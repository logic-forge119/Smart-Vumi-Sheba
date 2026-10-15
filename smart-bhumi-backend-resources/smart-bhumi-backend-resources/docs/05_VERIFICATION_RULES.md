# Deterministic rules and limits
Server rules v1 initially port the existing LandVerification checks, with explicit completeness guards. Never branch on scenario IDs to manufacture expected outcomes. Outcomes: attention if any fail; otherwise incomplete if any unknown; otherwise consistent. Consistent means only that supplied synthetic indicators match, not safe title or legal clearance. No unvalidated percentage risk score.

| Rule | pass | fail | unknown |
|---|---|---|---|
| seller | selected synthetic seller equals recorded owner | different | seller not supplied |
| deed-owner | latest registered full-plot deed buyer equals record owner | different | no deed / latest order ambiguous |
| mutation | latest completed mutation links the same deed and buyer | pending or mismatch | missing or ambiguous history |
| double-sale / chain | complete full-plot history shows continuity | conflicting full-plot sales without intervening reacquisition or chain break | absent, partial-share or incomplete/ambiguous history |
| mortgage/khas/vested/acquisition | explicit false in sufficiently current source | explicit true | null/missing/stale |
| cases | complete case source with no pending case | known pending case | source absent/incomplete or stale |
| tax | explicit paid in sufficiently current source | explicit unpaid | null/missing/stale |

Evidence rules: every check includes rule_id, state, reason_bn, evidence IDs, source as_of and source completeness. Flagged known adverse evidence may still fail even if other evidence is incomplete. Use named source completeness per category; absence of one global dataset field must not imply every registry is complete.

## Identity, ordering and scope
Normalize বাংলা digits to ASCII and Unicode NFC at boundary; stable location IDs, not display names, form keys. Scope includes dataset version, district/upazila/mouza identity, survey and dag. Same dag in a different mouza/survey is a different parcel. Khatian may cover multiple parcels in real data; MVP uses parcel-specific khatian rows and does not claim complete cadastral modeling.

Order transfers by effective date + explicit sequence when available. Equal date without authoritative sequence is ambiguous; UUID/lexicographic tie-breaking is only deterministic display, not legal order. Flag unknown rather than invent order. Reacquisition A→B, B→A, A→C should not be flagged as double sale solely because A sold twice. Cancelled deeds are excluded but preserved in evidence. Partial/shared/inheritance transfers must be marked unsupported/unknown for chain analysis, never full-plot conflict solely because seller/buyer differ.

## Snapshot/staleness
Store source as_of separately from generated_at. For deterministic demo, evaluate staleness relative to dataset evaluation_date, default 2026-10-13, with configurable demo threshold 30 days. Do not let advancing wall clock silently change historical fixture outcomes. Live future policy must define real source freshness, not reuse demo assumptions.

Original snapshot 1234/C02 → consistent (assuming complete fresh sources); 5678/C03 → attention; 9012/C05 → attention; 3456/C06 → incomplete. If new completeness requirements alter results, update fixture metadata explicitly and document why; never silently turn null into false. Data import should set completeness based on authored synthetic fixture definitions, not inferred zero rows.

## Tamper checks
Report JSON is a canonical, immutable snapshot; a SHA-256 digest can detect change relative to a trusted stored digest. Digest alone does not prove issuer, truth or authentic ownership. Browser-computed hash and QR linking to a public page are not digital signatures. P2 issuer-signed verification with key rotation/revocation is a deferred feature.
