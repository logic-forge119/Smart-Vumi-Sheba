import { describe, it, expect, beforeEach } from 'vitest';
import { ApiRouter } from '../server/router.js';
import { loadEnv } from '../server/env.js';
import { Repository } from '../server/repositories/index.js';
import { evaluateVerification } from '../server/domain/verification/index.js';
import { syntheticDatasetV2 } from '../server/repositories/syntheticData.js';

describe('Phase 5 Deterministic Verification Engine & Idempotency Gate', () => {
  const env = loadEnv();
  const router = new ApiRouter(env);

  beforeEach(() => {
    Repository.resetForTesting();
  });

  // T01: 1234 BS seller C02 -> consistent
  it('T01: Evaluates scenario 1234 BS seller C02 as consistent with complete sources', async () => {
    const res = await router.handle({
      httpMethod: 'POST',
      path: '/api/v1/verifications',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer test-token-visitor'
      },
      body: JSON.stringify({ record_id: '1234', seller_id: 'C02', survey: 'BS' })
    });

    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.body);
    expect(data.report.outcome).toBe('consistent');
    expect(data.report.counts.fail).toBe(0);
    expect(data.report.counts.unknown).toBe(0);
    expect(data.report.snapshotSha256).toBeDefined();
  });

  // T02: 5678 RS seller C03 -> attention with conflicting deeds (double sale)
  it('T02: Evaluates scenario 5678 RS seller C03 as attention with conflicting deeds', async () => {
    const res = await router.handle({
      httpMethod: 'POST',
      path: '/api/v1/verifications',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer test-token-visitor'
      },
      body: JSON.stringify({ record_id: '5678', seller_id: 'C03', survey: 'RS' })
    });

    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.body);
    expect(data.report.outcome).toBe('attention');

    const doubleSaleCheck = data.report.checks.find((c: { id: string }) => c.id === 'double-sale');
    expect(doubleSaleCheck).toBeDefined();
    expect(doubleSaleCheck.state).toBe('fail');
    expect(doubleSaleCheck.evidence).toContain('DEMO-D002');
    expect(doubleSaleCheck.evidence).toContain('DEMO-D003');
  });

  // T03: 9012 BS seller C05 -> attention with khas and acquisition
  it('T03: Evaluates scenario 9012 BS seller C05 as attention with khas and acquisition', async () => {
    const res = await router.handle({
      httpMethod: 'POST',
      path: '/api/v1/verifications',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer test-token-visitor'
      },
      body: JSON.stringify({ record_id: '9012', seller_id: 'C05', survey: 'BS' })
    });

    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.body);
    expect(data.report.outcome).toBe('attention');

    const khasCheck = data.report.checks.find((c: { id: string }) => c.id === 'khas');
    const acqCheck = data.report.checks.find((c: { id: string }) => c.id === 'acquisition');
    expect(khasCheck.state).toBe('fail');
    expect(acqCheck.state).toBe('fail');
  });

  // T04: 3456 BS seller C06 -> incomplete and null remains unknown
  it('T04: Evaluates scenario 3456 BS seller C06 as incomplete and null remains unknown', async () => {
    const res = await router.handle({
      httpMethod: 'POST',
      path: '/api/v1/verifications',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer test-token-visitor'
      },
      body: JSON.stringify({ record_id: '3456', seller_id: 'C06', survey: 'BS' })
    });

    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.body);
    expect(data.report.outcome).toBe('incomplete');
    expect(data.report.counts.unknown).toBeGreaterThanOrEqual(4);

    const casesCheck = data.report.checks.find((c: { id: string }) => c.id === 'cases');
    expect(casesCheck.state).toBe('unknown');
  });

  // T13: Legitimate reacquisition A -> B -> A -> C does NOT trigger false double-sale
  it('T13: Legitimate reacquisition (A -> B, B -> A, A -> C) does not trigger false double-sale signal', () => {
    const testRecord = {
      id: '9999',
      plot: '9999',
      survey: 'BS',
      ownerId: 'C03',
      area: 10
    };

    const reacquisitionDataset = {
      ...syntheticDatasetV2,
      transfers: [
        {
          id: 'DEED-1',
          plot: '9999',
          survey: 'BS',
          sellerId: 'C01',
          buyerId: 'C02',
          date: '2020-01-01',
          area: 10,
          areaScope: 'full' as const,
          status: 'registered' as const,
          source: 'test'
        },
        {
          id: 'DEED-2',
          plot: '9999',
          survey: 'BS',
          sellerId: 'C02',
          buyerId: 'C01',
          date: '2022-01-01',
          area: 10,
          areaScope: 'full' as const,
          status: 'registered' as const,
          source: 'test'
        },
        {
          id: 'DEED-3',
          plot: '9999',
          survey: 'BS',
          sellerId: 'C01',
          buyerId: 'C03',
          date: '2024-01-01',
          area: 10,
          areaScope: 'full' as const,
          status: 'registered' as const,
          source: 'test'
        }
      ],
      mutations: [
        {
          id: 'MUT-9999',
          plot: '9999',
          survey: 'BS',
          ownerId: 'C03',
          status: 'completed' as const,
          deedId: 'DEED-3',
          date: '2024-02-01',
          source: 'test'
        }
      ],
      status: [
        {
          id: 'STATUS-9999',
          plot: '9999',
          survey: 'BS',
          pendingCases: [],
          mortgage: false,
          khas: false,
          vested: false,
          acquisition: false,
          taxPaid: true,
          source: 'test'
        }
      ]
    };

    const result = evaluateVerification(testRecord, 'C03', reacquisitionDataset, 'v1');
    const doubleSaleCheck = result.checks.find(c => c.id === 'double-sale');
    expect(doubleSaleCheck?.state).toBe('pass');
    expect(result.conflicts.length).toBe(0);
  });

  // T14: Partial share or ambiguous deed marks double-sale unknown
  it('T14: Partial share deed marks double-sale check as unknown for unsupported chain', () => {
    const testRecord = {
      id: '8888',
      plot: '8888',
      survey: 'BS',
      ownerId: 'C02',
      area: 10
    };

    const partialDataset = {
      ...syntheticDatasetV2,
      transfers: [
        {
          id: 'DEED-PARTIAL',
          plot: '8888',
          survey: 'BS',
          sellerId: 'C01',
          buyerId: 'C02',
          date: '2025-01-01',
          area: 5,
          areaScope: 'partial' as const,
          status: 'registered' as const,
          source: 'test'
        }
      ],
      mutations: [],
      status: []
    };

    const result = evaluateVerification(testRecord, 'C02', partialDataset, 'v1');
    const doubleSaleCheck = result.checks.find(c => c.id === 'double-sale');
    expect(doubleSaleCheck?.state).toBe('unknown');
  });

  // T15: Idempotency: same user key + same body produces one report and replay
  it('T15: Re-submitting with identical Idempotency-Key and body replays original report', async () => {
    const idempotencyKey = 'IDEM-KEY-UNIQUE-12345678';
    const bodyStr = JSON.stringify({ record_id: '1234', seller_id: 'C02' });

    // Request 1
    const res1 = await router.handle({
      httpMethod: 'POST',
      path: '/api/v1/verifications',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer test-token-user-idem',
        'idempotency-key': idempotencyKey
      },
      body: bodyStr
    });

    expect(res1.statusCode).toBe(201);
    const data1 = JSON.parse(res1.body);
    expect(data1.replayed).toBe(false);
    const originalReportId = data1.id;

    // Request 2 (Duplicate replay)
    const res2 = await router.handle({
      httpMethod: 'POST',
      path: '/api/v1/verifications',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer test-token-user-idem',
        'idempotency-key': idempotencyKey
      },
      body: bodyStr
    });

    expect(res2.statusCode).toBe(200);
    const data2 = JSON.parse(res2.body);
    expect(data2.replayed).toBe(true);
    expect(data2.id).toBe(originalReportId);
  });

  // T16: Idempotency: same key + different body produces 409 Conflict
  it('T16: Re-submitting same Idempotency-Key with different payload returns 409 Conflict', async () => {
    const idempotencyKey = 'IDEM-KEY-CONFLICT-12345678';

    // Initial request
    await router.handle({
      httpMethod: 'POST',
      path: '/api/v1/verifications',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer test-token-user-idem2',
        'idempotency-key': idempotencyKey
      },
      body: JSON.stringify({ record_id: '1234', seller_id: 'C02' })
    });

    // Conflicting request with different payload
    const resConflict = await router.handle({
      httpMethod: 'POST',
      path: '/api/v1/verifications',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer test-token-user-idem2',
        'idempotency-key': idempotencyKey
      },
      body: JSON.stringify({ record_id: '5678', seller_id: 'C03' })
    });

    expect(resConflict.statusCode).toBe(409);
    const dataConflict = JSON.parse(resConflict.body);
    expect(dataConflict.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });
});
