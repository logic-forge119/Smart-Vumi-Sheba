# Testing plan and acceptance evidence
See tests/acceptance-matrix.csv. Agent must implement actual test code in the project; these are specifications, not executed tests.

## Layers
- Unit: normalization, scope keys, pure rules, null semantics, equal-date ambiguity, cancelled/partial transfers, reacquisition and outcome precedence.
- Database integration on local Supabase/Postgres: reset/migrate/seed, FK uniqueness, published immutability, private privilege denial, RPC atomicity/idempotency, cross-version reference rejection and role integrity.
- API integration: real local Auth subjects A/B and synthetic staff role, owner-private reads/writes, request validation, rate limits, error sanitization and no-store headers.
- Browser: authentic session lifecycle, visual regression, Bangla digits, keyboard flow, actual DB persistence across reload, offline warning/refresh, no demo fallback, logout/cache migration and expired tokens.
- Load/security: own prototype only; record cold/warm latency, throughput, errors, quota settings and database plans. Shared rate-limit concurrency; no unapproved external load.

## Minimum release gates
All P0 cases pass; migrations rerun from clean DB; no known critical/high exploitable unresolved dependency finding; secrets absent in bundle/repo; no cross-user access; backend unavailable never yields a successful fresh report; known missing source never becomes pass; snapshots immutable and versioned. Visual audit preserves green/white UI and all core service entry points.

## Expected local command categories
Use actual package scripts selected during audit: dependency install using lockfile, lint, typecheck, unit tests, local Supabase start/reset, DB tests, API integration, build, Playwright. Do not invent command success. Test artifacts include redacted test logs and screenshots in repository-supported location, not credentials.

Write docs/TEST_RESULTS.md with environment versions, command, timestamp, exit code, case counts and limits. Mark NOT RUN if unavailable. Existing conversation's “18 tests passed” refers to a prior static prototype check; it does not validate the new backend.
