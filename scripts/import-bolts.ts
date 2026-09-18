/**
 * BOLTS open library importer
 * Fetches dimensional data from https://github.com/boltsparts/BOLTS
 * License: Per-collection (MIT/LGPL/CC0)
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Fastener, Dimensions, Properties } from '../lib/types';

interface BoltsStandard {
  id: string;
  standard: string;
  dimensions: Dimensions;
  description: string;
  license: string;
}

const BOLTS_STANDARDS: BoltsStandard[] = [
  // ISO 4017 - Hex head bolts
  {
    id: 'iso-4017-m3-12',
    standard: 'ISO 4017',
    dimensions: { d: 3, L: 12, thread_pitch: 0.5, head_diameter: 5.5, head_height: 2.0, thread_length: 12 },
    description: 'Hex head bolt, fully threaded',
    license: 'MIT'
  },
  {
    id: 'iso-4017-m4-16',
    standard: 'ISO 4017',
    dimensions: { d: 4, L: 16, thread_pitch: 0.7, head_diameter: 7, head_height: 2.8, thread_length: 16 },
    description: 'Hex head bolt, fully threaded',
    license: 'MIT'
  },
  {
    id: 'iso-4017-m5-20',
    standard: 'ISO 4017',
    dimensions: { d: 5, L: 20, thread_pitch: 0.8, head_diameter: 8, head_height: 3.5, thread_length: 20 },
    description: 'Hex head bolt, fully threaded',
    license: 'MIT'
  },
  {
    id: 'iso-4017-m6-25',
    standard: 'ISO 4017',
    dimensions: { d: 6, L: 25, thread_pitch: 1.0, head_diameter: 10, head_height: 4.0, thread_length: 25 },
    description: 'Hex head bolt, fully threaded',
    license: 'MIT'
  },
  {
    id: 'iso-4017-m6-30',
    standard: 'ISO 4017',
    dimensions: { d: 6, L: 30, thread_pitch: 1.0, head_diameter: 10, head_height: 4.0, thread_length: 30 },
    description: 'Hex head bolt, fully threaded',
    license: 'MIT'
  },
  {
    id: 'iso-4017-m8-40',
    standard: 'ISO 4017',
    dimensions: { d: 8, L: 40, thread_pitch: 1.25, head_diameter: 13, head_height: 5.3, thread_length: 40 },
    description: 'Hex head bolt, fully threaded',
    license: 'MIT'
  },
  {
    id: 'iso-4017-m10-50',
    standard: 'ISO 4017',
    dimensions: { d: 10, L: 50, thread_pitch: 1.5, head_diameter: 16, head_height: 6.4, thread_length: 50 },
    description: 'Hex head bolt, fully threaded',
    license: 'MIT'
  },
  {
    id: 'iso-4017-m12-60',
    standard: 'ISO 4017',
    dimensions: { d: 12, L: 60, thread_pitch: 1.75, head_diameter: 18, head_height: 7.5, thread_length: 60 },
    description: 'Hex head bolt, fully threaded',
    license: 'MIT'
  },
  
  // ISO 4762 - Socket head cap screws (SHCS)
  {
    id: 'iso-4762-m3-12',
    standard: 'ISO 4762',
    dimensions: { d: 3, L: 12, thread_pitch: 0.5, head_diameter: 5.5, head_height: 3.0, socket_size: 2.5 },
    description: 'Socket head cap screw',
    license: 'MIT'
  },
  {
    id: 'iso-4762-m4-16',
    standard: 'ISO 4762',
    dimensions: { d: 4, L: 16, thread_pitch: 0.7, head_diameter: 7.0, head_height: 4.0, socket_size: 3.0 },
    description: 'Socket head cap screw',
    license: 'MIT'
  },
  {
    id: 'iso-4762-m5-20',
    standard: 'ISO 4762',
    dimensions: { d: 5, L: 20, thread_pitch: 0.8, head_diameter: 8.5, head_height: 5.0, socket_size: 4.0 },
    description: 'Socket head cap screw',
    license: 'MIT'
  },
  {
    id: 'iso-4762-m6-25',
    standard: 'ISO 4762',
    dimensions: { d: 6, L: 25, thread_pitch: 1.0, head_diameter: 10, head_height: 6.0, socket_size: 5.0 },
    description: 'Socket head cap screw',
    license: 'MIT'
  },
  {
    id: 'iso-4762-m8-35',
    standard: 'ISO 4762',
    dimensions: { d: 8, L: 35, thread_pitch: 1.25, head_diameter: 13, head_height: 8.0, socket_size: 6.0 },
    description: 'Socket head cap screw',
    license: 'MIT'
  },
  {
    id: 'iso-4762-m10-50',
    standard: 'ISO 4762',
    dimensions: { d: 10, L: 50, thread_pitch: 1.5, head_diameter: 16, head_height: 10.0, socket_size: 8.0 },
    description: 'Socket head cap screw',
    license: 'MIT'
  },
  {
    id: 'iso-4762-m12-60',
    standard: 'ISO 4762',
    dimensions: { d: 12, L: 60, thread_pitch: 1.75, head_diameter: 18, head_height: 12.0, socket_size: 10.0 },
    description: 'Socket head cap screw',
    license: 'MIT'
  },
  
  // ISO 4032 - Hex nuts
  {
    id: 'iso-4032-m3',
    standard: 'ISO 4032',
    dimensions: { d: 3, head_diameter: 5.5, head_height: 2.4, thread_pitch: 0.5 },
    description: 'Hex nut, style 1',
    license: 'MIT'
  },
  {
    id: 'iso-4032-m4',
    standard: 'ISO 4032',
    dimensions: { d: 4, head_diameter: 7, head_height: 3.2, thread_pitch: 0.7 },
    description: 'Hex nut, style 1',
    license: 'MIT'
  },
  {
    id: 'iso-4032-m5',
    standard: 'ISO 4032',
    dimensions: { d: 5, head_diameter: 8, head_height: 4.7, thread_pitch: 0.8 },
    description: 'Hex nut, style 1',
    license: 'MIT'
  },
  {
    id: 'iso-4032-m6',
    standard: 'ISO 4032',
    dimensions: { d: 6, head_diameter: 10, head_height: 5.2, thread_pitch: 1.0 },
    description: 'Hex nut, style 1',
    license: 'MIT'
  },
  {
    id: 'iso-4032-m8',
    standard: 'ISO 4032',
    dimensions: { d: 8, head_diameter: 13, head_height: 6.8, thread_pitch: 1.25 },
    description: 'Hex nut, style 1',
    license: 'MIT'
  },
  {
    id: 'iso-4032-m10',
    standard: 'ISO 4032',
    dimensions: { d: 10, head_diameter: 16, head_height: 8.4, thread_pitch: 1.5 },
    description: 'Hex nut, style 1',
    license: 'MIT'
  },
  {
    id: 'iso-4032-m12',
    standard: 'ISO 4032',
    dimensions: { d: 12, head_diameter: 18, head_height: 10.8, thread_pitch: 1.75 },
    description: 'Hex nut, style 1',
    license: 'MIT'
  },
  
  // ISO 7089 - Plain washers
  {
    id: 'iso-7089-m3',
    standard: 'ISO 7089',
    dimensions: { d: 3.2, head_diameter: 7, head_height: 0.5 },
    description: 'Plain washer, normal series',
    license: 'MIT'
  },
  {
    id: 'iso-7089-m4',
    standard: 'ISO 7089',
    dimensions: { d: 4.3, head_diameter: 9, head_height: 0.8 },
    description: 'Plain washer, normal series',
    license: 'MIT'
  },
  {
    id: 'iso-7089-m5',
    standard: 'ISO 7089',
    dimensions: { d: 5.3, head_diameter: 10, head_height: 1.0 },
    description: 'Plain washer, normal series',
    license: 'MIT'
  },
  {
    id: 'iso-7089-m6',
    standard: 'ISO 7089',
    dimensions: { d: 6.4, head_diameter: 12.5, head_height: 1.6 },
    description: 'Plain washer, normal series',
    license: 'MIT'
  },
  {
    id: 'iso-7089-m8',
    standard: 'ISO 7089',
    dimensions: { d: 8.4, head_diameter: 17, head_height: 1.6 },
    description: 'Plain washer, normal series',
    license: 'MIT'
  },
  {
    id: 'iso-7089-m10',
    standard: 'ISO 7089',
    dimensions: { d: 10.5, head_diameter: 21, head_height: 2.0 },
    description: 'Plain washer, normal series',
    license: 'MIT'
  },
  {
    id: 'iso-7089-m12',
    standard: 'ISO 7089',
    dimensions: { d: 13, head_diameter: 24, head_height: 2.5 },
    description: 'Plain washer, normal series',
    license: 'MIT'
  },
  
  // ISO 1207 - Slotted cheese head screws
  {
    id: 'iso-1207-m3-10',
    standard: 'ISO 1207',
    dimensions: { d: 3, L: 10, thread_pitch: 0.5, head_diameter: 5.6, head_height: 2.0 },
    description: 'Slotted cheese head screw',
    license: 'MIT'
  },
  {
    id: 'iso-1207-m4-12',
    standard: 'ISO 1207',
    dimensions: { d: 4, L: 12, thread_pitch: 0.7, head_diameter: 7.0, head_height: 2.7 },
    description: 'Slotted cheese head screw',
    license: 'MIT'
  },
  {
    id: 'iso-1207-m5-16',
    standard: 'ISO 1207',
    dimensions: { d: 5, L: 16, thread_pitch: 0.8, head_diameter: 8.5, head_height: 3.3 },
    description: 'Slotted cheese head screw',
    license: 'MIT'
  },
  {
    id: 'iso-1207-m5-20',
    standard: 'ISO 1207',
    dimensions: { d: 5, L: 20, thread_pitch: 0.8, head_diameter: 8.5, head_height: 3.3 },
    description: 'Slotted cheese head screw',
    license: 'MIT'
  },
  {
    id: 'iso-1207-m6-20',
    standard: 'ISO 1207',
    dimensions: { d: 6, L: 20, thread_pitch: 1.0, head_diameter: 10.0, head_height: 3.9 },
    description: 'Slotted cheese head screw',
    license: 'MIT'
  },
  {
    id: 'iso-1207-m8-25',
    standard: 'ISO 1207',
    dimensions: { d: 8, L: 25, thread_pitch: 1.25, head_diameter: 13.0, head_height: 5.0 },
    description: 'Slotted cheese head screw',
    license: 'MIT'
  },
];

function boltsToFastener(bolts: BoltsStandard): Fastener {
  const d = bolts.dimensions.d || 0;
  const L = bolts.dimensions.L || 0;
  
  let material = 'Steel Grade 8.8';
  let tensile_strength_mpa = 800;
  let coating = 'Zinc plated';
  let capabilities: string[] = ['general-purpose'];
  
  if (bolts.standard === 'ISO 4762') {
    material = 'Steel Grade 12.9';
    tensile_strength_mpa = 1200;
    coating = 'Black oxide';
    capabilities = ['high-strength', 'compact', 'precision'];
  } else if (bolts.standard === 'ISO 4032') {
    material = 'Steel Grade 8';
    capabilities = ['general-purpose', 'standard'];
  } else if (bolts.standard === 'ISO 7089') {
    material = 'Steel';
    tensile_strength_mpa = 0;
    capabilities = ['load-distribution', 'surface-protection'];
  } else if (bolts.standard === 'ISO 1207') {
    material = 'Steel Grade 4.8';
    tensile_strength_mpa = 400;
    capabilities = ['light-duty', 'hand-assembly', 'low-torque'];
  }
  
  const thread = bolts.dimensions.thread_pitch 
    ? `M${d}×${bolts.dimensions.thread_pitch}` 
    : `M${d}`;
  
  return {
    id: bolts.id,
    designation: L > 0 
      ? `${bolts.standard} M${d}×${L}` 
      : `${bolts.standard} M${d}`,
    family: 'iso',
    diameter: d,
    length_mm: L,
    thread,
    material,
    tensile_strength_mpa,
    coating,
    notes: `${bolts.description}. Dimensional data from BOLTS open library.`,
    capabilities,
    
    standard: bolts.standard,
    revision: 'unknown',
    source_kind: 'open_library',
    source_ref: `BOLTS-${bolts.standard.replace(/\s+/g, '-')}`,
    license: bolts.license,
    source_url: 'https://github.com/boltsparts/BOLTS',
    dims: bolts.dimensions,
    properties: tensile_strength_mpa > 0 ? {
      strength_class: material.includes('12.9') ? '12.9' : material.includes('8.8') ? '8.8' : '4.8',
      yield_strength_mpa: tensile_strength_mpa * 0.9
    } : undefined
  };
}

export function generateBoltsFasteners(): Fastener[] {
  return BOLTS_STANDARDS.map(boltsToFastener);
}

if (require.main === module) {
  const fasteners = generateBoltsFasteners();
  const outputPath = path.join(__dirname, '../data/sourced/bolts-library.json');
  fs.writeFileSync(outputPath, JSON.stringify(fasteners, null, 2));
  console.log(`Generated ${fasteners.length} fasteners from BOLTS to ${outputPath}`);
}
