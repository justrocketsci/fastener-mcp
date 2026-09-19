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

function snapZero(value: number): number {
  return Math.abs(value) < 1e-10 ? 0 : value;
}

function makeVertex(x: number, y: number, z: number): Vector3 {
  return {
    x: snapZero(x),
    y: snapZero(y),
    z: snapZero(z)
  };
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

function generateCylinderRim(radius: number, z: number, segments: number): Vector3[] {
  const vertices: Vector3[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    vertices.push(makeVertex(
      radius * Math.cos(angle),
      radius * Math.sin(angle),
      z
    ));
  }
  return vertices;
}

function generateCylinderMesh(radius: number, height: number, zOffset: number, segments: number = 16, includeBottom: boolean = true, includeTop: boolean = true): Triangle[] {
  const triangles: Triangle[] = [];
  const bottomRim = generateCylinderRim(radius, zOffset, segments);
  const topRim = generateCylinderRim(radius, zOffset + height, segments);
  
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    
    triangles.push({
      normal: computeNormal(bottomRim[i], topRim[i], bottomRim[next]),
      v1: bottomRim[i], v2: topRim[i], v3: bottomRim[next]
    });
    triangles.push({
      normal: computeNormal(topRim[i], topRim[next], bottomRim[next]),
      v1: topRim[i], v2: topRim[next], v3: bottomRim[next]
    });
  }
  
  if (includeBottom) {
    const center = makeVertex(0, 0, zOffset);
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      triangles.push({
        normal: { x: 0, y: 0, z: -1 },
        v1: center, v2: bottomRim[next], v3: bottomRim[i]
      });
    }
  }
  
  if (includeTop) {
    const center = makeVertex(0, 0, zOffset + height);
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      triangles.push({
        normal: { x: 0, y: 0, z: 1 },
        v1: center, v2: topRim[i], v3: topRim[next]
      });
    }
  }
  
  return triangles;
}

function generateHexRim(diameter: number, z: number): Vector3[] {
  const radius = diameter / 2;
  const vertices: Vector3[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * 2 * Math.PI;
    vertices.push(makeVertex(
      radius * Math.cos(angle),
      radius * Math.sin(angle),
      z
    ));
  }
  return vertices;
}

function generateHexMesh(diameter: number, height: number, zOffset: number, includeBottom: boolean = true, includeTop: boolean = true): Triangle[] {
  const triangles: Triangle[] = [];
  const bottomRim = generateHexRim(diameter, zOffset);
  const topRim = generateHexRim(diameter, zOffset + height);
  
  for (let i = 0; i < 6; i++) {
    const next = (i + 1) % 6;
    
    triangles.push({
      normal: computeNormal(bottomRim[i], topRim[i], bottomRim[next]),
      v1: bottomRim[i], v2: topRim[i], v3: bottomRim[next]
    });
    triangles.push({
      normal: computeNormal(topRim[i], topRim[next], bottomRim[next]),
      v1: topRim[i], v2: topRim[next], v3: bottomRim[next]
    });
  }
  
  if (includeBottom) {
    const center = makeVertex(0, 0, zOffset);
    for (let i = 0; i < 6; i++) {
      const next = (i + 1) % 6;
      triangles.push({
        normal: { x: 0, y: 0, z: -1 },
        v1: center, v2: bottomRim[next], v3: bottomRim[i]
      });
    }
  }
  
  if (includeTop) {
    const center = makeVertex(0, 0, zOffset + height);
    for (let i = 0; i < 6; i++) {
      const next = (i + 1) % 6;
      triangles.push({
        normal: { x: 0, y: 0, z: 1 },
        v1: center, v2: topRim[i], v3: topRim[next]
      });
    }
  }
  
  return triangles;
}

function generateAnnularPolygonMesh(innerRim: Vector3[], outerRim: Vector3[]): Triangle[] {
  const triangles: Triangle[] = [];
  const innerCount = innerRim.length;
  const outerCount = outerRim.length;
  
  if (innerCount === outerCount) {
    for (let i = 0; i < innerCount; i++) {
      const next = (i + 1) % innerCount;
      triangles.push({
        normal: { x: 0, y: 0, z: -1 },
        v1: outerRim[i], v2: innerRim[i], v3: outerRim[next]
      });
      triangles.push({
        normal: { x: 0, y: 0, z: -1 },
        v1: outerRim[next], v2: innerRim[i], v3: innerRim[next]
      });
    }
  } else {
    let innerIdx = 0;
    let outerIdx = 0;
    
    while (innerIdx < innerCount || outerIdx < outerCount) {
      const innerNext = (innerIdx + 1) % innerCount;
      const outerNext = (outerIdx + 1) % outerCount;
      
      const innerAngle = (innerNext / innerCount) * 2 * Math.PI;
      const outerAngle = (outerNext / outerCount) * 2 * Math.PI;
      
      if (innerIdx < innerCount && (outerIdx >= outerCount || innerAngle <= outerAngle)) {
        triangles.push({
          normal: { x: 0, y: 0, z: -1 },
          v1: innerRim[innerIdx],
          v2: outerRim[outerIdx % outerCount],
          v3: innerRim[innerNext]
        });
        innerIdx++;
      } else if (outerIdx < outerCount) {
        triangles.push({
          normal: { x: 0, y: 0, z: -1 },
          v1: outerRim[outerIdx],
          v2: outerRim[outerNext],
          v3: innerRim[innerIdx % innerCount]
        });
        outerIdx++;
      }
    }
  }
  
  return triangles;
}

function generateWasherMesh(innerRadius: number, outerRadius: number, thickness: number): Triangle[] {
  const triangles: Triangle[] = [];
  const segments = 16;
  
  const innerBottomRim = generateCylinderRim(innerRadius, 0, segments);
  const innerTopRim = generateCylinderRim(innerRadius, thickness, segments);
  const outerBottomRim = generateCylinderRim(outerRadius, 0, segments);
  const outerTopRim = generateCylinderRim(outerRadius, thickness, segments);
  
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    
    triangles.push({
      normal: { x: 0, y: 0, z: -1 },
      v1: outerBottomRim[i], v2: outerBottomRim[next], v3: innerBottomRim[i]
    });
    triangles.push({
      normal: { x: 0, y: 0, z: -1 },
      v1: outerBottomRim[next], v2: innerBottomRim[next], v3: innerBottomRim[i]
    });
    
    triangles.push({
      normal: { x: 0, y: 0, z: 1 },
      v1: outerTopRim[i], v2: innerTopRim[i], v3: outerTopRim[next]
    });
    triangles.push({
      normal: { x: 0, y: 0, z: 1 },
      v1: outerTopRim[next], v2: innerTopRim[i], v3: innerTopRim[next]
    });
    
    triangles.push({
      normal: computeNormal(outerBottomRim[i], outerTopRim[i], outerBottomRim[next]),
      v1: outerBottomRim[i], v2: outerTopRim[i], v3: outerBottomRim[next]
    });
    triangles.push({
      normal: computeNormal(outerTopRim[i], outerTopRim[next], outerBottomRim[next]),
      v1: outerTopRim[i], v2: outerTopRim[next], v3: outerBottomRim[next]
    });
    
    triangles.push({
      normal: computeNormal(innerBottomRim[i], innerBottomRim[next], innerTopRim[i]),
      v1: innerBottomRim[i], v2: innerBottomRim[next], v3: innerTopRim[i]
    });
    triangles.push({
      normal: computeNormal(innerBottomRim[next], innerTopRim[next], innerTopRim[i]),
      v1: innerBottomRim[next], v2: innerTopRim[next], v3: innerTopRim[i]
    });
  }
  
  return triangles;
}

function generateHexBoltStl(fastener: any, dims: FastenerDimensions): string {
  const triangles: Triangle[] = [];
  const segments = 16;
  
  const shaftTopRim = generateCylinderRim(dims.diameter / 2, dims.length, segments);
  const hexBottomRim = generateHexRim(dims.headDiameter, dims.length);
  
  triangles.push(...generateCylinderMesh(dims.diameter / 2, dims.length, 0, segments, true, false));
  triangles.push(...generateAnnularPolygonMesh(shaftTopRim, hexBottomRim));
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
  const segments = 16;
  
  const shaftTopRim = generateCylinderRim(dims.diameter / 2, dims.length, segments);
  const headBottomRim = generateCylinderRim(dims.headDiameter / 2, dims.length, segments);
  
  triangles.push(...generateCylinderMesh(dims.diameter / 2, dims.length, 0, segments, true, false));
  triangles.push(...generateAnnularPolygonMesh(shaftTopRim, headBottomRim));
  triangles.push(...generateCylinderMesh(dims.headDiameter / 2, dims.headHeight, dims.length, segments, false, true));
  
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
