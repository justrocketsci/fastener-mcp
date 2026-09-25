"""
Render with spot face and proper section cut
"""

import cadquery as cq
import numpy as np
import json
import subprocess
from pathlib import Path
from OCP.gp import gp_Trsf, gp_Pnt, gp_Dir, gp_Pln
from OCP.BRepBuilderAPI import BRepBuilderAPI_Transform, BRepBuilderAPI_MakeEdge, BRepBuilderAPI_MakeWire, BRepBuilderAPI_MakeFace
from OCP.BRepAlgoAPI import BRepAlgoAPI_Common, BRepAlgoAPI_Cut
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_FACE, TopAbs_EDGE
from OCP.TopoDS import TopoDS
from OCP.GProp import GProp_GProps
from OCP.BRepGProp import BRepGProp
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection

def tessellate_shape(shape):
    """Tessellate and return triangles"""
    mesh = BRepMesh_IncrementalMesh(shape, 0.1, False, 0.1, True)
    mesh.Perform()
    
    triangles = []
    explorer = TopExp_Explorer(shape, TopAbs_FACE)
    
    while explorer.More():
        face = TopoDS.Face_s(explorer.Current())
        location = face.Location()
        
        from OCP.BRep import BRep_Tool
        triangulation = BRep_Tool.Triangulation_s(face, location)
        
        if triangulation:
            nodes = []
            for i in range(1, triangulation.NbNodes() + 1):
                pnt = triangulation.Node(i)
                nodes.append([pnt.X(), pnt.Y(), pnt.Z()])
            
            for i in range(1, triangulation.NbTriangles() + 1):
                tri = triangulation.Triangle(i)
                n1, n2, n3 = tri.Get()
                triangles.append([nodes[n1-1], nodes[n2-1], nodes[n3-1]])
        
        explorer.Next()
    
    return triangles

def get_volume(shape):
    """Calculate volume"""
    props = GProp_GProps()
    BRepGProp.VolumeProperties_s(shape, props)
    return props.Mass()

def main():
    print("="*80)
    print("RENDERING WITH SPOT FACE AND PROPER SECTION")
    print("="*80)
    print()
    
    part_id = "iso-1207-m5-20"
    E = np.array([15.0, 15.0, 30.0])
    d = np.array([0, 0.57357644, -0.81915204])
    
    print(f"Entry E: {E}")
    print(f"Axis d: {d}")
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
  axisDirection: {{ x: {d[0]}, y: {d[1]}, z: {d[2]} }},
  entryPoint: {{ x: {E[0]}, y: {E[1]}, z: {E[2]} }},
  rotationDegrees: 0
}});

console.log(JSON.stringify(recipe.transform.matrix4x4));
"""
    
    with open('/tmp/gen_transform.ts', 'w') as f:
        f.write(test_script)
    
    result = subprocess.run(['npx', 'tsx', '/tmp/gen_transform.ts'], 
                          cwd='/workspace', capture_output=True, text=True)
    matrix_4x4 = json.loads(result.stdout.strip())
    print("✓ Transform generated")
    
    # Create block with hole and spot face
    print("Creating block with hole and spot face...")
    
    # Base 30mm cube
    block = cq.Workplane("XY").box(30, 30, 30).translate((15, 15, 15))
    
    # M5 clearance hole: 5.5mm diameter, 40mm long
    # Start at E - 2*d
    hole_start = E - 2 * d
    hole = cq.Workplane("XY").circle(2.75).extrude(40)
    hole = hole.rotate((0,0,0), (-1,0,0), 145).translate(tuple(hole_start))
    
    # Spot face: 10mm diameter, 5mm deep
    # Start at E - 5*d
    spot_start = E - 5 * d
    spot_face = cq.Workplane("XY").circle(5.0).extrude(5)
    spot_face = spot_face.rotate((0,0,0), (-1,0,0), 145).translate(tuple(spot_start))
    
    # Cut both from block
    block = block.cut(hole).cut(spot_face)
    print("✓ Block created with hole and spot face")
    
    # Verify hole axis
    print("\nVerifying hole placement:")
    print(f"  Hole axis after transform: {d}")
    print(f"  Hole passes through E: {E}")
    print(f"  Distance from axis to E: < 0.001 mm (by construction)")
    
    # Load and transform fastener
    print("\nLoading fastener...")
    step_path = Path('/workspace/public/models') / f'{part_id}.step'
    fastener_orig = cq.importers.importStep(str(step_path))
    
    trsf = gp_Trsf()
    R = matrix_4x4
    trsf.SetValues(
        R[0][0], R[0][1], R[0][2], R[0][3],
        R[1][0], R[1][1], R[1][2], R[1][3],
        R[2][0], R[2][1], R[2][2], R[2][3]
    )
    
    transformer = BRepBuilderAPI_Transform(fastener_orig.val().wrapped, trsf, True)
    transformer.Build()
    fastener_shape = transformer.Shape()
    print("✓ Fastener transformed")
    
    # Interference check
    print("\nChecking interference...")
    try:
        common_op = BRepAlgoAPI_Common(block.val().wrapped, fastener_shape)
        common_op.Build()
        if common_op.IsDone():
            common_shape = common_op.Shape()
            interference_volume = get_volume(common_shape)
            print(f"✓ Interference volume: {interference_volume:.6f} mm³")
        else:
            print("✗ Common operation failed")
            interference_volume = -1
    except Exception as e:
        print(f"✗ Interference check failed: {e}")
        interference_volume = -1
    
    # Cut both shapes at x=15 for section view
    print("\nCreating section cut at x=15...")
    # Create half-space box: keep x < 15
    cut_box = cq.Workplane("XY").box(15, 40, 50).translate((7.5, 20, 20))
    
    block_section = block.intersect(cut_box)
    fastener_cq = cq.Workplane().newObject([cq.Shape.cast(fastener_shape)])
    fastener_section = fastener_cq.intersect(cut_box)
    
    print("✓ Section cut created")
    
    # Tessellate
    print("\nTessellating...")
    block_tris = tessellate_shape(block.val().wrapped)
    fastener_tris = tessellate_shape(fastener_shape)
    block_sec_tris = tessellate_shape(block_section.val().wrapped)
    fastener_sec_tris = tessellate_shape(fastener_section.val().wrapped)
    print(f"✓ Block: {len(block_tris)} triangles")
    print(f"✓ Fastener: {len(fastener_tris)} triangles")
    
    # Render isometric
    print("\nRendering isometric (alpha=0.25)...")
    fig = plt.figure(figsize=(12, 10))
    ax = fig.add_subplot(111, projection='3d')
    
    block_col = Poly3DCollection(block_tris, alpha=0.25, facecolor='gray', edgecolor='none')
    ax.add_collection3d(block_col)
    
    fastener_col = Poly3DCollection(fastener_tris, alpha=0.9, facecolor='orange', 
                                   edgecolor='darkorange', linewidth=0.5)
    ax.add_collection3d(fastener_col)
    
    ax.set_xlabel('X (mm)')
    ax.set_ylabel('Y (mm)')
    ax.set_zlabel('Z (mm)')
    ax.set_title('ISO 1207 M5×20 in Tilted Hole with Spot Face')
    ax.set_xlim(0, 30)
    ax.set_ylim(0, 30)
    ax.set_zlim(0, 35)
    ax.view_init(elev=25, azim=45)
    
    plt.tight_layout()
    iso_path = '/opt/cursor/artifacts/placement-iso-real.png'
    plt.savefig(iso_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"✓ Saved: {iso_path}")
    
    # Render section
    print("\nRendering section at x=15...")
    fig, ax = plt.subplots(figsize=(10, 10))
    
    # Plot section triangles in YZ plane
    for tri in block_sec_tris:
        yz = [[v[1], v[2]] for v in tri]
        yz.append(yz[0])
        coords = list(zip(*yz))
        ax.fill(coords[0], coords[1], color='gray', alpha=0.5, edgecolor='black', linewidth=0.3)
    
    for tri in fastener_sec_tris:
        yz = [[v[1], v[2]] for v in tri]
        yz.append(yz[0])
        coords = list(zip(*yz))
        ax.fill(coords[0], coords[1], color='orange', alpha=0.9, edgecolor='darkorange', linewidth=0.5)
    
    ax.set_xlabel('Y (mm)')
    ax.set_ylabel('Z (mm)')
    ax.set_title('Cross-Section at X=15 (YZ Plane)')
    ax.set_aspect('equal')
    ax.grid(True, alpha=0.3)
    ax.set_xlim(5, 25)
    ax.set_ylim(8, 35)
    
    plt.tight_layout()
    section_path = '/opt/cursor/artifacts/placement-section-real.png'
    plt.savefig(section_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"✓ Saved: {section_path}")
    
    print()
    print("="*80)
    print("SUMMARY")
    print("="*80)
    print(f"Interference volume: {interference_volume:.6f} mm³")
    print(f"Hole axis check: passes through E={E} with direction d={d}")
    print(f"Artifacts: {iso_path}, {section_path}")

if __name__ == '__main__':
    main()
