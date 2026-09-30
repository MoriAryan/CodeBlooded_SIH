import { Router } from 'express';
import * as wellsService from './service.js';
import { ApiError } from '../../middleware/errorHandler.js';

const router = Router();

/**
 * GET /api/wells
 * List all wells
 */
router.get('/', async (_req, res, next) => {
  try {
    const wells = await wellsService.getAllWells();
    res.json({ success: true, data: wells, meta: { total: wells.length } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/wells/:wellId
 * Get a specific well by well_id (e.g., "WELL-001")
 */
router.get('/:wellId', async (req, res, next) => {
  try {
    const wellId = req.params.wellId as string;
    const well = await wellsService.getWellByWellId(wellId);
    if (!well) {
      throw new ApiError(404, 'WELL_NOT_FOUND', `Well ${wellId} not found`);
    }
    res.json({ success: true, data: well });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/wells/:wellId/nearby?radius=5000
 * Get nearby wells within radius (default 10km)
 */
router.get('/:wellId/nearby', async (req, res, next) => {
  try {
    const wellId = req.params.wellId as string;
    const radiusMeters = parseInt(req.query.radius as string) || 10000;
    const wells = await wellsService.getNearbyWells(wellId, radiusMeters);
    res.json({
      success: true,
      data: wells,
      meta: { total: wells.length, radius_m: radiusMeters },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/wells/:wellId/formations
 * Get formation intervals for a well
 */
router.get('/:wellId/formations', async (req, res, next) => {
  try {
    const wellId = req.params.wellId as string;
    const formations = await wellsService.getFormations(wellId);
    res.json({ success: true, data: formations, meta: { total: formations.length } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/wells/:wellId/trajectory
 * Get trajectory points for a well
 */
router.get('/:wellId/trajectory', async (req, res, next) => {
  try {
    const wellId = req.params.wellId as string;
    const trajectory = await wellsService.getTrajectory(wellId);
    res.json({ success: true, data: trajectory, meta: { total: trajectory.length } });
  } catch (err) {
    next(err);
  }
});

export default router;
