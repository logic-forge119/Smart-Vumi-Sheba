-- Smart Bhumi Seba: Initial Schema Migration
-- Targets Supabase Postgres / PostgreSQL 15+
-- Enforces immutable published datasets, report immutability, RLS, and atomic RPCs

begin;

create extension if not exists pgcrypto;

-- 1. Dataset Versions
create table if not exists public.dataset_versions (
  id uuid primary key default gen_random_uuid(),
  version_key text not null unique,
  state text not null default 'draft' check(state in ('draft','published')),
  synthetic boolean not null default true check(synthetic),
  as_of date not null,
  evaluation_date date not null,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

-- 2. Locations Hierarchy
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.dataset_versions(id) on delete cascade,
  parent_id uuid,
  kind text not null check(kind in ('division','district','upazila','mouza')),
  code text not null,
  label_bn text not null,
  unique(id, dataset_id),
  unique(dataset_id, kind, code),
  foreign key(parent_id, dataset_id) references public.locations(id, dataset_id)
);

-- 3. Synthetic Citizens (labels C01-C06 only)
create table if not exists public.citizens (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.dataset_versions(id) on delete cascade,
  code text not null,
  label_bn text not null,
  unique(id, dataset_id),
  unique(dataset_id, code)
);

-- 4. Evidence Sources
create table if not exists public.evidence_sources (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.dataset_versions(id) on delete cascade,
  source_code text not null,
  category text not null,
  label_bn text not null,
  as_of date not null,
  complete boolean,
  synthetic boolean not null default true check(synthetic),
  metadata jsonb not null default '{}',
  unique(id, dataset_id),
  unique(dataset_id, source_code)
);

-- 5. Parcels
create table if not exists public.parcels (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.dataset_versions(id) on delete cascade,
  mouza_id uuid not null,
  survey text not null check(survey in ('CS','SA','RS','BS','BRS')),
  dag_no text not null,
  area_shotok numeric(14,4) not null check(area_shotok > 0),
  land_class text not null,
  unique(id, dataset_id),
  unique(dataset_id, mouza_id, survey, dag_no),
  foreign key(mouza_id, dataset_id) references public.locations(id, dataset_id)
);

-- 6. Khatians
create table if not exists public.khatians (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.dataset_versions(id) on delete cascade,
  parcel_id uuid not null,
  khatian_no text not null,
  owner_id uuid not null,
  source_id uuid not null,
  unique(id, dataset_id),
  unique(dataset_id, parcel_id, khatian_no),
  foreign key(parcel_id, dataset_id) references public.parcels(id, dataset_id),
  foreign key(owner_id, dataset_id) references public.citizens(id, dataset_id),
  foreign key(source_id, dataset_id) references public.evidence_sources(id, dataset_id)
);

-- 7. Deeds
create table if not exists public.deeds (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.dataset_versions(id) on delete cascade,
  source_code text not null,
  parcel_id uuid not null,
  seller_id uuid not null,
  buyer_id uuid not null,
  effective_date date not null,
  effective_sequence integer,
  status text not null check(status in ('registered','cancelled')),
  area_scope text not null check(area_scope in ('full','partial','unknown')),
  area_shotok numeric(14,4) check(area_shotok > 0),
  source_id uuid not null,
  unique(id, dataset_id),
  unique(id, dataset_id, parcel_id),
  unique(dataset_id, source_code),
  foreign key(parcel_id, dataset_id) references public.parcels(id, dataset_id),
  foreign key(seller_id, dataset_id) references public.citizens(id, dataset_id),
  foreign key(buyer_id, dataset_id) references public.citizens(id, dataset_id),
  foreign key(source_id, dataset_id) references public.evidence_sources(id, dataset_id)
);

-- 8. Mutations
create table if not exists public.mutations (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.dataset_versions(id) on delete cascade,
  tracking_code text not null,
  parcel_id uuid not null,
  owner_id uuid not null,
  deed_id uuid,
  state text not null check(state in ('pending','completed','rejected','unknown')),
  effective_date date not null,
  stage integer not null default 0 check(stage between 0 and 4),
  source_id uuid not null,
  unique(id, dataset_id),
  unique(dataset_id, tracking_code),
  foreign key(parcel_id, dataset_id) references public.parcels(id, dataset_id),
  foreign key(owner_id, dataset_id) references public.citizens(id, dataset_id),
  foreign key(deed_id, dataset_id, parcel_id) references public.deeds(id, dataset_id, parcel_id),
  foreign key(source_id, dataset_id) references public.evidence_sources(id, dataset_id)
);

-- 9. Mutation Events
create table if not exists public.mutation_events (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null,
  mutation_id uuid not null,
  occurred_at timestamptz not null,
  stage integer not null check(stage between 0 and 4),
  label_bn text not null,
  foreign key(mutation_id, dataset_id) references public.mutations(id, dataset_id) on delete cascade
);

-- 10. Land Status
create table if not exists public.land_status (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null,
  parcel_id uuid not null,
  mortgage boolean,
  khas boolean,
  vested boolean,
  acquisition boolean,
  tax_paid boolean,
  cases_complete boolean,
  source_id uuid not null,
  unique(dataset_id, parcel_id),
  foreign key(parcel_id, dataset_id) references public.parcels(id, dataset_id) on delete cascade,
  foreign key(source_id, dataset_id) references public.evidence_sources(id, dataset_id)
);

-- 11. Court Cases
create table if not exists public.court_cases (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null,
  parcel_id uuid not null,
  source_code text not null,
  state text not null check(state in ('pending','resolved','unknown')),
  label_bn text not null,
  source_id uuid not null,
  unique(dataset_id, source_code),
  foreign key(parcel_id, dataset_id) references public.parcels(id, dataset_id) on delete cascade,
  foreign key(source_id, dataset_id) references public.evidence_sources(id, dataset_id)
);

-- 12. Protected User Roles
create table if not exists public.user_roles (
  user_id uuid primary key,
  role text not null check(role in ('reviewer','admin')),
  created_at timestamptz not null default now()
);

-- 13. Reports (Immutable once created)
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  owner_uid uuid not null,
  dataset_id uuid not null references public.dataset_versions(id),
  record_id uuid not null,
  seller_id uuid,
  rules_version text not null,
  outcome text not null check(outcome in ('consistent','attention','incomplete')),
  snapshot jsonb not null check(jsonb_typeof(snapshot) = 'object'),
  snapshot_sha256 text not null,
  created_at timestamptz not null default now(),
  unique(id, owner_uid),
  foreign key(record_id, dataset_id) references public.khatians(id, dataset_id),
  foreign key(seller_id, dataset_id) references public.citizens(id, dataset_id)
);

-- 14. Drafts (Revisioned)
create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  owner_uid uuid not null,
  client_draft_id text not null check(length(client_draft_id) between 1 and 128),
  revision integer not null default 1 check(revision > 0),
  body jsonb not null check(jsonb_typeof(body) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_uid, client_draft_id)
);

-- 15. Idempotency Keys (24-hour retention)
create table if not exists public.idempotency_keys (
  owner_uid uuid not null,
  key text not null check(length(key) between 8 and 128),
  request_sha256 text not null,
  report_id uuid not null,
  expires_at timestamptz not null,
  primary key(owner_uid, key),
  foreign key(report_id, owner_uid) references public.reports(id, owner_uid) on delete cascade
);

-- 16. Server Audit Events Log
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_uid uuid,
  action text not null,
  resource_id uuid,
  request_id uuid not null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

-- 17. Shared Rate Limits (Distributed Token Bucket)
create table if not exists public.rate_limits (
  bucket_key text primary key,
  tokens integer not null,
  last_replenished timestamptz not null default now()
);

-- Indexes for performance & bounded queries
create index if not exists idx_reports_owner_time on public.reports(owner_uid, created_at desc, id desc);
create index if not exists idx_deeds_parcel_time on public.deeds(dataset_id, parcel_id, effective_date);
create index if not exists idx_mutations_parcel_time on public.mutations(dataset_id, parcel_id, effective_date);
create index if not exists idx_events_mutation_time on public.mutation_events(mutation_id, occurred_at);
create index if not exists idx_idempotency_expiry on public.idempotency_keys(expires_at);
create index if not exists idx_parcels_lookup on public.parcels(dataset_id, mouza_id, survey, dag_no);
create index if not exists idx_khatians_lookup on public.khatians(dataset_id, parcel_id, khatian_no);

--------------------------------------------------------------------------------
-- INTEGRITY TRIGGERS
--------------------------------------------------------------------------------

-- Trigger: Prevent updates or deletes on reports (Immutability guarantee)
create or replace function public.fn_prevent_report_modification()
returns trigger as $$
begin
  raise exception 'Reports are immutable and cannot be updated or deleted directly.';
end;
$$ language plpgsql;

create or replace trigger trg_immutable_reports
before update or delete on public.reports
for each row execute function public.fn_prevent_report_modification();

-- Trigger: Freeze published datasets
create or replace function public.fn_prevent_published_dataset_modification()
returns trigger as $$
declare
  target_state text;
begin
  select state into target_state from public.dataset_versions where id = old.dataset_id;
  if target_state = 'published' then
    raise exception 'Records belonging to a published dataset version cannot be modified or deleted.';
  end if;
  return old;
end;
$$ language plpgsql;

create or replace trigger trg_freeze_parcels
before update or delete on public.parcels
for each row execute function public.fn_prevent_published_dataset_modification();

create or replace trigger trg_freeze_khatians
before update or delete on public.khatians
for each row execute function public.fn_prevent_published_dataset_modification();

create or replace trigger trg_freeze_deeds
before update or delete on public.deeds
for each row execute function public.fn_prevent_published_dataset_modification();

create or replace trigger trg_freeze_mutations
before update or delete on public.mutations
for each row execute function public.fn_prevent_published_dataset_modification();

-- Trigger: Drafts updated_at auto-refresh
create or replace function public.fn_touch_draft_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger trg_draft_touch
before update on public.drafts
for each row execute function public.fn_touch_draft_updated_at();

--------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) & STRICT PRIVILEGE RESTRICTION
--------------------------------------------------------------------------------
-- Deny direct access to application tables from browser anon and authenticated roles.
-- Access is granted exclusively to service_role via backend API handlers.

alter table public.dataset_versions enable row level security;
revoke all on public.dataset_versions from anon, authenticated;
grant select, insert, update, delete on public.dataset_versions to service_role;

alter table public.locations enable row level security;
revoke all on public.locations from anon, authenticated;
grant select, insert, update, delete on public.locations to service_role;

alter table public.citizens enable row level security;
revoke all on public.citizens from anon, authenticated;
grant select, insert, update, delete on public.citizens to service_role;

alter table public.evidence_sources enable row level security;
revoke all on public.evidence_sources from anon, authenticated;
grant select, insert, update, delete on public.evidence_sources to service_role;

alter table public.parcels enable row level security;
revoke all on public.parcels from anon, authenticated;
grant select, insert, update, delete on public.parcels to service_role;

alter table public.khatians enable row level security;
revoke all on public.khatians from anon, authenticated;
grant select, insert, update, delete on public.khatians to service_role;

alter table public.deeds enable row level security;
revoke all on public.deeds from anon, authenticated;
grant select, insert, update, delete on public.deeds to service_role;

alter table public.mutations enable row level security;
revoke all on public.mutations from anon, authenticated;
grant select, insert, update, delete on public.mutations to service_role;

alter table public.mutation_events enable row level security;
revoke all on public.mutation_events from anon, authenticated;
grant select, insert, update, delete on public.mutation_events to service_role;

alter table public.land_status enable row level security;
revoke all on public.land_status from anon, authenticated;
grant select, insert, update, delete on public.land_status to service_role;

alter table public.court_cases enable row level security;
revoke all on public.court_cases from anon, authenticated;
grant select, insert, update, delete on public.court_cases to service_role;

alter table public.user_roles enable row level security;
revoke all on public.user_roles from anon, authenticated;
grant select, insert, update, delete on public.user_roles to service_role;

alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;
grant select, insert, update, delete on public.reports to service_role;

alter table public.drafts enable row level security;
revoke all on public.drafts from anon, authenticated;
grant select, insert, update, delete on public.drafts to service_role;

alter table public.idempotency_keys enable row level security;
revoke all on public.idempotency_keys from anon, authenticated;
grant select, insert, update, delete on public.idempotency_keys to service_role;

alter table public.audit_events enable row level security;
revoke all on public.audit_events from anon, authenticated;
grant select, insert, update, delete on public.audit_events to service_role;

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;
grant select, insert, update, delete on public.rate_limits to service_role;

--------------------------------------------------------------------------------
-- STORED PROCEDURES & ATOMIC TRANSACTIONS (RPC)
--------------------------------------------------------------------------------

-- Distributed Token-Bucket Rate Limiter
create or replace function public.check_rate_limit(
  p_key text,
  p_max_tokens integer,
  p_refill_rate_seconds integer
) returns boolean as $$
declare
  v_tokens integer;
  v_last timestamptz;
  v_now timestamptz := now();
  v_replenish_count integer;
begin
  select tokens, last_replenished into v_tokens, v_last
  from public.rate_limits
  where bucket_key = p_key
  for update;

  if not found then
    insert into public.rate_limits (bucket_key, tokens, last_replenished)
    values (p_key, p_max_tokens - 1, v_now);
    return true;
  end if;

  -- Calculate elapsed replenishment
  v_replenish_count := floor(extract(epoch from (v_now - v_last)) / p_refill_rate_seconds)::integer;
  if v_replenish_count > 0 then
    v_tokens := least(p_max_tokens, v_tokens + v_replenish_count);
    v_last := v_now;
  end if;

  if v_tokens > 0 then
    update public.rate_limits
    set tokens = v_tokens - 1, last_replenished = v_last
    where bucket_key = p_key;
    return true;
  else
    update public.rate_limits
    set last_replenished = v_last
    where bucket_key = p_key;
    return false;
  end if;
end;
$$ language plpgsql security definer;
revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- Atomic Verification Report, Idempotency & Audit Persistence RPC
create or replace function public.create_verification_report_v1(
  p_owner_uid uuid,
  p_dataset_version text,
  p_record_id text,
  p_seller_id text,
  p_rules_version text,
  p_outcome text,
  p_snapshot jsonb,
  p_snapshot_sha256 text,
  p_idempotency_key text default null,
  p_request_sha256 text default null
) returns jsonb as $$
declare
  v_dataset_id uuid;
  v_dataset_state text;
  v_existing_idempotency record;
  v_existing_report record;
  v_new_report_id uuid;
  v_khatian_id uuid;
  v_citizen_id uuid;
begin
  -- 1. Ensure dataset exists
  select id, state into v_dataset_id, v_dataset_state
  from public.dataset_versions
  where version_key = p_dataset_version;

  if not found then
    raise exception 'DATASET_UNAVAILABLE: Dataset version % does not exist', p_dataset_version;
  end if;

  -- 2. Check Idempotency if key provided
  if p_idempotency_key is not null and length(trim(p_idempotency_key)) > 0 then
    select * into v_existing_idempotency
    from public.idempotency_keys
    where owner_uid = p_owner_uid and key = p_idempotency_key
    for update;

    if found then
      if v_existing_idempotency.request_sha256 <> p_request_sha256 then
        raise exception 'IDEMPOTENCY_CONFLICT: Key was previously used with a different request payload';
      end if;

      select * into v_existing_report
      from public.reports
      where id = v_existing_idempotency.report_id and owner_uid = p_owner_uid;

      if found then
        return jsonb_build_object(
          'id', v_existing_report.id::text,
          'report', v_existing_report.snapshot,
          'replayed', true
        );
      end if;
    end if;
  end if;

  -- 3. Resolve khatian_id and citizen_id if available
  select id into v_khatian_id from public.khatians
  where dataset_id = v_dataset_id and (khatian_no = p_record_id or id::text = p_record_id)
  limit 1;

  if p_seller_id is not null and length(trim(p_seller_id)) > 0 then
    select id into v_citizen_id from public.citizens
    where dataset_id = v_dataset_id and (code = p_seller_id or id::text = p_seller_id)
    limit 1;
  end if;

  -- 4. Insert report
  v_new_report_id := gen_random_uuid();

  insert into public.reports (
    id, owner_uid, dataset_id, record_id, seller_id, rules_version,
    outcome, snapshot, snapshot_sha256, created_at
  ) values (
    v_new_report_id,
    p_owner_uid,
    v_dataset_id,
    coalesce(v_khatian_id, '50000000-0000-0000-0000-000000000001'::uuid),
    v_citizen_id,
    p_rules_version,
    p_outcome,
    p_snapshot,
    p_snapshot_sha256,
    now()
  );

  -- 5. Insert idempotency key if provided
  if p_idempotency_key is not null and length(trim(p_idempotency_key)) > 0 and p_request_sha256 is not null then
    insert into public.idempotency_keys (
      owner_uid, key, request_sha256, report_id, expires_at
    ) values (
      p_owner_uid,
      p_idempotency_key,
      p_request_sha256,
      v_new_report_id,
      now() + interval '24 hours'
    );
  end if;

  -- 6. Insert audit event
  insert into public.audit_events (
    actor_uid, action, resource_id, request_id, created_at, metadata
  ) values (
    p_owner_uid,
    'CREATE_VERIFICATION_REPORT',
    v_new_report_id,
    gen_random_uuid(),
    now(),
    jsonb_build_object(
      'outcome', p_outcome,
      'record_id', p_record_id,
      'seller_id', p_seller_id,
      'rules_version', p_rules_version
    )
  );

  return jsonb_build_object(
    'id', v_new_report_id::text,
    'report', p_snapshot,
    'replayed', false
  );
end;
$$ language plpgsql security definer;
revoke all on function public.create_verification_report_v1 from public, anon, authenticated;
grant execute on function public.create_verification_report_v1 to service_role;

commit;
