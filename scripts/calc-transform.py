"""
Real geometry proof - Part 1: Calculate transform using Node/TypeScript
Outputs transform matrix to JSON for Python to consume
"""

import subprocess
import json
import sys
from pathlib import Path

def calculate_transform_via_typescript(part_id: str, hole_spec: dict) -> dict:
    """
    Call TypeScript placement recipe code to get transform
    """
    import subprocess
    
    # Call the TypeScript helper script
    cmd = [
        'npx', 'tsx', 'scripts/calc-transform-helper.ts',
        part_id,
        str(hole_spec['axisDirection']['x']),
        str(hole_spec['axisDirection']['y']),
        str(hole_spec['axisDirection']['z']),
        str(hole_spec['entryPoint']['x']),
        str(hole_spec['entryPoint']['y']),
        str(hole_spec['entryPoint']['z'])
    ]
    
    try:
        result = subprocess.run(
            cmd,
            cwd='/workspace',
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode != 0:
            print(f"Error running TypeScript: {result.stderr}")
            return None
        
        # Parse JSON output
        matrix = json.loads(result.stdout.strip())
        return matrix
    except Exception as e:
        print(f"Failed to run TypeScript: {e}")
        return None

if __name__ == '__main__':
    import numpy as np
    
    # Test parameters
    tilt_angle_deg = 35
    tilt_angle_rad = np.radians(tilt_angle_deg)
    hole_axis = [0, float(np.sin(tilt_angle_rad)), float(np.cos(tilt_angle_rad))]
    entry_point = [15.0, 15.0, 15.0]
    
    hole_spec = {
        'axisDirection': {'x': hole_axis[0], 'y': hole_axis[1], 'z': hole_axis[2]},
        'entryPoint': {'x': entry_point[0], 'y': entry_point[1], 'z': entry_point[2]},
        'rotationDegrees': 0
    }
    
    print("Calculating transform via TypeScript...")
    matrix = calculate_transform_via_typescript('iso-1207-m5-20', hole_spec)
    
    if matrix:
        print("✓ Transform calculated:")
        for row in matrix:
            print(f"  {row}")
        
        # Save to file for Python script
        output_path = Path('/workspace/test-artifacts/transform-matrix.json')
        output_path.parent.mkdir(exist_ok=True)
        with open(output_path, 'w') as f:
            json.dump(matrix, f)
        print(f"\n✓ Saved to: {output_path}")
    else:
        print("✗ Failed to calculate transform")
        sys.exit(1)
