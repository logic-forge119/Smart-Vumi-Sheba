import { describe, it, expect, beforeEach } from 'vitest';
import { ApiRouter } from '../server/router.js';
import { loadEnv } from '../server/env.js';
import { Repository } from '../server/repositories/index.js';

describe('Phase 6 Reports and Revisioned Drafts Gate', () => {
  const env = loadEnv();
  const router = new ApiRouter(env);

  beforeEach(() => {
    Repository.resetForTesting();
  });

  it('Owner history: lists user reports in reverse chronological order', async () => {
    // User creates 2 reports
    await router.handle({
      httpMethod: 'POST',
      path: '/api/v1/verifications',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer test-token-user-hist'
      },
      body: JSON.stringify({ record_id: '1234', seller_id: 'C02' })
    });

    await router.handle({
      httpMethod: 'POST',
      path: '/api/v1/verifications',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer test-token-user-hist'
      },
      body: JSON.stringify({ record_id: '5678', seller_id: 'C03' })
    });

    const res = await router.handle({
      httpMethod: 'GET',
      path: '/api/v1/reports',
      headers: {
        'authorization': 'Bearer test-token-user-hist'
      }
    });

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body);
    expect(data.count).toBe(2);
    expect(data.items.length).toBe(2);
    // Verified reverse chronological order
    expect(new Date(data.items[0].generatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(data.items[1].generatedAt).getTime()
    );
  });

  it('Revisioned draft endpoints: optimistic concurrency (T18: stale revision yields 409)', async () => {
    const draftId = 'd1111111-1111-1111-1111-111111111111';

    // 1. Create initial draft (revision 1)
    const createRes = await router.handle({
      httpMethod: 'POST',
      path: '/api/v1/drafts',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer test-token-user-rev'
      },
      body: JSON.stringify({
        client_draft_id: draftId,
        revision: 1,
        body: { note: 'Initial draft content', step: 1 }
      })
    });

    expect(createRes.statusCode).toBe(201);
    const draft1 = JSON.parse(createRes.body);
    expect(draft1.revision).toBe(1);

    // 2. Successful update with matching revision 1 -> becomes revision 2
    const updateRes1 = await router.handle({
      httpMethod: 'PUT',
      path: `/api/v1/drafts/${draftId}`,
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer test-token-user-rev'
      },
      body: JSON.stringify({
        client_draft_id: draftId,
        revision: 1,
        body: { note: 'Updated draft content', step: 2 }
      })
    });

    expect(updateRes1.statusCode).toBe(200);
    const draft2 = JSON.parse(updateRes1.body);
    expect(draft2.revision).toBe(2);

    // 3. Stale update: trying to update with stale revision 1 yields 409 Conflict
    const updateStale = await router.handle({
      httpMethod: 'PUT',
      path: `/api/v1/drafts/${draftId}`,
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer test-token-user-rev'
      },
      body: JSON.stringify({
        client_draft_id: draftId,
        revision: 1,
        body: { note: 'Stale concurrent update', step: 3 }
      })
    });

    expect(updateStale.statusCode).toBe(409);
    const errData = JSON.parse(updateStale.body);
    expect(errData.error.code).toBe('DRAFT_CONFLICT');
  });

  it('Delete draft removes draft for owner and returns 404 for non-existent', async () => {
    const draftId = 'd2222222-2222-2222-2222-222222222222';

    await router.handle({
      httpMethod: 'POST',
      path: '/api/v1/drafts',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer test-token-user-del'
      },
      body: JSON.stringify({
        client_draft_id: draftId,
        revision: 1,
        body: { note: 'To be deleted' }
      })
    });

    const delRes = await router.handle({
      httpMethod: 'DELETE',
      path: `/api/v1/drafts/${draftId}`,
      headers: {
        'authorization': 'Bearer test-token-user-del'
      }
    });

    expect(delRes.statusCode).toBe(200);

    // Second delete yields 404
    const delAgain = await router.handle({
      httpMethod: 'DELETE',
      path: `/api/v1/drafts/${draftId}`,
      headers: {
        'authorization': 'Bearer test-token-user-del'
      }
    });
    expect(delAgain.statusCode).toBe(404);
  });
});
