import { query } from '../../database/connection.js';

/**
 * Get all wells
 */
export async function getAllWells() {
  const result = await query(`
    SELECT
      w.*,
      wl.latitude,
      wl.longitude,
      wl.elevation,
      wl.coordinate_system
    FROM wells w
    LEFT JOIN well_locations wl ON wl.well_id = w.id
    ORDER BY w.well_id
  `);
  return result.rows;
}

/**
 * Get a well by its human-readable well_id (e.g., "WELL-001")
 */
export async function getWellByWellId(wellId: string) {
  const result = await query(
    `SELECT
      w.*,
      wl.latitude,
      wl.longitude,
      wl.elevation,
      wl.coordinate_system
    FROM wells w
    LEFT JOIN well_locations wl ON wl.well_id = w.id
    WHERE w.well_id = $1`,
    [wellId]
  );
  return result.rows[0] ?? null;
}

/**
 * Get a well by its database UUID
 */
export async function getWellById(id: string) {
  const result = await query(
    `SELECT
      w.*,
      wl.latitude,
      wl.longitude,
      wl.elevation,
      wl.coordinate_system
    FROM wells w
    LEFT JOIN well_locations wl ON wl.well_id = w.id
    WHERE w.id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

/**
 * Get nearby wells within a given radius (in meters) using PostGIS
 */
export async function getNearbyWells(wellId: string, radiusMeters: number) {
  const result = await query(
    `WITH target AS (
      SELECT wl.location
      FROM wells w
      JOIN well_locations wl ON wl.well_id = w.id
      WHERE w.well_id = $1
    )
    SELECT
      w.*,
      wl.latitude,
      wl.longitude,
      wl.elevation,
      ROUND(ST_Distance(wl.location, target.location)::numeric, 1) as distance_m
    FROM wells w
    JOIN well_locations wl ON wl.well_id = w.id
    CROSS JOIN target
    WHERE w.well_id != $1
      AND ST_DWithin(wl.location, target.location, $2)
    ORDER BY ST_Distance(wl.location, target.location)`,
    [wellId, radiusMeters]
  );
  return result.rows;
}

/**
 * Get formation intervals for a well
 */
export async function getFormations(wellId: string) {
  const result = await query(
    `SELECT fi.*
     FROM formation_intervals fi
     JOIN wells w ON w.id = fi.well_id
     WHERE w.well_id = $1
     ORDER BY fi.sequence_number`,
    [wellId]
  );
  return result.rows;
}

/**
 * Get trajectory points for a well
 */
export async function getTrajectory(wellId: string) {
  const result = await query(
    `SELECT tp.*,
       ST_X(ST_Transform(ST_SetSRID(ST_MakePoint(tp.easting, tp.northing), 23031), 4326)) as longitude,
       ST_Y(ST_Transform(ST_SetSRID(ST_MakePoint(tp.easting, tp.northing), 23031), 4326)) as latitude
     FROM trajectory_points tp
     JOIN wells w ON w.id = tp.well_id
     WHERE w.well_id = $1
     ORDER BY tp.sequence_number`,
    [wellId]
  );
  return result.rows;
}
