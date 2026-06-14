# Velmère PASS 127 — detailed page/card progress matrix

## Global product areas

| Area | Progress | Status | Main blocker |
|---|---:|---|---|
| Home / brand landing | 55–58% | review | more premium story, product routing, final hero media |
| Clothing collection page | 63–66% | review | final product truth and provider data |
| Product card system | 66–69% | review | final images, real SKU state, variant QA |
| Product detail pages | 61–65% | review | confirmed composition, size chart QA, care tests |
| Checkout / fulfilment | 25–30% | blocked | provider mapping, taxes, delivery, payment/live fulfilment |
| Shipping / returns / legal pages | 60–64% | review | final country/provider policy details |
| VLM token/access page | 45–50% | partial | utility-only copy, session gating, no investment promise |
| Velmère Square/community | 35–42% | partial | real features, moderation, access rules |
| Shield market table | 58–61% | review | source accuracy, sorting QA, mobile table polish |
| Shield token modal/chart | 59–62% | review | build QA, live data confirmations |
| VLM visual brain | 53–57% | review | real WebGL/Three.js would be needed for true 3D |
| VLM AI risk brain | 47–50% | review | live OSINT/contract/holder feeds |
| Operator AI Case File | 48–52% | review | source ledger + persistent audit storage |
| Evidence export | 22–28% | blocked | renderer, audit logs, redaction policy |
| Data/API spine | 35–36% | partial | holders/orderbook/contract/OSINT production feeds |
| Mobile performance | 40–43% | review | real phone QA after deploy |
| Full PL/EN/DE translations | 45–48% | review | deep Shield copy still mixed in places |
| Launch safety / RegTech copy | 61–63% | review | legal review and export policy |

## Shield/VLM card readiness

| Card / lane | Progress | Status | Notes |
|---|---:|---|---|
| Basic Analysis | 68–72% | usable | 10-point prescreen works, needs QA |
| Pro Review | 55–60% | review | opens now, but member gating/export still incomplete |
| Advanced Analysis | 53–57% | review | orbital shell optimized, still not true WebGL |
| Risk core tile | 70–74% | usable | good first signal, not final verdict |
| Supply/float tile | 50–55% | partial | needs live tokenomics/unlock source |
| Liquidity/exit tile | 45–50% | partial | needs real depth/slippage feeds |
| Holder graph tile | 35–42% | partial | needs chain labels/CEX exclusion |
| Contract owner tile | 32–38% | blocked | needs verified contract scanner/source labels |
| KOL/social tile | 28–35% | blocked | needs OSINT fetch + source ranking |
| Evidence chain tile | 35–42% | partial | needs persistent ledger/export |
| Loss prevention tile | 65–70% | usable | psychology copy and anti-FOMO logic present |
| Operator casefile | 48–52% | review | good structure, needs storage/source ledger |
| Chart/candle view | 62–66% | review | drag pan works, debug controls removed |
| Chart range buttons | 70–74% | usable | 1h/4h/1d/1w buttons stay clear |

## PASS 127 specific changes
- Removed visible chart debug pan controls (`drag chart`, `older`, `newer`, `latest`, bottom history pill).
- Kept chart drag/pan behaviour without clutter.
- Removed the two decorative right-panel link rails under the action panel.
- Lowered default VLM motion quality and added stronger low-power detection using cores/memory/viewport.
- Replaced high-frequency RAF orbit state loop with lower-cadence interval updates.
- Added drag-triggered tile refresh so manual rotation still responds.
- Reduced canvas node/packet counts and shortened animation lifetime.
- Added PASS127 guards for clean chart surface and motion-lite markers.
