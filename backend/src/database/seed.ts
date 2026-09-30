// ============================================================
// NWIS Controlled Dummy Dataset — Seed Script
// Populates the canonical data model with realistic Assam basin data.
//
// This is a DEVELOPMENT FIXTURE, not OIL production data.
// All data flows through the same canonical model that real data will use.
// ============================================================

import { pool, testConnection, withTransaction } from './connection.js';
import { logger } from '../middleware/logger.js';
import pg from 'pg';

// ============================================================
// WELLS
// Wells located in the Upper Assam basin (Duliajan/Digboi area)
// ============================================================
const WELLS = [
  {
    well_id: 'WELL-001',
    name: 'Duliajan-A1',
    status: 'active',
    spud_date: '2026-07-15',
    total_depth_md: null,        // Still drilling
    total_depth_tvd: null,
    current_depth_md: 3190,
    current_formation: 'Barail Group',
    field_name: 'Duliajan',
    operator: 'Oil India Limited',
    well_type: 'development',
  },
  {
    well_id: 'WELL-007',
    name: 'Duliajan-B3',
    status: 'historical',
    spud_date: '2024-03-10',
    total_depth_md: 3850,
    total_depth_tvd: 3820,
    current_depth_md: 3850,
    current_formation: null,
    field_name: 'Duliajan',
    operator: 'Oil India Limited',
    well_type: 'development',
  },
  {
    well_id: 'WELL-011',
    name: 'Duliajan-C1',
    status: 'historical',
    spud_date: '2023-11-05',
    total_depth_md: 3600,
    total_depth_tvd: 3565,
    current_depth_md: 3600,
    current_formation: null,
    field_name: 'Duliajan',
    operator: 'Oil India Limited',
    well_type: 'exploration',
  },
  {
    well_id: 'WELL-021',
    name: 'Moran-D2',
    status: 'historical',
    spud_date: '2024-06-20',
    total_depth_md: 3450,
    total_depth_tvd: 3415,
    current_depth_md: 3450,
    current_formation: null,
    field_name: 'Moran',
    operator: 'Oil India Limited',
    well_type: 'development',
  },
  {
    well_id: 'WELL-034',
    name: 'Nahorkatiya-E1',
    status: 'historical',
    spud_date: '2023-05-12',
    total_depth_md: 4100,
    total_depth_tvd: 4055,
    current_depth_md: 4100,
    current_formation: null,
    field_name: 'Nahorkatiya',
    operator: 'Oil India Limited',
    well_type: 'exploration',
  },
];

// ============================================================
// WELL LOCATIONS (Upper Assam basin coordinates)
// ============================================================
const LOCATIONS: Record<string, { lat: number; lng: number; elevation: number }> = {
  'WELL-001': { lat: 27.3650, lng: 95.3050, elevation: 116 },
  'WELL-007': { lat: 27.3750, lng: 95.3200, elevation: 118 },  // ~2.1 km from WELL-001
  'WELL-011': { lat: 27.3500, lng: 95.2800, elevation: 112 },  // ~4.2 km from WELL-001
  'WELL-021': { lat: 27.3900, lng: 95.3350, elevation: 120 },  // ~5.7 km from WELL-001
  'WELL-034': { lat: 27.3700, lng: 95.2650, elevation: 114 },  // ~5.5 km from WELL-001
};

// ============================================================
// FORMATION INTERVALS
// Typical Upper Assam basin stratigraphy
// ============================================================
type FormationDef = {
  name: string;
  top_md: number;
  base_md: number;
  top_tvd: number | null;
  base_tvd: number | null;
  lithology: string;
  description: string;
};

const BASE_FORMATIONS: FormationDef[] = [
  { name: 'Alluvium', top_md: 0, base_md: 200, top_tvd: 0, base_tvd: 200, lithology: 'Clay, Sand, Gravel', description: 'Recent alluvial deposits' },
  { name: 'Tipam Formation', top_md: 200, base_md: 1200, top_tvd: 200, base_tvd: 1195, lithology: 'Sandstone, Shale', description: 'Tipam sandstone group with interbedded shale' },
  { name: 'Girujan Clay', top_md: 1200, base_md: 1800, top_tvd: 1195, base_tvd: 1785, lithology: 'Clay, Siltstone', description: 'Girujan clay formation, marker horizon' },
  { name: 'Namsang Formation', top_md: 1800, base_md: 2500, top_tvd: 1785, base_tvd: 2475, lithology: 'Sandstone, Shale', description: 'Namsang sandstone with shale intercalations' },
  { name: 'Barail Group', top_md: 2500, base_md: 3500, top_tvd: 2475, base_tvd: 3460, lithology: 'Sandstone, Shale, Coal', description: 'Barail group — primary reservoir zone' },
  { name: 'Kopili Formation', top_md: 3500, base_md: 4000, top_tvd: 3460, base_tvd: 3945, lithology: 'Shale, Limestone', description: 'Kopili shale with limestone bands' },
  { name: 'Sylhet Limestone', top_md: 4000, base_md: 4500, top_tvd: 3945, base_tvd: 4430, lithology: 'Limestone', description: 'Sylhet limestone formation' },
];

// Add realistic variation per well (depth offsets)
function getFormationsForWell(wellId: string): FormationDef[] {
  const offsets: Record<string, number> = {
    'WELL-001': 0,
    'WELL-007': 15,
    'WELL-011': -25,
    'WELL-021': 30,
    'WELL-034': -10,
  };
  const offset = offsets[wellId] ?? 0;

  return BASE_FORMATIONS.map((f) => ({
    ...f,
    top_md: f.top_md + (f.top_md > 0 ? offset : 0),
    base_md: f.base_md + offset,
    top_tvd: f.top_tvd !== null ? f.top_tvd + (f.top_tvd > 0 ? offset * 0.98 : 0) : null,
    base_tvd: f.base_tvd !== null ? f.base_tvd + offset * 0.98 : null,
  }));
}

// ============================================================
// TRAJECTORY POINTS (simplified vertical-to-deviated profiles)
// ============================================================
function getTrajectoryForWell(wellId: string, totalMd: number): Array<{
  md: number; tvd: number; inc: number; azi: number;
}> {
  const kickoffDepth = 1500;
  const maxInclination: Record<string, number> = {
    'WELL-001': 12,
    'WELL-007': 15,
    'WELL-011': 8,
    'WELL-021': 20,
    'WELL-034': 10,
  };
  const azimuth: Record<string, number> = {
    'WELL-001': 135,
    'WELL-007': 120,
    'WELL-011': 180,
    'WELL-021': 90,
    'WELL-034': 200,
  };
  const maxInc = maxInclination[wellId] ?? 10;
  const azi = azimuth[wellId] ?? 0;
  const points = [];

  for (let md = 0; md <= totalMd; md += 100) {
    let inc = 0;
    let tvd = md;

    if (md > kickoffDepth) {
      const fraction = Math.min((md - kickoffDepth) / 1000, 1);
      inc = maxInc * fraction;
      // Simplified TVD calculation (actual calculation would use minimum curvature)
      tvd = md - (md - kickoffDepth) * (1 - Math.cos((inc * Math.PI) / 180)) * 0.5;
    }

    points.push({
      md,
      tvd: Math.round(tvd * 10) / 10,
      inc: Math.round(inc * 100) / 100,
      azi: md > kickoffDepth ? azi : 0,
    });
  }

  return points;
}

// ============================================================
// DOCUMENTS (sample DDR/WCR references)
// ============================================================
interface DocDef {
  document_id: string;
  well_id: string;
  document_type: string;
  title: string;
  total_pages: number;
  source: string;
}

const DOCUMENTS: DocDef[] = [
  { document_id: 'DDR-007-001', well_id: 'WELL-007', document_type: 'DDR', title: 'Daily Drilling Report - Duliajan-B3 - Day 45', total_pages: 18, source: 'OIL Internal Records' },
  { document_id: 'DDR-007-002', well_id: 'WELL-007', document_type: 'DDR', title: 'Daily Drilling Report - Duliajan-B3 - Day 78', total_pages: 12, source: 'OIL Internal Records' },
  { document_id: 'WCR-007', well_id: 'WELL-007', document_type: 'WCR', title: 'Well Completion Report - Duliajan-B3', total_pages: 42, source: 'OIL Internal Records' },
  { document_id: 'DDR-011-001', well_id: 'WELL-011', document_type: 'DDR', title: 'Daily Drilling Report - Duliajan-C1 - Day 62', total_pages: 25, source: 'OIL Internal Records' },
  { document_id: 'DDR-011-002', well_id: 'WELL-011', document_type: 'DDR', title: 'Daily Drilling Report - Duliajan-C1 - Day 85', total_pages: 18, source: 'OIL Internal Records' },
  { document_id: 'WCR-011', well_id: 'WELL-011', document_type: 'WCR', title: 'Well Completion Report - Duliajan-C1', total_pages: 38, source: 'OIL Internal Records' },
  { document_id: 'DDR-021-001', well_id: 'WELL-021', document_type: 'DDR', title: 'Daily Drilling Report - Moran-D2 - Day 55', total_pages: 15, source: 'OIL Internal Records' },
  { document_id: 'DDR-021-002', well_id: 'WELL-021', document_type: 'DDR', title: 'Daily Drilling Report - Moran-D2 - Day 40', total_pages: 14, source: 'OIL Internal Records' },
  { document_id: 'WCR-021', well_id: 'WELL-021', document_type: 'WCR', title: 'Well Completion Report - Moran-D2', total_pages: 35, source: 'OIL Internal Records' },
  { document_id: 'DDR-034-001', well_id: 'WELL-034', document_type: 'DDR', title: 'Daily Drilling Report - Nahorkatiya-E1 - Day 50', total_pages: 22, source: 'OIL Internal Records' },
  { document_id: 'DDR-034-002', well_id: 'WELL-034', document_type: 'DDR', title: 'Daily Drilling Report - Nahorkatiya-E1 - Day 72', total_pages: 16, source: 'OIL Internal Records' },
  { document_id: 'WCR-034', well_id: 'WELL-034', document_type: 'WCR', title: 'Well Completion Report - Nahorkatiya-E1', total_pages: 45, source: 'OIL Internal Records' },
];

// ============================================================
// DRILLING EVENTS + ACTIONS
// ============================================================
interface EventDef {
  well_id: string;
  event_type: string;
  start_depth_md: number;
  end_depth_md: number;
  formation: string;
  severity: string;
  description: string;
  event_date: string;
  duration_hours: number;
  npt_hours: number;
  source_doc_id: string;
  source_page: number;
  confidence: number;
  actions: Array<{ description: string; type: string; outcome: string }>;
}

const EVENTS: EventDef[] = [
  // WELL-007 events
  {
    well_id: 'WELL-007',
    event_type: 'mud_loss',
    start_depth_md: 3218,
    end_depth_md: 3225,
    formation: 'Barail Group',
    severity: 'partial',
    description: 'Partial mud loss observed while drilling through fractured Barail sandstone at 3218m. Losses estimated at 15 bbl/hr. Mud weight was 10.2 ppg.',
    event_date: '2024-06-22',
    duration_hours: 8,
    npt_hours: 4,
    source_doc_id: 'DDR-007-001',
    source_page: 14,
    confidence: 0.91,
    actions: [
      { description: 'Reduced pump rate from 450 to 320 lpm', type: 'operational', outcome: 'Losses reduced to 5 bbl/hr' },
      { description: 'Spotted LCM pill (50 bbls) at loss zone', type: 'treatment', outcome: 'Losses stopped after 2 hours' },
    ],
  },
  {
    well_id: 'WELL-007',
    event_type: 'high_torque',
    start_depth_md: 2850,
    end_depth_md: 2870,
    formation: 'Namsang Formation',
    severity: 'minor',
    description: 'Elevated torque readings (18-22 kN.m vs normal 12-15 kN.m) observed through Namsang shale section. Possibly due to reactive shale.',
    event_date: '2024-06-08',
    duration_hours: 6,
    npt_hours: 0,
    source_doc_id: 'DDR-007-002',
    source_page: 8,
    confidence: 0.85,
    actions: [
      { description: 'Adjusted WOB from 15 to 10 klbs', type: 'operational', outcome: 'Torque normalized to 14 kN.m' },
      { description: 'Increased mud weight from 9.8 to 10.0 ppg', type: 'mud_program', outcome: 'Wellbore stability improved' },
    ],
  },
  // WELL-011 events
  {
    well_id: 'WELL-011',
    event_type: 'stuck_pipe',
    start_depth_md: 3280,
    end_depth_md: 3280,
    formation: 'Barail Group',
    severity: 'severe',
    description: 'Drill string became stuck at 3280m while making connection. Differential sticking suspected in permeable Barail sandstone. Overpull applied up to 80 klbs above string weight.',
    event_date: '2024-02-14',
    duration_hours: 36,
    npt_hours: 36,
    source_doc_id: 'DDR-011-001',
    source_page: 22,
    confidence: 0.95,
    actions: [
      { description: 'Applied overpull (80 klbs) and worked pipe', type: 'mechanical', outcome: 'Pipe did not free' },
      { description: 'Spotted oil-based mud pill (70 bbls) at stuck point', type: 'treatment', outcome: 'Pipe freed after 8 hours soak time' },
      { description: 'Jarring operations conducted', type: 'mechanical', outcome: 'Contributed to freeing pipe' },
    ],
  },
  {
    well_id: 'WELL-011',
    event_type: 'mud_loss',
    start_depth_md: 3340,
    end_depth_md: 3355,
    formation: 'Barail Group',
    severity: 'partial',
    description: 'Partial losses (10 bbl/hr) encountered while drilling below previous stuck pipe zone. Loss zone associated with natural fractures in Barail sandstone.',
    event_date: '2024-02-20',
    duration_hours: 12,
    npt_hours: 6,
    source_doc_id: 'DDR-011-002',
    source_page: 15,
    confidence: 0.88,
    actions: [
      { description: 'LCM treatment with medium-coarse blend', type: 'treatment', outcome: 'Losses reduced to 2 bbl/hr' },
      { description: 'Adjusted mud weight from 10.5 to 10.2 ppg', type: 'mud_program', outcome: 'Maintained wellbore stability while reducing losses' },
    ],
  },
  // WELL-021 events
  {
    well_id: 'WELL-021',
    event_type: 'kick',
    start_depth_md: 3310,
    end_depth_md: 3315,
    formation: 'Barail Group',
    severity: 'critical',
    description: 'Gas kick detected at 3310m. Pit gain of 8 bbls observed with increase in flow rate. Gas influx from high-pressure Barail sandstone reservoir. Well was shut in and kill procedure initiated.',
    event_date: '2024-09-15',
    duration_hours: 24,
    npt_hours: 24,
    source_doc_id: 'DDR-021-001',
    source_page: 3,
    confidence: 0.97,
    actions: [
      { description: 'Shut-in well using soft shut-in procedure', type: 'well_control', outcome: 'SIDPP: 450 psi, SICP: 520 psi' },
      { description: 'Circulated kill mud (11.2 ppg) using driller\'s method', type: 'well_control', outcome: 'Kick circulated out after 6 hours' },
      { description: 'Increased mud weight to 11.4 ppg for safety margin', type: 'mud_program', outcome: 'No further influx observed' },
    ],
  },
  {
    well_id: 'WELL-021',
    event_type: 'tight_hole',
    start_depth_md: 2650,
    end_depth_md: 2680,
    formation: 'Namsang Formation',
    severity: 'minor',
    description: 'Tight hole conditions encountered while tripping out through Namsang shale section. Drag exceeded normal by 15 klbs.',
    event_date: '2024-08-28',
    duration_hours: 4,
    npt_hours: 2,
    source_doc_id: 'DDR-021-002',
    source_page: 10,
    confidence: 0.82,
    actions: [
      { description: 'Reamed tight section from 2650m to 2680m', type: 'mechanical', outcome: 'Hole cleaned, drag returned to normal' },
    ],
  },
  // WELL-034 events
  {
    well_id: 'WELL-034',
    event_type: 'cementing_failure',
    start_depth_md: 2900,
    end_depth_md: 2920,
    formation: 'Barail Group',
    severity: 'moderate',
    description: 'Poor cement bond detected on CBL across 2900-2920m interval. Top of cement lower than planned. Possible channel behind casing in Barail section.',
    event_date: '2023-09-08',
    duration_hours: 48,
    npt_hours: 48,
    source_doc_id: 'DDR-034-001',
    source_page: 18,
    confidence: 0.89,
    actions: [
      { description: 'Performed squeeze cement job at 2905m', type: 'remedial', outcome: 'Cement bond improved on repeat CBL' },
      { description: 'Pressure tested casing shoe to 2500 psi', type: 'testing', outcome: 'Pressure test satisfactory' },
    ],
  },
  {
    well_id: 'WELL-034',
    event_type: 'mud_loss',
    start_depth_md: 3050,
    end_depth_md: 3070,
    formation: 'Barail Group',
    severity: 'partial',
    description: 'Mud losses (12 bbl/hr) while drilling through vuggy Barail limestone stringers. Loss zone coincided with fractures identified on image log.',
    event_date: '2023-09-22',
    duration_hours: 10,
    npt_hours: 4,
    source_doc_id: 'DDR-034-002',
    source_page: 12,
    confidence: 0.86,
    actions: [
      { description: 'Adjusted mud weight from 10.8 to 10.4 ppg', type: 'mud_program', outcome: 'Losses reduced to 5 bbl/hr' },
      { description: 'Added fine-medium LCM to active system', type: 'treatment', outcome: 'Losses controlled' },
    ],
  },
];

// ============================================================
// SEED EXECUTION
// ============================================================
async function seed() {
  logger.info('Starting database seed...');

  const connected = await testConnection();
  if (!connected) {
    logger.error('Cannot connect to database. Aborting seed.');
    process.exit(1);
  }

  await withTransaction(async (client: pg.PoolClient) => {
    // Clear existing data (in reverse FK order)
    logger.info('Clearing existing data...');
    await client.query('DELETE FROM alerts');
    await client.query('DELETE FROM risk_predictions');
    await client.query('DELETE FROM telemetry_points');
    await client.query('DELETE FROM drilling_parameters');
    await client.query('DELETE FROM event_actions');
    await client.query('DELETE FROM drilling_events');
    await client.query('DELETE FROM document_pages');
    await client.query('DELETE FROM documents');
    await client.query('DELETE FROM formation_intervals');
    await client.query('DELETE FROM trajectory_points');
    await client.query('DELETE FROM well_locations');
    await client.query('DELETE FROM wells');

    // ---- Insert Wells ----
    logger.info('Inserting wells...');
    const wellDbIds: Record<string, string> = {};

    for (const w of WELLS) {
      const result = await client.query(
        `INSERT INTO wells (well_id, name, status, spud_date, total_depth_md, total_depth_tvd, current_depth_md, current_formation, field_name, operator, well_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [w.well_id, w.name, w.status, w.spud_date, w.total_depth_md, w.total_depth_tvd, w.current_depth_md, w.current_formation, w.field_name, w.operator, w.well_type]
      );
      wellDbIds[w.well_id] = result.rows[0].id;
      logger.info(`  ✓ Well: ${w.well_id} (${w.name})`);
    }

    // ---- Insert Locations ----
    logger.info('Inserting well locations...');
    for (const [wellId, loc] of Object.entries(LOCATIONS)) {
      const dbId = wellDbIds[wellId];
      await client.query(
        `INSERT INTO well_locations (well_id, latitude, longitude, elevation, location, coordinate_system)
         VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5::float8, $6::float8), 4326)::geography, 'WGS84')`,
        [dbId, loc.lat, loc.lng, loc.elevation, loc.lng, loc.lat]
      );
    }

    // ---- Insert Formations ----
    logger.info('Inserting formation intervals...');
    for (const wellId of Object.keys(wellDbIds)) {
      const formations = getFormationsForWell(wellId);
      const dbId = wellDbIds[wellId];
      const well = WELLS.find((w) => w.well_id === wellId)!;
      const maxDepth = well.total_depth_md ?? well.current_depth_md ?? 99999;

      for (let i = 0; i < formations.length; i++) {
        const f = formations[i];
        if (f.top_md > maxDepth) break;

        await client.query(
          `INSERT INTO formation_intervals (well_id, formation_name, top_depth_md, base_depth_md, top_depth_tvd, base_depth_tvd, lithology, description, sequence_number)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [dbId, f.name, f.top_md, Math.min(f.base_md, maxDepth), f.top_tvd, f.base_tvd, f.lithology, f.description, i + 1]
        );
      }
    }

    // ---- Insert Trajectories ----
    logger.info('Inserting trajectory points...');
    for (const wellId of Object.keys(wellDbIds)) {
      const well = WELLS.find((w) => w.well_id === wellId)!;
      const totalMd = well.total_depth_md ?? well.current_depth_md ?? 0;
      const trajectory = getTrajectoryForWell(wellId, totalMd);
      const dbId = wellDbIds[wellId];

      for (let i = 0; i < trajectory.length; i++) {
        const t = trajectory[i];
        await client.query(
          `INSERT INTO trajectory_points (well_id, measured_depth, true_vertical_depth, inclination, azimuth, sequence_number)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [dbId, t.md, t.tvd, t.inc, t.azi, i + 1]
        );
      }
    }

    // ---- Insert Documents ----
    logger.info('Inserting documents...');
    const docDbIds: Record<string, string> = {};

    for (const doc of DOCUMENTS) {
      const wellDbId = wellDbIds[doc.well_id];
      const result = await client.query(
        `INSERT INTO documents (document_id, well_id, document_type, title, total_pages, source, processed)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING id`,
        [doc.document_id, wellDbId, doc.document_type, doc.title, doc.total_pages, doc.source]
      );
      docDbIds[doc.document_id] = result.rows[0].id;

      // Insert sample pages
      for (let p = 1; p <= doc.total_pages; p++) {
        await client.query(
          `INSERT INTO document_pages (document_id, page_number, extracted_text, is_scanned, ocr_applied)
           VALUES ($1, $2, $3, false, false)`,
          [result.rows[0].id, p, `[Sample extracted text for ${doc.document_id} page ${p}]`]
        );
      }
    }

    // ---- Insert Events + Actions ----
    logger.info('Inserting drilling events and actions...');
    for (const evt of EVENTS) {
      const wellDbId = wellDbIds[evt.well_id];
      const docDbId = docDbIds[evt.source_doc_id] ?? null;

      const result = await client.query(
        `INSERT INTO drilling_events (well_id, event_type, start_depth_md, end_depth_md, formation, severity, description, event_date, duration_hours, npt_hours, source_document_id, source_page, confidence)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id`,
        [wellDbId, evt.event_type, evt.start_depth_md, evt.end_depth_md, evt.formation, evt.severity, evt.description, evt.event_date, evt.duration_hours, evt.npt_hours, docDbId, evt.source_page, evt.confidence]
      );
      const eventDbId = result.rows[0].id;

      for (let i = 0; i < evt.actions.length; i++) {
        const action = evt.actions[i];
        await client.query(
          `INSERT INTO event_actions (event_id, action_description, action_type, outcome, sequence_number)
           VALUES ($1, $2, $3, $4, $5)`,
          [eventDbId, action.description, action.type, action.outcome, i + 1]
        );
      }

      logger.info(`  ✓ Event: ${evt.event_type} at ${evt.start_depth_md}m in ${evt.well_id}`);
    }
  });

  logger.info('Seed complete!');
  logger.info(`  Wells: ${WELLS.length}`);
  logger.info(`  Documents: ${DOCUMENTS.length}`);
  logger.info(`  Events: ${EVENTS.length}`);
  await pool.end();
}

seed().catch((err) => {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
});
