import { Router } from 'express';
import * as eventsService from './service.js';
import { ApiError } from '../../middleware/errorHandler.js';

const router = Router();

/**
 * GET /api/events/well/:wellId
 * Get all events for a specific well
 */
router.get('/well/:wellId', async (req, res, next) => {
  try {
    const wellId = req.params.wellId as string;
    const events = await eventsService.getEventsByWell(wellId);
    res.json({ success: true, data: events, meta: { total: events.length } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/events/:eventId
 * Get a specific event with its actions
 */
router.get('/:eventId', async (req, res, next) => {
  try {
    const eventId = req.params.eventId as string;
    const event = await eventsService.getEventById(eventId);
    if (!event) {
      throw new ApiError(404, 'EVENT_NOT_FOUND', `Event ${eventId} not found`);
    }
    res.json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/events/type/:eventType
 * Get all events of a specific type
 */
router.get('/type/:eventType', async (req, res, next) => {
  try {
    const eventType = req.params.eventType as string;
    const events = await eventsService.getEventsByType(eventType);
    res.json({ success: true, data: events, meta: { total: events.length } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/events/lookahead/search?wells=WELL-007,WELL-011&start=3190&end=3240
 * Look-ahead: find historical events ahead of current depth
 */
router.get('/lookahead/search', async (req, res, next) => {
  try {
    const wellIds = (req.query.wells as string)?.split(',') ?? [];
    const startDepth = parseFloat(req.query.start as string);
    const endDepth = parseFloat(req.query.end as string);

    if (wellIds.length === 0 || isNaN(startDepth) || isNaN(endDepth)) {
      throw new ApiError(
        400,
        'INVALID_PARAMS',
        'Required: wells (comma-separated), start (depth), end (depth)'
      );
    }

    const events = await eventsService.getEventsInDepthRange(wellIds, startDepth, endDepth);
    res.json({
      success: true,
      data: events,
      meta: {
        total: events.length,
        depth_range: { start: startDepth, end: endDepth },
        wells_queried: wellIds,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
