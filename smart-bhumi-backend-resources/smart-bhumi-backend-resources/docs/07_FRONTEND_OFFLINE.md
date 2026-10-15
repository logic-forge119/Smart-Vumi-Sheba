# Frontend integration and offline requirements
Maintain current appearance. Capture baseline screenshots at mobile 390px and desktop 1440px before integration; compare search, report, tracker, map, drafts and Bangla language controls after changes. Preserve keyboard focus and meaningful labels.

## API client
One API wrapper adds access token and request ID, enforces timeout, parses errors and renders loading/empty/401/409/429/503 states. Abort obsolete searches. A 401 may trigger one coordinated SDK refresh, then retry once. Do not infinitely retry auth or writes. Report retries reuse the same Idempotency-Key. New intent gets a new key. Never attach tokens to arbitrary URLs.

Backend mode renders server results only. Demo mode uses bundled fixtures under a visible persistent label. Offline mode displays saved historical snapshots with saved time/dataset/as_of and explicit “not refreshed” warning. Do not show browser checks as fresh backend verification during an outage.

## Service worker
Existing sw.js has generic same-origin GET caching. Replace with explicit immutable shell asset allowlist. Bypass /api/, /.netlify/functions/, auth/session, signed/private storage URLs and all non-GET requests. Bump cache version and delete obsolete app caches on activation. APIs no-store on both server and client. New HTML/service worker release must not silently keep old verification scripts active.

## IndexedDB
Version bump with migration: namespace stores by auth UID + schema version; never infer legacy owner. Quarantine/delete old unscoped reports/preferences/drafts after an explicit user choice; no automatic cross-account import. Historical reports cannot be edited into server reports. Store minimal synthetic content, never auth tokens in these custom stores. If SDK uses browser persistence, protect with CSP/XSS controls and supported session lifecycle.

MVP sync: only drafts; manual or bounded retry with backoff. Each operation includes owner UID namespace, client_draft_id and expected revision. On logout, clear all private local namespaces/queue; on a different subject, do not replay queued actions. Reports are server-owned immutable snapshots; no bidirectional conflict merge. Browser unavailable storage must degrade with clear message, not fake saved state.

Map remains conceptual SVG. Voice is optional browser speech support; unsupported browser shows text alternative. Fee calculators/receipts are demo informational tools; no payment success claims. Alerts remain preference-only until a real authorized messaging channel is implemented.
