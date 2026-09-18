export type SourceKind = 
  | 'open_library'
  | 'gov_spec'
  | 'purchased_std'
  | 'distributor_ref';

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

export interface Source {
  standard?: string;
  revision?: string;
  source_kind: SourceKind;
  source_ref: string;
  license: string;
  source_url?: string;
}

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
  
  standard?: string;
  revision?: string;
  source_kind?: SourceKind;
  source_ref?: string;
  license?: string;
  source_url?: string;
  dims?: Dimensions;
  properties?: Properties;
}
