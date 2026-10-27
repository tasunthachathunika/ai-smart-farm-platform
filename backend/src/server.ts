import { env } from './config/env';
import { app } from './app';
import { logger } from './utils/logger';
import { closePool } from './db';
import { runMigrations } from './db/migrate';

async function startServer(): Promise<void> {
  try {
    // Run pending database migrations automatically at startup
    await runMigrations();

    const server = app.listen(env.PORT, () => {
      logger.info(`Goviya Plus backend listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed');
        try {
          await closePool();
          logger.info('Database connection pool closed');
          process.exit(0);
        } catch (err) {
          logger.error({ err }, 'Error during shutdown');
          process.exit(1);
        }
      });

      // Force close after 10 seconds if graceful shutdown takes too long
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error({ err }, 'Fatal error during server startup');
    process.exit(1);
  }
}

void startServer();
