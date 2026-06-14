# VELMERE PASS 132 — Operator Copy Clarity + Project Progress Matrix

## Base
Built on PASS 131.

## Why this pass
After the orbit cleanup, the next problem was clarity: some Shield text still sounded too technical or too vague. A new user should understand what Basic, Pro and Advanced do, what a low score means, and what the operator should check next.

## Implemented

### 1. Clearer Operator AI language
Updated:
- `lib/market-integrity/operator-casefile.ts`

Changed the low-risk wording from a weak generic sentence to pre-screen language:
- current sources show a low-risk pre-screen,
- it is not a clean certificate,
- missing sources keep the case in review mode.

### 2. Better Basic / Pro / Advanced copy
Updated:
- `components/market-integrity/TokenRiskModal.tsx`

New intent:
- Basic = fast prescreen without heavy scene.
- Pro = sources, missing data and review.
- Advanced = full risk map and evidence.

### 3. Compact right-panel guide
Added:
- `.shield-mode-guide`

The right action panel now has a short guide explaining that a low score is not a safety certificate and missing data still matters.

### 4. Project progress matrix in code
Added:
- `lib/launch/project-progress.ts`

This keeps progress estimates in the project, not only in chat. It includes home, clothing, product pages, checkout, Shield, AI brain, evidence export, data spine, mobile, translations and launch safety.

### 5. Documentation
Added:
- `docs/progress/PROJECT_PROGRESS_MATRIX_PASS132.md`

### 6. Guard
Added:
- `scripts/verify-operator-copy-progress-safety.mjs`

Updated:
- `package.json`
- `scripts/vercel-preflight.mjs`

New command:
- `npm run verify:operator-copy-progress`

## Validation
Passed:
- `$ node scripts/verify-operator-copy-progress-safety.mjs -> 0`
- `unzip -t`

Static checks:
- raw `<img>` in TSX: 0
- direct MapIterator spreads: 0
- root CODEX artifacts: 0
- deployable CODEX TS/JS artifacts: 0
- old bad terms: 0

## Progress note

| Area | Previous | After PASS 132 | Change |
|---|---:|---:|---:|
| UI shell / layout | 62–64% | 63–65% | +1% |
| Shield terminal | 64–66% | 65–67% | +1% |
| VLM AI risk brain | 48–51% | 49–52% | +1% |
| VLM visual brain / motion | 59–62% | 59–62% | 0% |
| Data / API spine | 37–39% | 38–40% | +1% |
| Legal / launch safety | 66–68% | 67–69% | +1% |
| Mobile polish | 44–47% | 44–47% | 0% |
| Full translations | 47–50% | 50–52% | +2% |
| Clothing commerce readiness | 60–63% | 60–63% | 0% |
| Evidence export / report draft | 42–48% | 43–49% | +1% |
| Whole brand/site launch readiness | 66–68% | 67–69% | +1% |

## Detailed progress matrix

| Element | Progress |
|---|---:|
| Home / brand landing | 60% |
| Clothing collection page | 67% |
| Product card system | 70% |
| Product detail pages | 66% |
| Checkout / fulfilment | 30% |
| Shipping / returns / legal pages | 68% |
| VLM token / access layer | 54% |
| Velmère Square / community | 43% |
| Shield market table | 63% |
| Shield token modal / chart | 67% |
| VLM visual brain | 63% |
| VLM AI risk brain | 52% |
| Operator AI Case File | 58% |
| Evidence report / JSON preview | 49% |
| Data/API spine | 39% |
| Mobile performance | 47% |
| Full PL/EN/DE translations | 51% |
| Launch safety / RegTech copy | 69% |
