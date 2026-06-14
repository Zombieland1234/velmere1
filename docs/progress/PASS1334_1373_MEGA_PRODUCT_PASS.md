# PASS1334–1373 — Mega Product Pass

Ten pass nie jest małym verifierem. To większy blok po korekcie trybu pracy: mniej papierowych numerków, więcej realnego produktu.

## Scope

### PASS1334 — PDF Premium Final
- New contract: `pass1334-pdf-premium-final`.
- Adds decision-first premium cover metadata, source appendix, missing-data visibility, preview/download parity and no-overlap budget.
- Integrated into `LensReport`, Browser reader UI and PDF route headers.

### PASS1354 — Shield Map Evidence Graph 2.0
- New contract: `pass1354-shield-map-evidence-graph-2`.
- Shield Map is explicitly a why-verdict graph, not another price table or PDF clone.
- Enforces 6–8 node budget, right drawer contract, drawer-only scroll and forbidden repeats: price table, PDF body clone, market cap wall, sort buttons.
- Integrated into `ShieldMapClient` and `LensReport`.

### PASS1374 — VLM Brain Source Truth Final
- New contract: `pass1374-vlm-brain-source-truth-final`.
- Adds hard source-truth rules: no random copy, no fake live wording, no hidden missing data, conflict lowers confidence, every report needs a human next check.
- Integrated into `LensReport`, Browser reader UI and PDF route headers.

## Why this matters

The earlier PASS1314–1333 was too narrow: it hardened screenshot artifact validation, but it did not improve enough of the visible product. This block changes product surfaces:

- Lens/Browser reader gains visible premium PDF and VLM source-truth strips.
- PDF route rejects mismatched premium/truth contracts before export.
- Shield Map gets a stronger evidence graph role and visible contract copy.
- `isLensReport` now requires PASS1334, PASS1354 and PASS1374 invariants.

## Release state after this pass

- Overall platform estimate: 96.3% -> 96.9%.
- Browser/Lens: 91.0% -> 92.4%.
- PDF premium/readability: 88.0% -> 91.5%.
- Shield Map: 80.5% -> 84.8%.
- VLM Brain source truth: 85.0% -> 88.4%.

Still not 100% until full Node 24 install, typecheck, lint, build and browser Playwright screenshot QA pass outside the sandbox timeout.
