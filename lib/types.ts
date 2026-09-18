export type SourceKind = 'open_library' | 'gov_spec' | 'purchased_std' | 'distributor_ref';
export type License = 'CC0' | 'MIT' | 'LGPL-2.1+' | 'public_domain_us_gov' | 'proprietary_cite' | 'proprietary-cite' | 'unknown' | 'sample-only';

export interface Dimensions {
  d?: number;
  L?: number;
  thread_pitch?: number;
  head_diameter?: number;
  head_height?: number;
  socket_size?: number;
  thread_length?: number;
  [key: string]: number | undefined;
}

export interface Properties {
  strength_class?: string;
  proof_load_mpa?: number;
  yield_strength_mpa?: number;
  [key: string]: string | number | undefined;
}

export interface Fastener {
  id: string;
  designation: string;
  family: 'iso' | 'an' | 'ms' | 'nas';
  diameter: number;
  diameter_unit?: 'mm' | 'in';
  length_mm: number;
  thread: string;
  material: string;
  tensile_strength_mpa?: number;
  coating: string;
  notes: string;
  capabilities: string[];
  
  // Source citation fields (Phase 1+2)
  standard?: string;
  source_kind?: SourceKind;
  source_ref?: string;
  source_url?: string;
  revision?: string;
  license?: License | string;
  confidence?: 'exact' | 'derived' | 'approximate';
  dims?: Dimensions;
  properties?: Properties;
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
