// ============================================================
// eRTMAC-NWIS — Canonical Data Model
// All data sources must conform to these contracts.
// The application never sees raw source formats.
// ============================================================

// --- Well ---

export type WellStatus = 'active' | 'historical' | 'abandoned' | 'suspended';
export type WellType = 'exploration' | 'development' | 'appraisal' | 'unknown';

export interface Well {
  id: string;
  well_id: string;           // Human-readable ID, e.g. "WELL-001"
  name: string;
  status: WellStatus;
  spud_date: string | null;  // ISO date
  total_depth_md: number | null;
  total_depth_tvd: number | null;
  current_depth_md: number | null;
  current_formation: string | null;
  field_name: string | null;
  operator: string | null;
  well_type: WellType;
  created_at: string;
  updated_at: string;
}

// --- Well Location ---

export interface WellLocation {
  id: string;
  well_id: string;           // FK → Well.id
  latitude: number;
  longitude: number;
  elevation: number | null;
  coordinate_system: string; // e.g. "WGS84"
  created_at: string;
}

// --- Trajectory Point ---

export interface TrajectoryPoint {
  id: string;
  well_id: string;
  measured_depth: number;
  true_vertical_depth: number | null;
  inclination: number | null;
  azimuth: number | null;
  northing: number | null;
  easting: number | null;
  sequence_number: number;
  created_at: string;
}

// --- Formation Interval ---

export interface FormationInterval {
  id: string;
  well_id: string;
  formation_name: string;
  top_depth_md: number;
  base_depth_md: number;
  top_depth_tvd: number | null;
  base_depth_tvd: number | null;
  lithology: string | null;
  description: string | null;
  sequence_number: number;
  created_at: string;
}

// --- Drilling Event ---

export type EventType =
  | 'mud_loss'
  | 'stuck_pipe'
  | 'kick'
  | 'tight_hole'
  | 'high_torque'
  | 'cementing_failure'
  | 'bit_failure'
  | 'wellbore_instability'
  | 'gas_influx'
  | 'equipment_failure'
  | 'fishing'
  | 'other';

export type Severity = 'minor' | 'partial' | 'moderate' | 'severe' | 'critical';

export interface DrillingEvent {
  id: string;
  well_id: string;
  event_type: EventType;
  start_depth_md: number | null;
  end_depth_md: number | null;
  start_depth_tvd: number | null;
  end_depth_tvd: number | null;
  formation: string | null;
  severity: Severity | null;
  description: string | null;
  event_date: string | null;    // ISO date
  duration_hours: number | null;
  npt_hours: number | null;     // Non-productive time
  source_document_id: string | null;
  source_page: number | null;
  confidence: number | null;    // 0–1
  created_at: string;
}

// --- Event Action ---

export interface EventAction {
  id: string;
  event_id: string;
  action_description: string;
  action_type: string | null;
  outcome: string | null;
  sequence_number: number;
  created_at: string;
}

// --- Document ---

export type DocumentType = 'DDR' | 'WCR' | 'mud_report' | 'geological_report'
  | 'directional_survey' | 'completion_report' | 'other';

export interface Document {
  id: string;
  document_id: string;         // e.g. "DDR-007"
  well_id: string;
  document_type: DocumentType;
  title: string | null;
  file_path: string | null;
  file_hash: string | null;
  total_pages: number | null;
  source: string | null;
  upload_date: string | null;
  processed: boolean;
  created_at: string;
}

// --- Document Page ---

export interface DocumentPage {
  id: string;
  document_id: string;
  page_number: number;
  extracted_text: string | null;
  is_scanned: boolean;
  ocr_applied: boolean;
  ocr_confidence: number | null;
  created_at: string;
}

// --- Drilling Parameter ---

export interface DrillingParameter {
  id: string;
  well_id: string;
  depth_md: number | null;
  depth_tvd: number | null;
  rop: number | null;             // Rate of penetration (m/hr)
  wob: number | null;             // Weight on bit (klbs)
  rpm: number | null;
  torque: number | null;          // (kN·m)
  standpipe_pressure: number | null; // (psi)
  flow_rate: number | null;       // (lpm)
  mud_weight: number | null;      // (ppg)
  recorded_at: string | null;
  created_at: string;
}

// --- Telemetry Point ---

export interface TelemetryPoint {
  id: string;
  well_id: string;
  timestamp: string;              // ISO timestamp
  depth_md: number | null;
  depth_tvd: number | null;
  rop: number | null;
  wob: number | null;
  rpm: number | null;
  torque: number | null;
  standpipe_pressure: number | null;
  flow_rate_in: number | null;
  flow_rate_out: number | null;
  mud_weight_in: number | null;
  mud_weight_out: number | null;
  hook_load: number | null;
  block_position: number | null;
  created_at: string;
}

// --- Risk Prediction ---

export type RiskType = 'mud_loss' | 'stuck_pipe' | 'kick' | 'wellbore_instability' | 'other';

export interface RiskPrediction {
  id: string;
  well_id: string;
  risk_type: RiskType;
  probability: number | null;     // 0–1
  depth_start_md: number | null;
  depth_end_md: number | null;
  prediction_horizon_m: number | null;
  model_version: string | null;
  features: Record<string, number> | null;
  shap_values: Record<string, number> | null;
  created_at: string;
}

// --- Alert ---

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertSourceType = 'historical' | 'correlation' | 'prediction';

export interface Alert {
  id: string;
  well_id: string;
  alert_type: string;
  severity: AlertSeverity;
  title: string;
  description: string | null;
  source_type: AlertSourceType;
  depth_md: number | null;
  formation: string | null;
  evidence: AlertEvidence | null;
  is_active: boolean;
  acknowledged_at: string | null;
  created_at: string;
}

export interface AlertEvidence {
  related_wells: string[];
  related_events: string[];
  related_documents: string[];
  risk_prediction_id?: string;
}

// --- API Response Contracts ---

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    per_page?: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// --- Adapter Interface ---
// All data importers must implement this contract

export interface DataImportResult {
  wells_imported: number;
  locations_imported: number;
  trajectories_imported: number;
  formations_imported: number;
  events_imported: number;
  actions_imported: number;
  documents_imported: number;
  pages_imported: number;
  errors: string[];
}
