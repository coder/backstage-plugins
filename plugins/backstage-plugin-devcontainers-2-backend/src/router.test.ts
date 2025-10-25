import { getVoidLogger } from '@backstage/backend-common';
import express from 'express';
import request from 'supertest';
import { createRouter } from './router';

async function initApp(): Promise<express.Express> {
  const logger = getVoidLogger();
  const router = await createRouter({ logger });
  const app = express().use(router);
  return app;
}

describe('createRouter', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /health', () => {
    it('returns ok', async () => {
      const app = await initApp();
      const response = await request(app).get('/health');

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });
});
