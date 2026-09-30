import { query } from '../../database/connection.js';

/**
 * Get all documents for a well
 */
export async function getDocumentsByWell(wellId: string) {
  const result = await query(
    `SELECT d.*
     FROM documents d
     JOIN wells w ON w.id = d.well_id
     WHERE w.well_id = $1
     ORDER BY d.upload_date`,
    [wellId]
  );
  return result.rows;
}

/**
 * Get a document by its human-readable document_id
 */
export async function getDocumentByDocId(docId: string) {
  const result = await query(
    `SELECT d.*, w.well_id as well_ref
     FROM documents d
     JOIN wells w ON w.id = d.well_id
     WHERE d.document_id = $1`,
    [docId]
  );
  return result.rows[0] ?? null;
}

/**
 * Get pages of a document
 */
export async function getDocumentPages(docId: string) {
  const result = await query(
    `SELECT dp.*
     FROM document_pages dp
     JOIN documents d ON d.id = dp.document_id
     WHERE d.document_id = $1
     ORDER BY dp.page_number`,
    [docId]
  );
  return result.rows;
}

/**
 * Get a specific page from a document
 */
export async function getDocumentPage(docId: string, pageNumber: number) {
  const result = await query(
    `SELECT
       dp.*,
       d.document_id,
       d.title as document_title,
       d.document_type,
       d.total_pages,
       d.source,
       w.well_id as well_ref,
       w.name as well_name
     FROM document_pages dp
     JOIN documents d ON d.id = dp.document_id
     JOIN wells w ON w.id = d.well_id
     WHERE d.document_id = $1 AND dp.page_number = $2`,
    [docId, pageNumber]
  );
  return result.rows[0] ?? null;
}

