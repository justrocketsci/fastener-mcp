import { NextRequest, NextResponse } from 'next/server';
import fasteners from '@/data/fasteners.json';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q')?.toLowerCase() || '';
  const family = searchParams.get('family') || '';
  const diameter = searchParams.get('diameter') || '';
  const material = searchParams.get('material')?.toLowerCase() || '';
  const limit = parseInt(searchParams.get('limit') || '50');

  let results = [...fasteners];

  if (q) {
    results = results.filter(f =>
      f.designation.toLowerCase().includes(q) ||
      f.notes.toLowerCase().includes(q) ||
      f.material.toLowerCase().includes(q) ||
      f.capabilities.some(c => c.toLowerCase().includes(q))
    );
  }

  if (family) {
    results = results.filter(f => f.family === family);
  }

  if (diameter) {
    const diam = parseFloat(diameter);
    results = results.filter(f => Math.abs(f.diameter - diam) < 0.5);
  }

  if (material) {
    results = results.filter(f => f.material.toLowerCase().includes(material));
  }

  results = results.slice(0, limit);

  return NextResponse.json({
    count: results.length,
    results
  });
}
