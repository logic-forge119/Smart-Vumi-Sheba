# API contract use
openapi.json is an OpenAPI 3.0.3 design contract, not an implemented endpoint. Generate validation/types from it if useful; reconcile with actual request validators and response tests before shipping. All response fields snake_case; adapt current camelCase UI in a single presenter, not inconsistent endpoint patches.

Session acquisition/refresh is via supported Supabase Auth SDK, not an invented password API. /health and /scenarios are public, all other endpoints require verified Bearer session. UUIDs below are placeholders; get actual IDs from seeded /scenarios and location choices. A synthetic citizen C02 is not the auth subject.

Example workflow (pseudocode, do not paste secrets):
1. SDK signInAnonymously() → access token in SDK session.
2. GET /api/v1/scenarios → record_id/seller_id for four fixtures.
3. POST /api/v1/verifications with Authorization Bearer token, Content-Type application/json and a random Idempotency-Key; body {record_id, seller_id}.
4. GET /api/v1/reports/{returned_id} as same user → persisted server snapshot.
5. Same request using another anonymous session → 404.
6. Reuse same key/body → same report; key/different seller → 409.

No endpoint accepts arbitrary SQL, government URL, user-supplied verification result or staff role. No registry write/upload/payment endpoints in MVP. Private report export is local JSON/print from the exact owner-authorized snapshot; public sharing deferred.

Pagination: opaque validated cursor over stable (created_at,id) for reports/drafts, scoped stable ordering for registries; never accept raw SQL ordering. Scope/published-version information must be included in cursor integrity checks. Define cursor validation in implementation and reject malformed or mismatched cursors.
