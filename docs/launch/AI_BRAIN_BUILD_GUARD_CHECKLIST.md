# Velmère PASS 116 — AI Brain Build Guard Checklist

## Purpose
After integrating the Codex `risk-engine.ts`, the project needs automated guards so Vercel fails early if the AI brain reintroduces old runtime/build hazards.

## Guarded issues
- `result.limitations` cannot return.
- Old duplicated VLM risk text cannot return.
- Old `index` transform bug cannot return.
- Direct Map/Set iterator spread is blocked.
- Browser APIs inside `risk-engine.ts` are blocked.
- Required exports are checked.
- Unsafe hype/advice/legal-accusation language is blocked.
- Signal IDs used by `risk-engine.ts` must exist in `RiskSignalId`.

## Commands
- `npm run verify:risk-engine`
- `npm run verify:shield-all`
- `npm run vercel:preflight`
- `npm run build`

## Remaining manual checks
- Confirm Vercel build after deployment.
- Confirm terminal runtime after clicking a high-risk token.
- Confirm low-risk large caps do not get inflated by missing-data noise.
- Confirm stablecoins/RWA show reserve/issuer uncertainty instead of fake safety.
