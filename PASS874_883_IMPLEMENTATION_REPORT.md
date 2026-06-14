# PASS874–PASS883 — Route Surface Cleanup + Browser/Cart Handoff Integrity

## Scope
This pass focuses on real navigation/runtime blockers that can create 404s or wrong handoffs even when UI polish looks finished.

## Implemented
- Added short localized route aliases:
  - `/[locale]/real-markets` renders `CrossAssetCollapseRadarPanel` directly.
  - `/[locale]/shield-map` renders `ShieldMapCommandClient` directly.
  - `/[locale]/collection` redirects to `/${locale}/clothing` instead of falling into missing-route handling.
- Added root redirects:
  - `/real-markets` → `/pl/real-markets`
  - `/shield-map` → `/pl/shield-map`
  - `/collection` → `/pl/clothing`
- Updated product navigation to use clean public routes:
  - Shield → `/shield-map`
  - Real Markets → `/real-markets`
  - Browser Orbit handoff → `/[locale]/shield-map?...`
- Fixed a commerce route bug:
  - Cart policy link now points to `/terms` instead of missing `/legal/terms`.
- Expanded `smoke:routes` matrix with customer-critical pages:
  - `/collection`, `/market-integrity`, `/shield-map`, `/real-markets`, `/search`, `/square`, `/member`, `/security`.
- Added verifier:
  - `verify:pass874-883-route-surface-cleanup`.

## Verified in this environment
- `npm run verify:pass874-883-route-surface-cleanup` — PASS
- `npm run check:i18n` — PASS
- `npm run verify:pass864-873-shield-shell-gemini-micro` — PASS
- `npm run verify:pass854-863-gemini-unified-shell` — PASS after regenerating local slim handoff for verifier only
- `npm run verify:pass844-853-unified-asset-modal` — PASS
- `npm run verify:pass834-843-evidence-graph` — PASS
- `npm run verify:pass824-833-runtime-cleanup` — PASS
- `node --check scripts/verify-pass874-883-route-surface-cleanup.mjs` — PASS
- `node --check scripts/smoke-routes.mjs` — PASS

## Still not honestly verified
- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- real browser click QA

Reason: the sandbox exposes Node 22/npm 10, while the project explicitly requires Node 24/npm 11 via `engines`, `volta` and `doctor:runtime-env`.

## Runtime risk reduced
Users and QA can now use short product routes without relying on nested internal URLs. This reduces the chance of direct `/pl/shield-map`, `/pl/real-markets` and `/pl/collection` 404 reports.
