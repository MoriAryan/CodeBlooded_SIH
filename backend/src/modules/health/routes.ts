import { Router, Request, Response } from 'express';
import { testConnection, pool } from '../../database/connection.js';

const router = Router();

/**
 * GET /api/health
 * System health check
 */
router.get('/', async (_req: Request, res: Response) => {
  const dbConnected = await testConnection();

  const status = {
    service: 'nwis-backend',
    status: dbConnected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    components: {
      database: dbConnected ? 'connected' : 'disconnected',
      api: 'running',
    },
  };

  res.status(dbConnected ? 200 : 503).json(status);
});

/**
 * GET /api/health/db
 * Database-specific health with table counts
 */
router.get('/db', async (_req: Request, res: Response) => {
  try {
    const tables = ['wells', 'well_locations', 'trajectory_points', 'formation_intervals',
      'documents', 'document_pages', 'drilling_events', 'event_actions'];

    const counts: Record<string, number> = {};
    for (const table of tables) {
      const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
      counts[table] = parseInt(result.rows[0].count);
    }

    res.json({
      success: true,
      data: {
        status: 'connected',
        tables: counts,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      error: { code: 'DB_ERROR', message: 'Database health check failed' },
    });
  }
});

export default router;
