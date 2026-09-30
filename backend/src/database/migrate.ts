import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, testConnection } from './connection.js';
import { logger } from '../middleware/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, 'migrations');

async function migrate() {
  logger.info('Starting database migration...');

  const connected = await testConnection();
  if (!connected) {
    logger.error('Cannot connect to database. Aborting migration.');
    process.exit(1);
  }

  // Ensure _migrations table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Get already-applied migrations
  const applied = await pool.query('SELECT name FROM _migrations ORDER BY id');
  const appliedNames = new Set(applied.rows.map((r) => r.name));

  // Read migration files
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let migrationsRun = 0;

  for (const file of files) {
    const name = file.replace('.sql', '');

    if (appliedNames.has(name)) {
      logger.info(`  ✓ ${name} (already applied)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');

    try {
      await pool.query(sql);
      logger.info(`  ✓ ${name} (applied)`);
      migrationsRun++;
    } catch (err) {
      logger.error({ err, migration: name }, `  ✗ ${name} FAILED`);
      process.exit(1);
    }
  }

  logger.info(`Migration complete. ${migrationsRun} new migration(s) applied.`);
  await pool.end();
}

migrate().catch((err) => {
  logger.error({ err }, 'Migration failed');
  process.exit(1);
});
