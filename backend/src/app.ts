import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { apiRoutes } from './routes';
import { requestId } from './middleware/requestId';
import { httpLogger } from './utils/logger';
import { notFoundHandler } from './middleware/notFoundHandler';
import { errorHandler } from './middleware/errorHandler';

export function createApp(): Application {
  const app: Application = express();

  // Correlation Request ID
  app.use(requestId);

  // Structured HTTP logging with Pino
  app.use(httpLogger);

  // Security HTTP headers
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );

  // Body parsing & cookies
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Mount API routes
  app.use('/api', apiRoutes);

  // 404 Handler for undefined routes
  app.use(notFoundHandler);

  // Centralized error handler conforming to AGENTS.md format
  app.use(errorHandler);

  return app;
}

export const app: Application = createApp();
export default app;
