# PASS1314–1333 — Playwright screenshot repair gate

Status: HARNESS REPAIRED, NOT RUN HERE.

This pass does not claim green browser proof. It repairs the screenshot proof harness so the next real browser run cannot pass with empty or fake artifacts.

## What changed

- Added `pass1314-playwright-screenshot-repair-gate` as the release rule for visual artifacts.
- Added a stable `data-testid="lens-pdf-toggle"` so the PDF iframe proof no longer depends on translated button copy.
- Updated the PASS1274 Playwright screenshot helper to write a JSON sidecar for every PNG.
- Hardened `verify:e2e:pass1274-1293-artifacts` so it validates:
  - PNG signature;
  - PNG IHDR dimensions;
  - minimum bytes;
  - PASS1314 sidecar metadata;
  - route, viewport and selector for each required artifact.

## Required real browser command

```bash
npm run test:e2e:pass1314-1333
```

This runs the click proof suite, the visual QA suite and then validates the generated artifacts.

## Artifact rule

Every screenshot must have a matching `.png.json` sidecar. The sidecar records:

- pass: `PASS1314-1333`;
- artifact filename;
- capturedAt timestamp;
- route;
- viewport;
- surface;
- selector;
- captured locator width and height.

## Why this matters

Before this pass, the artifact validator only checked file existence and byte size. That was not enough for a real release gate because a corrupt PNG or wrong screenshot could still look non-empty. PASS1314 requires PNG IHDR dimensions and sidecar metadata.

## Still not proven here

The browser was not launched in this sandbox. The correct status is `ready_for_real_browser_run`, not `proven_green`.

Next real blocker: run Node 24/npm 11 full install + build, then run `npm run test:e2e:pass1314-1333` and inspect the eight screenshots.
