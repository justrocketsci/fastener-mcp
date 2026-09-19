#!/usr/bin/env tsx

/**
 * Generate simplified ASCII STL meshes for fasteners
 * 
 * Creates basic cylindrical mesh approximations from catalog dimensions.
 * NOT FOR CERTIFICATION - Educational/visualization only.
 */

import fs from 'fs';
import path from 'path';
import fasteners from '../data/fasteners.json';

interface FastenerDimensions {
  diameter: number;
  length: number;
  headDiameter: number;
  headHeight: number;
  socketSize: number;
  threadPitch: number;
}

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Triangle {
  normal: Vector3;
  v1: Vector3;
  v2: Vector3;
  v3: Vector3;
}

function getDimensionsForFamily(fastener: any): FastenerDimensions | null {
  const diameter = fastener.diameter;
  const length = fastener.length_mm;

  if (length === 0) {
    return null;
  }

  const dims = fastener.dims || {};
  
  const headDiameter = dims.head_diameter || 
    (fastener.family === 'iso' ? diameter * 1.5 : 
     fastener.family === 'nas' ? diameter * 1.4 :
     diameter * 1.5);
  
  const headHeight = dims.head_height || 
    (fastener.family === 'iso' ? diameter * 0.7 : 
     fastener.family === 'nas' ? diameter :
     diameter * 0.65);

  const socketSize = dims.socket_size || (diameter * 0.75);

  return {
    diameter,
    length,
    headDiameter,
    headHeight,
    socketSize,
    threadPitch: dims.thread_pitch || 1.0
  };
}

function generateStlHeader(name: string): string {
  return `solid ${name}\n`;
}

function generateStlFooter(name: string): string {
  return `endsolid ${name}\n`;
}

function triangleToStl(triangle: Triangle): string {
  const { normal, v1, v2, v3 } = triangle;
  return `  facet normal ${normal.x.toExponential(6)} ${normal.y.toExponential(6)} ${normal.z.toExponential(6)}
    outer loop
      vertex ${v1.x.toExponential(6)} ${v1.y.toExponential(6)} ${v1.z.toExponential(6)}
      vertex ${v2.x.toExponential(6)} ${v2.y.toExponential(6)} ${v2.z.toExponential(6)}
      vertex ${v3.x.toExponential(6)} ${v3.y.toExponential(6)} ${v3.z.toExponential(6)}
    endloop
  endfacet\n`;
}

function computeNormal(v1: Vector3, v2: Vector3, v3: Vector3): Vector3 {
  const u = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
  const v = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z };
  
  const nx = u.y * v.z - u.z * v.y;
  const ny = u.z * v.x - u.x * v.z;
  const nz = u.x * v.y - u.y * v.x;
  
  const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (length < 1e-10) {
    return { x: 0, y: 0, z: 1 };
  }
  
  return { x: nx / length, y: ny / length, z: nz / length };
}

function generateCylinderMesh(radius: number, height: number, zOffset: number, segments: number = 16, includeBottom: boolean = true, includeTop: boolean = true): Triangle[] {
  const triangles: Triangle[] = [];
  
  for (let i = 0; i < segments; i++) {
    const angle1 = (i / segments) * 2 * Math.PI;
    const angle2 = ((i + 1) / segments) * 2 * Math.PI;
    
    const x1 = radius * Math.cos(angle1);
    const y1 = radius * Math.sin(angle1);
    const x2 = radius * Math.cos(angle2);
    const y2 = radius * Math.sin(angle2);
    
    const bottom1: Vector3 = { x: x1, y: y1, z: zOffset };
    const bottom2: Vector3 = { x: x2, y: y2, z: zOffset };
    const top1: Vector3 = { x: x1, y: y1, z: zOffset + height };
    const top2: Vector3 = { x: x2, y: y2, z: zOffset + height };
    
    triangles.push({
      normal: computeNormal(bottom1, top1, bottom2),
      v1: bottom1, v2: top1, v3: bottom2
    });
    triangles.push({
      normal: computeNormal(top1, top2, bottom2),
      v1: top1, v2: top2, v3: bottom2
    });
    
    if (includeBottom) {
      const center: Vector3 = { x: 0, y: 0, z: zOffset };
      triangles.push({
        normal: { x: 0, y: 0, z: -1 },
        v1: center, v2: bottom2, v3: bottom1
      });
    }
    
    if (includeTop) {
      const topCenter: Vector3 = { x: 0, y: 0, z: zOffset + height };
      triangles.push({
        normal: { x: 0, y: 0, z: 1 },
        v1: topCenter, v2: top1, v3: top2
      });
    }
  }
  
  return triangles;
}

function generateHexMesh(diameter: number, height: number, zOffset: number, includeBottom: boolean = true, includeTop: boolean = true): Triangle[] {
  const triangles: Triangle[] = [];
  const radius = diameter / 2;
  const segments = 6;
  
  for (let i = 0; i < segments; i++) {
    const angle1 = (i / segments) * 2 * Math.PI;
    const angle2 = ((i + 1) / segments) * 2 * Math.PI;
    
    const x1 = radius * Math.cos(angle1);
    const y1 = radius * Math.sin(angle1);
    const x2 = radius * Math.cos(angle2);
    const y2 = radius * Math.sin(angle2);
    
    const bottom1: Vector3 = { x: x1, y: y1, z: zOffset };
    const bottom2: Vector3 = { x: x2, y: y2, z: zOffset };
    const top1: Vector3 = { x: x1, y: y1, z: zOffset + height };
    const top2: Vector3 = { x: x2, y: y2, z: zOffset + height };
    
    triangles.push({
      normal: computeNormal(bottom1, top1, bottom2),
      v1: bottom1, v2: top1, v3: bottom2
    });
    triangles.push({
      normal: computeNormal(top1, top2, bottom2),
      v1: top1, v2: top2, v3: bottom2
    });
    
    if (includeBottom) {
      const center: Vector3 = { x: 0, y: 0, z: zOffset };
      triangles.push({
        normal: { x: 0, y: 0, z: -1 },
        v1: center, v2: bottom2, v3: bottom1
      });
    }
    
    if (includeTop) {
      const topCenter: Vector3 = { x: 0, y: 0, z: zOffset + height };
      triangles.push({
        normal: { x: 0, y: 0, z: 1 },
        v1: topCenter, v2: top1, v3: top2
      });
    }
  }
  
  return triangles;
}

function generateAnnulusMesh(innerRadius: number, outerRadius: number, z: number, segments: number = 16): Triangle[] {
  const triangles: Triangle[] = [];
  
  for (let i = 0; i < segments; i++) {
    const angle1 = (i / segments) * 2 * Math.PI;
    const angle2 = ((i + 1) / segments) * 2 * Math.PI;
    
    const innerX1 = innerRadius * Math.cos(angle1);
    const innerY1 = innerRadius * Math.sin(angle1);
    const innerX2 = innerRadius * Math.cos(angle2);
    const innerY2 = innerRadius * Math.sin(angle2);
    
    const outerX1 = outerRadius * Math.cos(angle1);
    const outerY1 = outerRadius * Math.sin(angle1);
    const outerX2 = outerRadius * Math.cos(angle2);
    const outerY2 = outerRadius * Math.sin(angle2);
    
    const inner1: Vector3 = { x: innerX1, y: innerY1, z };
    const inner2: Vector3 = { x: innerX2, y: innerY2, z };
    const outer1: Vector3 = { x: outerX1, y: outerY1, z };
    const outer2: Vector3 = { x: outerX2, y: outerY2, z };
    
    triangles.push({
      normal: { x: 0, y: 0, z: -1 },
      v1: outer1, v2: inner1, v3: outer2
    });
    triangles.push({
      normal: { x: 0, y: 0, z: -1 },
      v1: outer2, v2: inner1, v3: inner2
    });
  }
  
  return triangles;
}

function generateWasherMesh(innerRadius: number, outerRadius: number, thickness: number): Triangle[] {
  const triangles: Triangle[] = [];
  const segments = 16;
  
  for (let i = 0; i < segments; i++) {
    const angle1 = (i / segments) * 2 * Math.PI;
    const angle2 = ((i + 1) / segments) * 2 * Math.PI;
    
    const innerX1 = innerRadius * Math.cos(angle1);
    const innerY1 = innerRadius * Math.sin(angle1);
    const innerX2 = innerRadius * Math.cos(angle2);
    const innerY2 = innerRadius * Math.sin(angle2);
    
    const outerX1 = outerRadius * Math.cos(angle1);
    const outerY1 = outerRadius * Math.sin(angle1);
    const outerX2 = outerRadius * Math.cos(angle2);
    const outerY2 = outerRadius * Math.sin(angle2);
    
    const bottomInner1: Vector3 = { x: innerX1, y: innerY1, z: 0 };
    const bottomInner2: Vector3 = { x: innerX2, y: innerY2, z: 0 };
    const topInner1: Vector3 = { x: innerX1, y: innerY1, z: thickness };
    const topInner2: Vector3 = { x: innerX2, y: innerY2, z: thickness };
    
    const bottomOuter1: Vector3 = { x: outerX1, y: outerY1, z: 0 };
    const bottomOuter2: Vector3 = { x: outerX2, y: outerY2, z: 0 };
    const topOuter1: Vector3 = { x: outerX1, y: outerY1, z: thickness };
    const topOuter2: Vector3 = { x: outerX2, y: outerY2, z: thickness };
    
    triangles.push({
      normal: { x: 0, y: 0, z: -1 },
      v1: bottomOuter1, v2: bottomOuter2, v3: bottomInner1
    });
    triangles.push({
      normal: { x: 0, y: 0, z: -1 },
      v1: bottomOuter2, v2: bottomInner2, v3: bottomInner1
    });
    
    triangles.push({
      normal: { x: 0, y: 0, z: 1 },
      v1: topOuter1, v2: topInner1, v3: topOuter2
    });
    triangles.push({
      normal: { x: 0, y: 0, z: 1 },
      v1: topOuter2, v2: topInner1, v3: topInner2
    });
    
    triangles.push({
      normal: computeNormal(bottomOuter1, topOuter1, bottomOuter2),
      v1: bottomOuter1, v2: topOuter1, v3: bottomOuter2
    });
    triangles.push({
      normal: computeNormal(topOuter1, topOuter2, bottomOuter2),
      v1: topOuter1, v2: topOuter2, v3: bottomOuter2
    });
    
    triangles.push({
      normal: computeNormal(bottomInner1, bottomInner2, topInner1),
      v1: bottomInner1, v2: bottomInner2, v3: topInner1
    });
    triangles.push({
      normal: computeNormal(bottomInner2, topInner2, topInner1),
      v1: bottomInner2, v2: topInner2, v3: topInner1
    });
  }
  
  return triangles;
}

function generateHexBoltStl(fastener: any, dims: FastenerDimensions): string {
  const triangles: Triangle[] = [];
  
  triangles.push(...generateCylinderMesh(dims.diameter / 2, dims.length, 0, 16, true, false));
  triangles.push(...generateAnnulusMesh(dims.diameter / 2, dims.headDiameter / 2, dims.length, 16));
  triangles.push(...generateHexMesh(dims.headDiameter, dims.headHeight, dims.length, false, true));
  
  let stl = generateStlHeader(fastener.id);
  for (const triangle of triangles) {
    stl += triangleToStl(triangle);
  }
  stl += generateStlFooter(fastener.id);
  
  return stl;
}

function generateSocketCapScrewStl(fastener: any, dims: FastenerDimensions): string {
  const triangles: Triangle[] = [];
  
  triangles.push(...generateCylinderMesh(dims.diameter / 2, dims.length, 0, 16, true, false));
  triangles.push(...generateAnnulusMesh(dims.diameter / 2, dims.headDiameter / 2, dims.length, 16));
  triangles.push(...generateCylinderMesh(dims.headDiameter / 2, dims.headHeight, dims.length, 16, false, true));
  
  let stl = generateStlHeader(fastener.id);
  for (const triangle of triangles) {
    stl += triangleToStl(triangle);
  }
  stl += generateStlFooter(fastener.id);
  
  return stl;
}

function generateNutStl(fastener: any, dims: FastenerDimensions): string {
  const nutHeight = dims.headHeight || dims.diameter * 0.8;
  const acrossFlats = dims.headDiameter || dims.diameter * 1.5;
  
  const triangles: Triangle[] = [];
  triangles.push(...generateWasherMesh(dims.diameter / 2, acrossFlats / 2, nutHeight));
  
  let stl = generateStlHeader(fastener.id);
  for (const triangle of triangles) {
    stl += triangleToStl(triangle);
  }
  stl += generateStlFooter(fastener.id);
  
  return stl;
}

function generateWasherStl(fastener: any, dims: FastenerDimensions): string {
  const outerDiameter = dims.headDiameter || dims.diameter * 2.5;
  const thickness = dims.headHeight || dims.diameter * 0.15;
  const innerDiameter = dims.diameter * 1.1;
  
  const triangles: Triangle[] = [];
  triangles.push(...generateWasherMesh(innerDiameter / 2, outerDiameter / 2, thickness));
  
  let stl = generateStlHeader(fastener.id);
  for (const triangle of triangles) {
    stl += triangleToStl(triangle);
  }
  stl += generateStlFooter(fastener.id);
  
  return stl;
}

function generateStlModel(fastener: any): string | null {
  const dims = getDimensionsForFamily(fastener);
  
  if (!dims) {
    return null;
  }

  const designation = fastener.designation.toLowerCase();
  const notes = fastener.notes.toLowerCase();

  if (designation.includes('nut') || notes.includes('nut')) {
    return generateNutStl(fastener, dims);
  }
  
  if (designation.includes('washer') || notes.includes('washer')) {
    return generateWasherStl(fastener, dims);
  }

  if (designation.includes('socket') || designation.includes('shcs') || 
      notes.includes('socket') || fastener.family === 'nas') {
    return generateSocketCapScrewStl(fastener, dims);
  }

  return generateHexBoltStl(fastener, dims);
}

function main() {
  const modelsDir = path.join(process.cwd(), 'public', 'models');
  
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
  }

  let generatedCount = 0;
  let skippedCount = 0;

  for (const fastener of fasteners) {
    const stlContent = generateStlModel(fastener);
    
    if (!stlContent) {
      skippedCount++;
      continue;
    }

    const filename = `${fastener.id}.stl`;
    const filepath = path.join(modelsDir, filename);
    
    fs.writeFileSync(filepath, stlContent, 'utf-8');
    generatedCount++;
    
    if (generatedCount % 10 === 0) {
      console.log(`Generated ${generatedCount} models...`);
    }
  }

  console.log(`\nDone! Generated ${generatedCount} ASCII STL models, skipped ${skippedCount}`);
  console.log(`Models saved to: ${modelsDir}`);
}

main();
