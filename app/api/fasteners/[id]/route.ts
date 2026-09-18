import { NextRequest, NextResponse } from 'next/server';
import fasteners from '@/data/fasteners.json';
import type { Fastener } from '@/lib/types';

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

  return NextResponse.json({
    ...fastener,
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
