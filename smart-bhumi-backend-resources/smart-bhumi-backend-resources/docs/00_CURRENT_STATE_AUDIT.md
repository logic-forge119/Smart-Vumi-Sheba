# Verified current state
Audit source: Library file smart-bhumi-seba-netlify.zip, retrieved 2026-10-15. This audits that artifact, not an unseen latest GitHub repository or the currently deployed Netlify runtime.

The archive contains exactly nine files: app.js, demo-data.js, icon.svg, index.html, manifest.webmanifest, sw.js, verification-ui.js, verification.js and _headers. There are no server handlers, database migrations, package manifest, auth configuration or server deployment files in this artifact.

- demo-data.js creates synthetic-v2 citizens C01–C06, four khatians, transfers, mutations and land status locally.
- verification.js evaluates deterministic checks in a browser IIFE named LandVerification. It is useful rule logic, not a server or AI model.
- app.js searches arrays and tracks cases locally. openDB() opens IndexedDB bhumi-local version 2 with drafts, receipts, preferences and reports stores.
- verification-ui.js saves/loads reports through those local stores and generates JSON/print output in the browser.
- sw.js caches the shell and responds to same-origin GET requests. Its generic cache handler needs explicit API/auth exclusions before backend integration.
- There is no shared, authoritative persistent verification history, server-side access control, owner-private report API or real registry connection here.

Conclusion: the supplied deploy package is a static offline-capable prototype with client-side business rules. It does not implement an application backend. An external backend could exist outside this artifact; no such implementation was supplied or verified.

## Migration map
| Current code | Target responsibility |
|---|---|
| demo-data.js | deterministic database seed; browser fixture only in explicit demo mode |
| LandVerification.evaluate | server shared domain module, versioned tests; browser preview must not create authoritative results |
| searchRecords()/trackCase() | API reads with complete scope identifiers |
| run verification in verification-ui.js | POST /api/v1/verifications, then render server response |
| IndexedDB reports | optional local snapshot cache with owner namespace, not system of record |
| drafts/receipts/preferences | private API for supported drafts; unsupported receipts stay clearly local/demo |
| sw.js | shell-only cache, exclude API/auth/storage URLs |
| SVG plot map | conceptual sample visualization; do not claim cadastral/GIS accuracy |

Do not import old locally stored reports as server-issued reports. Mark them legacy-local or regenerate after a new authenticated request. Do not expose old device drafts under a different user's session.
