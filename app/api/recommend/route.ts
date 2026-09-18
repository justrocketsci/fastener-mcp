import { NextRequest, NextResponse } from 'next/server';
import fasteners from '@/data/fasteners.json';

interface RecommendRequest {
  diameter?: number;
  length?: number;
  material?: string;
  load_n?: number;
  environment?: string;
}

interface ScoredFastener {
  fastener: typeof fasteners[0];
  score: number;
  reasons: string[];
}

export async function POST(request: NextRequest) {
  const body: RecommendRequest = await request.json();
  const { diameter, length, material, load_n, environment } = body;

  const scored: ScoredFastener[] = fasteners.map(fastener => {
    let score = 0;
    const reasons: string[] = [];

    if (diameter !== undefined) {
      const diamDiff = Math.abs(fastener.diameter - diameter);
      if (diamDiff < 1) {
        score += 50;
        reasons.push('Diameter matches requirement');
      } else if (diamDiff < 2) {
        score += 30;
        reasons.push('Diameter close to requirement');
      }
    }

    if (length !== undefined && fastener.length_mm > 0) {
      const lengthDiff = Math.abs(fastener.length_mm - length);
      if (lengthDiff < 5) {
        score += 40;
        reasons.push('Length matches requirement');
      } else if (lengthDiff < 10) {
        score += 20;
        reasons.push('Length acceptable');
      }
    }

    if (material) {
      const matLower = material.toLowerCase();
      const fastMatLower = fastener.material.toLowerCase();
      if (fastMatLower.includes(matLower) || matLower.includes('steel') && fastMatLower.includes('steel')) {
        score += 30;
        reasons.push('Material matches requirement');
      }
      if (matLower.includes('stainless') && fastMatLower.includes('stainless')) {
        score += 20;
        reasons.push('Corrosion-resistant material');
      }
    }

    if (load_n !== undefined && fastener.tensile_strength_mpa > 0) {
      const area_mm2 = Math.PI * Math.pow(fastener.diameter / 2, 2);
      const capacity_n = fastener.tensile_strength_mpa * area_mm2;
      if (capacity_n > load_n * 1.5) {
        score += 40;
        reasons.push(`High strength capacity (${Math.round(capacity_n)}N vs required ${load_n}N)`);
      } else if (capacity_n > load_n) {
        score += 20;
        reasons.push('Adequate strength for load');
      }
    }

    if (environment) {
      const envLower = environment.toLowerCase();
      if ((envLower.includes('outdoor') || envLower.includes('marine') || envLower.includes('corrosive')) &&
          fastener.capabilities.some(c => c.includes('corrosion-resistant') || c.includes('marine'))) {
        score += 35;
        reasons.push('Suitable for harsh environment');
      }
      if (envLower.includes('aerospace') && fastener.family === 'an' || fastener.family === 'ms') {
        score += 50;
        reasons.push('Aerospace-grade specification');
      }
    }

    if (fastener.capabilities.includes('high-strength')) {
      score += 10;
    }

    return { fastener, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score);
  const recommendations = scored.slice(0, 10).filter(s => s.score > 0);

  return NextResponse.json({
    count: recommendations.length,
    recommendations: recommendations.map(r => ({
      ...r.fastener,
      match_score: r.score,
      reasons: r.reasons
    }))
  });
}
