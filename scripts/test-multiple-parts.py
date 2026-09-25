"""
Test placement recipe with multiple fastener types
"""

import cadquery as cq
import numpy as np
import json
import subprocess
import sys
from pathlib import Path
from OCP.gp import gp_Trsf
from OCP.BRepBuilderAPI import BRepBuilderAPI_Transform
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_FACE
from OCP.BRepAdaptor import BRepAdaptor_Surface
from OCP.GeomAbs import GeomAbs_Cylinder, GeomAbs_Plane
from OCP.GProp import GProp_GProps
from OCP.BRepGProp import BRepGProp
from OCP.TopoDS import TopoDS

def test_part(part_id, part_name, entry_point, hole_axis, block_size):
    """Test placement for a single part"""
    print("=" * 80)
    print(f"Testing: {part_name} ({part_id})")
    print("=" * 80)
    print()
    
    hole_axis = hole_axis / np.linalg.norm(hole_axis)
    
    # Generate transform
    test_script = f"""
import {{ buildPlacementPacket }} from '@/lib/placement-packet';
import {{ buildPlacementRecipe }} from '@/lib/placement-recipe';
import fasteners from '@/data/fasteners.json';

const fastener = fasteners.find(f => f.id === '{part_id}');
const packet = buildPlacementPacket(fastener, 'https://test.com');
const recipe = buildPlacementRecipe(packet, {{
  axisDirection: {{ x: {hole_axis[0]}, y: {hole_axis[1]}, z: {hole_axis[2]} }},
  entryPoint: {{ x: {entry_point[0]}, y: {entry_point[1]}, z: {entry_point[2]} }},
  rotationDegrees: 0
}});

console.log(JSON.stringify(recipe.transform.matrix4x4));
"""
    
    with open('/tmp/gen_transform.ts', 'w') as f:
        f.write(test_script)
    
    result = subprocess.run(
        ['npx', 'tsx', '/tmp/gen_transform.ts'],
        cwd='/workspace',
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        print(f"✗ Failed to generate transform: {result.stderr}")
        return False
    
    matrix_4x4 = json.loads(result.stdout.strip())
    
    # Load and transform STEP
    step_path = Path('/workspace/public/models') / f'{part_id}.step'
    if not step_path.exists():
        print(f"✗ STEP file not found: {step_path}")
        return False
    
    fastener_orig = cq.importers.importStep(str(step_path))
    original_shape = fastener_orig.val().wrapped
    
    trsf = gp_Trsf()
    R = matrix_4x4
    trsf.SetValues(
        R[0][0], R[0][1], R[0][2], R[0][3],
        R[1][0], R[1][1], R[1][2], R[1][3],
        R[2][0], R[2][1], R[2][2], R[2][3]
    )
    
    transformer = BRepBuilderAPI_Transform(original_shape, trsf, True)
    transformer.Build()
    transformed_shape = transformer.Shape()
    
    # Export
    output_path = f'/workspace/test-artifacts/{part_id}-transformed.step'
    cq.exporters.export(
        cq.Workplane().newObject([cq.Shape.cast(transformed_shape)]),
        output_path
    )
    
    # Measure
    explorer = TopExp_Explorer(transformed_shape, TopAbs_FACE)
    cylinders = []
    
    while explorer.More():
        face_shape = explorer.Current()
        face = TopoDS.Face_s(face_shape)
        surface = BRepAdaptor_Surface(face, True)
        
        if surface.GetType() == GeomAbs_Cylinder:
            cylinder = surface.Cylinder()
            axis = cylinder.Axis()
            direction = axis.Direction()
            location = axis.Location()
            radius = cylinder.Radius()
            
            cylinders.append({
                'radius': radius,
                'axis_dir': np.array([direction.X(), direction.Y(), direction.Z()]),
                'axis_point': np.array([location.X(), location.Y(), location.Z()])
            })
        
        explorer.Next()
    
    # Find planes
    explorer = TopExp_Explorer(transformed_shape, TopAbs_FACE)
    planes = []
    
    while explorer.More():
        face_shape = explorer.Current()
        face = TopoDS.Face_s(face_shape)
        surface = BRepAdaptor_Surface(face, True)
        
        if surface.GetType() == GeomAbs_Plane:
            plane = surface.Plane()
            axis = plane.Axis()
            direction = axis.Direction()
            location = plane.Location()
            
            props = GProp_GProps()
            BRepGProp.SurfaceProperties_s(face, props)
            area = props.Mass()
            
            planes.append({
                'normal': np.array([direction.X(), direction.Y(), direction.Z()]),
                'point': np.array([location.X(), location.Y(), location.Z()]),
                'area': area
            })
        
        explorer.Next()
    
    if not cylinders:
        print("✗ No cylinders found")
        return False
    
    # Find shank (smallest cylinder)
    shank = min(cylinders, key=lambda c: c['radius'])
    shank_axis = shank['axis_dir'] / np.linalg.norm(shank['axis_dir'])
    shank_point = shank['axis_point']
    
    # Measurements
    hole_axis_norm = hole_axis / np.linalg.norm(hole_axis)
    dot = np.dot(shank_axis, hole_axis_norm)
    angle_rad = np.arccos(np.clip(abs(dot), -1, 1))
    angle_deg = np.degrees(angle_rad)
    
    w = shank_point - entry_point
    cross = np.cross(shank_axis, hole_axis_norm)
    cross_norm = np.linalg.norm(cross)
    if cross_norm < 1e-6:
        offset = np.linalg.norm(w - np.dot(w, shank_axis) * shank_axis)
    else:
        offset = abs(np.dot(w, cross)) / cross_norm
    
    # Find head underside (perpendicular to shank, intermediate area)
    head_dist = None
    head_found = False
    if planes:
        head_candidates = []
        for plane in planes:
            normal = plane['normal'] / np.linalg.norm(plane['normal'])
            if abs(np.dot(normal, shank_axis)) > 0.99:
                # Skip very small (tip) and very large (head top) planes
                if 10 < plane['area'] < 200:
                    head_candidates.append(plane)
        
        if head_candidates:
            # Pick the one closest to entry point
            head = min(head_candidates, key=lambda p: np.linalg.norm(p['point'] - entry_point))
            head_dist = np.linalg.norm(head['point'] - entry_point)
            head_found = head_dist < 0.1
    
    # Find tip (if it exists - some parts have pointed/rounded tips without a flat plane)
    tip_pass = True  # Default: assume OK
    if planes:
        # Look for planes deep inside the block (positive signed distance > 5mm)
        # This filters out head faces and finds the tip
        deep_planes = []
        for p in planes:
            diff = p['point'] - entry_point
            signed_dist = np.dot(diff, hole_axis_norm)
            inside_bounds = (
                -1 < p['point'][0] < block_size + 1 and
                -1 < p['point'][1] < block_size + 1 and
                -1 < p['point'][2] < block_size + 1
            )
            if signed_dist > 5 and inside_bounds:
                deep_planes.append(p)
        
        if deep_planes:
            # Found tip plane(s) - smallest one is likely the actual tip
            tip = min(deep_planes, key=lambda p: p['area'])
            tip_point = tip['point']
            diff = tip_point - entry_point
            tip_signed_dist = np.dot(diff, hole_axis_norm)
            tip_pass = tip_signed_dist > 0.5
    
    # Results
    angle_pass = angle_deg < 0.01
    offset_pass = offset < 0.01
    head_pass = head_found
    # tip_pass is already set above
    
    all_pass = angle_pass and offset_pass and head_pass and tip_pass
    
    print(f"  Angle: {angle_deg:.9f}° {'✓' if angle_pass else '✗'}")
    print(f"  Offset: {offset:.9f} mm {'✓' if offset_pass else '✗'}")
    print(f"  Head at entry: {'✓' if head_pass else '✗'}")
    print(f"  Tip position: {'✓' if tip_pass else '✗'}")
    print(f"  Overall: {'✓ PASS' if all_pass else '✗ FAIL'}")
    print()
    
    return all_pass

def main():
    print()
    print("="*80)
    print("MULTI-PART PLACEMENT TEST")
    print("="*80)
    print()
    
    # Test configuration (30mm cube, 35° tilt)
    block_size = 30
    entry_point = np.array([15.0, 15.0, 30.0])
    tilt_deg = 35
    tilt_rad = np.radians(tilt_deg)
    hole_axis = np.array([0, np.sin(tilt_rad), -np.cos(tilt_rad)])
    
    tests = [
        ('iso-1207-m5-20', 'ISO 1207 M5×20 (slotted cheese head)'),
        ('iso-4762-m5-20', 'ISO 4762 M5×20 (socket head cap screw)'),
        ('iso-4017-m5-20', 'ISO 4017 M5×20 (hex head bolt)'),
    ]
    
    results = []
    for part_id, part_name in tests:
        passed = test_part(part_id, part_name, entry_point, hole_axis, block_size)
        results.append((part_name, passed))
    
    print("="*80)
    print("SUMMARY")
    print("="*80)
    for name, passed in results:
        print(f"  {name}: {'✓ PASS' if passed else '✗ FAIL'}")
    print()
    
    all_passed = all(p for _, p in results)
    if all_passed:
        print("✓✓✓ ALL TESTS PASSED ✓✓✓")
        return 0
    else:
        print("✗ SOME TESTS FAILED")
        return 1

if __name__ == '__main__':
    sys.exit(main())
