export type SourceKind = 'open_library' | 'gov_spec' | 'purchased_std' | 'distributor_ref';
export type License = 'CC0' | 'MIT' | 'LGPL-2.1+' | 'public_domain_us_gov' | 'proprietary_cite' | 'unknown';

export interface Fastener {
  id: string;
  designation: string;
  family: 'iso' | 'an' | 'ms';
  diameter: number;
  length_mm: number;
  thread: string;
  material: string;
  tensile_strength_mpa: number;
  coating: string;
  notes: string;
  capabilities: string[];
  
  // Source citation fields (Phase 1+2)
  source_kind?: SourceKind;
  source_ref?: string;
  source_url?: string;
  revision?: string;
  license?: License;
  confidence?: 'exact' | 'derived' | 'approximate';
}

export interface FastenerSearchParams {
  q?: string;
  family?: string;
  diameter?: number | string;
  material?: string;
  limit?: number;
}

export interface FastenerRecommendation {
  diameter?: number;
  length?: number;
  material?: string;
  load_n?: number;
  environment?: string;
}
