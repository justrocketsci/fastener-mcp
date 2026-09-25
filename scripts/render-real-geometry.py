"""
Render real tessellated geometry with tilted hole
"""

import cadquery as cq
import numpy as np
import json
import subprocess
from pathlib import Path
from OCP.gp import gp_Trsf, gp_Pnt, gp_Dir, gp_Ax2
from OCP.BRepBuilderAPI import BRepBuilderAPI_Transform
from OCP.BRepAlgoAPI import BRepAlgoAPI_Section, BRepAlgoAPI_Cut
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_FACE
from OCP.TopoDS import TopoDS
from OCP.Bnd import Bnd_Box
from OCP.BRepBndLib import BRepBndLib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection

def tessellate_shape(shape):
    """Tessellate a shape and return triangles"""
    # Mesh the shape
    mesh = BRepMesh_IncrementalMesh(shape, 0.1, False, 0.1, True)
    mesh.Perform()
    
    triangles = []
    explorer = TopExp_Explorer(shape, TopAbs_FACE)
    
    while explorer.More():
        face = TopoDS.Face_s(explorer.Current())
        location = face.Location()
        
        # Get triangulation
        from OCP.BRep import BRep_Tool
        triangulation = BRep_Tool.Triangulation_s(face, location)
        
        if triangulation:
            # Get vertices
            nodes = []
            for i in range(1, triangulation.NbNodes() + 1):
                pnt = triangulation.Node(i)
                nodes.append([pnt.X(), pnt.Y(), pnt.Z()])
            
            # Get triangles
            for i in range(1, triangulation.NbTriangles() + 1):
                tri = triangulation.Triangle(i)
                n1, n2, n3 = tri.Get()
                triangles.append([
                    nodes[n1-1],
                    nodes[n2-1],
                    nodes[n3-1]
                ])
        
        explorer.Next()
    
    return triangles

def render_isometric(block_triangles, fastener_triangles, output_path):
    """Render isometric view"""
    fig = plt.figure(figsize=(12, 10))
    ax = fig.add_subplot(111, projection='3d')
    
    # Plot block (semi-transparent gray)
    block_collection = Poly3DCollection(block_triangles, alpha=0.3, facecolor='gray', edgecolor='none')
    ax.add_collection3d(block_collection)
    
    # Plot fastener (orange)
    fastener_collection = Poly3DCollection(fastener_triangles, alpha=0.9, facecolor='orange', edgecolor='darkorange', linewidth=0.5)
    ax.add_collection3d(fastener_collection)
    
    # Set labels and limits
    ax.set_xlabel('X (mm)')
    ax.set_ylabel('Y (mm)')
    ax.set_zlabel('Z (mm)')
    ax.set_title('Isometric View - ISO 1207 M5×20 in Tilted Hole')
    
    # Set equal aspect and limits
    ax.set_xlim(0, 30)
    ax.set_ylim(0, 30)
    ax.set_zlim(0, 35)
    
    # Isometric view
    ax.view_init(elev=25, azim=45)
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    print(f"✓ Saved: {output_path}")

def render_section(block_shape, fastener_shape, output_path):
    """Render 2D cross-section at x=15"""
    # Simply filter triangles by x coordinate for visualization
    
    # Get half-spaces by cutting
    # For visualization, we'll tessellate and filter triangles
    block_tris = tessellate_shape(block_shape)
    fastener_tris = tessellate_shape(fastener_shape)
    
    # Filter to only show triangles with at least one vertex at x < 15.5
    block_section = [t for t in block_tris if any(v[0] < 15.5 for v in t)]
    fastener_section = [t for t in fastener_tris if any(v[0] < 15.5 for v in t)]
    
    # Plot 2D projection on YZ plane
    fig, ax = plt.subplots(figsize=(10, 10))
    
    # Extract YZ coordinates from section triangles
    for tri in block_section:
        yz_tri = [[v[1], v[2]] for v in tri]
        yz_tri.append(yz_tri[0])  # Close the triangle
        yz_coords = list(zip(*yz_tri))
        ax.fill(yz_coords[0], yz_coords[1], color='gray', alpha=0.3, edgecolor='black', linewidth=0.5)
    
    for tri in fastener_section:
        yz_tri = [[v[1], v[2]] for v in tri]
        yz_tri.append(yz_tri[0])
        yz_coords = list(zip(*yz_tri))
        ax.fill(yz_coords[0], yz_coords[1], color='orange', alpha=0.9, edgecolor='darkorange', linewidth=0.5)
    
    ax.set_xlabel('Y (mm)')
    ax.set_ylabel('Z (mm)')
    ax.set_title('Cross-Section at X=15 (YZ Plane)')
    ax.set_aspect('equal')
    ax.grid(True, alpha=0.3)
    ax.set_xlim(0, 30)
    ax.set_ylim(5, 35)
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    print(f"✓ Saved: {output_path}")

def main():
    print("="*80)
    print("RENDERING REAL TESSELLATED GEOMETRY")
    print("="*80)
    print()
    
    # Configuration
    part_id = "iso-1207-m5-20"
    block_size = 30
    entry_point = np.array([15.0, 15.0, 30.0])
    tilt_deg = 35
    tilt_rad = np.radians(tilt_deg)
    hole_axis = np.array([0, np.sin(tilt_rad), -np.cos(tilt_rad)])
    hole_axis = hole_axis / np.linalg.norm(hole_axis)
    
    print(f"Part: {part_id}")
    print(f"Entry: {entry_point}")
    print(f"Axis: {hole_axis}")
    print(f"Tilt: {tilt_deg}°")
    print()
    
    # Generate transform
    print("Generating transform...")
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
    
    matrix_4x4 = json.loads(result.stdout.strip())
    print("✓ Transform generated")
    
    # Create block with tilted hole
    print("Creating block with tilted hole...")
    
    # Create base block
    block = cq.Workplane("XY").box(block_size, block_size, block_size).translate((15, 15, 15))
    
    # Create hole cylinder (5.5mm clearance, 40mm long)
    hole = cq.Workplane("XY").circle(2.75).extrude(40)
    
    # Apply same rotation and translation to hole
    # Rotate 145° about X axis
    angle_rad = np.radians(145)
    hole = hole.rotate((0,0,0), (1,0,0), 145)
    
    # Translate up so it starts above entry point and goes through
    hole = hole.translate((0, 0, 32))
    
    # Cut hole from block
    block = block.cut(hole)
    print("✓ Block with hole created")
    
    # Load and transform fastener
    print("Loading and transforming fastener...")
    step_path = Path('/workspace/public/models') / f'{part_id}.step'
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
    print("✓ Fastener transformed")
    
    # Tessellate both
    print("Tessellating geometry...")
    block_triangles = tessellate_shape(block.val().wrapped)
    fastener_triangles = tessellate_shape(transformed_shape)
    print(f"✓ Block: {len(block_triangles)} triangles")
    print(f"✓ Fastener: {len(fastener_triangles)} triangles")
    print()
    
    # Render isometric
    print("Rendering isometric view...")
    iso_path = '/opt/cursor/artifacts/placement-iso-real.png'
    render_isometric(block_triangles, fastener_triangles, iso_path)
    
    # Render section
    print("Rendering cross-section...")
    section_path = '/opt/cursor/artifacts/placement-section-real.png'
    render_section(block.val().wrapped, transformed_shape, section_path)
    
    print()
    print("="*80)
    print("RENDERING COMPLETE")
    print("="*80)
    print(f"Isometric: {iso_path}")
    print(f"Section: {section_path}")

if __name__ == '__main__':
    main()
