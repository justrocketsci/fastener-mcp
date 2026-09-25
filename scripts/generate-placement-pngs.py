"""
Generate PNG visualizations of the placement
"""

import cadquery as cq
import numpy as np
import json
import subprocess
import sys
from pathlib import Path
from OCP.gp import gp_Trsf
from OCP.BRepBuilderAPI import BRepBuilderAPI_Transform
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
from mpl_toolkits.mplot3d.art3d import Poly3DCollection

def plot_assembly(fastener_wp, block_wp, entry_point, hole_axis, output_path, view_type="isometric"):
    """Create a 3D plot of the assembly"""
    fig = plt.figure(figsize=(12, 10))
    ax = fig.add_subplot(111, projection='3d')
    
    # Get bounding boxes
    fastener_bb = fastener_wp.val().BoundingBox()
    block_bb = block_wp.val().BoundingBox()
    
    # Plot fastener bounding box
    fastener_verts = [
        [fastener_bb.xmin, fastener_bb.ymin, fastener_bb.zmin],
        [fastener_bb.xmax, fastener_bb.ymin, fastener_bb.zmin],
        [fastener_bb.xmax, fastener_bb.ymax, fastener_bb.zmin],
        [fastener_bb.xmin, fastener_bb.ymax, fastener_bb.zmin],
        [fastener_bb.xmin, fastener_bb.ymin, fastener_bb.zmax],
        [fastener_bb.xmax, fastener_bb.ymin, fastener_bb.zmax],
        [fastener_bb.xmax, fastener_bb.ymax, fastener_bb.zmax],
        [fastener_bb.xmin, fastener_bb.ymax, fastener_bb.zmax],
    ]
    
    # Draw fastener wireframe
    fastener_edges = [
        [fastener_verts[0], fastener_verts[1], fastener_verts[2], fastener_verts[3]],
        [fastener_verts[4], fastener_verts[5], fastener_verts[6], fastener_verts[7]],
        [fastener_verts[0], fastener_verts[1], fastener_verts[5], fastener_verts[4]],
        [fastener_verts[2], fastener_verts[3], fastener_verts[7], fastener_verts[6]],
        [fastener_verts[0], fastener_verts[3], fastener_verts[7], fastener_verts[4]],
        [fastener_verts[1], fastener_verts[2], fastener_verts[6], fastener_verts[5]],
    ]
    
    fastener_collection = Poly3DCollection(fastener_edges, alpha=0.7, facecolor='orange', edgecolor='darkorange', linewidth=2)
    ax.add_collection3d(fastener_collection)
    
    # Plot block bounding box
    block_verts = [
        [block_bb.xmin, block_bb.ymin, block_bb.zmin],
        [block_bb.xmax, block_bb.ymin, block_bb.zmin],
        [block_bb.xmax, block_bb.ymax, block_bb.zmin],
        [block_bb.xmin, block_bb.ymax, block_bb.zmin],
        [block_bb.xmin, block_bb.ymin, block_bb.zmax],
        [block_bb.xmax, block_bb.ymin, block_bb.zmax],
        [block_bb.xmax, block_bb.ymax, block_bb.zmax],
        [block_bb.xmin, block_bb.ymax, block_bb.zmax],
    ]
    
    block_edges = [
        [block_verts[0], block_verts[1], block_verts[2], block_verts[3]],
        [block_verts[4], block_verts[5], block_verts[6], block_verts[7]],
        [block_verts[0], block_verts[1], block_verts[5], block_verts[4]],
        [block_verts[2], block_verts[3], block_verts[7], block_verts[6]],
        [block_verts[0], block_verts[3], block_verts[7], block_verts[4]],
        [block_verts[1], block_verts[2], block_verts[6], block_verts[5]],
    ]
    
    block_collection = Poly3DCollection(block_edges, alpha=0.2, facecolor='gray', edgecolor='black', linewidth=1)
    ax.add_collection3d(block_collection)
    
    # Draw hole axis
    axis_start = entry_point
    axis_end = entry_point + hole_axis * 25
    ax.plot3D([axis_start[0], axis_end[0]], 
             [axis_start[1], axis_end[1]], 
             [axis_start[2], axis_end[2]], 
             'r-', linewidth=3, label='Hole axis')
    
    # Draw entry point
    ax.scatter([entry_point[0]], [entry_point[1]], [entry_point[2]], 
              c='red', s=100, marker='o', label='Entry point')
    
    # Set labels and title
    ax.set_xlabel('X (mm)')
    ax.set_ylabel('Y (mm)')
    ax.set_zlabel('Z (mm)')
    ax.set_title(f'{view_type.capitalize()} View - Fastener Placement')
    ax.legend()
    
    # Set equal aspect ratio
    all_coords = np.array(fastener_verts + block_verts)
    max_range = np.ptp(all_coords, axis=0).max() / 2.0
    mid_x = (fastener_bb.xmin + fastener_bb.xmax + block_bb.xmin + block_bb.xmax) / 4
    mid_y = (fastener_bb.ymin + fastener_bb.ymax + block_bb.ymin + block_bb.ymax) / 4
    mid_z = (fastener_bb.zmin + fastener_bb.zmax + block_bb.zmin + block_bb.zmax) / 4
    
    ax.set_xlim(mid_x - max_range, mid_x + max_range)
    ax.set_ylim(mid_y - max_range, mid_y + max_range)
    ax.set_zlim(mid_z - max_range, mid_z + max_range)
    
    # Set view angle
    if view_type == "isometric":
        ax.view_init(elev=30, azim=45)
    elif view_type == "section":
        # View along the hole axis
        ax.view_init(elev=20, azim=90)
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    print(f"✓ Saved: {output_path}")

def main():
    print("="*80)
    print("GENERATING PLACEMENT VISUALIZATION PNGS")
    print("="*80)
    print()
    
    part_id = "iso-1207-m5-20"
    block_size = 30
    entry_point = np.array([15.0, 15.0, 30.0])
    tilt_deg = 35
    tilt_rad = np.radians(tilt_deg)
    hole_axis = np.array([0, np.sin(tilt_rad), -np.cos(tilt_rad)])
    hole_axis = hole_axis / np.linalg.norm(hole_axis)
    
    print(f"Part: {part_id}")
    print(f"Entry point: {entry_point}")
    print(f"Hole axis: {hole_axis}")
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
    
    if result.returncode != 0:
        print(f"✗ Failed: {result.stderr}")
        return 1
    
    matrix_4x4 = json.loads(result.stdout.strip())
    print("✓ Transform generated")
    
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
    fastener_transformed = cq.Workplane().newObject([cq.Shape.cast(transformed_shape)])
    print("✓ Fastener transformed")
    
    # Create test block
    print("Creating test block...")
    block = cq.Workplane("XY").box(block_size, block_size, block_size).translate((15, 15, 15))
    print("✓ Block created")
    
    # Generate PNGs
    print("\nGenerating PNG visualizations...")
    
    output_dir = Path('/workspace/test-artifacts')
    output_dir.mkdir(exist_ok=True)
    
    # Isometric view
    iso_path = output_dir / 'placement-isometric.png'
    plot_assembly(fastener_transformed, block, entry_point, hole_axis, str(iso_path), "isometric")
    
    # Section view
    section_path = output_dir / 'placement-section.png'
    plot_assembly(fastener_transformed, block, entry_point, hole_axis, str(section_path), "section")
    
    print()
    print("="*80)
    print("SUMMARY")
    print("="*80)
    print(f"Generated 2 PNG files:")
    print(f"  1. {iso_path} - Isometric view showing overall placement")
    print(f"  2. {section_path} - Section view along hole axis")
    print()
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
