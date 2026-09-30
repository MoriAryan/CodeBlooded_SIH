-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- pgvector will be added when semantic search is needed (Phase 4+)
-- CREATE EXTENSION IF NOT EXISTS vector;
