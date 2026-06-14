# PASS1994 — final visual / logic / lag sweep

## Completed changes

| Request area | Implementation status | Percent | Notes |
|---|---:|---:|---|
| Duplicate TSX issues | Done | 100% | Removed duplicate `testIdPrefix` prop from `UnifiedTimeframeTabs` and verified the Real Markets search `useMemo` has one callback only. |
| Popup asset modal: five clean windows | Done, continued visual polish | 94% | Added PASS1994 final modal layer: transparent shell, separate dark header/readout/timeframe/chart/action windows, tighter viewport heights. |
| Popup background / transparent clutter | Done | 96% | Modal, menu, cart, wallet and private note surfaces use solid dark backgrounds and darker drawer backdrops. |
| Popup no-scroll desktop feel | Mostly done | 92% | Desktop modal locks heights and hides overflow; mobile still allows inner scroll for usability. |
| Basic / Pro / Advanced right-side cards | Done | 96% | Three right cards now use locked equal heights, shorter text rhythm and separate solid card styling. |
| Shield sorting click-proof | Done technically | 98% | Strengthened pointer/touch/cursor/z-index for table header sort buttons and retained click-proof verifier. |
| Real Markets table alignment | Done | 95% | Re-aligned columns, numeric cells, chart column and compact density to be closer to Shield. |
| Real Markets search aliasing | Done first layer | 87% | Added manual aliases for Binance/BNB, MEXC/MX, OKX/OKB, Coinbase, Kraken, Bybit, Microsoft, Apple, Nvidia, Google/Alphabet, Amazon, Meta, Tesla, Visa and Mastercard. |
| Microsoft / brand logo fallback | Improved | 85% | Local brand resolver now supports base ticker symbols like `SAP.DE` → `SAP` and hides glyph once image loads. |
| Menu/cart/private note lag and background | Improved | 91% | Solid surfaces, darker backdrop and shorter overlay motion from earlier pass retained. |
| Lens / shop typewriter | Retained | 100% | Slower Lens typewriter and shop commerce-first typewriter remain in place. |
| Whole-file visual sweep | Continued | 91% | Focused on CSS hierarchy, table alignment, modal spacing, typography, background and pointer bugs. |

## Checks run

| Check | Result |
|---|---:|
| `npm run verify:pass1994-final-visual-logic-sweep` | OK |
| `npm run check:i18n` | OK |
| `npm run vercel:preflight` | OK |
| `npm run verify:pass1934-1973-runtime-click-proof` | OK 20/20 |
| `npm run verify:pass1993-visual-qa-polish` | OK |
| `package.json` parse check | OK |
| quick duplicate scan | OK |

## Remaining risk

Full browser runtime and full `next build` were not run here because this ZIP workspace has no installed `node_modules`. The static/verifier checks passed, but final feel should still be checked in the browser after install/build.
