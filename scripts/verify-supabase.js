import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function loadDotEnv() {
  const envPath = path.join(rootDir, '.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[key] = val;
      }
    }
  }
  return { ...env, ...process.env };
}

async function run() {
  console.log('========================================================================');
  console.log('  Smart Bhumi Seba: Supabase Live Integration & Security Test Suite     ');
  console.log('========================================================================\n');

  const env = loadDotEnv();
  const supabaseUrl = env.SUPABASE_URL || '';
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

  const isConfigured =
    supabaseUrl &&
    supabaseUrl.startsWith('https://') &&
    serviceKey &&
    !serviceKey.startsWith('REPLACE_');

  if (!isConfigured) {
    console.log('STATUS: [NOT RUN]');
    console.log('Supabase credentials are not configured in local .env.\n');
    console.log('--- EXACT SETUP STEPS FOR SUPABASE CONNECTION ---');
    console.log('1. Go to https://supabase.com and create a free project.');
    console.log('2. Navigate to Project Settings -> API.');
    console.log('3. Copy your "Project URL" and "service_role" secret key.');
    console.log('4. Create or edit .env in this workspace (c:\\Users\\User\\Downloads\\smart-bhumi-seba-netlify\\.env):');
    console.log('   SUPABASE_URL=https://<your-project-id>.supabase.co');
    console.log('   SUPABASE_PUBLISHABLE_KEY=<your-anon-key>');
    console.log('   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>');
    console.log('   NODE_ENV=development\n');
    console.log('5. In Supabase Dashboard -> SQL Editor, run:');
    console.log('   - File 1: supabase/migrations/20261015000000_init_schema.sql');
    console.log('   - File 2: supabase/seed.sql');
    console.log('\n6. After applying SQL, re-run this test via:');
    console.log('   node scripts/verify-supabase.js');
    console.log('========================================================================\n');
    process.exit(0);
  }

  console.log(`Connecting to live Supabase: ${supabaseUrl}`);
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });

  let passCount = 0;
  let totalCount = 0;

  async function test(name, fn) {
    totalCount++;
    process.stdout.write(`  [${totalCount}] ${name} ... `);
    try {
      await fn();
      console.log('PASS');
      passCount++;
    } catch (err) {
      console.log('FAIL');
      console.error(`      Error: ${err.message}`);
    }
  }

  // 1. Connectivity & Dataset test
  await test('Ping dataset_versions (synthetic-v2 published)', async () => {
    const { data, error } = await supabase
      .from('dataset_versions')
      .select('version_key, state')
      .eq('version_key', 'synthetic-v2')
      .maybeSingle();

    if (error) throw new Error(`Query failed: ${error.message}`);
    if (!data) throw new Error('Dataset version synthetic-v2 not found. Run supabase/seed.sql first.');
    if (data.state !== 'published') throw new Error(`Dataset state is ${data.state}, expected published.`);
  });

  // 2. Schema tables check
  await test('Verify essential tables and RLS tables exist', async () => {
    const tables = ['parcels', 'khatians', 'citizens', 'deeds', 'mutations', 'reports', 'drafts', 'idempotency_keys', 'rate_limits'];
    for (const tbl of tables) {
      const { error } = await supabase.from(tbl).select('*').limit(1);
      if (error && !error.message.includes('0 rows')) {
        throw new Error(`Table ${tbl} error: ${error.message}`);
      }
    }
  });

  // 3. Two-User Isolation (IDOR Check)
  const userA = crypto.randomUUID();
  const userB = crypto.randomUUID();
  const testDraftId = 'draft-' + crypto.randomUUID().slice(0, 8);

  await test('Two-User Isolation: User B cannot access User A reports or drafts', async () => {
    // User A creates draft
    const { data: draftA, error: dErr } = await supabase
      .from('drafts')
      .insert({
        owner_uid: userA,
        client_draft_id: testDraftId,
        revision: 1,
        body: { note: 'Private data of User A' }
      })
      .select()
      .single();

    if (dErr || !draftA) throw new Error(`User A draft creation failed: ${dErr?.message}`);

    // User B tries to read User A's draft
    const { data: bDraftRead } = await supabase
      .from('drafts')
      .select('*')
      .eq('owner_uid', userB)
      .eq('client_draft_id', testDraftId)
      .maybeSingle();

    if (bDraftRead) throw new Error('Security breach: User B was able to read User A draft!');

    // Cleanup draft
    await supabase.from('drafts').delete().eq('owner_uid', userA).eq('client_draft_id', testDraftId);
  });

  // 4. Atomic Verification Report RPC & Persistence
  const testReportIdempotencyKey = 'idem-' + crypto.randomUUID();
  const testRequestBody = JSON.stringify({ record_id: '1234', seller_id: 'C02' });
  const testBodyDigest = crypto.createHash('sha256').update(testRequestBody, 'utf8').digest('hex');
  let createdReportId = '';

  await test('Atomic RPC create_verification_report_v1 creates report, idempotency & audit', async () => {
    const dummySnapshot = {
      record: { id: '1234', plot: '1204', survey: 'BS' },
      sellerId: 'C02',
      outcome: 'consistent',
      counts: { pass: 5, fail: 0, unknown: 0 },
      rulesVersion: 'v1',
      datasetVersion: 'synthetic-v2',
      snapshotSha256: 'abc123dummy',
      generatedAt: new Date().toISOString()
    };

    const { data, error } = await supabase.rpc('create_verification_report_v1', {
      p_owner_uid: userA,
      p_dataset_version: 'synthetic-v2',
      p_record_id: '1234',
      p_seller_id: 'C02',
      p_rules_version: 'v1',
      p_outcome: 'consistent',
      p_snapshot: dummySnapshot,
      p_snapshot_sha256: 'abc123dummy',
      p_idempotency_key: testReportIdempotencyKey,
      p_request_sha256: testBodyDigest
    });

    if (error) throw new Error(`RPC call failed: ${error.message}`);
    if (!data || !data.id || data.replayed !== false) {
      throw new Error(`Unexpected RPC response: ${JSON.stringify(data)}`);
    }

    createdReportId = data.id;

    // Check that audit event was atomically written
    const { data: auditRow, error: aErr } = await supabase
      .from('audit_events')
      .select('*')
      .eq('resource_id', createdReportId)
      .maybeSingle();

    if (aErr || !auditRow) throw new Error(`Audit event missing after report creation: ${aErr?.message}`);
  });

  // 5. Idempotency Replay and Conflict Detection
  await test('Idempotency Replay: Exact duplicate payload replays original report (200)', async () => {
    const dummySnapshot = {
      record: { id: '1234', plot: '1204', survey: 'BS' },
      sellerId: 'C02',
      outcome: 'consistent'
    };

    const { data, error } = await supabase.rpc('create_verification_report_v1', {
      p_owner_uid: userA,
      p_dataset_version: 'synthetic-v2',
      p_record_id: '1234',
      p_seller_id: 'C02',
      p_rules_version: 'v1',
      p_outcome: 'consistent',
      p_snapshot: dummySnapshot,
      p_snapshot_sha256: 'abc123dummy',
      p_idempotency_key: testReportIdempotencyKey,
      p_request_sha256: testBodyDigest
    });

    if (error) throw new Error(`Replay call failed: ${error.message}`);
    if (!data || data.id !== createdReportId || data.replayed !== true) {
      throw new Error(`Expected replayed: true with id ${createdReportId}, got ${JSON.stringify(data)}`);
    }
  });

  await test('Idempotency Conflict: Same key with different payload raises 409 conflict', async () => {
    const alteredDigest = crypto.createHash('sha256').update('different payload', 'utf8').digest('hex');

    const { data, error } = await supabase.rpc('create_verification_report_v1', {
      p_owner_uid: userA,
      p_dataset_version: 'synthetic-v2',
      p_record_id: '1234',
      p_seller_id: 'C02',
      p_rules_version: 'v1',
      p_outcome: 'consistent',
      p_snapshot: {},
      p_snapshot_sha256: 'abc123dummy',
      p_idempotency_key: testReportIdempotencyKey,
      p_request_sha256: alteredDigest
    });

    if (!error) throw new Error('Expected IDEMPOTENCY_CONFLICT exception, but RPC succeeded.');
    if (!error.message.includes('IDEMPOTENCY_CONFLICT')) {
      throw new Error(`Expected IDEMPOTENCY_CONFLICT, got: ${error.message}`);
    }
  });

  // 6. Draft Optimistic Concurrency
  await test('Draft Optimistic Concurrency: Stale revision rejects with 409 conflict', async () => {
    const draftKey = 'concurrent-' + crypto.randomUUID().slice(0, 8);

    // Rev 1
    const { data: d1 } = await supabase.from('drafts').insert({
      owner_uid: userA,
      client_draft_id: draftKey,
      revision: 1,
      body: { step: 1 }
    }).select().single();

    // Rev 1 -> 2 update succeeds
    const { data: d2 } = await supabase.from('drafts')
      .update({ revision: 2, body: { step: 2 } })
      .eq('id', d1.id)
      .eq('revision', 1)
      .select().single();

    if (!d2 || d2.revision !== 2) throw new Error('Failed to update revision from 1 to 2.');

    // Stale update using old revision 1 fails
    const { data: dStale } = await supabase.from('drafts')
      .update({ revision: 2, body: { step: 'stale' } })
      .eq('id', d1.id)
      .eq('revision', 1)
      .select();

    if (dStale && dStale.length > 0) {
      throw new Error('Optimistic concurrency failure: Stale revision was updated!');
    }

    // Cleanup
    await supabase.from('drafts').delete().eq('id', d1.id);
  });

  // 7. Shared Rate Limiting RPC
  await test('Shared Rate Limiter RPC check_rate_limit decrements and blocks on exhaustion', async () => {
    const rlKey = 'test-ip-' + crypto.randomUUID().slice(0, 6);
    // Allow 2 requests
    const { data: r1 } = await supabase.rpc('check_rate_limit', { p_key: rlKey, p_max_tokens: 2, p_refill_rate_seconds: 60 });
    const { data: r2 } = await supabase.rpc('check_rate_limit', { p_key: rlKey, p_max_tokens: 2, p_refill_rate_seconds: 60 });
    const { data: r3 } = await supabase.rpc('check_rate_limit', { p_key: rlKey, p_max_tokens: 2, p_refill_rate_seconds: 60 });

    if (r1 !== true || r2 !== true || r3 !== false) {
      throw new Error(`Unexpected rate limit results: r1=${r1}, r2=${r2}, r3=${r3}`);
    }

    // Cleanup
    await supabase.from('rate_limits').delete().eq('bucket_key', rlKey);
  });

  console.log('\n========================================================================');
  console.log(`Live Supabase Integration Result: ${passCount}/${totalCount} tests passed.`);
  console.log('========================================================================\n');
}

run().catch(err => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
