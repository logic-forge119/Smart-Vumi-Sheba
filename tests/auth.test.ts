import { describe, it, expect, beforeEach } from 'vitest';
import { ApiRouter } from '../server/router.js';
import { loadEnv } from '../server/env.js';
import { Repository } from '../server/repositories/index.js';

describe('Phase 3 Auth & Authorization Gate', () => {
  const env = loadEnv();
  const router = new ApiRouter(env);

  beforeEach(() => {
    Repository.resetForTesting();
  });

  it('Missing or empty Authorization header returns 401', async () => {
    const res = await router.handle({
      httpMethod: 'POST',
      path: '/api/v1/verifications',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({ record_id: '1234', seller_id: 'C02' })
    });

    expect(res.statusCode).toBe(401);
    const data = JSON.parse(res.body);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('Expired or forged JWT token is rejected with 401', async () => {
    for (const badToken of ['forged-token', 'expired-token']) {
      const res = await router.handle({
        httpMethod: 'POST',
        path: '/api/v1/verifications',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${badToken}`
        },
        body: JSON.stringify({ record_id: '1234', seller_id: 'C02' })
      });

      expect(res.statusCode).toBe(401);
      const data = JSON.parse(res.body);
      expect(data.error.code).toBe('INVALID_TOKEN');
    }
  });

  it('Two users are strictly isolated (User B cannot read User A report)', async () => {
    // 1. User A creates a verification report
    const resA = await router.handle({
      httpMethod: 'POST',
      path: '/api/v1/verifications',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer test-token-user-a'
      },
      body: JSON.stringify({ record_id: '1234', seller_id: 'C02' })
    });

    expect(resA.statusCode).toBe(201);
    const reportA = JSON.parse(resA.body);
    const reportId = reportA.id;
    expect(reportId).toBeDefined();

    // 2. User A can read their own report
    const readA = await router.handle({
      httpMethod: 'GET',
      path: `/api/v1/reports/${reportId}`,
      headers: {
        'authorization': 'Bearer test-token-user-a'
      }
    });
    expect(readA.statusCode).toBe(200);

    // 3. User B attempts to read User A's report -> 404 NOT_FOUND (IDOR isolated)
    const readB = await router.handle({
      httpMethod: 'GET',
      path: `/api/v1/reports/${reportId}`,
      headers: {
        'authorization': 'Bearer test-token-user-b'
      }
    });
    expect(readB.statusCode).toBe(404);
    const errorB = JSON.parse(readB.body);
    expect(errorB.error.code).toBe('REPORT_NOT_FOUND');
  });

  it('Two users are strictly isolated on drafts (User B cannot update or delete User A draft)', async () => {
    // 1. User A creates a draft
    const draftId = 'd0000000-0000-0000-0000-000000000001';
    const resA = await router.handle({
      httpMethod: 'POST',
      path: '/api/v1/drafts',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer test-token-user-a'
      },
      body: JSON.stringify({
        client_draft_id: draftId,
        revision: 1,
        body: { note: 'Draft by user A' }
      })
    });
    expect(resA.statusCode).toBe(201);

    // 2. User B attempts to read User A's draft -> 404
    const getB = await router.handle({
      httpMethod: 'GET',
      path: `/api/v1/drafts/${draftId}`,
      headers: {
        'authorization': 'Bearer test-token-user-b'
      }
    });
    expect(getB.statusCode).toBe(404);

    // 3. User B attempts to delete User A's draft -> 404 and draft remains untouched
    const delB = await router.handle({
      httpMethod: 'DELETE',
      path: `/api/v1/drafts/${draftId}`,
      headers: {
        'authorization': 'Bearer test-token-user-b'
      }
    });
    expect(delB.statusCode).toBe(404);

    // 4. User A can still read their draft intact
    const getA = await router.handle({
      httpMethod: 'GET',
      path: `/api/v1/drafts/${draftId}`,
      headers: {
        'authorization': 'Bearer test-token-user-a'
      }
    });
    expect(getA.statusCode).toBe(200);
    const draftData = JSON.parse(getA.body);
    expect(draftData.body.note).toBe('Draft by user A');
  });

  it('Self-promotion impossible: submitting role or owner_uid in body is rejected with 422', async () => {
    const maliciousBody = {
      record_id: '1234',
      seller_id: 'C02',
      role: 'admin',
      owner_uid: '00000000-0000-0000-0000-000000000999'
    };

    const res = await router.handle({
      httpMethod: 'POST',
      path: '/api/v1/verifications',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer test-token-user-visitor'
      },
      body: JSON.stringify(maliciousBody)
    });

    expect(res.statusCode).toBe(422);
    const data = JSON.parse(res.body);
    expect(data.error.code).toBe('UNEXPECTED_FIELD');
  });
});
