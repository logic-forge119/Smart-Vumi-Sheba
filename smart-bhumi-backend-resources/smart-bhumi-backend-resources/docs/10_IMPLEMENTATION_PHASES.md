# Sequential implementation plan
Keep code and status evidence in Git. Review existing repository instructions first. Phase completion requires runnable evidence; a generated file is not a passed test.

| Phase | Deliverables | Gate |
|---|---|---|
| 0 Audit | repo/framework/dependency/UI/env audit; baseline screenshots; gap and status files | audit matches actual repo, no existing work overwritten |
| 1 Foundation | server TS router, validation/errors/env modules, API client skeleton, supported build/CI | typecheck/build; /health no secrets; invalid method/content type rejected |
| 2 Database | executable migrations, immutable/version constraints, seed importer, local DB tests, protected roles | reset + seed reproducible; references correct; direct browser privileges denied |
| 3 Auth | anonymous visitors, provisioned synthetic staff, verified tokens, owner/role helpers | two users isolated; expired/forged token rejected; self-promotion impossible |
| 4 Search/tracker | scoped versioned read APIs, pagination, shared rate limiting | four known records, wrong scope/no matches, tracking stages and 429 tested |
| 5 Verification | versioned rules, atomic report RPC, idempotency, evidence snapshot | scenarios + unknown/order/share tests; concurrent same key one result; rollback tested |
| 6 Reports/drafts | owner history, immutable report export, revisioned draft endpoints, cleanup rules | IDOR denied, cross-user body fields rejected, stale revision 409 |
| 7 UI/offline | replace browser authority with API, explicit demo mode, cache exclusions, UID local stores | backend outage visible; no private cache; logout clears local data; visuals preserved |
| 8 Hardening | CSP/headers, logs, quotas, security/dependency checks and load measurement | P0 acceptance matrix green or release blocked with evidence |
| 9 Handover | preview deployment config, README/TRD/OpenAPI sync, tested runbook, team explanation | actual preview smoke + documented provider blockers; no false live claims |

## Deadline-aware minimum slice
If time is short, complete phases 0–5 plus security and minimal report UI/preview checks first: persistent synthetic records, verified anonymous session, server-side verification, owner-private persisted report. Defer draft sync, staff dashboard and uploads. Never drop authorization, tri-state evidence, immutable snapshot or clear synthetic labeling to meet a deadline. Report unfinished phases honestly. No automatic claim that every feature will be finished before the rulebook deadline.

## Completion report template
Implemented / Tested (commands + results) / Not run / Deferred / Provider setup blocked / Known limitations / Exact next commands. Keep AI disclosure accurate: list tools actually used and their roles, not tools merely mentioned in the plan.
