# Database handoff
schema.reference.sql is a reviewed structural starting point, NOT a validated deployable migration. No Supabase instance was available or modified while producing this package.

Agent must turn the reference into ordered migrations, add protected RPCs/triggers/grants and execute database tests before deploying. All app tables default to deny browser roles; only server uses service_role. No policies are missing by accident: this is a deliberate backend-only design. Do not add `using (true)` to fix access errors.

Required routines: create_verification_atomic(actor_uid, body, key, request_id); update_draft_atomic(actor_uid,id,expected_revision,body); publish_dataset_atomic(admin_uid,dataset_id); rate_limit_reserve_atomic(actor_uid,route,window,limit); cleanup_expired_data. Signature details are internal implementation decisions; public clients cannot execute them. Revoke PUBLIC/anon/authenticated execute and fix search_path. Public HTTP endpoints MUST authenticate and authorize independently.

Import reference/current-static-site/demo-data.js with an explicit parser/adapter; never execute untrusted uploaded JS in a production import. fixtures.expected.json defines mapping and expected outcomes. Preserve original source IDs in source_code columns or metadata and map them to UUIDs deterministically. Dates/as_of/completeness must be authored explicitly. Imported identity labels are generated placeholders only.

Before gate: create empty local DB, run migrations, seed twice with idempotency, prove counts/relationships, execute negative grants/ownership/cross-version tests, freeze published data and prove a failed transaction leaves no partial report/audit/key rows.
