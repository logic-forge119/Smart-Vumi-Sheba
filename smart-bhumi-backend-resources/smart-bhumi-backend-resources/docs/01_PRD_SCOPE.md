# Product requirements and competition boundary
Goal: help a citizen identify inconsistencies and missing evidence before a proposed land purchase, using transparent synthetic records. Main problem P5. Supporting P3 signals and P4 tracking do not constitute complete implementations of those problems.

## Users and acceptance
- Visitor: sees a public synthetic scenario list; starts an anonymous session without submitting personal data; searches scoped sample records; selects a synthetic seller; creates and views only their reports; saves private drafts.
- Reviewer: synthetic provisioned staff identity; can read demo registry and review flagged synthetic evidence; cannot approve real ownership or alter a citizen's report.
- Admin: pre-provisioned role, imports a validated synthetic dataset as a new immutable version. No self-promotion, arbitrary production SQL or public admin endpoint.
- UDC mode: accessible guided interface acting under its own session. No cross-citizen access or hidden impersonation. A future assisted-service consent model is deferred.

## P1–P6 matrix
| Problem | MVP commitment | Later |
|---|---|---|
| P1 | searchable structured synthetic records | Bangla OCR + human validation + confidence provenance |
| P2 | immutable server report and optional internal integrity digest | issuer signatures/QR verification with trust anchors |
| P3 | full-plot conflicting transfers, chain breaks, mismatch signals | partial shares, inheritance, cadastral overlap, validated fraud analysis |
| P4 | synthetic mutation status/history, read-only | registration → mutation workflow with real authorization |
| P5 | ownership/mutation/evidence history, pending cases, khas/acquisition/status and unknowns | approved authoritative data integration |
| P6 | supporting offline/accessibility features | separate proposal only if organizer accepts |

## Must ship
Backend-generated deterministic report; persistent owner-private history; versioned synthetic dataset; API validation and authorization; safe error/offline states; preserved Bangla UI; repeatable deployment and tests. Search requires district/upazila/mouza/survey/dag identity; a khatian number alone is ambiguous.

## Exclusions
No real personal/land data, government scraping/querying, live payments, SMS delivery, legal certification, autonomous approval, production GIS, fabricated AI score or claim of verified government ownership. Concept note must name ONE selected problem; confirm against actual registration before submission.

## Measures (targets, not measured claims)
Four scenarios produce reproducible expected outcomes; zero cross-user access in negative tests; all private writes server-generated/validated; zero unknown → safe conversions. Target p95 API response <2s at 20 concurrent users against 1,000 synthetic parcels in the team's own preview. Record hardware, region, cold starts and actual result; this is not a scalability claim until measured.

## Rulebook evidence
Read supplied 17-page LandTech 2026 Rule Book. Printed pp. 4–5: P1–P6 and one chosen problem. Printed pp. 6–7: commit history, sources/licenses, synthetic/public data restrictions, no real personal data or government scraping, AI disclosure. Printed pp. 7–8: concept note max 4 PDF pages, repo/README, demo max 3 minutes; live link recommended; final deck max 10 slides. PDF states Round 1 deadline 16 Oct 2026 and dates may change. This is a supplied-document requirement, not a claim that no later organizer update exists. Separate judging rubric was not supplied; do not invent scoring.
