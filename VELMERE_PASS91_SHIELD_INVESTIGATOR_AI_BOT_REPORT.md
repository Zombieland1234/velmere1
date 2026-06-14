# VELMERE PASS 91 — VLM Shield Investigator / AI Bot OSINT Protocol

## Base
Built on PASS 90 `velmere_pass90_shield_neural_launch_system`.

## What changed

### 1. New VLM Shield Investigator engine
Added `lib/market-integrity/shield-investigator.ts`.

It builds a structured OSINT-style investigation protocol:
- Supply / float risk
- Vesting / unlock transparency
- Liquidity / exit-depth risk
- Whale / insider risk
- Social / KOL hype risk
- Contract / governance risk
- Evidence table
- Web OSINT search queries
- Final verdict and confidence score

The engine never treats missing transparency as safe. Missing vesting, holder, supply or contract data increases risk.

### 2. API integration
Added:
- `app/api/market-integrity/investigator/route.ts`

Updated:
- `app/api/market-integrity/assistant/route.ts`
- `app/api/market-integrity/chat/route.ts`

The AI bot endpoints now return `investigator` alongside existing assistant/chat outputs.

### 3. Advanced modal integration
Updated `components/market-integrity/TokenRiskModal.tsx`.

Advanced VLM console now includes:
- VLM Shield Investigator brief
- Shield risk score
- confidence
- six investigation lanes
- web OSINT required query rail
- no hype / no accusation without evidence guardrail

This makes Advanced feel like an actual investigation layer, not only visual decoration.

### 4. Shield Map launch storytelling
Updated `components/market-integrity/ShieldMapClient.tsx`.

Added a new Shield Investigator section explaining:
- supply/float protocol
- vesting/unlocks
- engineered demand
- KOL/social risk
- contract control
- evidence standard
- investigator guardrails

Shield Map now explains how the bot works and why missing transparency is a red flag.

### 5. Types / Vercel safety
Updated:
- `lib/market-integrity/risk-types.ts`
- `lib/market-integrity/risk-engine.ts`

TokenRiskResult metrics now carry:
- circulatingSupply
- totalSupply
- maxSupply

Also scanned for direct `MapIterator` spreads like `[...map.values()]`; no remaining matches found.

## Validation

Passed:
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`
- `node scripts/verify-market-integrity-no-truncation.mjs`
- `node scripts/verify-shield-design-safety.mjs`

Not fully run:
- `next build` / `tsc --noEmit`, because this sandbox package does not include installed `node_modules`.

## Product direction
This pass turns VLM AI from a generic risk bot into a dedicated Shield Investigator:
- direct
- evidence based
- OSINT-ready
- legally safer
- stronger for Advanced Analysis and Shield Map

Next recommended pass:
PASS 92 — run a full Vercel build log loop, then continue mobile polish + actual Shield Map dashboard UX.
