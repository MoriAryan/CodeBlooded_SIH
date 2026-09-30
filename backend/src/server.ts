import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config.js';
import { logger } from './middleware/logger.js';
import { errorHandler, notFoundHandler, requestLogger } from './middleware/errorHandler.js';
import { testConnection } from './database/connection.js';

// Route modules
import healthRoutes from './modules/health/routes.js';
import wellsRoutes from './modules/wells/routes.js';
import eventsRoutes from './modules/events/routes.js';
import documentsRoutes from './modules/documents/routes.js';
import correlationRoutes from './modules/correlation/routes.js';

const app = express();
const httpServer = createServer(app);

// Socket.IO setup (for future telemetry in Phase 9)
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/wells', wellsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/correlation', correlationRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Socket.IO connection handler (placeholder for Phase 9)
io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'Client connected via Socket.IO');

  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id }, 'Client disconnected');
  });
});

// Start server
async function start() {
  // Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    logger.warn('Database not available. Server starting in degraded mode.');
  }

  httpServer.listen(config.port, () => {
    logger.info(`NWIS Backend running on http://localhost:${config.port}`);
    logger.info(`  Environment: ${config.env}`);
    logger.info(`  Database: ${dbConnected ? 'connected' : 'NOT CONNECTED'}`);
    logger.info(`  API base: http://localhost:${config.port}/api`);
    logger.info(`  Health: http://localhost:${config.port}/api/health`);
  });
}

start().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});

export { app, io };
