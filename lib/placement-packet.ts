import type { Fastener } from '@/lib/types';
import fs from 'fs';
import path from 'path';

export interface PlacementPacket {
  schema: 'fastener-mcp.placement.v0';
  id: string;
  part_designation: string;
  standard?: string;
  model: {
    format: 'step';
    url: string;
    available: boolean;
  };
  frame: {
    origin: 'head_bearing_face_center';
    axis: '+Z_along_shank_toward_tip';
    units: 'mm';
    grip_length_mm: number | null;
    head_side: '+Z';
  };
  citations: {
    source_kind?: string;
    source_ref?: string;
    source_url?: string;
    revision?: string;
    license?: string;
    confidence?: string;
  };
  honesty: {
    level: 'L1_insert_at_frame';
    not_certified_mates: true;
    not_fit_critical: true;
    geometry: string;
  };
  adapters: {
    onshape: {
      insert: 'POST /api/adapters/onshape/insert';
      status: 'experimental';
    };
  };
}

/**
 * Build a CAD-agnostic placement packet for a fastener
 * @param fastener - The fastener from the catalog
 * @param baseUrl - The base URL for generating absolute model URLs
 * @returns Placement packet with frame, honesty, and adapter info
 */
export function buildPlacementPacket(
  fastener: Fastener,
  baseUrl: string
): PlacementPacket {
  const modelPath = path.join(process.cwd(), 'public', 'models', `${fastener.id}.step`);
  const modelExists = fs.existsSync(modelPath);
  const modelUrl = `${baseUrl}/models/${fastener.id}.step`;

  // Determine grip length (null for nuts/washers with length_mm=0)
  const gripLength = fastener.length_mm > 0 ? fastener.length_mm : null;

  return {
    schema: 'fastener-mcp.placement.v0',
    id: fastener.id,
    part_designation: fastener.designation,
    standard: fastener.standard,
    model: {
      format: 'step',
      url: modelUrl,
      available: modelExists,
    },
    frame: {
      origin: 'head_bearing_face_center',
      axis: '+Z_along_shank_toward_tip',
      units: 'mm',
      grip_length_mm: gripLength,
      head_side: '+Z',
    },
    citations: {
      source_kind: fastener.source_kind,
      source_ref: fastener.source_ref,
      source_url: fastener.source_url,
      revision: fastener.revision,
      license: fastener.license,
      confidence: fastener.confidence,
    },
    honesty: {
      level: 'L1_insert_at_frame',
      not_certified_mates: true,
      not_fit_critical: true,
      geometry:
        'Approximate BREP STEP from catalog dimensions via CadQuery / OpenCascade (or Onshape export when applicable). NOT certified for engineering analysis or manufacturing.',
    },
    adapters: {
      onshape: {
        insert: 'POST /api/adapters/onshape/insert',
        status: 'experimental',
      },
    },
  };
}
