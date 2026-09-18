import { NextRequest, NextResponse } from 'next/server';
import fasteners from '@/data/fasteners.json';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const fastener = fasteners.find(f => f.id === id);

  if (!fastener) {
    return NextResponse.json(
      { error: 'Fastener not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(fastener);
}
