# API security requirements
Threats: object-level authorization bypass, role spoofing, malicious input/XSS, leaked privileged credentials, inconsistent concurrent writes, shared-device cache exposure and resource exhaustion.

## Mandatory controls
1. Validate JWT on every private route; check signature, expiry and expected issuer/audience with maintained SDK. Missing/invalid token 401. Valid token with insufficient role 403; private object not owned 404. Fail closed on auth uncertainty.
2. Never accept owner_uid, role, outcome, evidence or dataset publication status from public request bodies. Reject extra fields. Derive actor from token; read protected roles table. Ownership predicate in query AND transaction.
3. CORS same-origin by default; if needed, explicit reviewed origins only. CORS is not authorization. Reject unsupported methods/content types and unsafe cross-origin write attempts. MVP uses Authorization Bearer, not implicit cookies. If cookies are introduced, add secure HttpOnly SameSite, CSRF tokens and Origin validation.
4. Service key only in server runtime env. Publishable key is expected browser configuration; still restrict all DB grants. No VITE_/PUBLIC_ secret names. No source maps/logs/build artifacts with secrets. Missing secret stops private handlers with sanitized 503; never a development bypass in deployed code.
5. Validate UUIDs, max lengths, numeric ranges, known survey/status enums, pagination and JSON schemas. Parameterized queries; no dynamic SQL from user strings. 32 KiB max body; timeouts; no arbitrary file/URL fetching.
6. Per-UID distributed limits: search 60/min; report create 10/min + 100/day; drafts write 30/min; public IP quota for health/scenarios. Values are initial product defaults. Use shared atomic storage/provider enforcement with verified client IP handling; return 429 + Retry-After. Memory maps are insufficient on serverless.
7. Cache-Control: no-store on every /api/v1 response including errors. Do not cache tokens or private data in service worker, CDN or shared browser cache. User-scoped local copies cleared on logout.
8. Return text through safe DOM textContent/escaping. Current UI uses template strings/innerHTML: audit every server-controlled field before rendering. Inline handlers/scripts require refactor or nonce/hash CSP; do not ship blanket unsafe-inline as the final security design.
9. CSP tailored to actual script/font/Auth origins; frame-ancestors 'none', X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, HTTPS-only deployment. Deploy Report-Only first if needed, then enforce after browser checks.
10. Structured error {error:{code,message_bn,request_id}}. Do not expose SQL, stack, keys or raw provider errors. Audit write success/denial minimally; never record access tokens/passwords/full document content.
11. Immutable reports and published sources; transactional idempotency with unique(owner_uid,key), request digest and 24h replay retention. Reserve and finish in transaction; duplicate concurrent requests produce one report. Roll back all records on failure.
12. DB RLS + privilege deny tests for anon and authenticated must pass; service_role bypass requires explicit API authorization regression tests. Restrict security-definer routines with fixed search_path, revoked PUBLIC execute, least privilege and actor checks. No user-controlled function names.

## Uploads and AI
Uploads disabled in MVP. Future module: allowlist PDF/PNG/JPEG, max 5 MiB, inspect magic bytes, generated object names, private quarantine bucket, malware scan before use, per-object authorization, signed URLs with short TTL and no arbitrary remote URLs. Storage policy tested, not merely documented. Reject SVG/HTML/executables, decompression bombs and MIME spoofing. Never call an AI model with real personal records in competition. Any future LLM output is untrusted, validated and non-authoritative.

## Auth privacy
Anonymous sessions avoid collecting citizen contact details. Mitigate automated anonymous signup with provider abuse controls and rate limits. Provisioned synthetic staff accounts are a test-only design; restrict credentials to team, rotate before showcase, disable signup/role escalation. No sensitive production pilot data belongs in a demo project.

## Security evidence
Against OWN local/preview app: two-user report/draft IDOR, role injection, expired/forged tokens, unknown fields, oversized inputs, rate-limit concurrency, service key bundle scan, stored XSS fixtures, cache/logout, direct DB role attempts and transaction rollback. Never scan government or unrelated systems. Dependency audit is one check, not proof that an app is secure.
