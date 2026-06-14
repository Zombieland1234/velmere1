# PASS477–479 — Unified Analysis Depth, Human Evidence Brief, PDF Occlusion Fix & Mobile Real Markets

## Scope

This delivery continues from the full PASS476 project and resolves the next highest-value product gaps in Velmère Browser/Lens and Real Markets:

- Basic / Pro / Advanced could be selected in the UI, but the chosen depth was not a first-class field in the report payload;
- the PDF route could render a different depth from the Reader payload without an explicit parity rejection;
- the human-facing report mixed technical layers and did not clearly separate confirmed facts, review values and missing evidence;
- the global site header could still remain above the PDF depth dialog, forge or preview because those surfaces started below `top-20` with a low z-index;
- Real Markets still rendered a 1240 px desktop table on phones and depended on horizontal scrolling;
- the search surface needed an explicit invariant that suggestions do not mutate the stable market catalog while typing.

## PASS477 — Unified depth contract

Added `lib/market-integrity/pass477-unified-depth-contract.ts`.

The contract makes report depth part of the signed report model instead of an after-the-fact UI choice:

- canonical `basic | pro | advanced` selection;
- exact field budgets: Basic 10, Pro 14, Advanced 20;
- localized purpose, included layers and intentionally excluded layers;
- exact metric IDs for every tier;
- source count, evidence state and confidence ceiling;
- four localized forge stages;
- parity guarantees for Reader, PDF blob, download and Shield handoff;
- hard rule that missing data may not become a fact.

`buildLensReport()` now receives the requested depth and builds PASS466, PASS477 and PASS478 from one depth value. The Browser no longer mutates `report.pass466` after report creation.

The PDF endpoint now rejects a query/payload depth mismatch with HTTP 409 instead of silently rendering a different report tier.

## PASS478 — Human evidence brief

Added `lib/market-integrity/pass478-human-evidence-brief.ts`.

The new human layer converts the selected 10/14/20 metric set into:

- an evidence-bounded verdict;
- a localized confidence ceiling;
- claims with `confirmed`, `review`, `source_required` or `not_applicable` state;
- confirmed facts;
- explicit confidence limits;
- concrete next checks;
- questions that would materially change the read;
- a clear non-forecast / independent-verification disclosure.

The Reader now exposes:

- selected report depth and field budget;
- what the selected tier includes and intentionally omits;
- evidence state and confidence ceiling;
- confirmed facts and confidence limits in separate panels;
- the selected PASS478 human verdict instead of relying only on the older technical decision copy.

The generated PDF now uses the same PASS477/PASS478 payload for the title line, verdict, confirmed facts, confidence limits, next checks and final decision boundary. Response headers expose the selected depth contract, human brief version and field budget.

## PASS479 — Full-screen PDF and mobile Real Markets

### PDF header occlusion repair

The depth selector, four-stage forge and final preview now:

- cover the full viewport instead of starting below the global header;
- use a project-level modal z-index above all site chrome;
- respect top and bottom safe-area insets;
- keep their own scroll region and shared body scroll lock;
- preserve the visible close, download, Reader/PDF switch and Shield/Orbit handoff controls.

### Mobile Real Markets cards

Added a dedicated responsive card layout below `xl`:

- no 1240 px horizontal table on phones or tablets;
- identity, symbol, venue/class, price, 24h movement and mini chart are visible in the first scan;
- risk, market cap, volume and source state are grouped into compact evidence cells;
- each card opens the existing full analysis modal;
- loading and show-more states work independently on mobile;
- the desktop data table remains unchanged at `xl` and above.

The search container is now width-safe on narrow screens, and the catalog remains stable while the user types. Search suggestions open the selected analysis instead of shrinking the entire table.

## Files changed

- `app/api/search/lens-report/route.ts`
- `components/market-integrity/CrossAssetCollapseRadarPanel.tsx`
- `components/search/VelmereIntelligenceSearchClient.tsx`
- `lib/search/lens-report.ts`
- `lib/market-integrity/pass477-unified-depth-contract.ts`
- `lib/market-integrity/pass478-human-evidence-brief.ts`
- `scripts/verify-pass477-479-intelligence-pdf-realmarkets.mjs`
- `package.json`
- PASS479 report/progress metadata

## Validation completed

- PASS477–479 dedicated verifier: PASS.
- PASS476 regression verifier: PASS.
- TypeScript/TSX syntax parse: 795 files, 0 syntax errors.
- PL / DE / EN i18n parity: PASS.
- Vercel preflight: PASS, 791 deployable files scanned.
- Depth budgets checked statically: Basic 10 / Pro 14 / Advanced 20.
- PDF query/payload mismatch gate checked.
- Mobile card / desktop table breakpoint gate checked.
- ZIP exclusions checked for `node_modules`, `.next`, `.git`, cache and build-info files.

## Build note

A clean dependency installation was attempted, but the sandbox package extraction did not complete before the execution limit. The repository targets Node.js 20.x while the sandbox exposes Node.js 22.16.0. Therefore a full `next build` is not claimed here. The project-level syntax, i18n, preflight and dedicated regression gates pass; the final production build should run under the repository's declared Node.js 20.x environment after `npm ci`.
