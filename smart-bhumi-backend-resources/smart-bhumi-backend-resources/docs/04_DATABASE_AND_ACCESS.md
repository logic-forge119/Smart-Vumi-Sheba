# Database design and access
See database/schema.reference.sql. This design uses UUID row IDs and version-scoped natural keys. UUID auth subjects are not synthetic citizen identities: never conflate C02 with auth.uid().

## Entities
| Entity | Relationship / purpose |
|---|---|
| dataset_versions | immutable published synthetic snapshots, unique version key |
| locations | hierarchy division/district/upazila/mouza, stable code per version |
| citizens | generated C01–C06 labels, no real person fields |
| parcels | version + mouza + survey + dag identity, numeric area in shotok |
| khatians | parcel + khatian number + recorded owner |
| evidence_sources | synthetic source, document code, as_of, completeness metadata |
| deeds | parcel/seller/buyer, dates, full/partial area, source |
| mutations / mutation_events | deed/recorded owner/status and ordered stage history |
| land_status | nullable status flags; cases_complete NULL/false is unknown |
| court_cases | typed synthetic pending/resolved cases; no rows only means none when complete |
| reports | owner UID, record/seller, dataset/rules version, immutable JSON snapshot |
| drafts | owner UID, client draft ID, revision, validated allowlisted body |
| user_roles | protected reviewer/admin membership, assigned out-of-band |
| idempotency_keys | owner + key + body digest + report reference + expiry |
| audit_events | server-only append log, actor/action/resource/request/time |

All exposed application tables have RLS enabled and anon/authenticated grants revoked. Server routines use service_role only after authenticated API checks. Role assignment, import and audit access are not public. Tables are intentionally inaccessible directly to browser sessions. Private bucket objects also deny direct access unless a future upload module is deliberately enabled.

## Integrity work required before migrations pass
Reference DDL includes composite FKs to prevent cross-version references, unique keys and bounds. Agent must add immutability triggers on dataset-owned rows, published-version freeze, report immutability, updated_at/revision routines and transactional RPCs. A simple JSONB report column does not guarantee correctness: validate the report output schema and generate it server-side.

No destructive reset against production. Version migrations in Git and validate from empty local DB; validate upgrade from previous staging state. Backup and rehearse restore before production change. Migration rollback may require a forward fix; reverting code alone does not undo schema changes.

## Query indexes / retention
Indexes cover dataset+location+survey+dag, khatian parcel/number, deed and mutation parcel/date, reports owner/date/id, drafts owner, events mutation/date and idempotency expiry. Use bounded cursor pagination by (created_at,id), verify query plans on synthetic load.

Initial policy proposal: draft expiry after 30 days; private reports after 90 days; idempotency reservation 24 hours (minimum active retry window); audit 90 days. Enforce via tested scheduled cleanup with FK-safe delete order and documented user export/delete. These are product choices, not statutory claims. Do not erase dataset evidence still referenced by retained reports. Auth identity deletion must clear owner data through a trusted cleanup process, never arbitrary cascade that breaks audit requirements. Keep anonymized audit metadata only if needed and documented.
