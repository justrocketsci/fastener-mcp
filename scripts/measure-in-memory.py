"""
Measure transformed geometry in-memory (no export/import)
This measures the ACTUAL B-rep faces after transformation
"""

import cadquery as cq
from OCP.TopoDS import TopoDS
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_FACE
from OCP.BRepAdaptor import BRepAdaptor_Surface
from OCP.GeomAbs import GeomAbs_Cylinder, GeomAbs_Plane
import numpy as np
import json
from pathlib import Path

# Load original STEP
print("Loading original STEP...")
fastener_orig = cq.importers.importStep('public/models/iso-1207-m5-20.step')

# Load transform matrix
print("Loading transform matrix...")
with open('test-artifacts/transform-matrix.json') as f:
    matrix = json.load(f)

print(f"Transform matrix:")
for row in matrix:
    print(f"  {row}")
print()

# Apply transform IN MEMORY
print("Applying transform in-memory...")
fastener_transformed = fastener_orig.newObject([
    s.transformGeometry(cq.Matrix(matrix))
    for s in fastener_orig.objects
])

# Now measure from the in-memory transformed solid
print("Measuring B-rep faces from transformed solid...")
print("=" * 80)

shape = fastener_transformed.val().wrapped
explorer = TopExp_Explorer(shape, TopAbs_FACE)

# Find cylinders
print("\nCYLINDRICAL FACES:")
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
        
        cyl_data = {
            'radius': radius,
            'axis_dir': np.array([direction.X(), direction.Y(), direction.Z()]),
            'axis_point': np.array([location.X(), location.Y(), location.Z()])
        }
        cylinders.append(cyl_data)
        
        print(f"  Cylinder {len(cylinders)}:")
        print(f"    Radius: {radius:.3f} mm")
        print(f"    Axis direction: {cyl_data['axis_dir']}")
        print(f"    Axis point: {cyl_data['axis_point']}")
    
    explorer.Next()

# Find planes
explorer = TopExp_Explorer(shape, TopAbs_FACE)
planes = []
print("\nPLANAR FACES:")
while explorer.More():
    face_shape = explorer.Current()
    face = TopoDS.Face_s(face_shape)
    surface = BRepAdaptor_Surface(face, True)
    
    if surface.GetType() == GeomAbs_Plane:
        plane = surface.Plane()
        axis = plane.Axis()
        direction = axis.Direction()
        location = plane.Location()
        
        from OCP.GProp import GProp_GProps
        from OCP.BRepGProp import BRepGProp
        props = GProp_GProps()
        BRepGProp.SurfaceProperties_s(face, props)
        area = props.Mass()
        
        plane_data = {
            'normal': np.array([direction.X(), direction.Y(), direction.Z()]),
            'point': np.array([location.X(), location.Y(), location.Z()]),
            'area': area
        }
        planes.append(plane_data)
        
        print(f"  Plane {len(planes)}:")
        print(f"    Normal: {plane_data['normal']}")
        print(f"    Point: {plane_data['point']}")
        print(f"    Area: {area:.3f} mm²")
    
    explorer.Next()

print()
print("=" * 80)
print("MEASUREMENTS")
print("=" * 80)

# Expected hole
tilt_deg = 35
tilt_rad = np.radians(tilt_deg)
hole_axis = np.array([0, np.sin(tilt_rad), np.cos(tilt_rad)])
entry_point = np.array([15.0, 15.0, 15.0])

print(f"Hole axis: {hole_axis}")
print(f"Entry point: {entry_point}")
print()

# Identify shank (smallest cylinder)
if cylinders:
    shank = min(cylinders, key=lambda c: c['radius'])
    shank_axis = shank['axis_dir'] / np.linalg.norm(shank['axis_dir'])
    shank_point = shank['axis_point']
    
    print(f"Shank identified (radius {shank['radius']:.3f}mm):")
    print(f"  Axis direction: {shank_axis}")
    print(f"  Axis point: {shank_point}")
    print()
    
    # Measure axis alignment
    hole_axis_norm = hole_axis / np.linalg.norm(hole_axis)
    dot = np.dot(shank_axis, hole_axis_norm)
    angle_rad = np.arccos(np.clip(abs(dot), -1, 1))
    angle_deg = np.degrees(angle_rad)
    
    print(f"Axis alignment angle: {angle_deg:.6f}°")
    
    # Measure axis offset
    w = shank_point - entry_point
    cross = np.cross(shank_axis, hole_axis_norm)
    cross_norm = np.linalg.norm(cross)
    if cross_norm < 1e-6:
        offset = np.linalg.norm(w - np.dot(w, shank_axis) * shank_axis)
    else:
        offset = abs(np.dot(w, cross)) / cross_norm
    
    print(f"Axis perpendicular offset: {offset:.6f} mm")
    
    # Direction check
    direction_correct = dot > 0
    print(f"Direction correct (shank into hole): {direction_correct}")
    print()

else:
    print("✗ No cylinders found - cannot measure!")
    print()

# Identify head underside (largest plane parallel to shank axis)
if cylinders and planes:
    shank = min(cylinders, key=lambda c: c['radius'])
    shank_axis = shank['axis_dir'] / np.linalg.norm(shank['axis_dir'])
    
    head_candidates = []
    for plane in planes:
        normal = plane['normal'] / np.linalg.norm(plane['normal'])
        if abs(np.dot(normal, shank_axis)) > 0.99:
            head_candidates.append(plane)
    
    if head_candidates:
        head = max(head_candidates, key=lambda p: p['area'])
        head_point = head['point']
        
        print(f"Head underside identified (area {head['area']:.3f}mm²):")
        print(f"  Point: {head_point}")
        print()
        
        # Measure head seating
        diff = head_point - entry_point
        seating_distance = np.linalg.norm(diff)
        seating_along_axis = abs(np.dot(diff, hole_axis_norm))
        
        print(f"Head seating distance: {seating_distance:.6f} mm")
        print(f"Head seating along axis: {seating_along_axis:.6f} mm")
    else:
        print("✗ No head underside found!")
else:
    print("✗ Cannot identify head - insufficient geometry!")

print()
print("=" * 80)
