export type ActionTense = "past" | "future";

export interface PictogramFeatures {
  plural?: boolean;
  action?: ActionTense;
  nocolor?: boolean;
  hair?: string;
  skin?: string;
}

export interface PictogramItem {
  source: string;
  keyword: string;
  label: string;
  pictogram_id: number | null;
  image_url: string | null;
  resolved: boolean;
  type: number | null;
  type_label: string | null;
  has_locution: boolean;
  features: PictogramFeatures;
}

export interface Sequence {
  source: string;
  items: PictogramItem[];
}

export interface ConvertResponse {
  engine: string;
  language: string;
  sequences: Sequence[];
}

export interface HealthResponse {
  status: string;
  language: string;
  spacy_model: string;
  index_ready: boolean;
  llm_available: boolean;
  llm_provider: string;
  llm_model: string;
}

export interface LookupResult {
  word: string;
  keyword: string | null;
  pictogram_id: number | null;
  image_url: string | null;
  resolved: boolean;
}

export interface SearchResult {
  id: number;
  keyword: string;
  plural: string | null;
  type: number | null;
  has_locution: boolean;
  schematic: boolean;
  aac: boolean;
  image_url: string;
  categories: string[];
}
