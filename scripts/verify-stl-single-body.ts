#!/usr/bin/env tsx

/**
 * Verify that each STL file contains exactly one solid body
 * rather than multiple separate bodies.
 * 
 * This ensures Onshape and other CAD tools import fasteners as one part.
 */

import fs from 'fs';
import path from 'path';

interface VerificationResult {
  filename: string;
  solidCount: number;
  isValid: boolean;
}

function countSolids(stlContent: string): number {
  const solidPattern = /^solid\s+/gm;
  const matches = stlContent.match(solidPattern);
  return matches ? matches.length : 0;
}

function verifyStlFile(filepath: string): VerificationResult {
  const content = fs.readFileSync(filepath, 'utf-8');
  const solidCount = countSolids(content);
  
  return {
    filename: path.basename(filepath),
    solidCount,
    isValid: solidCount === 1
  };
}

function main() {
  const modelsDir = path.join(process.cwd(), 'public', 'models');
  
  if (!fs.existsSync(modelsDir)) {
    console.error(`Models directory not found: ${modelsDir}`);
    process.exit(1);
  }

  const stlFiles = fs.readdirSync(modelsDir)
    .filter(f => f.endsWith('.stl'))
    .map(f => path.join(modelsDir, f));

  if (stlFiles.length === 0) {
    console.error('No STL files found in models directory');
    process.exit(1);
  }

  console.log(`Verifying ${stlFiles.length} STL files...\n`);

  const results: VerificationResult[] = stlFiles.map(verifyStlFile);
  
  const validFiles = results.filter(r => r.isValid);
  const invalidFiles = results.filter(r => !r.isValid);

  console.log(`✓ Valid (single body): ${validFiles.length}`);
  
  if (invalidFiles.length > 0) {
    console.log(`✗ Invalid (multiple bodies): ${invalidFiles.length}\n`);
    console.log('Files with multiple bodies:');
    invalidFiles.forEach(r => {
      console.log(`  - ${r.filename}: ${r.solidCount} solid blocks`);
    });
    process.exit(1);
  }

  console.log('\n✓ All STL files contain exactly one solid body');
  console.log('  Onshape and other CAD tools will import each fastener as a single part.');
}

main();
