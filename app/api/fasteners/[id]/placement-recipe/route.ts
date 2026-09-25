import { NextRequest, NextResponse } from 'next/server';
import fasteners from '@/data/fasteners.json';
import type { Fastener } from '@/lib/types';
import { buildPlacementPacket } from '@/lib/placement-packet';
import { buildPlacementRecipe, type TargetHole } from '@/lib/placement-recipe';

interface PlacementRecipeRequest {
  axisDirection: { x: number; y: number; z: number };
  entryPoint: { x: number; y: number; z: number };
  rotationDegrees?: number;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const body: PlacementRecipeRequest = await request.json();

    // Validate input
    if (!body.axisDirection || !body.entryPoint) {
      return NextResponse.json(
        { error: 'Missing required fields: axisDirection and entryPoint' },
        { status: 400 }
      );
    }

    // Find fastener
    const fastener = fasteners.find(f => f.id === id) as Fastener | undefined;
    if (!fastener) {
      return NextResponse.json(
        { error: 'Fastener not found', id },
        { status: 404 }
      );
    }

    // Build placement packet (needed for frame info)
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'https://fastener-mcp.vercel.app';
    const placementPacket = buildPlacementPacket(fastener, baseUrl);

    // Build target hole specification
    const targetHole: TargetHole = {
      axisDirection: body.axisDirection,
      entryPoint: body.entryPoint,
      rotationDegrees: body.rotationDegrees || 0,
    };

    // Calculate placement recipe
    const recipe = buildPlacementRecipe(placementPacket, targetHole);

    return NextResponse.json(recipe);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
