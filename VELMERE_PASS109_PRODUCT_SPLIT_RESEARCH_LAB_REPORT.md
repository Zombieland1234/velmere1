# VELMERE PASS 109 — Product Split + Research Lab Route + Local-First Search Suggestions

## Base
Built on PASS 108 AI Risk Brain Handoff.

## Main goal
Keep moving while Codex works on the real AI risk brain (`risk-engine.ts`).

## Implemented

### 1. Main Shield terminal search autosuggest upgrade
Updated:
- `components/market-integrity/MarketIntegrityClient.tsx`

Changed:
- one-letter local suggestions now work from already-loaded market rows
- suggestions are local-first, so the API is not spammed for every single character
- remote `/api/market-integrity/search` is used only from 2+ characters and merges with local suggestions
- suggestions expanded from 3 to 6
- exact/local table matches still open terminal instantly
- `placeholder=""` preserved because the Shield design-safety script requires the clean empty main search field

### 2. Dedicated Research Lab route
Added:
- `app/[locale]/research-lab/page.tsx`

Localized:
- Polish
- German
- English

Content:
- Bajak Protocol as numerical audit
- primes and cryptography as education/research
- inverse formula as research pipeline
- explicit safe boundaries:
  - no crypto-breaking promises
  - no RH proof claim
  - no investment/ROI promises
  - replication/falsification/peer review framing

### 3. VLM page Research Lab CTA
Updated:
- `components/vlm/VlmAccessGatePage.tsx`

Added hero CTA:
- Research Lab

This links VLM Access with the new research narrative without turning it into an investment promise.

## Validation
Passed:
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`
- `node scripts/verify-market-integrity-no-truncation.mjs`
- `node scripts/verify-shield-design-safety.mjs`

Static checks:
- raw `<img>` in TSX: 0
- direct MapIterator spreads: 0
- critical old TokenRisk/risk-engine bad terms: 0

## Parallel track
Codex should still work on:
- `lib/market-integrity/risk-engine.ts`

We continue with:
- translations,
- Square,
- VLM access,
- visual VLM brain,
- Research Lab,
- Basic/Pro/Advanced product separation,
- Vercel build cleanup.

## Next PASS 110
Recommended:
- Move Research Lab link into navigation/footer where appropriate.
- Full PL/DE/EN sweep of Shield Map old PASS archive.
- Add Basic / Pro / Advanced product cards to Shield Map and VLM Access.
- Build a dedicated `/market-integrity/research-lab` bridge or link route.
- Continue visual brain polish after AI risk brain returns from Codex.
