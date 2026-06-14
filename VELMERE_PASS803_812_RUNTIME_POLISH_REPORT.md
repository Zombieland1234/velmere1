# VELMÈRE PASS803–812 — Runtime Polish Checkpoint

## Scope
This checkpoint prioritizes the interaction blockers reported from local screenshots:

- cart opening from the wrong side;
- header connect wallet not opening from the trigger;
- language selector not appearing as a small anchored table;
- VLM Access / other wallets opening from the left corner;
- Lens / VLM core not spinning continuously;
- Lens search sitting too low and looking too heavy;
- Shield top section still carrying too much copy;
- Shield table sort needing a true neutral state.

## PASS log

| PASS | Status | Result |
|---|---|---|
| PASS803 | Done | Fixed the global drawer portal frame so it no longer forces all drawers into a left/top viewport box. |
| PASS804 | Done | Cart now uses a bottom motion preset and opens as a bottom/right sheet instead of a left panel. |
| PASS805 | Done | Language selector uses a higher anchored listbox layer under the globe trigger. |
| PASS806 | Done | Header connect wallet now opens as an anchored dropdown from the button, not a detached left drawer. |
| PASS807 | Done | Other wallets expand inside the current wallet panel instead of launching a corner modal. |
| PASS808 | Done | VLM Access panel keeps wallet expansion inside the opened VLM side panel. |
| PASS809 | Done | Lens/VLM core now rotates continuously, with faster scan motion while searching/generating. |
| PASS810 | Done | Lens search moved above the hero; native square focus highlight suppressed. |
| PASS811 | Done | Shield top hero trimmed so search/actions/table become the main product surface. |
| PASS812 | Done | Shield sort cycle updated to desc → asc → neutral and table keeps right mini chart. |

## Tests run

- `npm run verify:pass803-812-runtime-polish` — PASS 15/15
- `npm run verify:pass792-overlay-audit` — PASS 17/17
- `npm run check:i18n` — PASS PL/EN/DE
- TypeScript transpile smoke for changed TS/TSX files — PASS

## Not claimed as finished

These still need the next checkpoint:

- Real Markets modal 1:1 with Shield;
- Real Markets Basic/Pro/Advanced content not appearing under modal layers;
- Shield Map / Orbit 360 full IA polish;
- full `npm ci`, `npm run typecheck`, `next build`, Playwright and Vercel smoke test on Node 24.16/npm 11.16.

## Readiness estimate after this checkpoint

| Area | Estimate |
|---|---:|
| Whole platform code | 92–93% |
| Header / language / connect / wallet | 90% |
| Cart interaction | 91% |
| VLM Access wallet flow | 86% |
| Lens / Browser UX | 77% |
| Shield terminal UX | 88% |
| VLM Brain code | 96% |
| Confirmed production readiness | 86–87% |

