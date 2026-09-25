#!/usr/bin/env python3
"""
Test KCL files for syntax validity using kcl-lib parser output
"""

import subprocess
import sys
from pathlib import Path

def check_kcl_syntax(kcl_file: Path) -> dict:
    """
    Check KCL syntax using kcl-lib-bin
    Returns dict with parse_succeeded, warnings, errors
    """
    parser_bin = "/tmp/modeling-app/rust/target/release/kcl-lib-bin"
    
    if not Path(parser_bin).exists():
        return {
            'parser_available': False,
            'error': 'KCL parser binary not found'
        }
    
    try:
        result = subprocess.run(
            [parser_bin, str(kcl_file)],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        # Parser exits with error if execution fails, but that's OK for syntax check
        # We look for "CompilationIssue" or syntax errors in stderr
        output = result.stdout + result.stderr
        
        # Check for syntax errors
        has_syntax_error = 'SyntaxError' in output or 'ParseError' in output
        
        # Check for compilation issues (warnings)
        has_warnings = 'CompilationIssue' in output
        
        # Check for API token error (means it parsed successfully)
        parsed_ok = 'No API token found' in output or result.returncode == 0
        
        return {
            'parser_available': True,
            'parse_succeeded': parsed_ok and not has_syntax_error,
            'has_warnings': has_warnings,
            'has_syntax_errors': has_syntax_error,
            'output': output[:500] if output else None
        }
    except Exception as e:
        return {
            'parser_available': True,
            'error': str(e)
        }

def main():
    print("=" * 80)
    print("KCL SYNTAX VALIDATION")
    print("=" * 80)
    print()
    
    parser_bin = Path("/tmp/modeling-app/rust/target/release/kcl-lib-bin")
    if not parser_bin.exists():
        print("✗ KCL parser binary not found")
        print(f"  Expected at: {parser_bin}")
        print("  Build it first with: cd /tmp/modeling-app/rust/kcl-lib && cargo build --release")
        return 1
    
    print(f"✓ KCL parser found: {parser_bin}")
    print(f"  Version: kcl-lib v0.2.186 from KittyCAD/modeling-app")
    print()
    
    # Files to test
    test_files = [
        Path("/workspace/test-artifacts/test1_axis_aligned.kcl"),
        Path("/workspace/test-artifacts/test2_tilted_45deg.kcl"),
        Path("/workspace/test-artifacts/test3_antiparallel.kcl"),
        Path("/workspace/test-artifacts/test4_complex_with_rotation.kcl"),
    ]
    
    results = []
    for kcl_file in test_files:
        print(f"Testing: {kcl_file.name}")
        print("-" * 60)
        
        if not kcl_file.exists():
            print(f"✗ File not found: {kcl_file}")
            results.append(False)
            print()
            continue
        
        result = check_kcl_syntax(kcl_file)
        
        if not result.get('parser_available'):
            print(f"✗ Parser not available: {result.get('error')}")
            results.append(False)
        elif result.get('error'):
            print(f"✗ Error: {result.get('error')}")
            results.append(False)
        elif result.get('parse_succeeded'):
            print(f"✓ Syntax valid")
            if result.get('has_warnings'):
                print(f"  ⚠  Has warnings (non-fatal)")
            results.append(True)
        else:
            print(f"✗ Syntax errors detected")
            if result.get('output'):
                print(f"  Output: {result['output'][:200]}")
            results.append(False)
        
        print()
    
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    passed = sum(results)
    total = len(results)
    print(f"Files tested: {total}")
    print(f"Syntax valid: {passed}")
    print(f"Syntax errors: {total - passed}")
    print()
    
    if passed == total:
        print("✓ All KCL files have valid syntax")
        return 0
    else:
        print("✗ Some KCL files have syntax errors")
        return 1

if __name__ == '__main__':
    sys.exit(main())
