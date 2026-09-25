"""
Correct placement test with rigid transform preserving analytical surfaces
"""

import cadquery as cq
import numpy as np
import json
from pathlib import Path
from OCP.gp import gp_Trsf, gp_Vec, gp_Ax1, gp_Pnt, gp_Dir, gp_XYZ
from OCP.BRepBuilderAPI import BRepBuilderAPI_Transform
from OCP.TopoDS import TopoDS
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_FACE
from OCP.BRepAdaptor import BRepAdaptor_Surface
from OCP.GeomAbs import GeomAbs_Cylinder, GeomAbs_Plane
from OCP.GProp import GProp_GProps
from OCP.BRepGProp import BRepGProp
from OCP.BRepAlgoAPI import BRepAlgoAPI_Common

print("=" * 80)
print("CORRECT PLACEMENT TEST WITH RIGID TRANSFORM")
print("=" * 80)
print()

# Test configuration
# Block: 30x30x30mm, origin at corner
# Entry face: TOP face at Z=30
# Hole: 35° tilt in YZ plane, pointing INTO the block (downward/inward)
# Entry point: (15, 15, 30) on top face

block_size = 30
entry_point = np.array([15.0, 15.0, 30.0])  # Top face
tilt_deg = 35
tilt_rad = np.radians(tilt_deg)

# Hole axis points INTO block: down and forward
# In YZ plane at 35° from vertical (-Z)
# Negative Z component (into block), positive Y component (tilted forward)
hole_axis = np.array([0, np.sin(tilt_rad), -np.cos(tilt_rad)])
hole_axis = hole_axis / np.linalg.norm(hole_axis)  # Normalize

print(f"Test configuration:")
print(f"  Block size: {block_size}mm cube")
print(f"  Entry point: {entry_point} (top face)")
print(f"  Hole axis: {hole_axis}")
print(f"  Hole tilt: {tilt_deg}° from vertical, pointing INTO block")
print()

# Get placement recipe from API
print("Fetching placement recipe from API...")
import subprocess
import time

# Start server briefly
proc = subprocess.Popen(['npm', 'start'], cwd='/workspace', 
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(3)

try:
    import urllib.request
    import urllib.error
    
    req_data = json.dumps({
        'axisDirection': {'x': float(hole_axis[0]), 'y': float(hole_axis[1]), 'z': float(hole_axis[2])},
        'entryPoint': {'x': float(entry_point[0]), 'y': float(entry_point[1]), 'z': float(entry_point[2])}
    }).encode('utf-8')
    
    req = urllib.request.Request(
        'http://localhost:3000/api/fasteners/iso-1207-m5-20/placement-recipe',
        data=req_data,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    
    with urllib.request.urlopen(req, timeout=5) as response:
        recipe = json.loads(response.read().decode('utf-8'))
    
    matrix_4x4 = recipe['transform']['matrix4x4']
    print("✓ Recipe fetched")
    print()
    
finally:
    proc.terminate()
    proc.wait(timeout=2)

# Save matrix
with open('test-artifacts/transform-matrix-correct.json', 'w') as f:
    json.dump(matrix_4x4, f, indent=2)

print("Transform matrix:")
for row in matrix_4x4:
    print(f"  {row}")
print()

# Load original fastener
print("Loading original STEP...")
fastener_orig = cq.importers.importStep('public/models/iso-1207-m5-20.step')
original_shape = fastener_orig.val().wrapped

# Apply rigid transform using gp_Trsf (preserves analytical surfaces)
print("Applying rigid transform with gp_Trsf...")

# Build gp_Trsf from matrix
trsf = gp_Trsf()
# SetValues takes 12 values: 3x3 rotation + 1x3 translation
R = matrix_4x4
trsf.SetValues(
    R[0][0], R[0][1], R[0][2], R[0][3],
    R[1][0], R[1][1], R[1][2], R[1][3],
    R[2][0], R[2][1], R[2][2], R[2][3]
)

# Apply transform
transformer = BRepBuilderAPI_Transform(original_shape, trsf, True)  # True = copy
transformer.Build()
transformed_shape = transformer.Shape()

# Wrap back in CadQuery
fastener_transformed = cq.Workplane().newObject([cq.Shape.cast(transformed_shape)])

print("✓ Transform applied")
print()

# Export transformed fastener
output_path = 'test-artifacts/iso-1207-m5-20-transformed-correct.step'
print(f"Exporting: {output_path}")
cq.exporters.export(fastener_transformed, output_path)

# Now measure the transformed geometry
print()
print("=" * 80)
print("MEASURING TRANSFORMED GEOMETRY WITH ANALYTICAL SURFACES")
print("=" * 80)
print()

explorer = TopExp_Explorer(transformed_shape, TopAbs_FACE)

# Find cylinders
cylinders = []
print("Cylindrical faces:")
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
        
        cyl_data = {
            'radius': radius,
            'axis_dir': np.array([direction.X(), direction.Y(), direction.Z()]),
            'axis_point': np.array([location.X(), location.Y(), location.Z()])
        }
        cylinders.append(cyl_data)
        
        print(f"  Cylinder {len(cylinders)}: r={radius:.3f}mm")
        print(f"    Axis direction: {cyl_data['axis_dir']}")
        print(f"    Axis point: {cyl_data['axis_point']}")
    
    explorer.Next()

# Find planes
explorer = TopExp_Explorer(transformed_shape, TopAbs_FACE)
planes = []
print("\nPlanar faces:")
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
        
        plane_data = {
            'normal': np.array([direction.X(), direction.Y(), direction.Z()]),
            'point': np.array([location.X(), location.Y(), location.Z()]),
            'area': area
        }
        planes.append(plane_data)
        
        print(f"  Plane {len(planes)}: area={area:.3f}mm²")
        print(f"    Normal: {plane_data['normal']}")
        print(f"    Point: {plane_data['point']}")
    
    explorer.Next()

print()
print("=" * 80)
print("MEASUREMENTS")
print("=" * 80)
print()

if not cylinders:
    print("✗ FATAL: No cylinders found! Rigid transform failed.")
    exit(1)

# Identify shank (smallest cylinder)
shank = min(cylinders, key=lambda c: c['radius'])
shank_axis = shank['axis_dir'] / np.linalg.norm(shank['axis_dir'])
shank_point = shank['axis_point']

print(f"Shank cylinder (r={shank['radius']:.3f}mm):")
print(f"  Axis: {shank_axis}")
print(f"  Point: {shank_point}")
print()

# Measure 1: Axis alignment
hole_axis_norm = hole_axis / np.linalg.norm(hole_axis)
dot = np.dot(shank_axis, hole_axis_norm)
angle_rad = np.arccos(np.clip(abs(dot), -1, 1))
angle_deg = np.degrees(angle_rad)

print(f"1. Axis alignment angle: {angle_deg:.9f}°")

# Measure 2: Axis offset
w = shank_point - entry_point
cross = np.cross(shank_axis, hole_axis_norm)
cross_norm = np.linalg.norm(cross)
if cross_norm < 1e-6:
    offset = np.linalg.norm(w - np.dot(w, shank_axis) * shank_axis)
else:
    offset = abs(np.dot(w, cross)) / cross_norm

print(f"2. Axis perpendicular offset: {offset:.9f} mm")

# Measure 3: Direction (shank must point INTO hole, same direction)
direction_correct = dot > 0
print(f"3. Direction (shank into hole): {direction_correct} (dot={dot:.6f})")

# Measure 4: Head underside at entry point
if planes:
    # Find head underside: plane perpendicular to shank, area ~37mm² (annulus)
    head_candidates = []
    for plane in planes:
        normal = plane['normal'] / np.linalg.norm(plane['normal'])
        # Perpendicular to shank axis
        if abs(np.dot(normal, shank_axis)) > 0.99:
            # Area ~37mm² (annulus)
            if 30 < plane['area'] < 45:
                head_candidates.append(plane)
    
    if head_candidates:
        head = head_candidates[0]  # Should only be one
        head_point = head['point']
        head_normal = head['normal'] / np.linalg.norm(head['normal'])
        
        print(f"\n4. Head underside (area={head['area']:.3f}mm²):")
        print(f"   Point: {head_point}")
        
        # Distance from head to entry point
        diff = head_point - entry_point
        dist = np.linalg.norm(diff)
        
        # Signed distance along hole axis (negative = head OUTSIDE block)
        signed_dist = np.dot(diff, hole_axis_norm)
        
        print(f"   Distance to entry: {dist:.9f} mm")
        print(f"   Signed distance along axis: {signed_dist:.9f} mm")
        
        if signed_dist < -0.01:
            print(f"   → Head is OUTSIDE block (correct) ✓")
            head_outside = True
        elif signed_dist > 0.01:
            print(f"   → Head is INSIDE block (wrong!) ✗")
            head_outside = False
        else:
            print(f"   → Head is AT entry face ✓")
            head_outside = True
    else:
        print(f"\n4. Head underside: NOT FOUND")
        head_outside = False
else:
    print(f"\n4. No planes found")
    head_outside = False

# Measure 5: Tip inside block
# Find tip plane (smallest area ~20mm²)
tip_candidates = [p for p in planes if p['area'] < 25]
if tip_candidates:
    tip = min(tip_candidates, key=lambda p: p['area'])
    tip_point = tip['point']
    
    print(f"\n5. Shank tip (area={tip['area']:.3f}mm²):")
    print(f"   Point: {tip_point}")
    
    # Tip should be inside block bounding box and along negative side of hole axis from entry
    diff = tip_point - entry_point
    signed_dist = np.dot(diff, hole_axis_norm)
    
    # Check if inside block bounds
    inside_bounds = (0 < tip_point[0] < block_size and 
                     0 < tip_point[1] < block_size and 
                     0 < tip_point[2] < block_size)
    
    print(f"   Signed distance along axis: {signed_dist:.3f} mm")
    print(f"   Inside block bounds: {inside_bounds}")
    
    if signed_dist > 1 and inside_bounds:
        print(f"   → Tip is INSIDE block (correct) ✓")
        tip_inside = True
    else:
        print(f"   → Tip is NOT inside block (wrong!) ✗")
        tip_inside = False
else:
    print(f"\n5. Tip: NOT FOUND")
    tip_inside = False

print()
print("=" * 80)
print("TOLERANCE CHECKS")
print("=" * 80)

angle_pass = angle_deg < 0.01
offset_pass = offset < 0.01
direction_pass = direction_correct
head_pass = head_outside and dist < 0.01

print(f"Angle < 0.01°:            {'✓ PASS' if angle_pass else '✗ FAIL'} ({angle_deg:.9f}°)")
print(f"Offset < 0.01mm:          {'✓ PASS' if offset_pass else '✗ FAIL'} ({offset:.9f} mm)")
print(f"Direction correct:        {'✓ PASS' if direction_pass else '✗ FAIL'}")
print(f"Head at entry (outside):  {'✓ PASS' if head_pass else '✗ FAIL'} ({dist:.9f} mm)")
print(f"Tip inside block:         {'✓ PASS' if tip_inside else '✗ FAIL'}")
print()

all_pass = angle_pass and offset_pass and direction_pass and head_pass and tip_inside

if all_pass:
    print("✓✓✓ ALL MEASUREMENTS PASS ✓✓✓")
else:
    print("✗ SOME MEASUREMENTS FAILED")

# Save results
results = {
    'cylinders_found': len(cylinders),
    'planes_found': len(planes),
    'axis_angle_deg': float(angle_deg),
    'axis_offset_mm': float(offset),
    'direction_correct': direction_correct,
    'head_distance_mm': float(dist) if head_candidates else None,
    'head_outside_block': head_outside,
    'tip_inside_block': tip_inside,
    'all_checks_pass': all_pass
}

with open('test-artifacts/correct-placement-results.json', 'w') as f:
    json.dump(results, f, indent=2)

print()
print(f"Results saved to: test-artifacts/correct-placement-results.json")
print()
EOF
python3 /workspace/scripts/test-correct-placement.py
