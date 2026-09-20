import { NextRequest, NextResponse } from 'next/server';
import fasteners from '@/data/fasteners.json';
import type { Fastener } from '@/lib/types';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const fastener = fasteners.find(f => f.id === id) as Fastener | undefined;

  if (!fastener) {
    return NextResponse.json(
      { error: 'Fastener not found' },
      { status: 404 }
    );
  }

  const modelPath = path.join(process.cwd(), 'public', 'models', `${id}.step`);
  const modelExists = fs.existsSync(modelPath);

  if (!modelExists) {
    return NextResponse.json(
      { 
        error: 'Model not available',
        reason: 'No simplified 3D model for this fastener (may be a nut/washer with length=0)'
      },
      { status: 404 }
    );
  }

  const baseUrl = request.nextUrl.origin;
  const modelUrl = `${baseUrl}/models/${id}.step`;

  return NextResponse.json({
    id: fastener.id,
    designation: fastener.designation,
    dimensions: {
      diameter: fastener.diameter,
      diameter_unit: fastener.diameter > 1 ? 'mm' : 'in',
      length_mm: fastener.length_mm,
      thread: fastener.thread
    },
    model_url: modelUrl,
    format: 'step',
    simplified_not_for_certification: true,
    disclaimer: 'Approximate BREP STEP geometry from Onshape Part Studio for CAD drop-in. NOT certified for engineering analysis or manufacturing. Always consult the controlling specification.',
    citation: fastener.source_kind && fastener.source_kind !== 'distributor_ref' ? {
      standard: fastener.standard,
      revision: fastener.revision,
      source_kind: fastener.source_kind,
      source_ref: fastener.source_ref,
      license: fastener.license,
      source_url: fastener.source_url
    } : undefined
  });
}
