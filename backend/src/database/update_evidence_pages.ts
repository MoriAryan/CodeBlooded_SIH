import { pool } from './connection.js';
import { logger } from '../middleware/logger.js';

interface PageTextUpdate {
  docId: string;
  pageNum: number;
  confidence: number;
  text: string;
}

const EVIDENCE_PAGES: PageTextUpdate[] = [
  {
    docId: 'DDR-007-001',
    pageNum: 14,
    confidence: 0.94,
    text: `================================================================================
OIL INDIA LIMITED — DRILLING & WORKOVER DEPARTMENT
DAILY DRILLING REPORT (DDR) — REPORT NO. 45
WELL: Duliajan-B3 (WELL-007) | RIG: OIL-RIG-04 | FIELD: Duliajan | BASIN: Assam Shelf
DATE: 2024-06-22 | 24-HR PROGRESS: 35 m | PRESENT DEPTH: 3,225 m MD / 3,110 m TVD
TARGET FORMATION: Barail Group (Oligocene Sandstone-Shale Sequence)
CASING RECORD: 9-5/8" casing set @ 2,550 m MD | CURRENT HOLE SIZE: 8-1/2"
--------------------------------------------------------------------------------
ACTIVE DRILLING PARAMETERS (06:00 - 14:00):
  - Weight on Bit (WOB): 22 - 26 klbs
  - Rotary Speed (RPM): 110 rpm
  - Standpipe Pressure (SPP): 2,450 psi @ 450 gpm
  - Torque: 14.5 kN·m
  - Mud Weight In: 10.2 ppg | Mud Weight Out: 10.1 ppg
  - Plastic Viscosity: 18 cP | Yield Point: 22 lb/100ft² | pH: 9.2

INCIDENT & EVENT DESCRIPTION (08:30 hrs - 13:30 hrs):
  - At 08:30 hrs @ 3,218 m MD, sudden partial loss of returns observed while drilling
    permeable Barail sandstone. Active pit level decreased by 25 bbls within 15 minutes.
    Calculated loss rate: approximately 15 bbl/hr.
  - 08:45 hrs: Drilling suspended immediately. String picked up off bottom to 3,205 m MD.
    Pumps stopped; flow check conducted for 15 mins. Well static (no influx).
  - 09:15 hrs: Resumed circulation at reduced pump rate of 320 gpm (SPP 1,600 psi) to
    minimize Equivalent Circulating Density (ECD) on fragile Barail sandstone.

MITIGATION ACTIONS & RESULTS:
  - 10:15 hrs: Prepared 50 bbls specialized LCM pill containing medium nut plug (25 ppb)
    and coarse mica flakes (15 ppb) in high-viscosity bentonite carrier fluid.
  - 11:00 hrs: Spotted 50 bbl LCM pill across loss zone (3,210 - 3,225 m MD). Displaced
    pill with mud and allowed to soak under static conditions for 2 hours.
  - 13:00 hrs: Staged pumps slowly from 200 gpm to 350 gpm. Monitored active pit volumes.
    Full returns established. Total mud lost to formation: 38 bbls. Total NPT: 4.0 hrs.
  - 14:00 hrs: Resumed drilling ahead from 3,218 m to 3,225 m MD with controlled ROP.

OFFSET DRILLING RECOMMENDATION:
  - Barail sandstone reservoir interval in Duliajan block exhibits micro-fracturing at
    3,210 - 3,240 m. Future offset wells (including planned Duliajan-A1 / WELL-001) must
    maintain Mud Weight <= 10.0 ppg and keep 50 bbl pre-mixed LCM pill on surface standby
    prior to entering Barail top.
================================================================================`
  },
  {
    docId: 'DDR-011-001',
    pageNum: 22,
    confidence: 0.96,
    text: `================================================================================
OIL INDIA LIMITED — DRILLING & WORKOVER DEPARTMENT
DAILY DRILLING REPORT (DDR) — REPORT NO. 62
WELL: Duliajan-C1 (WELL-011) | RIG: OIL-RIG-07 | FIELD: Duliajan | BASIN: Assam Shelf
DATE: 2024-02-14 | CURRENT DEPTH: 3,280 m MD / 3,185 m TVD
FORMATION: Barail Group (Upper Sand Interval) | HOLE SIZE: 8-1/2"
--------------------------------------------------------------------------------
INCIDENT REPORT — SEVERE MECHANICAL / DIFFERENTIAL STUCK PIPE:
  - At 03:15 hrs @ 3,280 m MD, completed connection of stand #104. Attempted to resume
    rotation and circulation. String found immobilized with 0 rpm and 0 vertical movement.
  - Differential pressure across porous Barail sandstone estimated at 850 psi (MW 10.8 ppg
    vs pore pressure 9.2 ppg equivalent).
  - Normal string weight: 140 klbs. Maximum allowable overpull: 220 klbs.

OPERATIONAL RECOVERY CHRONOLOGY:
  - 03:30 - 05:00 hrs: Applied overpull in increments up to 80 klbs above string weight
    (220 klbs hook load). Worked torque into string up to 18 kN·m. String remained stuck.
  - 05:30 hrs: Rigged up hydraulic drilling jar. Initiated upward jarring cycle (60 blows
    over 2 hours). No movement achieved.
  - 08:00 hrs: Called drilling superintendent. Decision made to spot 70 bbls specialized
    pipe-freeing surfactant / oil-based lubricant pill across stuck interval (3,240 - 3,280 m).
  - 11:30 hrs: Displaced lubricant pill to bit and annulus. Allowed to soak with intermittent
    jarring (1 blow every 10 mins).
  - 17:45 hrs: After 6.2 hours soak time, string freed during 180 klbs jar stroke.
  - 18:30 hrs: Circulated hole clean. Conditioned mud system to 10.4 ppg. Total NPT: 36.0 hrs.

CRITICAL LESSONS LEARNED FOR OFFSET WELLS:
  - High differential pressure in permeable Barail sands presents high sticking hazard
    during static pipe connections. Limit static connection time to < 2 minutes.
================================================================================`
  },
  {
    docId: 'DDR-021-001',
    pageNum: 3,
    confidence: 0.98,
    text: `================================================================================
OIL INDIA LIMITED — DRILLING OPERATIONS CONTROL
DAILY DRILLING REPORT (DDR) — REPORT NO. 55
WELL: Moran-D2 (WELL-021) | RIG: OIL-RIG-02 | FIELD: Moran | BASIN: Assam Shelf
DATE: 2024-09-15 | CURRENT DEPTH: 3,315 m MD / 3,220 m TVD
FORMATION: Barail Group (Sub-thrust Sandstone Reservoir) | HOLE SIZE: 8-1/2"
--------------------------------------------------------------------------------
WELL CONTROL INCIDENT REPORT — GAS INFLUX (KICK):
  - At 14:10 hrs @ 3,310 m MD, fast drilling break observed (ROP jumped from 4 m/hr to
    18 m/hr over 1.2 meters).
  - At 14:14 hrs, Mud logger alerted rig floor: active pit volume increased by 8.5 bbls.
    Flow line sensor showed flow rate increased from 420 gpm to 480 gpm with pumps steady.
  - Primary indicator: Gas kick from unexpected high-pressure gas sand in Barail Group.

WELL SHUT-IN & KILL SHEET OPERATIONS:
  - 14:16 hrs: Performed soft shut-in:
      1. Spaced out drill string tool joint above rotary table.
      2. Stopped mud pumps and verified continuous positive flow.
      3. Opened hydraulic choke line valve (HCR).
      4. Closed annular BOP. Closed remote adjustable choke.
  - 14:25 hrs: Well shut in successfully. Recorded stabilized pressures:
      - Shut-In Drill Pipe Pressure (SIDPP): 450 psi
      - Shut-In Casing Pressure (SICP): 520 psi
      - Pit gain: 9.0 bbls (estimated gas influx volume)
  - 15:30 hrs: Completed Kill Sheet calculations. Calculated Kill Mud Weight (KMW):
      KMW = Current MW (10.4 ppg) + [SIDPP (450) / (0.052 * 3,220 m TVD * 3.281)] = 11.2 ppg.
  - 17:00 hrs: Circulated out gas influx using Driller's Method (First Circulation).
    Gas flared safely at surface separator. Maximum casing pressure during kill: 680 psi.
  - 21:30 hrs: Second circulation with 11.2 ppg kill mud. Well dead, SIDPP = 0 psi, SICP = 0 psi.
  - 02:00 hrs (next day): Increased safety margin to 11.4 ppg. Total NPT: 24.0 hrs.
================================================================================`
  },
  {
    docId: 'DDR-011-002',
    pageNum: 15,
    confidence: 0.91,
    text: `================================================================================
OIL INDIA LIMITED — DRILLING & WORKOVER DEPARTMENT
DAILY DRILLING REPORT (DDR) — REPORT NO. 85
WELL: Duliajan-C1 (WELL-011) | RIG: OIL-RIG-07 | FIELD: Duliajan
DATE: 2024-02-20 | CURRENT DEPTH: 3,355 m MD / 3,248 m TVD
FORMATION: Barail Group (Lower Sandstone Member)
--------------------------------------------------------------------------------
EVENT: PARTIAL MUD LOSS (10 - 12 bbl/hr) AT 3,340 m MD:
  - While rotary drilling 8-1/2" hole from 3,335 m to 3,355 m with 10.5 ppg mud, active
    suction pit recorded steady loss of 10 bbl/hr starting at 3,340 m MD.
  - Shakers showed clean quartzitic sandstone cuttings with calcite fracture-fillings.

REMEDIAL ACTIONS TAKEN:
  - Reduced mud weight from 10.5 ppg to 10.2 ppg by controlled dilution with water and
    polymers, reducing bottom-hole hydrostatic pressure by ~50 psi.
  - Spotted 40 bbls medium-coarse LCM blend through drill pipe at 3,340 m.
  - Losses decreased to manageable seeping (< 2 bbl/hr). Drilling continued to section TD.
================================================================================`
  },
  {
    docId: 'DDR-034-001',
    pageNum: 12,
    confidence: 0.89,
    text: `================================================================================
OIL INDIA LIMITED — DAILY DRILLING REPORT
WELL: Nahorkatiya-E1 (WELL-034) | DATE: 2024-04-10
FORMATION: Barail Group | DEPTH: 3,050 m - 3,070 m MD
EVENT: MUD LOSS IN DEPLETED FAULT BLOCK:
  - Encountered pressure-depleted zone at 3,050 m. Lost 18 bbl/hr mud.
  - Controlled with 45 bbl LCM pill and reduced flow rate to 340 gpm.
================================================================================`
  },
  {
    docId: 'WCR-034',
    pageNum: 18,
    confidence: 0.92,
    text: `================================================================================
OIL INDIA LIMITED — WELL COMPLETION REPORT (WCR)
WELL: Nahorkatiya-E1 (WELL-034)
SECTION: 9-5/8" Intermediate Casing Cementing Evaluation (2,900 m - 2,920 m MD)
EVENT: CEMENTING INTEGRITY & CHANNELLING IN BARAIL SHALE-SAND CONTACT:
  - Cement bond log (CBL-VDL) showed poor acoustic isolation across 2,900 - 2,920 m MD.
  - Performed remedial squeeze cementing through wireline perforations to secure isolation.
================================================================================`
  }
];

async function updateEvidencePages() {
  logger.info('Updating evidence pages with realistic engineering text...');
  for (const item of EVIDENCE_PAGES) {
    const res = await pool.query(
      `UPDATE document_pages dp
       SET extracted_text = $1, ocr_confidence = $2, ocr_applied = true
       FROM documents d
       WHERE d.id = dp.document_id AND d.document_id = $3 AND dp.page_number = $4
       RETURNING dp.id`,
      [item.text, item.confidence, item.docId, item.pageNum]
    );
    logger.info(`Updated ${item.docId} page ${item.pageNum}: ${res.rowCount} row(s) updated`);
  }
  await pool.end();
  logger.info('Evidence pages updated successfully.');
}

updateEvidencePages().catch((err) => {
  logger.error({ err }, 'Failed to update evidence pages');
  process.exit(1);
});
