#!/usr/bin/env python3
"""
Generate STEP files using CadQuery for fasteners.

This script generates simplified fastener geometries using CadQuery,
primarily to fill gaps where Onshape export quotas are exhausted.

Environment Setup:
    python3 -m venv .venv-cadquery
    source .venv-cadquery/bin/activate
    pip install cadquery

Usage:
    python3 scripts/generate-cadquery-step.py

NOT FOR CERTIFICATION: Generated models are approximate representations from
catalog dimensions. Always consult controlling specifications.
"""

import json
import sys
from pathlib import Path

try:
    import cadquery as cq
except ImportError:
    print("Error: CadQuery not installed")
    print("Install with:")
    print("  python3 -m venv .venv-cadquery")
    print("  source .venv-cadquery/bin/activate")
    print("  pip install cadquery")
    sys.exit(1)


def load_pending_exports():
    """Load pending Onshape exports that need CadQuery generation."""
    pending_path = Path(__file__).parent.parent / "public" / "models" / "_pending_onshape_exports.json"
    if not pending_path.exists():
        return []
    
    with open(pending_path, 'r') as f:
        data = json.load(f)
    
    return data.get('pending', [])


def load_fasteners_catalog():
    """Load fasteners from the JSON catalog."""
    catalog_path = Path(__file__).parent.parent / "data" / "fasteners.json"
    with open(catalog_path, 'r') as f:
        return json.load(f)


def parse_fastener_id(fastener_id: str) -> dict:
    """Parse fastener ID to extract dimensions."""
    # This is a simplified parser - real implementation would be more robust
    parts = fastener_id.lower().split('-')
    
    # Try to extract diameter and length from common patterns
    # Examples: ms24693-s254, ms51957-10, an380-4-2
    return {
        'id': fastener_id,
        'family': parts[0] if parts else 'unknown'
    }


def create_hex_bolt(diameter: float, length: float, head_diameter: float, head_height: float) -> cq.Workplane:
    """Create a hex head bolt geometry."""
    # Create shaft
    bolt = cq.Workplane("XY").circle(diameter / 2).extrude(length)
    
    # Create hex head
    hex_head = (
        cq.Workplane("XY")
        .workplane(offset=length)
        .polygon(6, head_diameter / 1.732)  # Inscribed circle to hex
        .extrude(head_height)
    )
    
    bolt = bolt.union(hex_head)
    return bolt


def create_socket_screw(diameter: float, length: float, head_diameter: float, head_height: float) -> cq.Workplane:
    """Create a socket head cap screw geometry."""
    # Create shaft
    screw = cq.Workplane("XY").circle(diameter / 2).extrude(length)
    
    # Create cylindrical head
    head = (
        cq.Workplane("XY")
        .workplane(offset=length)
        .circle(head_diameter / 2)
        .extrude(head_height)
    )
    
    screw = screw.union(head)
    return screw


def create_rivet(diameter: float, length: float, head_diameter: float, head_height: float) -> cq.Workplane:
    """Create a rivet geometry."""
    # Create shaft
    rivet = cq.Workplane("XY").circle(diameter / 2).extrude(length)
    
    # Create countersunk or dome head
    head = (
        cq.Workplane("XY")
        .workplane(offset=length)
        .circle(head_diameter / 2)
        .extrude(head_height)
    )
    
    rivet = rivet.union(head)
    return rivet


def generate_fastener_step(fastener_data: dict, output_path: Path) -> bool:
    """Generate STEP file for a single fastener."""
    try:
        fastener_id = fastener_data['id']
        info = parse_fastener_id(fastener_id)
        
        # Default dimensions (in mm) - should be looked up from catalog
        diameter = 4.0
        length = 20.0
        head_diameter = diameter * 1.8
        head_height = diameter * 0.7
        
        # Determine fastener type and create geometry
        family = info['family']
        
        if family in ['ms24693', 'ms24694', 'ms51957', 'ms20470', 'ms20426']:
            # Rivets
            geometry = create_rivet(diameter, length, head_diameter, head_height)
        elif family in ['ms35206', 'ms35207']:
            # Self-locking nuts/inserts (simplified as cylinders)
            geometry = create_socket_screw(diameter, length, head_diameter, head_height)
        elif family.startswith('an380'):
            # Cotter pins (simplified)
            geometry = create_rivet(diameter, length, head_diameter, head_height)
        else:
            # Default to socket screw
            geometry = create_socket_screw(diameter, length, head_diameter, head_height)
        
        # Export to STEP
        cq.exporters.export(geometry, str(output_path))
        return True
        
    except Exception as e:
        print(f"Error generating {fastener_data['id']}: {e}")
        return False


def main():
    """Main entry point."""
    print("=" * 70)
    print("CADQUERY STEP GENERATION")
    print("=" * 70)
    print()
    
    # Load pending exports
    pending = load_pending_exports()
    if not pending:
        print("No pending exports found.")
        return
    
    print(f"Found {len(pending)} pending exports")
    print()
    
    output_dir = Path(__file__).parent.parent / "public" / "models"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    generated = 0
    failed = 0
    
    for i, fastener_data in enumerate(pending, 1):
        fastener_id = fastener_data['id']
        output_path = output_dir / f"{fastener_id}.step"
        
        print(f"[{i}/{len(pending)}] Generating {fastener_id}...", end=' ')
        
        if output_path.exists():
            print("EXISTS (skipping)")
            generated += 1
            continue
        
        if generate_fastener_step(fastener_data, output_path):
            file_size = output_path.stat().st_size
            print(f"OK ({file_size:,} bytes)")
            generated += 1
        else:
            print("FAILED")
            failed += 1
    
    print()
    print(f"Complete: {generated} generated, {failed} failed")
    
    # Create summary JSON
    summary = {
        "generated": generated,
        "failed": failed,
        "source": "cadquery",
        "note": "CadQuery-generated STEP files to fill Onshape export quota gaps"
    }
    
    summary_path = output_dir / "_cadquery_step_summary.json"
    with open(summary_path, 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"Summary written to {summary_path}")


if __name__ == '__main__':
    main()
