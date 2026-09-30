-- ============================================================
-- NWIS Initial Schema Migration
-- Creates the canonical data model tables
-- ============================================================

-- Track applied migrations
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WELLS
-- ============================================================
CREATE TABLE wells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  well_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'historical', 'abandoned', 'suspended')),
  spud_date DATE,
  total_depth_md NUMERIC,
  total_depth_tvd NUMERIC,
  current_depth_md NUMERIC,
  current_formation VARCHAR(255),
  field_name VARCHAR(255),
  operator VARCHAR(255),
  well_type VARCHAR(50) DEFAULT 'unknown' CHECK (well_type IN ('exploration', 'development', 'appraisal', 'unknown')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WELL LOCATIONS (PostGIS-enabled)
-- ============================================================
CREATE TABLE well_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  well_id UUID NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  elevation NUMERIC,
  location GEOGRAPHY(POINT, 4326),
  coordinate_system VARCHAR(50) DEFAULT 'WGS84',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_well_locations_geo ON well_locations USING GIST(location);
CREATE INDEX idx_well_locations_well ON well_locations(well_id);

-- ============================================================
-- TRAJECTORY POINTS
-- ============================================================
CREATE TABLE trajectory_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  well_id UUID NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
  measured_depth NUMERIC NOT NULL,
  true_vertical_depth NUMERIC,
  inclination NUMERIC,
  azimuth NUMERIC,
  northing NUMERIC,
  easting NUMERIC,
  sequence_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trajectory_well ON trajectory_points(well_id);
CREATE INDEX idx_trajectory_depth ON trajectory_points(well_id, measured_depth);

-- ============================================================
-- FORMATION INTERVALS
-- ============================================================
CREATE TABLE formation_intervals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  well_id UUID NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
  formation_name VARCHAR(255) NOT NULL,
  top_depth_md NUMERIC NOT NULL,
  base_depth_md NUMERIC NOT NULL,
  top_depth_tvd NUMERIC,
  base_depth_tvd NUMERIC,
  lithology VARCHAR(255),
  description TEXT,
  sequence_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_formation_well ON formation_intervals(well_id);
CREATE INDEX idx_formation_depth ON formation_intervals(well_id, top_depth_md, base_depth_md);

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id VARCHAR(100) UNIQUE NOT NULL,
  well_id UUID NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
  document_type VARCHAR(100) CHECK (document_type IN ('DDR', 'WCR', 'mud_report', 'geological_report', 'directional_survey', 'completion_report', 'other')),
  title VARCHAR(500),
  file_path TEXT,
  file_hash VARCHAR(128),
  total_pages INTEGER,
  source VARCHAR(255),
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_well ON documents(well_id);

-- ============================================================
-- DOCUMENT PAGES
-- ============================================================
CREATE TABLE document_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  extracted_text TEXT,
  is_scanned BOOLEAN DEFAULT FALSE,
  ocr_applied BOOLEAN DEFAULT FALSE,
  ocr_confidence NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pages_document ON document_pages(document_id);

-- ============================================================
-- DRILLING EVENTS
-- ============================================================
CREATE TABLE drilling_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  well_id UUID NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  start_depth_md NUMERIC,
  end_depth_md NUMERIC,
  start_depth_tvd NUMERIC,
  end_depth_tvd NUMERIC,
  formation VARCHAR(255),
  severity VARCHAR(50) CHECK (severity IN ('minor', 'partial', 'moderate', 'severe', 'critical')),
  description TEXT,
  event_date DATE,
  duration_hours NUMERIC,
  npt_hours NUMERIC,
  source_document_id UUID REFERENCES documents(id),
  source_page INTEGER,
  confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_well ON drilling_events(well_id);
CREATE INDEX idx_events_type ON drilling_events(event_type);
CREATE INDEX idx_events_depth ON drilling_events(well_id, start_depth_md);
CREATE INDEX idx_events_formation ON drilling_events(formation);

-- ============================================================
-- EVENT ACTIONS
-- ============================================================
CREATE TABLE event_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES drilling_events(id) ON DELETE CASCADE,
  action_description TEXT NOT NULL,
  action_type VARCHAR(100),
  outcome TEXT,
  sequence_number INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_actions_event ON event_actions(event_id);

-- ============================================================
-- DRILLING PARAMETERS
-- ============================================================
CREATE TABLE drilling_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  well_id UUID NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
  depth_md NUMERIC,
  depth_tvd NUMERIC,
  rop NUMERIC,
  wob NUMERIC,
  rpm NUMERIC,
  torque NUMERIC,
  standpipe_pressure NUMERIC,
  flow_rate NUMERIC,
  mud_weight NUMERIC,
  recorded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_params_well ON drilling_parameters(well_id);

-- ============================================================
-- TELEMETRY POINTS
-- ============================================================
CREATE TABLE telemetry_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  well_id UUID NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  depth_md NUMERIC,
  depth_tvd NUMERIC,
  rop NUMERIC,
  wob NUMERIC,
  rpm NUMERIC,
  torque NUMERIC,
  standpipe_pressure NUMERIC,
  flow_rate_in NUMERIC,
  flow_rate_out NUMERIC,
  mud_weight_in NUMERIC,
  mud_weight_out NUMERIC,
  hook_load NUMERIC,
  block_position NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_telemetry_well_time ON telemetry_points(well_id, timestamp);

-- ============================================================
-- RISK PREDICTIONS
-- ============================================================
CREATE TABLE risk_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  well_id UUID NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
  risk_type VARCHAR(100) NOT NULL,
  probability NUMERIC CHECK (probability >= 0 AND probability <= 1),
  depth_start_md NUMERIC,
  depth_end_md NUMERIC,
  prediction_horizon_m NUMERIC,
  model_version VARCHAR(50),
  features JSONB,
  shap_values JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_risk_well ON risk_predictions(well_id);

-- ============================================================
-- ALERTS
-- ============================================================
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  well_id UUID NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  source_type VARCHAR(50) CHECK (source_type IN ('historical', 'correlation', 'prediction')),
  depth_md NUMERIC,
  formation VARCHAR(255),
  evidence JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_well ON alerts(well_id);
CREATE INDEX idx_alerts_active ON alerts(is_active) WHERE is_active = TRUE;

-- Record this migration
INSERT INTO _migrations (name) VALUES ('001_initial_schema');
