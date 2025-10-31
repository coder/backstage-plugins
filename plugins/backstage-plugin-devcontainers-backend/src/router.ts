import type { LoggerService } from '@backstage/backend-plugin-api';
import express, { type ErrorRequestHandler } from 'express';
import Router from 'express-promise-router';

export interface RouterOptions {
  logger: LoggerService;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger } = options;

  const router = Router();
  router.use(express.json());

  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

  // Error handler middleware
  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    logger.error(`Error: ${error.message}`);
    res.status(error.status || 500).json({ error: error.message });
  };
  router.use(errorHandler);

  return router;
}
