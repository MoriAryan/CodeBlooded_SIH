import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.BACKEND_PORT || '3001', 10),

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'nwis',
    user: process.env.DB_USER || 'nwis_user',
    password: process.env.DB_PASSWORD || 'nwis_dev_password',
  },

  pythonService: {
    url: process.env.PYTHON_SERVICE_URL || 'http://localhost:5001',
  },
} as const;
