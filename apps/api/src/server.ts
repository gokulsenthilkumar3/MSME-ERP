import app from './app';
import { config } from './config';
import { logger } from './lib/logger';

const server = app.listen(config.port, () => {
  logger.info(`🚀 MSME ERP API running on http://localhost:${config.port}`);
  logger.info(`   Environment: ${config.nodeEnv}`);
  logger.info(`   Health check: http://localhost:${config.port}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
