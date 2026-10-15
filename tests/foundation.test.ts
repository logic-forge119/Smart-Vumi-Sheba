import { describe, it, expect } from 'vitest';
import { ApiRouter } from '../server/router.js';
import { loadEnv } from '../server/env.js';

describe('Phase 1 Foundation: Router & Health Gate', () => {
  const env = loadEnv();
  const router = new ApiRouter(env);

  it('GET /health returns 200 ok and exposes no secret variables', async () => {
    const res = await router.handle({
      httpMethod: 'GET',
      path: '/api/v1/health',
      headers: {}
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers['cache-control']).toBe('no-store, no-cache, must-revalidate, max-age=0');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-request-id']).toBeDefined();

    const data = JSON.parse(res.body);
    expect(data.status).toBe('ok');
    expect(data.data_mode).toBe('synthetic');
    expect(data.dataset_version).toBe('synthetic-v2');
    expect(data.rules_version).toBe('v1');
    expect(data.timestamp).toBeDefined();

    // Verify no secret leak
    const bodyStr = res.body.toLowerCase();
    expect(bodyStr).not.toContain('secret');
    expect(bodyStr).not.toContain('service_role');
    expect(bodyStr).not.toContain('key');
  });

  it('Rejects POST request without application/json content-type with 415', async () => {
    const res = await router.handle({
      httpMethod: 'POST',
      path: '/api/v1/verifications',
      headers: {
        'content-type': 'text/plain',
        'authorization': 'Bearer test-token-user-a'
      },
      body: 'invalid text'
    });

    expect(res.statusCode).toBe(415);
    const data = JSON.parse(res.body);
    expect(data.error).toBeDefined();
    expect(data.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
    expect(data.error.request_id).toBeDefined();
  });

  it('Rejects oversized payload (>32 KiB) with 422', async () => {
    const hugeBody = JSON.stringify({ padding: 'x'.repeat(33 * 1024) });
    const res = await router.handle({
      httpMethod: 'POST',
      path: '/api/v1/drafts',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer test-token-user-a'
      },
      body: hugeBody
    });

    expect(res.statusCode).toBe(422);
    const data = JSON.parse(res.body);
    expect(data.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('Returns 404 with structured error for unknown routes', async () => {
    const res = await router.handle({
      httpMethod: 'GET',
      path: '/api/v1/non-existent-route',
      headers: {}
    });

    expect(res.statusCode).toBe(404);
    const data = JSON.parse(res.body);
    expect(data.error.code).toBe('NOT_FOUND');
  });
});
