# PASS1294–1313 — Build Truth + Runtime Artifact Gate

Status: `PASS STATIC GATE / FULL BUILD NOT PROVEN HERE`

This pass does not pretend that Velmère is 100% production ready. It converts the last remaining build/runtime uncertainty into an explicit release gate.

## What was added

- `lib/release/pass1294-build-truth-release-gate.ts`
- `scripts/run-pass1294-build-truth.mjs`
- `scripts/verify-pass1294-playwright-artifacts.mjs`
- `scripts/verify-pass1294-1313-build-truth-runtime-artifacts.mjs`
- package scripts for sandbox-safe proof, full build truth, and Playwright screenshot validation

## Real sandbox result

A full Node 24/npm 11 install was attempted again with:

```bash
npx -p node@24.16.0 -p npm@11.16.0 -c "node -v && npm -v && npm ci --no-audit --no-fund --progress=false"
```

Result: packages started downloading and npm emitted dependency deprecation warnings only, but the sandbox hit a **420s timeout** before a stable `node_modules` directory remained. This is **not counted as green build**.

## Commands that must pass before real 100%

```bash
npm run ci:pass1294-build-truth:full
npm run test:e2e:pass1214-1233
npm run test:e2e:pass1274-1293
npm run verify:e2e:pass1274-1293-artifacts
```

## Screenshot artifacts required

Root: `test-results/pass1274-runtime-visual-qa`

- `lens-reader-desktop-eth.png`
- `lens-pdf-frame-desktop-eth.png`
- `lens-reader-mobile-eth.png`
- `header-language-mobile.png`
- `header-wallet-mobile.png`
- `header-cart-mobile.png`
- `shield-unified-modal.png`
- `real-markets-unified-modal.png`

Each file must exist and be at least 2048 bytes. Missing files keep runtime proof in pending state.

## Percentage rule after this pass

Platform can move from ~95.6% to ~96.0%, but it remains capped below true release until full build and screenshot artifacts are green.

## Next blocker order

1. PASS1314 — run Playwright on real browser and repair actual screenshots.
2. PASS1334 — final Lens/PDF premium typography from real PDF/reader artifacts.
3. PASS1354 — Shield Map evidence graph visual simplification.
4. PASS1374 — VLM Brain source truth and no-random-copy enforcement.
