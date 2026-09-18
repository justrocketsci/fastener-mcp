import { NextRequest, NextResponse } from 'next/server';
import fasteners from '@/data/fasteners.json';
import type { Fastener } from '@/lib/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q')?.toLowerCase() || '';
  const family = searchParams.get('family') || '';
  const diameter = searchParams.get('diameter') || '';
  const material = searchParams.get('material')?.toLowerCase() || '';
  const standard = searchParams.get('standard')?.toLowerCase() || '';
  const source_kind = searchParams.get('source_kind') || '';
  const limit = parseInt(searchParams.get('limit') || '50');

  let results = [...fasteners] as Fastener[];

  if (q) {
    results = results.filter(f =>
      f.designation.toLowerCase().includes(q) ||
      f.notes.toLowerCase().includes(q) ||
      f.material.toLowerCase().includes(q) ||
      f.capabilities.some(c => c.toLowerCase().includes(q)) ||
      (f.standard && f.standard.toLowerCase().includes(q))
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

  if (standard) {
    results = results.filter(f => f.standard && f.standard.toLowerCase().includes(standard));
  }

  if (source_kind) {
    results = results.filter(f => f.source_kind === source_kind);
  }

  results = results.slice(0, limit);

  return NextResponse.json({
    count: results.length,
    results: results.map(r => ({
      ...r,
      citation: r.source_kind && r.source_kind !== 'distributor_ref' ? {
        standard: r.standard,
        revision: r.revision,
        source_kind: r.source_kind,
        source_ref: r.source_ref,
        license: r.license,
        source_url: r.source_url
      } : undefined
    }))
  });
}
