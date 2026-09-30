import { Router } from 'express';
import * as documentsService from './service.js';
import { ApiError } from '../../middleware/errorHandler.js';

const router = Router();

/**
 * GET /api/documents/well/:wellId
 * Get all documents for a well
 */
router.get('/well/:wellId', async (req, res, next) => {
  try {
    const wellId = req.params.wellId as string;
    const docs = await documentsService.getDocumentsByWell(wellId);
    res.json({ success: true, data: docs, meta: { total: docs.length } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/documents/:docId
 * Get a specific document
 */
router.get('/:docId', async (req, res, next) => {
  try {
    const docId = req.params.docId as string;
    const doc = await documentsService.getDocumentByDocId(docId);
    if (!doc) {
      throw new ApiError(404, 'DOCUMENT_NOT_FOUND', `Document ${docId} not found`);
    }
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/documents/:docId/pages
 * Get all pages of a document
 */
router.get('/:docId/pages', async (req, res, next) => {
  try {
    const docId = req.params.docId as string;
    const pages = await documentsService.getDocumentPages(docId);
    res.json({ success: true, data: pages, meta: { total: pages.length } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/documents/:docId/pages/:pageNumber
 * Get a specific page (evidence view)
 */
router.get('/:docId/pages/:pageNumber', async (req, res, next) => {
  try {
    const docId = req.params.docId as string;
    const pageNum = parseInt(req.params.pageNumber as string);
    const page = await documentsService.getDocumentPage(docId, pageNum);
    if (!page) {
      throw new ApiError(
        404,
        'PAGE_NOT_FOUND',
        `Page ${pageNum} of ${docId} not found`
      );
    }
    res.json({ success: true, data: page });
  } catch (err) {
    next(err);
  }
});

export default router;
