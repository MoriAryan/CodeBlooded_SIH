import { query } from '../../database/connection.js';

/**
 * Get all events for a specific well
 */
export async function getEventsByWell(wellId: string) {
  const result = await query(
    `SELECT
      de.*,
      w.well_id as well_ref,
      w.name as well_name,
      d.document_id as source_document_ref,
      d.title as source_document_title,
      d.document_type as source_document_type,
      COALESCE(
        (SELECT json_agg(ea ORDER BY ea.sequence_number)
         FROM event_actions ea
         WHERE ea.event_id = de.id),
        '[]'::json
      ) as actions
    FROM drilling_events de
    JOIN wells w ON w.id = de.well_id
    LEFT JOIN documents d ON d.id = de.source_document_id
    WHERE w.well_id = $1
    ORDER BY de.start_depth_md`,
    [wellId]
  );
  return result.rows;
}

/**
 * Get a specific event by ID with its actions
 */
export async function getEventById(eventId: string) {
  const eventResult = await query(
    `SELECT
      de.*,
      w.well_id as well_ref,
      w.name as well_name,
      d.document_id as source_document_ref,
      d.title as source_document_title,
      d.document_type as source_document_type
    FROM drilling_events de
    JOIN wells w ON w.id = de.well_id
    LEFT JOIN documents d ON d.id = de.source_document_id
    WHERE de.id = $1`,
    [eventId]
  );

  if (eventResult.rows.length === 0) return null;

  const actionsResult = await query(
    `SELECT * FROM event_actions WHERE event_id = $1 ORDER BY sequence_number`,
    [eventId]
  );

  return {
    ...eventResult.rows[0],
    actions: actionsResult.rows,
  };
}

/**
 * Get events by type across all wells
 */
export async function getEventsByType(eventType: string) {
  const result = await query(
    `SELECT
      de.*,
      w.well_id as well_ref,
      w.name as well_name,
      d.document_id as source_document_ref
    FROM drilling_events de
    JOIN wells w ON w.id = de.well_id
    LEFT JOIN documents d ON d.id = de.source_document_id
    WHERE de.event_type = $1
    ORDER BY de.start_depth_md`,
    [eventType]
  );
  return result.rows;
}

/**
 * Get events in a depth range for specific wells
 * Used for the look-ahead feature
 */
export async function getEventsInDepthRange(
  wellIds: string[],
  startDepth: number,
  endDepth: number
) {
  const result = await query(
    `SELECT
      de.*,
      w.well_id as well_ref,
      w.name as well_name,
      d.document_id as source_document_ref,
      d.title as source_document_title,
      COALESCE(
        (SELECT json_agg(ea ORDER BY ea.sequence_number)
         FROM event_actions ea
         WHERE ea.event_id = de.id),
        '[]'::json
      ) as actions
    FROM drilling_events de
    JOIN wells w ON w.id = de.well_id
    LEFT JOIN documents d ON d.id = de.source_document_id
    WHERE w.well_id = ANY($1)
      AND de.start_depth_md >= $2
      AND de.start_depth_md <= $3
    ORDER BY de.start_depth_md`,
    [wellIds, startDepth, endDepth]
  );
  return result.rows;
}

/**
 * Get actions for an event
 */
export async function getEventActions(eventId: string) {
  const result = await query(
    `SELECT * FROM event_actions WHERE event_id = $1 ORDER BY sequence_number`,
    [eventId]
  );
  return result.rows;
}
