import { query } from '../../database/connection.js';
import { getNearbyWells, getFormations } from '../wells/service.js';

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
  overall_score: number;        // 0 - 100
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

/**
 * Correlate nearby offset wells against the current drilling well.
 * Evaluates geographic proximity, stratigraphic (formation) alignment,
 * depth coverage across the look-ahead interval, and historical event density.
 */
export async function getCorrelatedOffsets(
  wellId: string,
  radiusMeters: number = 10000,
  lookaheadWindowM: number = 150
): Promise<OffsetRelevance[]> {
  // 1. Fetch current well info
  const currentWellRes = await query(
    `SELECT w.*, wl.latitude, wl.longitude
     FROM wells w
     LEFT JOIN well_locations wl ON wl.well_id = w.id
     WHERE w.well_id = $1`,
    [wellId]
  );

  if (currentWellRes.rows.length === 0) {
    throw new Error(`Current well ${wellId} not found`);
  }

  const currentWell = currentWellRes.rows[0];
  const currentDepth = currentWell.current_depth_md || 2650;
  const currentFormation = currentWell.current_formation || 'Hod Fm';
  const lookaheadEnd = currentDepth + lookaheadWindowM;

  // 2. Fetch current formations
  const currentFormations = await getFormations(wellId);
  const currentFormationNames = new Set(currentFormations.map((f: any) => f.formation_name));

  // 3. Fetch nearby offset wells
  const nearbyWells = await getNearbyWells(wellId, radiusMeters);

  const results: OffsetRelevance[] = [];

  for (const offset of nearbyWells) {
    // Formations for offset well
    const offsetFormations = await getFormations(offset.well_id);
    const offsetFormationNames = offsetFormations.map((f: any) => f.formation_name);

    const sharedFormations = offsetFormationNames.filter((name: string) =>
      currentFormationNames.has(name)
    );
    const targetFormationPresent = offsetFormationNames.includes(currentFormation);

    // Historical events count
    const eventsRes = await query(
      `SELECT
        COUNT(*) as total_events,
        COUNT(CASE WHEN start_depth_md >= $2 AND start_depth_md <= $3 THEN 1 END) as lookahead_events
       FROM drilling_events de
       JOIN wells w ON w.id = de.well_id
       WHERE w.well_id = $1`,
      [offset.well_id, currentDepth, lookaheadEnd]
    );

    const totalEvents = parseInt(eventsRes.rows[0].total_events) || 0;
    const lookaheadEvents = parseInt(eventsRes.rows[0].lookahead_events) || 0;

    // --- Scoring Components ---
    // 1. Proximity score (10km scale: 0km = 100, 10km = 50)
    const distM = offset.distance_m || 1000;
    const proximityScore = Math.max(30, Math.round(100 - (distM / radiusMeters) * 50));

    // 2. Formation score: target formation match = 60pts, shared formations ratio = 40pts
    let formationScore = 30;
    if (targetFormationPresent) formationScore += 40;
    const sharedRatio = currentFormationNames.size > 0
      ? sharedFormations.length / currentFormationNames.size
      : 0.5;
    formationScore += Math.round(sharedRatio * 30);
    formationScore = Math.min(100, formationScore);

    // 3. Depth overlap score
    const offsetTotalDepth = offset.total_depth_md || offset.current_depth_md || 3500;
    const coversLookahead = offsetTotalDepth >= lookaheadEnd;
    let depthScore = 40;
    if (offsetTotalDepth >= currentDepth) depthScore += 30;
    if (coversLookahead) depthScore += 30;

    // Overall weighted score
    // Proximity: 30%, Formation: 40%, Depth: 30%
    let overallScore = Math.round(
      proximityScore * 0.3 + formationScore * 0.4 + depthScore * 0.3
    );

    // Boost if there are documented events in the lookahead zone
    if (lookaheadEvents > 0) {
      overallScore = Math.min(99, overallScore + 5);
    }

    let relevanceLevel: 'HIGH' | 'MODERATE' | 'LOW' = 'MODERATE';
    if (overallScore >= 80) relevanceLevel = 'HIGH';
    else if (overallScore < 60) relevanceLevel = 'LOW';

    // Rationale reasons
    const reasons: string[] = [];
    if (targetFormationPresent) {
      reasons.push(`Penetrates active formation (${currentFormation})`);
    }
    if (coversLookahead) {
      reasons.push(`Total depth (${offsetTotalDepth}m) fully covers look-ahead window (${currentDepth}m - ${lookaheadEnd}m)`);
    }
    if (distM < 3000) {
      reasons.push(`Immediate geographic offset (${(distM / 1000).toFixed(1)} km)`);
    } else {
      reasons.push(`Within regional cluster (${(distM / 1000).toFixed(1)} km)`);
    }
    if (lookaheadEvents > 0) {
      reasons.push(`Documented ${lookaheadEvents} historical event(s) directly ahead of current bit depth`);
    }

    results.push({
      well_id: offset.well_id,
      name: offset.name,
      field_name: offset.field_name,
      operator: offset.operator,
      status: offset.status,
      distance_m: distM,
      latitude: offset.latitude,
      longitude: offset.longitude,
      total_depth_md: offsetTotalDepth,
      overall_score: overallScore,
      relevance_level: relevanceLevel,
      formation_match: {
        score: formationScore,
        target_formation_present: targetFormationPresent,
        shared_formations: sharedFormations,
      },
      depth_overlap: {
        score: depthScore,
        depth_coverage_m: offsetTotalDepth,
        covers_lookahead: coversLookahead,
      },
      proximity: {
        score: proximityScore,
        distance_km: parseFloat((distM / 1000).toFixed(2)),
      },
      historical_events_count: totalEvents,
      lookahead_events_count: lookaheadEvents,
      relevance_reasons: reasons,
    });
  }

  // Sort by overall relevance score descending
  return results.sort((a, b) => b.overall_score - a.overall_score);
}
