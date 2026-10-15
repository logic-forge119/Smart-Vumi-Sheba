# Technical requirements document (TRD)
Status: proposed implementation architecture, not deployed.

## Architecture
Browser (existing HTML/CSS/JS) → same-origin /api/v1/* Netlify Functions → Supabase Postgres via restricted transactional routines. Browser ↔ Supabase Auth only for session acquisition/refresh. The browser receives URL + publishable key only. Private DB/storage traffic goes through the authenticated API.

Use TypeScript server modules, runtime request validation (e.g. Zod), Supabase SDK, Vitest or existing compatible test runner, Playwright for browser tests and local Supabase/Postgres for integration tests. Pin tested versions after repository audit. Retain vanilla frontend unless existing repository already uses a framework.

Suggested target folders:
- netlify/functions/api.ts: versioned HTTP router only.
- server/auth/, server/authorization/, server/validation/, server/domain/verification/, server/repositories/, server/errors/.
- public/ or existing static root: audited existing frontend; js/api-client.js + auth adapter.
- supabase/migrations/, supabase/seed.sql, supabase/tests/.
- tests/unit/, integration/, e2e/, security/; docs/IMPLEMENTATION_STATUS.md.
Never place server/, migrations, .env or this resource folder in the published static directory.

## Boundary and authorization
Verify token signature/expiry/issuer/audience with supported Supabase verification; getUser(token) server validation is acceptable. Never trust decoded JWT alone, browser user_id, editable user_metadata roles or client outcome. An anonymous Auth session still has a real auth.uid() and authenticated database role; the public anon DB role is different.

MVP repository strategy: server-only Supabase secret/service_role client, all application tables deny direct anon/authenticated access. EVERY handler must enforce resource ownership using verified sub and staff role from protected user_roles. This key bypasses RLS: RLS is not protection against a buggy privileged handler. Never expose raw arbitrary query/RPC interfaces. Internal RPCs executable by service_role only; accept actor_uid passed exclusively by verified server code, validate its roles/ownership again. Keep role assignment out of HTTP-facing code.

A later alternative is caller-JWT database access with precise RLS policies; do not mix both access models ad hoc. The reference schema intentionally uses the first strategy. Test API authorization AND direct DB denial separately.

## Data consistency
Each dataset is immutable after publication. Source imports build a draft version, validate it, then publish atomically. A report pins one published dataset version and rules version. One PostgreSQL transactional routine must select that version, read relevant records/evidence, compute/store a snapshot and audit/idempotency record, all-or-nothing. Either implement evaluation in SQL RPC or move logic to server and use an RPC that revalidates dataset immutability/version and persists the complete result atomically. Never chain independent REST writes pretending they are a transaction.

## Functional requirements
TR-01 normalize Bangla/ASCII digits and scoped identifiers server-side; retain original human-readable labels.
TR-02 all statuses tri-state; source absence not false.
TR-03 immutable report generated_at UTC, data as_of, evidence provenance, rules_version, dataset_version.
TR-04 no client submitted report checks/outcome accepted; validate seller belongs to pinned dataset.
TR-05 reports read only by owner; drafts optimistic concurrency; idempotent report creation.
TR-06 private API Cache-Control no-store; shell-only service worker.
TR-07 structured JSON errors, request ID; timeouts and bounded payloads.
TR-08 no personally identifying fields in demo forms; generated labels only.
TR-09 atomic import/publish, no public registry mutation.
TR-10 source snapshot is reference, not proof of authenticity or complete title history.

## Reliability and operations
Explicit live/demo/offline mode; backend outage yields retry message. Supabase failures return sanitized 503, not false results. Record error rate/latency/request_id without tokens or full user content. Health exposes only status, not environment/secrets. Limits start at 32 KiB JSON request body, page size 20 max 50, max 100 stored drafts/user. Rate limits use shared persistent counters or provider controls, not per-process maps on serverless workers. Reserve quota atomically before expensive DB work.

Avoid overengineering: no microservices, blockchain, ML model, queue or document upload in MVP. Future long OCR jobs require background processing and bounded resources.

Select the published dataset by server-only ACTIVE_DATASET_VERSION; never select arbitrary latest-created drafts. Missing or unpublished configured version returns 503. Searches/scenarios/identity choices share the same pinned active version. Historical report reads retain their original version. Changing the active version requires an explicit tested release.
