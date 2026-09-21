import { NextRequest, NextResponse } from 'next/server';
import fasteners from '@/data/fasteners.json';
import type { Fastener } from '@/lib/types';
import { buildPlacementPacket } from '@/lib/placement-packet';

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

  const baseUrl = request.nextUrl.origin;
  const packet = buildPlacementPacket(fastener, baseUrl);

  return NextResponse.json(packet);
}
