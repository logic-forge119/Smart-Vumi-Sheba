import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

describe('Phase 2 Database: Migration & Seed Verification Gate', () => {
  const migrationPath = path.join(root, 'supabase', 'migrations', '20261015000000_init_schema.sql');
  const seedPath = path.join(root, 'supabase', 'seed.sql');
  const fixturesExpectedPath = path.join(
    root,
    'smart-bhumi-backend-resources',
    'smart-bhumi-backend-resources',
    'database',
    'fixtures.expected.json'
  );

  it('Migration file exists and defines all required relational tables', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    const requiredTables = [
      'dataset_versions',
      'locations',
      'citizens',
      'evidence_sources',
      'parcels',
      'khatians',
      'deeds',
      'mutations',
      'mutation_events',
      'land_status',
      'court_cases',
      'user_roles',
      'reports',
      'drafts',
      'idempotency_keys',
      'audit_events'
    ];

    for (const table of requiredTables) {
      expect(sql).toContain(`create table if not exists public.${table}`);
    }
  });

  it('Enforces Row Level Security and revokes anon/authenticated table privileges', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    const appTables = [
      'dataset_versions',
      'locations',
      'citizens',
      'evidence_sources',
      'parcels',
      'khatians',
      'deeds',
      'mutations',
      'mutation_events',
      'land_status',
      'court_cases',
      'reports',
      'drafts',
      'idempotency_keys'
    ];

    for (const table of appTables) {
      expect(sql).toContain(`alter table public.${table} enable row level security;`);
      expect(sql).toContain(`revoke all on public.${table} from anon, authenticated;`);
      expect(sql).toContain(`grant select, insert, update, delete on public.${table} to service_role;`);
    }
  });

  it('Enforces report immutability and published dataset freeze triggers', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('fn_prevent_report_modification()');
    expect(sql).toContain('trg_immutable_reports');
    expect(sql).toContain('fn_prevent_published_dataset_modification()');
  });

  it('Seed file defines deterministic synthetic-v2 dataset matching fixtures.expected.json', () => {
    expect(fs.existsSync(seedPath)).toBe(true);
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    const fixturesRaw = fs.readFileSync(fixturesExpectedPath, 'utf8');
    const fixtures = JSON.parse(fixturesRaw);

    expect(seedSql).toContain(fixtures.dataset_version);
    expect(seedSql).toContain(fixtures.as_of);
    expect(seedSql).toContain(fixtures.district);
    expect(seedSql).toContain(fixtures.upazila);
    expect(seedSql).toContain(fixtures.mouza);

    // Verify all 6 synthetic identities
    for (const id of fixtures.identities) {
      expect(seedSql).toContain(`'${id}'`);
    }

    // Verify all 4 expected cases
    for (const c of fixtures.cases) {
      expect(seedSql).toContain(`'${c.khatian}'`);
      expect(seedSql).toContain(`'${c.dag}'`);
      expect(seedSql).toContain(`'${c.survey}'`);
    }
  });
});
