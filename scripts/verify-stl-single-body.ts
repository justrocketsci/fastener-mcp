#!/usr/bin/env tsx

/**
 * Verify that each STL file contains exactly one connected solid body
 * rather than multiple separate bodies.
 * 
 * This ensures Onshape and other CAD tools import fasteners as one part.
 */

import fs from 'fs';
import path from 'path';

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Triangle {
  v1: Vector3;
  v2: Vector3;
  v3: Vector3;
}

interface VerificationResult {
  filename: string;
  solidCount: number;
  connectedComponents: number;
  triangleCount: number;
  boundaryEdges: number;
  isValid: boolean;
}

function countSolids(stlContent: string): number {
  const solidPattern = /^solid\s+/gm;
  const matches = stlContent.match(solidPattern);
  return matches ? matches.length : 0;
}

function parseStlTriangles(stlContent: string): Triangle[] {
  const triangles: Triangle[] = [];
  const lines = stlContent.split('\n');
  
  let currentTriangle: Partial<Triangle> = {};
  let vertexIndex = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('vertex ')) {
      const parts = trimmed.split(/\s+/);
      const vertex: Vector3 = {
        x: parseFloat(parts[1]),
        y: parseFloat(parts[2]),
        z: parseFloat(parts[3])
      };
      
      if (vertexIndex === 0) {
        currentTriangle.v1 = vertex;
      } else if (vertexIndex === 1) {
        currentTriangle.v2 = vertex;
      } else if (vertexIndex === 2) {
        currentTriangle.v3 = vertex;
        triangles.push(currentTriangle as Triangle);
        currentTriangle = {};
        vertexIndex = -1;
      }
      vertexIndex++;
    }
  }
  
  return triangles;
}

function vertexKey(v: Vector3): string {
  return `${v.x.toFixed(9)},${v.y.toFixed(9)},${v.z.toFixed(9)}`;
}

function edgeKey(v1: Vector3, v2: Vector3): string {
  const k1 = vertexKey(v1);
  const k2 = vertexKey(v2);
  return k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
}

function countBoundaryEdges(triangles: Triangle[]): number {
  const edgeCount = new Map<string, number>();
  
  triangles.forEach(tri => {
    const edges = [
      [tri.v1, tri.v2],
      [tri.v2, tri.v3],
      [tri.v3, tri.v1]
    ];
    
    edges.forEach(([v1, v2]) => {
      const key = edgeKey(v1, v2);
      edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
    });
  });
  
  let boundaryCount = 0;
  edgeCount.forEach(count => {
    if (count !== 2) {
      boundaryCount++;
    }
  });
  
  return boundaryCount;
}

function countConnectedComponents(triangles: Triangle[]): number {
  if (triangles.length === 0) return 0;
  
  const vertexToTriangles = new Map<string, number[]>();
  
  triangles.forEach((tri, idx) => {
    [tri.v1, tri.v2, tri.v3].forEach(v => {
      const key = vertexKey(v);
      if (!vertexToTriangles.has(key)) {
        vertexToTriangles.set(key, []);
      }
      vertexToTriangles.get(key)!.push(idx);
    });
  });
  
  const triangleGraph = new Map<number, Set<number>>();
  for (let i = 0; i < triangles.length; i++) {
    triangleGraph.set(i, new Set());
  }
  
  triangles.forEach((tri, idx) => {
    [tri.v1, tri.v2, tri.v3].forEach(v => {
      const key = vertexKey(v);
      const neighbors = vertexToTriangles.get(key) || [];
      neighbors.forEach(neighborIdx => {
        if (neighborIdx !== idx) {
          triangleGraph.get(idx)!.add(neighborIdx);
        }
      });
    });
  });
  
  const visited = new Set<number>();
  let componentCount = 0;
  
  function dfs(triIdx: number) {
    if (visited.has(triIdx)) return;
    visited.add(triIdx);
    
    const neighbors = triangleGraph.get(triIdx) || new Set();
    neighbors.forEach(neighbor => dfs(neighbor));
  }
  
  for (let i = 0; i < triangles.length; i++) {
    if (!visited.has(i)) {
      componentCount++;
      dfs(i);
    }
  }
  
  return componentCount;
}

function verifyStlFile(filepath: string): VerificationResult {
  const content = fs.readFileSync(filepath, 'utf-8');
  const solidCount = countSolids(content);
  const triangles = parseStlTriangles(content);
  const connectedComponents = countConnectedComponents(triangles);
  const boundaryEdges = countBoundaryEdges(triangles);
  
  return {
    filename: path.basename(filepath),
    solidCount,
    connectedComponents,
    triangleCount: triangles.length,
    boundaryEdges,
    isValid: solidCount === 1 && connectedComponents === 1 && boundaryEdges === 0
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

  console.log(`Verifying ${stlFiles.length} STL files (checking connected components)...\n`);

  const results: VerificationResult[] = stlFiles.map(verifyStlFile);
  
  const validFiles = results.filter(r => r.isValid);
  const invalidFiles = results.filter(r => !r.isValid);

  console.log(`✓ Valid (single watertight body): ${validFiles.length}`);
  
  if (invalidFiles.length > 0) {
    console.log(`✗ Invalid (not watertight or disconnected): ${invalidFiles.length}\n`);
    console.log('Files with issues:');
    invalidFiles.forEach(r => {
      const issues: string[] = [];
      if (r.solidCount !== 1) {
        issues.push(`${r.solidCount} solid blocks`);
      }
      if (r.connectedComponents !== 1) {
        issues.push(`${r.connectedComponents} connected components`);
      }
      if (r.boundaryEdges > 0) {
        issues.push(`${r.boundaryEdges} boundary edges (not watertight)`);
      }
      console.log(`  - ${r.filename}: ${issues.join(', ')} (${r.triangleCount} triangles)`);
    });
    process.exit(1);
  }

  console.log('\n✓ All STL files are watertight closed manifolds');
  console.log('  - 1 solid block per file');
  console.log('  - 1 connected component (all triangles share vertices)');
  console.log('  - 0 boundary edges (every edge used exactly twice)');
  console.log('  → Onshape will import each fastener as bodyType: solid');
}

main();
