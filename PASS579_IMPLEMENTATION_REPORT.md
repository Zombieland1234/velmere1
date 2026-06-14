# Velmère PASS573–579 — Reader / Shield Map / Real Markets intelligence release

## Scope

This package continues directly from PASS565. The batch closes the next user-facing failure class: mixed-language PDF text, content that can overflow A4 page boundaries, Shield Map nodes without a focused evidence view, provider status that is too vague, a Real Markets table that relies on desktop overflow, and search flows that can select a merely similar instrument instead of the exact requested one.

## PASS573 — PDF locale purity contract

- Added a public PDF text sanitizer for PL / DE / EN.
- Common English fallback phrases are translated before they reach the Reader or downloadable report.
- Titles, summaries, section bodies, source notes, missing-data labels and the next verification step use the same locale contract.
- The report records detected language leaks and exposes a locale-purity state for release QA.

## PASS574 — deterministic A4 page-boundary matrix

- Added per-page character budgets for Decision, Evidence, Analysis and Boundaries.
- Report density is calculated before presentation instead of relying only on CSS wrapping.
- The matrix records estimated collisions, overloaded pages and the global document density.
- Reader surfaces expose the boundary state while public A4 CSS prevents table rows, cards and headings from splitting incorrectly.

## PASS575 — Shield Map evidence delta

- Added comparison between the previous and current evidence snapshot.
- The Map now explains risk, blocker, source and confidence movement instead of showing only the newest absolute value.
- Added resolved blockers and newly introduced blockers with a localized next action and confidence boundary.
- Snapshot history remains source-bound; missing previous evidence is shown as a baseline rather than invented change.

## PASS576 — right-edge Shield Map focus drawer

- Atlas node selection now opens a dedicated evidence drawer from the right edge on desktop and as a bottom sheet on mobile.
- The drawer includes source attachments, observation time, next verification test and explicit evidence boundary.
- Added Escape close, outside-click close, body scroll lock, safe mobile height and reduced-motion behavior.
- The main Orbit/Map surface stays visible behind the drawer, preserving spatial context.

## PASS577 — provider SLO console

- Added closed / half-open / open / unknown provider circuit states.
- Provider cards expose freshness, retry pressure, recovery score and a concrete next action.
- Existing states such as `source_bound`, `rate_limited` and `provider_error` are normalized into a readable public reliability contract.
- The SLO layer does not upgrade confidence when provider recovery or source freshness is incomplete.

## PASS578 — full-width Real Markets table

- Removed the fixed 1240 px minimum-width dependency from the desktop table.
- Rebalanced the grid columns so the primary catalogue fits its container without a forced horizontal scrollbar.
- Long labels truncate safely while full values remain available in the analysis modal.
- The public Real Markets category list still excludes Crypto; crypto analysis remains in Velmère Shield.

## PASS579 — exact search receipt and regression gate

- Exact symbol, exact ID and exact name now outrank fuzzy/ranked matches.
- Search writes a deterministic receipt containing the selected key, match mode and boundary.
- Empty input resolves to `missing` rather than silently opening a default instrument.
- The same exact-resolution policy is wired into Lens search, Shield search, Shield Map investigator search and Real Markets.
- Added a dedicated PASS573–579 verifier and targeted TypeScript configuration; the verifier is part of the production build chain.

## Changed production surfaces

- Velmère Lens / Browser and A4 PDF Reader
- Shield Map investigator, snapshot report and atlas node focus
- Velmère Shield exact asset resolution
- Real Markets catalogue, exchange provider health and responsive table
- Shared PDF report construction and search resolution contracts

## Validation completed

- PASS573–579 verifier: PASS.
- PL / DE / EN i18n check: PASS.
- Vercel preflight: PASS, 855 project files scanned.
- TypeScript parser sweep: PASS, 861 TS/TSX files, 0 syntax diagnostics.
- Runtime helper tests: PASS, 5 checks.
- Base comparison: 7 production files changed and 7 implementation/gate files added.
- Package excludes `node_modules`, `.next`, `.git`, caches and logs.

## Environment boundary

A full semantic `tsc` and `next build` are not claimed. The sandbox does not contain the complete project dependency tree and runs Node.js 22.16.0, while the project production contract is Node.js 20.x. Run `npm ci` and `npm run build` under Node.js 20.x before deployment.
