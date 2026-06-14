# Velmère PASS158 — Big Surface Sweep

## Scope

This pass intentionally takes a larger package than the previous micro-passes. It touches several user-visible surfaces while keeping the Vercel/static safety rail intact.

## Implemented

- VLM token page: localized EN/PL/DE operating copy for utility, tokenomics, roadmap, contract/audit status, risk notice and FAQ.
- VLM token page: added a launch operating matrix covering access rules, wallet safety, contract/audit and Shield routing.
- Square: fixed missing German mode/trust copy keys used by the UI.
- Square: added launch routing cards so the page explains how public feed, moderation, member rooms and Shield language work.
- Square: added a release checklist in the right rail.
- Research Lab: added validation matrix for dataset, benchmark, negative controls and peer review.
- Checkout: added commerce readiness matrix explaining provider truth, payment, shipping and returns before activation.
- Guard: added `verify:pass158-big-surface-sweep` and attached it to `verify:shield-all`.

## Verified locally in artifact environment

```bash
npm run check:i18n
npm run repair:codex-handoff
npm run vercel:preflight
npm run verify:shield-all
npm run verify:pass158-big-surface-sweep
unzip -t
```

All static checks passed in the artifact environment. Full `next build` is still not claimed locally because this sandbox does not include the full Vercel `node_modules` install.

## Progress delta

| Area | PASS157 | PASS158 | Delta |
|---|---:|---:|---:|
| Vercel/static build safety | 96% | 96% | 0% |
| Shield Map containment | 95% | 95% | 0% |
| Shield modal / chart popup | 89% | 89% | 0% |
| Basic/Pro/Advanced UX | 91% | 91% | 0% |
| Risk tile visual/readout | 94% | 94% | 0% |
| Selected tile drawer | 94% | 94% | 0% |
| VLM visual brain / motion | 82% | 82% | 0% |
| VLM brain performance | 82% | 82% | 0% |
| VLM token page | 59% | 68% | +9% |
| Velmère Square | 49% | 60% | +11% |
| Research Lab / prime crypto story | 43% | 55% | +12% |
| Commerce/order/payment readiness | 51% | 57% | +6% |
| PL/EN/DE translations | 72% | 78% | +6% |
| Mobile polish | 66% | 67% | +1% |
| Home / brand landing | 67% | 67% | 0% |
| Shield evidence/report/export | 63% | 63% | 0% |
| Shield terminal/search | 77% | 77% | 0% |
| Whole launch readiness | 91–93% | 92–94% | +1% |

## Next blockers

- Run PASS158 on Vercel to catch the next real TypeScript/build error if one remains.
- Real browser review of VLM modal FPS, chart proportions and mobile bottom sheet.
- Product/provider truth still needs production data connections.
- Research Lab still needs downloadable audit framing and clearer public/private split.
