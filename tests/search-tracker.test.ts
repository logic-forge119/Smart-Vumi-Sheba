import { describe, it, expect } from 'vitest';
import { ApiRouter } from '../server/router.js';
import { loadEnv } from '../server/env.js';

describe('Phase 4 Search and Mutation Tracker Gate', () => {
  const env = loadEnv();
  const router = new ApiRouter(env);

  it('Searches and finds four known synthetic records with pagination', async () => {
    const res = await router.handle({
      httpMethod: 'GET',
      path: '/api/v1/records',
      queryStringParameters: {
        district: 'ঢাকা',
        upazila: 'সাভার',
        mouza: 'আশুলিয়া',
        limit: '10',
        offset: '0'
      },
      headers: {}
    });

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body);
    expect(data.total).toBe(4);
    expect(data.items.length).toBe(4);

    const khatians = data.items.map((r: { id: string }) => r.id);
    expect(khatians).toContain('1234');
    expect(khatians).toContain('5678');
    expect(khatians).toContain('9012');
    expect(khatians).toContain('3456');
  });

  it('Normalizes Bengali digits in khatian search (১২৩৪ == 1234)', async () => {
    const res = await router.handle({
      httpMethod: 'GET',
      path: '/api/v1/records',
      queryStringParameters: {
        district: 'ঢাকা',
        upazila: 'সাভার',
        mouza: 'আশুলিয়া',
        survey: 'BS',
        khatian_no: '১২৩৪'
      },
      headers: {}
    });

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body);
    expect(data.total).toBe(1);
    expect(data.items[0].id).toBe('1234');
    expect(data.items[0].plot).toBe('1204');
  });

  it('Enforces exact scope isolation (wrong survey or mouza returns 0 matches)', async () => {
    // 5678 exists in RS, searching with BS must yield 0 matches
    const resWrongSurvey = await router.handle({
      httpMethod: 'GET',
      path: '/api/v1/records',
      queryStringParameters: {
        district: 'ঢাকা',
        upazila: 'সাভার',
        mouza: 'আশুলিয়া',
        survey: 'BS',
        khatian_no: '5678'
      },
      headers: {}
    });

    expect(resWrongSurvey.statusCode).toBe(200);
    const dataWrongSurvey = JSON.parse(resWrongSurvey.body);
    expect(dataWrongSurvey.total).toBe(0);
    expect(dataWrongSurvey.items.length).toBe(0);

    // Searching in a different mouza must yield 0 matches
    const resWrongMouza = await router.handle({
      httpMethod: 'GET',
      path: '/api/v1/records',
      queryStringParameters: {
        district: 'ঢাকা',
        upazila: 'সাভার',
        mouza: 'মিরপুর',
        khatian_no: '1234'
      },
      headers: {}
    });

    expect(resWrongMouza.statusCode).toBe(200);
    const dataWrongMouza = JSON.parse(resWrongMouza.body);
    expect(dataWrongMouza.total).toBe(0);
  });

  it('Tracks synthetic mutation applications with ordered stages', async () => {
    // 1. Pending mutation MUT-2026-8849
    const resPending = await router.handle({
      httpMethod: 'GET',
      path: '/api/v1/mutations/MUT-2026-8849',
      headers: {}
    });

    expect(resPending.statusCode).toBe(200);
    const mutPending = JSON.parse(resPending.body);
    expect(mutPending.tracking_code).toBe('MUT-2026-8849');
    expect(mutPending.status).toBe('pending');
    expect(mutPending.stage).toBe(2);
    expect(mutPending.stage_label).toBe('তদন্ত ও প্রতিবেদন');
    expect(mutPending.days_elapsed).toBe(8);

    // 2. Completed mutation MUT-2026-1021 with Bengali digits
    const resCompleted = await router.handle({
      httpMethod: 'GET',
      path: '/api/v1/mutations/MUT-২০২৬-১০২১',
      headers: {}
    });

    expect(resCompleted.statusCode).toBe(200);
    const mutCompleted = JSON.parse(resCompleted.body);
    expect(mutCompleted.tracking_code).toBe('MUT-2026-1021');
    expect(mutCompleted.status).toBe('completed');
    expect(mutCompleted.stage).toBe(4);
    expect(mutCompleted.stage_label).toBe('খতিয়ান অনুমোদন ও DCR');

    // 3. Unknown tracking code
    const resUnknown = await router.handle({
      httpMethod: 'GET',
      path: '/api/v1/mutations/MUT-9999-9999',
      headers: {}
    });
    expect(resUnknown.statusCode).toBe(404);
    const errUnknown = JSON.parse(resUnknown.body);
    expect(errUnknown.error.code).toBe('MUTATION_NOT_FOUND');
  });

  it('GET /locations and /citizens return synthetic references', async () => {
    const resLoc = await router.handle({
      httpMethod: 'GET',
      path: '/api/v1/locations',
      headers: {}
    });
    expect(resLoc.statusCode).toBe(200);
    const loc = JSON.parse(resLoc.body);
    expect(loc.mouza).toBe('আশুলিয়া');

    const resCit = await router.handle({
      httpMethod: 'GET',
      path: '/api/v1/citizens',
      headers: {}
    });
    expect(resCit.statusCode).toBe(200);
    const cit = JSON.parse(resCit.body);
    expect(cit.count).toBe(6);
  });
});
