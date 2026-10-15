import { describe, it, expect } from 'vitest';
import { ApiRouter } from '../server/router.js';
import type { ServerEnv } from '../server/env.js';

describe('Production Supabase Guards & Security Invariants', () => {
  const prodEnvWithoutSupabase: ServerEnv = {
    supabaseUrl: '',
    supabaseServiceRoleKey: '',
    allowedOrigins: ['http://localhost:8888'],
    dataMode: 'synthetic',
    activeRulesVersion: 'v1',
    activeDatasetVersion: 'synthetic-v2',
    nodeEnv: 'production'
  };

  const prodRouter = new ApiRouter(prodEnvWithoutSupabase);

  it('Production rejects test-token-* with 401 INVALID_TOKEN', async () => {
    const res = await prodRouter.handle({
      httpMethod: 'GET',
      path: '/api/v1/reports',
      headers: {
        'authorization': 'Bearer test-token-admin'
      }
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('INVALID_TOKEN');
    expect(body.error.message_bn).toContain('টেস্ট টোকেন প্রোডাকশন পরিবেশে অনুমোদিত নয়');
  });

  it('Production without Supabase config returns 503 on real token verification', async () => {
    const res = await prodRouter.handle({
      httpMethod: 'GET',
      path: '/api/v1/reports',
      headers: {
        'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy'
      }
    });

    expect(res.statusCode).toBe(503);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(body.error.message_bn).toContain('Supabase কনফিগারেশন অনুপস্থিত');
  });

  it('Production without Supabase config returns 503 on registry search and records', async () => {
    const res = await prodRouter.handle({
      httpMethod: 'GET',
      path: '/api/v1/records/1234',
      headers: {}
    });

    expect(res.statusCode).toBe(503);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(body.error.message_bn).toContain('মেমরি ফলব্যাক নিষিদ্ধ');
  });

  it('Enforces Cache-Control: no-store on all API endpoints (success & error)', async () => {
    const endpoints = [
      { method: 'GET', path: '/api/v1/health' },
      { method: 'GET', path: '/api/v1/locations' },
      { method: 'GET', path: '/api/v1/scenarios' },
      { method: 'GET', path: '/api/v1/citizens' },
      { method: 'OPTIONS', path: '/api/v1/verifications' },
      { method: 'POST', path: '/api/v1/verifications', headers: { 'content-type': 'text/plain' }, body: 'invalid' }
    ];

    for (const ep of endpoints) {
      const res = await prodRouter.handle({
        httpMethod: ep.method,
        path: ep.path,
        headers: ep.headers || {},
        body: ep.body || null
      });

      expect(res.headers['cache-control']).toBe('no-store, no-cache, must-revalidate, max-age=0');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    }
  });

  it('Shared Rate Limiter triggers 429 when client exceeds request quota', async () => {
    const testEnv: ServerEnv = {
      supabaseUrl: '',
      supabaseServiceRoleKey: '',
      allowedOrigins: ['http://localhost:8888'],
      dataMode: 'synthetic',
      activeRulesVersion: 'v1',
      activeDatasetVersion: 'synthetic-v2',
      nodeEnv: 'test'
    };
    const rateLimitedRouter = new ApiRouter(testEnv);

    let lastStatus = 200;
    // Exhaust write bucket (max 30 tokens)
    for (let i = 0; i < 35; i++) {
      const res = await rateLimitedRouter.handle({
        httpMethod: 'POST',
        path: '/api/v1/drafts',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer test-token-rate-limit-user',
          'x-forwarded-for': '198.51.100.25'
        },
        body: JSON.stringify({
          client_draft_id: `rate-limit-draft-${i}`,
          revision: 1,
          body: { step: i }
        })
      });
      lastStatus = res.statusCode;
      if (lastStatus === 429) {
        const body = JSON.parse(res.body);
        expect(body.error.code).toBe('TOO_MANY_REQUESTS');
        expect(body.error.message_bn).toContain('অনুরোধের সীমা অতিক্রম করেছে');
        break;
      }
    }

    expect(lastStatus).toBe(429);
  });
});
