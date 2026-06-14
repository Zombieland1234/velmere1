# VELMERE PASS 134 — Square + VLM Launch Control

## Base
Built on PASS 133.

## Why this pass
The project needed page-by-page analysis beyond Shield. PASS133 created broad audit coverage; PASS134 turns the Square/VLM pages into concrete launch-control UI and typed data so VLM, Square, Community and Member cockpit do not drift into hype or unclear token language.

## Implemented

### 1. Square/VLM launch-control model
Added:
- `lib/launch/square-vlm-launch-control.ts`

It defines:
- route
- progress
- status
- user promise
- safety boundary
- blockers
- next build step

Covered:
- VLM access layer
- VLM FAQ
- Square public board
- Community bridge
- Member cockpit

### 2. Square/VLM launch-control UI
Added:
- `components/launch/SquareVlmLaunchControl.tsx`

Rendered on:
- `app/[locale]/square/page.tsx`
- `app/[locale]/vlm-token/page.tsx`
- `app/[locale]/community/page.tsx`

The UI explains:
- clothing checkout is separate,
- Square is a board/community layer,
- VLM is utility/access only,
- no price/profit/listing promises,
- no custody or seed phrase flow.

### 3. Localization cleanup
Updated:
- `messages/pl.json`
- `messages/de.json`

Fixed known English leftovers around Footer VLM/trust copy.

### 4. Page audit/progress updates
Updated:
- `lib/launch/site-page-audit.ts`
- `lib/launch/project-progress.ts`
- `docs/progress/PROJECT_PROGRESS_LEDGER.md`

### 5. Guard
Added:
- `scripts/verify-square-vlm-launch-control-safety.mjs`

Updated:
- `package.json`
- `scripts/vercel-preflight.mjs`

New command:
- `npm run verify:square-vlm-launch`

## Validation
Passed:
- `node scripts/verify-square-vlm-launch-control-safety.mjs` → exit 0
- `node scripts/verify-site-page-audit-safety.mjs` → exit 0
- `node scripts/verify-vercel-static-safety.mjs` → exit 0
- `node scripts/verify-operator-copy-progress-safety.mjs` → exit 0
- `node scripts/verify-orbit-layout-cleanup-safety.mjs` → exit 0
- `node scripts/verify-evidence-export-manifest-safety.mjs` → exit 0
- `node scripts/verify-evidence-report-safety.mjs` → exit 0
- `node scripts/verify-vlm-motion-governor-safety.mjs` → exit 0
- `node scripts/verify-vlm-brain-performance.mjs` → exit 0
- `node scripts/verify-shield-runtime-ui-safety.mjs` → exit 0
- `node scripts/check-i18n.mjs` → exit 0
- `node scripts/vercel-preflight.mjs` → exit 0
- `node scripts/verify-market-integrity-no-truncation.mjs` → exit 0
- `node scripts/verify-shield-design-safety.mjs` → exit 0
- `node scripts/verify-risk-engine-safety.mjs` → exit 0
- `node scripts/verify-locale-surface.mjs` → exit 0
- `node scripts/verify-ai-brain-import-contract.mjs` → exit 0
- `node scripts/verify-commerce-launch-safety.mjs` → exit 0
- `node scripts/verify-product-truth-safety.mjs` → exit 0
- `node scripts/verify-ai-risk-brain-scenarios.mjs` → exit 0
- `node scripts/verify-operator-casefile-safety.mjs` → exit 0

Static checks:
- raw `<img>` in TSX: 0
- direct runtime MapIterator spreads: 0
- root CODEX artifacts: 0
- deployable CODEX source artifacts: 0
- old bad terms: 0

## Progress after PASS 134

| Area | Previous | After PASS 134 | Change |
|---|---:|---:|---:|
| UI shell / layout | 64–66% | 65–67% | +1% |
| Shield terminal | 66–68% | 66–68% | 0% |
| VLM AI risk brain | 49–52% | 49–52% | 0% |
| VLM visual brain / motion | 59–62% | 59–62% | 0% |
| Data / API spine | 40–41% | 41–42% | +1% |
| Legal / launch safety | 69–71% | 70–72% | +1% |
| Mobile polish | 44–47% | 44–47% | 0% |
| Full translations | 50–53% | 52–54% | +2% |
| Clothing commerce readiness | 61–64% | 61–64% | 0% |
| Square/community readiness | 44–45% | 48–50% | +4–5% |
| VLM access layer | 55–57% | 57–59% | +2% |
| Vercel/static build safety | 70–74% | 72–75% | +2% |
| Whole brand/site launch readiness | 68–70% | 69–71% | +1% |

## Detailed route state

| Route | Progress | Status |
|---|---:|---|
| `/[locale]/vlm-token` | 57% | launch_control |
| `/[locale]/vlm-token/faq` | 51% | partial |
| `/[locale]/square` | 48% | partial |
| `/[locale]/community` | 45% | partial |
| `/[locale]/member` | 39% | blocked |

## Biggest blockers
- checkout / fulfillment,
- Square moderation,
- member cockpit gating,
- VLM legal/contract/audit status,
- live data APIs for Shield,
- real Vercel `npm run build` confirmation.
