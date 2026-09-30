import { Router } from 'express';
import * as correlationService from './service.js';
import { ApiError } from '../../middleware/errorHandler.js';

const router = Router();

/**
 * GET /api/correlation/offsets/:wellId?radius=10000&lookahead=150
 * Get correlated offset wells with multi-factor relevance ranking
 */
router.get('/offsets/:wellId', async (req, res, next) => {
  try {
    const wellId = req.params.wellId as string;
    const radiusMeters = parseInt(req.query.radius as string) || 10000;
    const lookaheadWindowM = parseInt(req.query.lookahead as string) || 150;

    const offsets = await correlationService.getCorrelatedOffsets(
      wellId,
      radiusMeters,
      lookaheadWindowM
    );

    res.json({
      success: true,
      data: offsets,
      meta: {
        total: offsets.length,
        current_well: wellId,
        radius_m: radiusMeters,
        lookahead_window_m: lookaheadWindowM,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
