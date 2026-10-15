# Implement Smart Bhumi Seba backend while preserving the current UI
You are acting as a professional full-stack engineer in this existing repository. Implement the backend described by this resource folder; do not stop after a plan or generate a new unrelated website.

## Read first
Read START_HERE_BN.md and docs/00_CURRENT_STATE_AUDIT.md, then all numbered docs, database/README.md, database/schema.reference.sql, api/openapi.json, tests/acceptance-matrix.csv and config templates. Inspect the actual repository before modifying anything. The source under reference/current-static-site is historical evidence, not automatically the current working app.

## Non-negotiable decisions
- Preserve the green/white appearance, service cards, Bangla accessibility, navigation and existing useful tools. Refactor incrementally; no framework rewrite solely for preference.
- Primary scope P5; P3 signals and read-only P4 history support it. P1 OCR, P2 issuer signatures, full P4 automation, payment and public government integrations are deferred.
- Use existing frontend + TypeScript Netlify Functions + Supabase Postgres/Auth. Use the API boundary and per-resource authorization. No browser service_role/secret key. No default secret, permissive CORS, SQLite or browser-authoritative verification.
- Competition data must be synthetic. Use anonymous Supabase sessions for visitors, synthetic provisioned staff accounts; never request real name, NID, address, phone or personal email. Do not scrape or test government or third-party systems.
- Backend mode never silently falls back to local demo decisions. Explicit demo/offline modes are clearly labelled. Unknown remains unknown; never claim legal safety.
- No fake AI, hardcoded per-scenario results, fake success responses, unauthenticated staff writes or claims that tests passed when they did not run.

## Phase 0 first
Inspect framework, scripts, current git state, DOM hooks, service worker, fixtures, dependency versions and hosting config. Record actual findings in docs/IMPLEMENTATION_STATUS.md. Compare with this package and document justified adjustments before code changes. Preserve user's uncommitted work. Identify exact migration mapping from current fixtures. If existing secure infrastructure already satisfies a requirement, reuse it.

## Implement in order
Follow docs/10_IMPLEMENTATION_PHASES.md. Maintain docs/IMPLEMENTATION_STATUS.md with phase, changed files, commands, results, remaining blockers and evidence. Complete each phase's acceptance gate before the next. Do not request approval for routine reversible implementation. If provider access is missing, implement all independent local work and list only the exact external setup steps still blocked. Never fabricate credentials or bypass failures.

Create executable migrations, deterministic synthetic seed tooling, transactional RPCs/internal SQL routines, endpoint handlers, shared validation, API client, tests, CI and deployment config. Reference SQL is a design baseline, not a production-ready migration. Read-only guest data is only explicitly public synthetic data; reports/drafts remain owner-private. Do not expose database tables directly through the browser.

## Required evidence
Run local database reset/migrations, integration tests with real local Postgres/Supabase, API authorization tests with two users, RLS bypass attempts as anon/authenticated, transaction rollback/concurrency tests, offline/cache/logout tests and browser smoke checks. Unit tests alone are insufficient. If the environment cannot run a check, mark NOT RUN and provide a reproducible command; do not claim a green gate. Perform security tests only against this team's local/preview prototype.

Before release, supply dependency/security scan results with triage, frontend visual evidence, schema diagram, working OpenAPI/examples, .env.example with placeholders, Git-backed Netlify build instructions and rollback steps. Pin tested compatible dependencies, commit lockfile and configure runtime from current provider docs. Do not publish or apply production migrations unless the user's repository instructions authorize that action.

## Finish
Report what works, what was tested, what remains, setup steps the user must perform and exact commands. Update README with actual sources, limitations, AI tool disclosure and explainable student handover. Distinguish implemented, verified, mocked, deferred and blocked. Explain the backend in Bangla to the team, including JWT verification, RLS, resource ownership, transaction snapshot, missing-data logic and why hash matching alone cannot establish genuine ownership.
