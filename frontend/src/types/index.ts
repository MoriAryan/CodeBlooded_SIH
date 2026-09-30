export interface TrajectoryPoint {
  id?: string;
  measured_depth: number;
  true_vertical_depth?: number;
  inclination?: number;
  azimuth?: number;
  latitude: number;
  longitude: number;
  sequence_number?: number;
}

export type WellStatus = 'active' | 'historical' | 'abandoned' | 'suspended';

export interface Well {
  id: string;
  well_id: string;
  name: string;
  status: WellStatus;
  spud_date: string | null;
  total_depth_md: number | null;
  total_depth_tvd: number | null;
  current_depth_md: number | null;
  current_formation: string | null;
  field_name: string | null;
  operator: string | null;
  latitude?: number;
  longitude?: number;
  elevation?: number;
}

export interface OffsetRelevance {
  well_id: string;
  name: string;
  field_name: string | null;
  operator: string | null;
  status: string;
  distance_m: number;
  latitude: number;
  longitude: number;
  total_depth_md: number | null;
  overall_score: number;
  relevance_level: 'HIGH' | 'MODERATE' | 'LOW';
  formation_match: {
    score: number;
    target_formation_present: boolean;
    shared_formations: string[];
  };
  depth_overlap: {
    score: number;
    depth_coverage_m: number;
    covers_lookahead: boolean;
  };
  proximity: {
    score: number;
    distance_km: number;
  };
  historical_events_count: number;
  lookahead_events_count: number;
  relevance_reasons: string[];
}

export interface EventAction {
  id: string;
  event_id: string;
  action_description: string;
  action_type: string | null;
  outcome: string | null;
  sequence_number: number;
}

export type EventSeverity = 'minor' | 'partial' | 'moderate' | 'severe' | 'critical';

export interface DrillingEvent {
  id: string;
  well_id: string;
  well_ref?: string;
  well_name?: string;
  event_type: string;
  start_depth_md: number;
  end_depth_md: number;
  formation: string | null;
  severity: EventSeverity;
  description: string | null;
  event_date: string | null;
  duration_hours: number | null;
  npt_hours: number | null;
  source_document_ref: string | null;
  source_document_title?: string | null;
  source_page: number | null;
  confidence: number | null;
  actions?: EventAction[];
}

export interface DocumentPageEvidence {
  id: string;
  document_id: string;
  document_title?: string;
  document_type?: string;
  total_pages?: number;
  source?: string;
  well_ref?: string;
  well_name?: string;
  page_number: number;
  extracted_text: string | null;
  is_scanned: boolean;
  ocr_applied: boolean;
  ocr_confidence: number | null;
}
