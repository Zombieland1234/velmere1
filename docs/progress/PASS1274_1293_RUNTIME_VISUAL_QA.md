# PASS1274–1293 · Runtime visual QA + Lens modal screenshot proof

## Goal
Move from static release gates toward real browser proof. PASS1274 does not claim that Playwright ran in this sandbox. It adds the missing harness and runtime metadata needed to produce screenshot evidence on a normal Node 24/npm 11 machine or a deployed preview.

## What changed

| Area | Change | Why it matters |
|---|---|---|
| Lens report contract | Added `pass1274-runtime-visual-qa-release-gate` to the canonical Lens report payload. | PDF/reader now carries an explicit screenshot proof plan before 100%. |
| Browser/Lens modal | Added PASS1274 data attributes to modal root, header, reader scroll region and A4 article. | Playwright can prove the exact modal surface instead of guessing selectors. |
| Reader UI | Added visible PASS1274 visual QA strip with desktop/mobile viewport matrix and proof state. | The user sees whether visual QA is prepared, not hidden in code. |
| CSS | Added containment/overflow hardening for PASS1274 visual proof surfaces. | Reduces modal/header clipping and mobile overflow risk. |
| Playwright | Added `tests/e2e/pass1274-1293-runtime-visual-qa.spec.ts`. | Produces screenshot artifacts for Lens reader, PDF frame, header language/wallet/cart, Shield modal and Real Markets modal. |
| Package scripts | Added `test:e2e:pass1274-1293` and `verify:pass1274-1293-runtime-visual-qa`. | One command now runs the browser proof when dependencies are installed. |

## Required visual artifacts

The browser proof should create these files under `test-results/pass1274-runtime-visual-qa/`:

1. `lens-reader-desktop-eth.png`
2. `lens-pdf-frame-desktop-eth.png`
3. `lens-reader-mobile-eth.png`
4. `header-language-mobile.png`
5. `header-wallet-mobile.png`
6. `header-cart-mobile.png`
7. `shield-unified-modal.png`
8. `real-markets-unified-modal.png`

## Command chain for real proof

```bash
nvm use 24.16.0
npm ci --no-audit --no-fund --progress=false
npm run verify:pass1274-1293-runtime-visual-qa
npm run check:i18n
npm run vercel:preflight
npm run smoke:routes:static
npm run typecheck
npm run lint
npm run build
npm run test:e2e:pass1274-1293
```

## Honest build truth

| Check | Status here | Meaning |
|---|---|---|
| `npm run verify:pass1274-1293-runtime-visual-qa` | PASS | Static wiring for PASS1274 is present. |
| `npm run check:i18n` | PASS | Locale files remain consistent. |
| `npm run vercel:preflight` | PASS | Static deploy preflight remains intact. |
| `npm run smoke:routes:static` | PASS | Static route smoke still sees the app surface. |
| Full `npm ci` on Node 24/npm 11 | NOT COMPLETED HERE | The sandbox does not provide Node 24.16.0 and previous long installs timed out. |
| Full `npm run build` | NOT PROVEN HERE | Must run after complete install. |
| PASS1274 Playwright screenshot QA | HARNESS ADDED, NOT RUN HERE | Needs installed Playwright/browser + dev server/deployed preview. |

## Updated estimate

| Area | Before | After |
|---|---:|---:|
| Whole platform | 95.2% | 95.6% |
| Runtime proof | 65.0% | 72.0% prepared / not executed |
| Browser / Lens | 89.0% | 90.2% |
| Header / wallet / cart | 97.0% | 97.4% |
| Shield / Real Markets modal proof | 92.0% | 92.8% |
| Build/deploy readiness | 91.6% | 91.8% |

## Remaining blockers before true 100%

1. Run full Node 24 install, typecheck, lint and build on a machine without timeout.
2. Run `npm run test:e2e:pass1274-1293` and inspect the screenshot artifacts.
3. Fix any real browser clipping/overflow found by the screenshots.
4. Continue VLM Brain/provider truth after visual runtime proof is green.
