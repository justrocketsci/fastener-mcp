"""
Real geometry measurement using OCP B-rep faces
Measures axis from cylindrical faces, head from planar faces
"""

import cadquery as cq
from cadquery import occ_impl
from OCP.BRepAdaptor import BRepAdaptor_Surface
from OCP.GeomAbs import GeomAbs_Cylinder, GeomAbs_Plane
from OCP.gp import gp_Pnt, gp_Dir, gp_Ax1
from OCP.TopAbs import TopAbs_FACE
from OCP.TopExp import TopExp_Explorer
import numpy as np
import json
from pathlib import Path
import sys

def find_cylindrical_faces(solid: cq.Workplane) -> list:
    """
    Find all cylindrical faces in the solid using OCP
    Returns list of (radius, axis_direction, axis_point)
    """
    from OCP.TopoDS import TopoDS
    cylindrical_faces = []
    
    shape = solid.val().wrapped
    explorer = TopExp_Explorer(shape, TopAbs_FACE)
    
    while explorer.More():
        face_shape = explorer.Current()
        face = TopoDS.Face_s(face_shape)  # Cast to TopoDS_Face
        surface = BRepAdaptor_Surface(face, True)
        
        if surface.GetType() == GeomAbs_Cylinder:
            # Get cylinder properties
            cylinder = surface.Cylinder()
            axis = cylinder.Axis()
            
            # Get axis direction
            direction = axis.Direction()
            axis_dir = np.array([direction.X(), direction.Y(), direction.Z()])
            
            # Get a point on the axis
            location = axis.Location()
            axis_point = np.array([location.X(), location.Y(), location.Z()])
            
            # Get radius
            radius = cylinder.Radius()
            
            cylindrical_faces.append({
                'radius': radius,
                'axis_direction': axis_dir,
                'axis_point': axis_point
            })
        
        explorer.Next()
    
    return cylindrical_faces

def find_planar_faces(solid: cq.Workplane) -> list:
    """
    Find all planar faces in the solid using OCP
    Returns list of (normal, point_on_plane, area)
    """
    from OCP.TopoDS import TopoDS
    planar_faces = []
    
    shape = solid.val().wrapped
    explorer = TopExp_Explorer(shape, TopAbs_FACE)
    
    while explorer.More():
        face_shape = explorer.Current()
        face = TopoDS.Face_s(face_shape)  # Cast to TopoDS_Face
        surface = BRepAdaptor_Surface(face, True)
        
        if surface.GetType() == GeomAbs_Plane:
            # Get plane properties
            plane = surface.Plane()
            axis = plane.Axis()
            
            # Get normal direction
            direction = axis.Direction()
            normal = np.array([direction.X(), direction.Y(), direction.Z()])
            
            # Get a point on the plane
            location = plane.Location()
            point = np.array([location.X(), location.Y(), location.Z()])
            
            # Get face area (approximate)
            try:
                from OCP.GProp import GProp_GProps
                from OCP.BRepGProp import BRepGProp
                props = GProp_GProps()
                BRepGProp.SurfaceProperties_s(face, props)
                area = props.Mass()
            except:
                area = 0.0
            
            planar_faces.append({
                'normal': normal,
                'point': point,
                'area': area
            })
        
        explorer.Next()
    
    return planar_faces

def find_shank_axis(cylindrical_faces: list) -> dict:
    """
    Find the shank axis from cylindrical faces
    The shank should be one of the narrower cylinders
    """
    if not cylindrical_faces:
        raise ValueError("No cylindrical faces found in fastener")
    
    # Sort by radius to find the shank (likely a smaller cylinder)
    # For a hex socket cap screw, the shank is typically the smallest cylinder
    sorted_faces = sorted(cylindrical_faces, key=lambda f: f['radius'])
    
    # The shank is likely the smallest or second-smallest cylinder
    # Return the smallest
    shank = sorted_faces[0]
    
    return shank

def find_head_underside(planar_faces: list, shank_axis_dir: np.ndarray) -> dict:
    """
    Find the head underside plane
    It should be perpendicular to the shank axis, facing toward the tip
    """
    # Normalize shank axis
    shank_axis_norm = shank_axis_dir / np.linalg.norm(shank_axis_dir)
    
    # Find planar faces whose normal is parallel to the shank axis
    head_candidates = []
    for face in planar_faces:
        normal = face['normal'] / np.linalg.norm(face['normal'])
        
        # Check if normal is parallel to shank axis
        dot = abs(np.dot(normal, shank_axis_norm))
        if dot > 0.99:  # Nearly parallel
            head_candidates.append(face)
    
    if not head_candidates:
        raise ValueError("No planar faces parallel to shank axis found")
    
    # The head underside should be one of the larger planar faces
    # Sort by area
    head_candidates.sort(key=lambda f: f.get('area', 0), reverse=True)
    
    return head_candidates[0]

def measure_geometry(fastener_transformed: cq.Workplane, 
                    hole_axis: np.ndarray,
                    entry_point: np.ndarray) -> dict:
    """
    Measure transformed fastener geometry from B-rep faces
    """
    # Find cylindrical faces
    print("Finding cylindrical faces in transformed fastener...")
    cylindrical_faces = find_cylindrical_faces(fastener_transformed)
    print(f"  Found {len(cylindrical_faces)} cylindrical faces")
    
    if cylindrical_faces:
        for i, face in enumerate(cylindrical_faces):
            print(f"    Cylinder {i}: radius={face['radius']:.3f}mm")
    
    # Find shank axis
    print("Identifying shank axis...")
    shank = find_shank_axis(cylindrical_faces)
    shank_axis_dir = shank['axis_direction']
    shank_axis_point = shank['axis_point']
    print(f"  Shank axis direction: {shank_axis_dir}")
    print(f"  Shank axis point: {shank_axis_point}")
    print(f"  Shank radius: {shank['radius']:.3f}mm")
    
    # Find planar faces
    print("Finding planar faces...")
    planar_faces = find_planar_faces(fastener_transformed)
    print(f"  Found {len(planar_faces)} planar faces")
    
    # Find head underside
    print("Identifying head underside...")
    try:
        head_face = find_head_underside(planar_faces, shank_axis_dir)
        head_normal = head_face['normal']
        head_point = head_face['point']
        print(f"  Head normal: {head_normal}")
        print(f"  Head point: {head_point}")
        print(f"  Head area: {head_face.get('area', 0):.3f}mm²")
    except ValueError as e:
        print(f"  Warning: {e}")
        head_point = None
        head_normal = None
    
    # Normalize vectors
    shank_axis_norm = shank_axis_dir / np.linalg.norm(shank_axis_dir)
    hole_axis_norm = hole_axis / np.linalg.norm(hole_axis)
    
    # Measure 1: Axis alignment angle
    dot_product = np.dot(shank_axis_norm, hole_axis_norm)
    angle_rad = np.arccos(np.clip(abs(dot_product), -1, 1))
    angle_deg = np.degrees(angle_rad)
    
    # Measure 2: Axis perpendicular offset
    # Distance between two lines in 3D
    w = shank_axis_point - entry_point
    cross = np.cross(shank_axis_norm, hole_axis_norm)
    cross_norm = np.linalg.norm(cross)
    
    if cross_norm < 1e-6:
        # Parallel lines
        axis_offset = np.linalg.norm(w - np.dot(w, shank_axis_norm) * shank_axis_norm)
    else:
        # Skew lines
        axis_offset = abs(np.dot(w, cross)) / cross_norm
    
    # Measure 3: Head seating distance
    if head_point is not None:
        # Distance from head point to entry point
        head_seating_distance = np.linalg.norm(head_point - entry_point)
        
        # Better: distance along axis
        diff = head_point - entry_point
        head_seating_along_axis = abs(np.dot(diff, hole_axis_norm))
    else:
        head_seating_distance = None
        head_seating_along_axis = None
    
    # Measure 4: Direction check (shank points into hole)
    # The shank should point in the same direction as the hole axis
    direction_correct = np.dot(shank_axis_norm, hole_axis_norm) > 0
    
    return {
        'shank_axis_direction': shank_axis_norm,
        'shank_axis_point': shank_axis_point,
        'shank_radius': shank['radius'],
        'hole_axis_direction': hole_axis_norm,
        'axis_alignment_angle_deg': angle_deg,
        'axis_perpendicular_offset_mm': axis_offset,
        'head_point': head_point,
        'head_seating_distance_mm': head_seating_distance,
        'head_seating_along_axis_mm': head_seating_along_axis,
        'direction_correct': direction_correct,
        'num_cylindrical_faces': len(cylindrical_faces),
        'num_planar_faces': len(planar_faces)
    }

def main():
    print("=" * 80)
    print("REAL GEOMETRY MEASUREMENT FROM B-REP FACES")
    print("=" * 80)
    print()
    
    # Load transformed fastener
    step_path = Path("/workspace/test-artifacts/iso-1207-m5-20-transformed.step")
    if not step_path.exists():
        print(f"✗ Transformed STEP not found: {step_path}")
        print("  Run proof-real-geometry.py first")
        return 1
    
    print(f"Loading transformed fastener: {step_path}")
    fastener_transformed = cq.importers.importStep(str(step_path))
    print("✓ Loaded")
    print()
    
    # Test parameters
    tilt_angle_deg = 35
    tilt_angle_rad = np.radians(tilt_angle_deg)
    hole_axis = np.array([0, np.sin(tilt_angle_rad), np.cos(tilt_angle_rad)])
    entry_point = np.array([15.0, 15.0, 15.0])
    
    print(f"Test configuration:")
    print(f"  Hole axis: {hole_axis}")
    print(f"  Hole tilt: {tilt_angle_deg}°")
    print(f"  Entry point: {entry_point} mm")
    print()
    
    # Measure geometry
    print("Measuring geometry from B-rep faces...")
    print("-" * 80)
    try:
        results = measure_geometry(fastener_transformed, hole_axis, entry_point)
    except Exception as e:
        print(f"✗ Failed to measure: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    print()
    print("=" * 80)
    print("MEASUREMENT RESULTS")
    print("=" * 80)
    print(f"Axis alignment angle: {results['axis_alignment_angle_deg']:.6f}°")
    print(f"Axis perpendicular offset: {results['axis_perpendicular_offset_mm']:.6f} mm")
    if results['head_seating_distance_mm'] is not None:
        print(f"Head seating distance: {results['head_seating_distance_mm']:.6f} mm")
        print(f"Head seating along axis: {results['head_seating_along_axis_mm']:.6f} mm")
    else:
        print(f"Head seating: Could not measure")
    print(f"Direction correct (shank into hole): {results['direction_correct']}")
    print()
    
    # Check tolerances
    ANGLE_TOL = 0.01  # degrees
    OFFSET_TOL = 0.01  # mm
    SEATING_TOL = 0.01  # mm
    
    angle_pass = results['axis_alignment_angle_deg'] < ANGLE_TOL
    offset_pass = results['axis_perpendicular_offset_mm'] < OFFSET_TOL
    seating_pass = (results['head_seating_along_axis_mm'] is not None and 
                   results['head_seating_along_axis_mm'] < SEATING_TOL)
    direction_pass = results['direction_correct']
    
    print("Tolerance checks:")
    print(f"  Axis angle: {'✓ PASS' if angle_pass else '✗ FAIL'} ({results['axis_alignment_angle_deg']:.6f}° < {ANGLE_TOL}°)")
    print(f"  Axis offset: {'✓ PASS' if offset_pass else '✗ FAIL'} ({results['axis_perpendicular_offset_mm']:.6f} mm < {OFFSET_TOL} mm)")
    if results['head_seating_along_axis_mm'] is not None:
        print(f"  Head seating: {'✓ PASS' if seating_pass else '✗ FAIL'} ({results['head_seating_along_axis_mm']:.6f} mm < {SEATING_TOL} mm)")
    else:
        print(f"  Head seating: ✗ FAIL (could not measure)")
    print(f"  Direction: {'✓ PASS' if direction_pass else '✗ FAIL'}")
    print()
    
    all_pass = angle_pass and offset_pass and seating_pass and direction_pass
    
    # Save results
    output_path = Path("/workspace/test-artifacts/brep-measurement-results.json")
    with open(output_path, 'w') as f:
        # Convert numpy arrays to lists for JSON
        json_results = {
            k: v.tolist() if isinstance(v, np.ndarray) else v 
            for k, v in results.items()
        }
        json_results['tolerances'] = {
            'angle_deg': ANGLE_TOL,
            'offset_mm': OFFSET_TOL,
            'seating_mm': SEATING_TOL
        }
        json_results['checks'] = {
            'angle_pass': angle_pass,
            'offset_pass': offset_pass,
            'seating_pass': seating_pass,
            'direction_pass': direction_pass,
            'all_pass': all_pass
        }
        json.dump(json_results, f, indent=2)
    
    print(f"Results saved to: {output_path}")
    print()
    
    if all_pass:
        print("✓ ALL CHECKS PASSED")
        return 0
    else:
        print("✗ SOME CHECKS FAILED")
        return 1

if __name__ == '__main__':
    sys.exit(main())
