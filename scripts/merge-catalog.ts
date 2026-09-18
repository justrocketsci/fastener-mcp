/**
 * Merge sourced catalog data into final fasteners.json
 * Keeps select legacy AN/MS samples, quarantines unsourced ISO
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateBoltsFasteners } from './import-bolts';
import type { Fastener } from '../lib/types';

const LEGACY_DATA_PATH = path.join(__dirname, '../data/fasteners.json');
const OUTPUT_PATH = path.join(__dirname, '../data/fasteners.json');

function migrateLegacyFastener(legacy: any): Fastener {
  return {
    ...legacy,
    standard: legacy.designation.split(' ')[0] + ' ' + legacy.designation.split(' ')[1],
    revision: 'unknown',
    source_kind: 'distributor_ref',
    source_ref: 'legacy-sample-data',
    license: 'sample-only',
    source_url: undefined,
    notes: `${legacy.notes} (Legacy sample data - source TBD)`
  };
}

function mergeCatalog() {
  const legacyData = JSON.parse(fs.readFileSync(LEGACY_DATA_PATH, 'utf-8'));
  
  const legacyAN = legacyData
    .filter((f: any) => f.family === 'an')
    .map(migrateLegacyFastener);
  
  const legacyMS = legacyData
    .filter((f: any) => f.family === 'ms')
    .map(migrateLegacyFastener);
  
  const boltsFasteners = generateBoltsFasteners();
  
  const merged = [
    ...boltsFasteners,
    ...legacyAN,
    ...legacyMS
  ];
  
  merged.sort((a, b) => {
    if (a.family !== b.family) {
      return a.family.localeCompare(b.family);
    }
    return a.id.localeCompare(b.id);
  });
  
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(merged, null, 2));
  
  console.log(`Merged catalog: ${merged.length} total fasteners`);
  console.log(`  - BOLTS sourced: ${boltsFasteners.length}`);
  console.log(`  - Legacy AN: ${legacyAN.length}`);
  console.log(`  - Legacy MS: ${legacyMS.length}`);
  console.log(`Written to: ${OUTPUT_PATH}`);
}

if (require.main === module) {
  mergeCatalog();
}

export { mergeCatalog };
