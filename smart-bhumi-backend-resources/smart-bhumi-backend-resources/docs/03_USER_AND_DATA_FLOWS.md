# User and data flows
## A. Session
Load shell → select live/demo mode → in live mode create/restore Supabase anonymous session → receive access token → API client attaches Bearer token. Refresh session through supported SDK; on failure show session expired. No real contact data required. Anonymous history is limited to that browser/session unless a future recovery mechanism is explicitly added; clearing browser state loses access.

Staff demo login uses pre-provisioned synthetic accounts in a separate test project; no signup or role selection. Rate-limit login through provider controls. Synthetic account credentials are not committed or embedded in JS. Account provisioning with an admin API must run only in a trusted setup script; mark email confirmed for synthetic .invalid addresses, disable email delivery/recovery workflows in this demo. Use a managed staff invitation model only for a separately authorized real pilot.

## B. Record search
Pick district → upazila → mouza (stable IDs) → survey → khatian/dag → normalize digits → API validates scope, pagination and published version → query indexed keys → return synthetic summary + source version. Zero matches is empty data, never proof that a parcel does not exist. Missing/ambiguous scope is 422/409, not arbitrary first match.

## C. Verification
Select record + synthetic seller → send record_id/seller_id and Idempotency-Key → verify JWT → body/rate/ownership checks → pin published dataset → read immutable evidence → evaluate versioned rules → atomically persist report snapshot, idempotency and audit → 201 report. Same owner/key/body replays same report; same owner/key/different body returns 409. UI renders server checks; never accepts a client-generated outcome.

## D. History and report
GET owner reports → cursor page → GET report id with owner predicate → display generated_at/as_of/version/evidence/disclaimer → browser print/JSON export of exact server snapshot. No public share link in MVP. UUID unpredictability is not authorization. Other user's known UUID returns 404 (same as nonexistent).

## E. Mutation tracking
Scoped sample case lookup → immutable published mutation + ordered stage events. A tracking ID alone is insufficient for nonpublic cases; MVP only explicitly synthetic-public registry cases. No UI button advances official status. No update endpoint for citizen/reviewer.

## F. Draft sync
Owner-scoped local draft → manual save or queued safe update → POST/PATCH with expected revision and client draft ID → server ownership and revision check → increment revision → return persisted row. 409 leaves both versions available for explicit merge. No last-write-wins silent overwrite. Expired session pauses sync; queue never switches owners.

## G. Dataset administration
Trusted local import command, staff provisioned out-of-band → validate synthetic-only allowlisted JSON → create draft version → load normalized rows → check references, versions, source scope and completeness → freeze/publish in one transaction → audit. No web admin CRUD for MVP. Reviewer can inspect synthetic evidence read-only. Published evidence is not edited in place.

## H. Logout / shared device
Revoke/sign out session as supported → clear token, user-scoped IndexedDB reports/drafts/preferences and pending queue → close private views → disable back-navigation exposure. Service worker never contains private API data. Legacy unscoped caches are quarantined/cleared rather than assigned to the next visitor.
