import { describe, it, expect } from 'vitest';
import { handler } from '../netlify/functions/api.js';

describe('Netlify Serverless Function Handler & Routing', () => {
  it('Handles /api/v1/health via Netlify function event', async () => {
    const event = {
      httpMethod: 'GET',
      path: '/.netlify/functions/api/v1/health',
      headers: {},
      queryStringParameters: null,
      body: null
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(body.data_mode).toBe('synthetic');
  });

  it('Handles /api/records search via Netlify redirect path', async () => {
    const event = {
      httpMethod: 'GET',
      path: '/.netlify/functions/api/records',
      headers: {},
      queryStringParameters: {
        khatian_no: '1234',
        survey: 'BS'
      },
      body: null
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.total).toBe(1);
    expect(body.items[0].id).toBe('1234');
  });

  it('Rejects invalid method/path with structured JSON and 404 (never HTML)', async () => {
    const event = {
      httpMethod: 'GET',
      path: '/.netlify/functions/api/invalid-endpoint',
      headers: {},
      queryStringParameters: null,
      body: null
    };

    const res = await handler(event);
    expect(res.statusCode).toBe(404);
    expect(res.headers['content-type']).toContain('application/json');
    const body = JSON.parse(res.body);
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(res.body).not.toContain('<!doctype');
  });
});
