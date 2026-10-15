# Handover and showcase checklist
## Repository documents to complete with actual implementation
README.md (problem P5, setup, synthetic scenarios, deployment, limitations, data/design credits, actual AI disclosure); docs/IMPLEMENTATION_STATUS.md; docs/TEST_RESULTS.md; architecture/schema diagram; OpenAPI; CHANGELOG (including post-Round-1 changes); license and dependency/source credits; safe .env.example; lockfile and CI configuration. PRD = what/why; TRD = how/constraints; schema = entities/relationships; OpenAPI = API contract; tasks = implementation order; tests = evidence requirements.

## Student explanation practice
Both students should explain: browser vs server; anonymous JWT identity vs synthetic citizen C02; service key exposure; RLS bypass and API ownership; dataset snapshot/unknown logic; double sale vs legitimate reacquisition; transaction/idempotency concurrency; logout/service worker privacy; what is mocked/deferred; why this cannot certify a real title.

## Three-minute demo outline (adapt after actual implementation)
0:00–0:25 Bangladesh pre-purchase information inconsistency and P5 focus.
0:25–1:10 consistent fixture: API request, server report, source versions/evidence and synthetic disclaimer.
1:10–1:45 conflicting transfer and khas/acquisition fixtures; explain reasons rather than a fake risk score.
1:45–2:10 missing-data fixture remains incomplete; offline snapshot is labelled historical.
2:10–2:40 prove persistence/reload and two-user isolation using own preview; show real test summary.
2:40–3:00 limitations, future authorized data integration and team contribution.
Never present implementation planned here as already delivered. Do not reveal provider secrets, private credentials or tokens while recording.

## Production pilot is a separate milestone
A production citizen service needs approved data access, real identity/account recovery design, data governance/legal review, source authority agreements, more complete co-ownership/inheritance/area models, operations capacity and monitoring. This package targets a secure synthetic competition backend, not a national land registry deployment.
