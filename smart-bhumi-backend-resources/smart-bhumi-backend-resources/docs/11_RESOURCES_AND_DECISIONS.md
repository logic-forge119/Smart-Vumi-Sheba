# Official implementation references
Checked 2026-10-15. Read current official docs during implementation; provider APIs, plans and limits can change. Requirements in this package are product/design decisions unless explicitly attributed below.

- Supabase RLS and grants: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase token verification: https://supabase.com/docs/reference/javascript/auth-getclaims
- Supabase auth server client: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Supabase protected roles: https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac
- Netlify function environment: https://docs.netlify.com/build/functions/environment-variables/
- Netlify CLI: https://docs.netlify.com/api-and-cli-guides/cli-guides/get-started-with-cli/
- OWASP REST API security: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html
- OWASP file upload security (future scope): https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html

Key source guidance applied: service_role bypasses RLS and stays server-side; RLS and privileges are separate checks; JWTs need validation, not decoding; Netlify runtime function secrets use runtime environment configuration; API security requires authentication, authorization, validation and safe errors. Security requirements are tailored to this prototype, not a certification claim.

## Architecture decisions
ADR-001 Keep existing vanilla UI: quickest controlled integration and visual continuity.
ADR-002 Supabase Postgres + Auth: relational evidence/history and managed sessions; no existing backend was found in supplied ZIP.
ADR-003 Netlify Functions: same hosting intent and same-origin API boundary; use Git/CLI build deployment.
ADR-004 Backend-only DB access: exposed tables deny browser roles; privileged server enforces ownership. This is explicit, not an assertion that RLS protects service_role.
ADR-005 Synthetic anonymous visitor sessions: avoid collecting prohibited real personal data in competition. Session recovery/cross-device citizen account is deferred.
ADR-006 Deterministic rules: no model required for P5 consistency indicators; evidence transparency matters more than an unvalidated AI claim.
ADR-007 Versioned immutable datasets/snapshots: reproducible demo and report history; no silent source rewrite.

## Supplied evidence
Current deploy artifact smart-bhumi-seba-netlify.zip (9 static files) included in reference/current-static-site as extracted context. Supplied LandTech 2026 Rule Book, 17 PDF pages, inspected for scope/privacy/submission rules. Full rulebook not repackaged; obtain latest organizer notices/rubric before submission. No live government data or tests were used.
