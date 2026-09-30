import pg from 'pg';
import { config } from '../config.js';
import { logger } from '../middleware/logger.js';

const { Pool, types } = pg;

// Parse PostgreSQL numeric (OID 1700) as float so numbers aren't returned as strings
types.setTypeParser(1700, (val: string) => (val === null ? null : parseFloat(val)));

export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected database pool error');
});

/**
 * Test database connectivity
 */
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as now, PostGIS_Version() as postgis');
    logger.info(
      { time: result.rows[0].now, postgis: result.rows[0].postgis },
      'Database connected'
    );
    client.release();
    return true;
  } catch (err) {
    logger.error({ err }, 'Database connection failed');
    return false;
  }
}

/**
 * Helper for running queries
 */
export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;

  if (duration > 500) {
    logger.warn({ duration, query: text.substring(0, 100) }, 'Slow query detected');
  }

  return result;
}

/**
 * Helper for running queries within a transaction
 */
export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
