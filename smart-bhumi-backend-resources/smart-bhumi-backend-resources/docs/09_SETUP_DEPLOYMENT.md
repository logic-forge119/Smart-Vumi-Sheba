# Setup, deployment and rollback
## User-owned setup needed
1. Open existing website repo; create a feature branch/checkpoint. Preserve existing changes.
2. Create a dedicated Supabase DEMO project or start local Supabase for development. Keep projects separate for development/preview and showcase. Copy project URL/publishable key; put privileged server key only into server runtime secrets.
3. Enable anonymous sign-ins for visitor sessions and configure supported abuse protections. Disable any UI that asks for real citizen contact information. Provision synthetic staff only via trusted setup script. Do not paste keys/passwords into the AI chat.
4. Implement/test migrations locally first; run validated migrations/seed against preview project. Do not reset a project containing useful data. Pin dataset version and verify four fixtures.
5. Connect repository to Netlify using Git-backed build or use a supported CLI function build/deploy. Configure correct static publish directory and functions directory. The old static ZIP/Drop workflow does not by itself build this new backend.
6. Set server secret env in Netlify with Functions runtime scope as supported by the plan/UI; set browser URL/publishable key only through deliberate public config generation. Config templates contain placeholders only. netlify.toml env is not the source for runtime function secrets; redeploy after secret changes.
7. Configure allowed deployment origin, Supabase auth settings and redirects if any staff login flow requires them. Isolate preview origins/credentials; never accept arbitrary Origin reflection.
8. Deploy preview, execute smoke/security cases against own app, then promote tested artifact if authorized. Confirm database still has only synthetic data and no public table grants.

## Build layout requirements
Adapt config/netlify.toml.template after audit. If current site has index.html at repo root, move/copy only required frontend assets into a dedicated public/dist folder for publishing; never publish whole repo including this resource package. Netlify SPA catch-all, if needed, comes AFTER /api routes and must not turn API errors into HTML. Preserve browser service worker scope.

## Environment
Browser: SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY in generated public config (never server key). Server: same URL + SUPABASE_SERVICE_ROLE_KEY (or current equivalent server secret key), ALLOWED_ORIGINS, DATA_MODE=synthetic, ACTIVE_RULES_VERSION, rate-limit provider credentials if chosen. Validate at startup; no secret defaults. Exact provider key names/SDK API must be checked against current docs when implementing.

## Backup / rollback
Before schema release: take supported backup/export, test restore to another project, record dataset/migration IDs. Deploy additive compatible schema before switching code. Release old/new code compatibility window. On failure: pause writes, revert to previous code artifact, verify schema compatibility; apply tested forward migration or restore if needed. A Git revert does not roll back a database. Document any data-loss window. Rotate compromised key, redeploy, invalidate affected sessions and inspect audit metadata.

## Operations / costs
Check current plan limits, function timeout, DB/storage quotas, auth abuse protection, outbound email availability and rate-limiter costs; free plan is not guaranteed. Use pagination and bounded requests; monitor errors/latency/quota. Log no secrets. Alerting must be configured using the team's own provider tools, not claimed to exist until tested.

## Owner access limitation
An AI in Antigravity may not have authorized access to provider dashboards or account provisioning. It should finish local implementation and give exact blocked setup steps. Never fabricate a deployed database URL or claim provisioning without evidence.

Set ACTIVE_DATASET_VERSION=synthetic-v2 for initial demo; only change it after a validated publish. Redeploy/runtime configuration changes must be tested together with fixture version.
