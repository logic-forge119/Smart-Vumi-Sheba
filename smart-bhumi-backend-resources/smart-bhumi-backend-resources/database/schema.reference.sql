-- DESIGN REFERENCE ONLY. Validate locally and implement triggers/RPCs before release.
-- Targets Supabase Postgres, including auth.users and service_role/anon/authenticated roles.
begin;
create extension if not exists pgcrypto;
create table public.dataset_versions (
 id uuid primary key default gen_random_uuid(), version_key text not null unique,
 state text not null default 'draft' check(state in ('draft','published')),
 synthetic boolean not null default true check(synthetic), as_of date not null,
 evaluation_date date not null, created_at timestamptz not null default now(), published_at timestamptz
);
create table public.locations (
 id uuid primary key default gen_random_uuid(), dataset_id uuid not null references public.dataset_versions(id),
 parent_id uuid, kind text not null check(kind in ('division','district','upazila','mouza')),
 code text not null, label_bn text not null, unique(id,dataset_id), unique(dataset_id,kind,code),
 foreign key(parent_id,dataset_id) references public.locations(id,dataset_id)
);
create table public.citizens (
 id uuid primary key default gen_random_uuid(), dataset_id uuid not null references public.dataset_versions(id),
 code text not null, label_bn text not null, unique(id,dataset_id),unique(dataset_id,code)
);
create table public.evidence_sources (
 id uuid primary key default gen_random_uuid(), dataset_id uuid not null references public.dataset_versions(id),
 source_code text not null, category text not null, label_bn text not null, as_of date not null,
 complete boolean, synthetic boolean not null default true check(synthetic), metadata jsonb not null default '{}',
 unique(id,dataset_id),unique(dataset_id,source_code)
);
create table public.parcels (
 id uuid primary key default gen_random_uuid(), dataset_id uuid not null references public.dataset_versions(id),
 mouza_id uuid not null, survey text not null check(survey in ('CS','SA','RS','BS','BRS')),
 dag_no text not null, area_shotok numeric(14,4) not null check(area_shotok>0), land_class text not null,
 unique(id,dataset_id), unique(dataset_id,mouza_id,survey,dag_no),
 foreign key(mouza_id,dataset_id) references public.locations(id,dataset_id)
);
create table public.khatians (
 id uuid primary key default gen_random_uuid(), dataset_id uuid not null references public.dataset_versions(id),
 parcel_id uuid not null, khatian_no text not null, owner_id uuid not null, source_id uuid not null,
 unique(id,dataset_id), unique(dataset_id,parcel_id,khatian_no),
 foreign key(parcel_id,dataset_id) references public.parcels(id,dataset_id),
 foreign key(owner_id,dataset_id) references public.citizens(id,dataset_id),
 foreign key(source_id,dataset_id) references public.evidence_sources(id,dataset_id)
);
create table public.deeds (
 id uuid primary key default gen_random_uuid(), dataset_id uuid not null references public.dataset_versions(id),
 source_code text not null, parcel_id uuid not null, seller_id uuid not null, buyer_id uuid not null,
 effective_date date not null, effective_sequence integer,
 status text not null check(status in ('registered','cancelled')),
 area_scope text not null check(area_scope in ('full','partial','unknown')),
 area_shotok numeric(14,4) check(area_shotok>0),source_id uuid not null,
 unique(id,dataset_id),unique(id,dataset_id,parcel_id),unique(dataset_id,source_code),
 foreign key(parcel_id,dataset_id) references public.parcels(id,dataset_id),
 foreign key(seller_id,dataset_id) references public.citizens(id,dataset_id),
 foreign key(buyer_id,dataset_id) references public.citizens(id,dataset_id),
 foreign key(source_id,dataset_id) references public.evidence_sources(id,dataset_id)
);
create table public.mutations (
 id uuid primary key default gen_random_uuid(), dataset_id uuid not null references public.dataset_versions(id),
 tracking_code text not null, parcel_id uuid not null, owner_id uuid not null, deed_id uuid,
 state text not null check(state in ('pending','completed','rejected','unknown')), effective_date date not null,
 stage integer not null default 0 check(stage between 0 and 4),source_id uuid not null,
 unique(id,dataset_id), unique(dataset_id,tracking_code),
 foreign key(parcel_id,dataset_id) references public.parcels(id,dataset_id),
 foreign key(owner_id,dataset_id) references public.citizens(id,dataset_id),
 foreign key(deed_id,dataset_id,parcel_id) references public.deeds(id,dataset_id,parcel_id),
 foreign key(source_id,dataset_id) references public.evidence_sources(id,dataset_id)
);
create table public.mutation_events (
 id uuid primary key default gen_random_uuid(),dataset_id uuid not null, mutation_id uuid not null,
 occurred_at timestamptz not null,stage integer not null check(stage between 0 and 4), label_bn text not null,
 foreign key(mutation_id,dataset_id) references public.mutations(id,dataset_id)
);
create table public.land_status (
 id uuid primary key default gen_random_uuid(),dataset_id uuid not null,parcel_id uuid not null,
 mortgage boolean,khas boolean,vested boolean,acquisition boolean,tax_paid boolean,cases_complete boolean,
 source_id uuid not null,unique(dataset_id,parcel_id),
 foreign key(parcel_id,dataset_id) references public.parcels(id,dataset_id),
 foreign key(source_id,dataset_id) references public.evidence_sources(id,dataset_id)
);
create table public.court_cases (
 id uuid primary key default gen_random_uuid(),dataset_id uuid not null,parcel_id uuid not null,
 source_code text not null, state text not null check(state in ('pending','resolved','unknown')),
 label_bn text not null,source_id uuid not null,unique(dataset_id,source_code),
 foreign key(parcel_id,dataset_id) references public.parcels(id,dataset_id),
 foreign key(source_id,dataset_id) references public.evidence_sources(id,dataset_id)
);
create table public.user_roles (
 user_id uuid primary key references auth.users(id),role text not null check(role in ('reviewer','admin')),
 created_at timestamptz not null default now()
);
create table public.reports (
 id uuid primary key default gen_random_uuid(),owner_uid uuid not null references auth.users(id),
 dataset_id uuid not null references public.dataset_versions(id),record_id uuid not null,seller_id uuid,
 rules_version text not null,outcome text not null check(outcome in ('consistent','attention','incomplete')),
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),snapshot_sha256 text,
 created_at timestamptz not null default now(),unique(id,owner_uid),
 foreign key(record_id,dataset_id) references public.khatians(id,dataset_id),
 foreign key(seller_id,dataset_id) references public.citizens(id,dataset_id)
);
create table public.drafts (
 id uuid primary key default gen_random_uuid(),owner_uid uuid not null references auth.users(id),
 client_draft_id uuid not null,revision integer not null default 1 check(revision>0),body jsonb not null,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(owner_uid,client_draft_id)
);
create table public.idempotency_keys (
 owner_uid uuid not null references auth.users(id),key text not null check(length(key) between 8 and 128),
 request_sha256 text not null,report_id uuid not null,expires_at timestamptz not null,
 primary key(owner_uid,key),foreign key(report_id,owner_uid) references public.reports(id,owner_uid)
);
create table public.audit_events (
 id uuid primary key default gen_random_uuid(),actor_uid uuid,action text not null,resource_id uuid,
 request_id uuid not null,created_at timestamptz not null default now(),metadata jsonb not null default '{}'
);
create index reports_owner_time on public.reports(owner_uid,created_at desc,id desc);
create index deeds_parcel_time on public.deeds(dataset_id,parcel_id,effective_date);
create index mutations_parcel_time on public.mutations(dataset_id,parcel_id,effective_date);
create index events_mutation_time on public.mutation_events(mutation_id,occurred_at);
create index idempotency_expiry on public.idempotency_keys(expires_at);
-- Backend-only model: no browser access to application tables, including public synthetic registry.
-- API explicitly exposes safe synthetic rows after validation; service_role bypasses RLS.
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
-- REQUIRED FOLLOW-UP: freeze published datasets/children, immutable reports/audit,
-- correct location hierarchy checks, atomic RPCs, shared rate-limit storage,
-- explicit routine execute revocation/grants, retention routines and DB tests.
-- Do not deploy this reference alone as a finished backend.
commit;
