# PASS243–PASS245 — AI Brain Real Three-Pass Branch

Ten branch nie używa sztucznego numerowania dziesięciu małych etykiet. Zawiera trzy konkretne większe passy wdrożone w kodzie:

## PASS243 — Release Triage Board
- Nowy kontrakt: `lib/market-integrity/vlm-brain-release-triage-board.ts`.
- Kompresuje release chain, launch dashboard, control tower, PDF manifest, wallet gate i data-quality gate w jeden operator-only go/no-go board.
- Twarde flagi zostają zablokowane: customer export, binary PDF, wallet access, raw payload.

## PASS244 — Operator Handoff Vault
- Nowy kontrakt: `lib/market-integrity/vlm-brain-operator-handoff-vault.ts`.
- Zamienia triage board na konkretne zadania durable-write: source snapshot, case timeline, redaction manifest, PDF preview, browser QA trace.
- Handoff jest preview/no-PII, bez raw payload.

## PASS245 — Browser Replay Script
- Nowy kontrakt: `lib/market-integrity/vlm-brain-browser-replay-script.ts`.
- Tworzy realną checklistę QA do Vercel browser replay: modal layering, Orbit FPS, tile keyboard flow, search portal, PDF preview, wallet/access gate, mobile, reduced motion.
- Statyczne guardy nie są udawane jako browser QA.

## UI
`TokenRiskModal.tsx` renderuje trzy nowe panele w drawerze klikniętego kafelka:
- `data-vlm-release-triage-board="pass243"`
- `data-vlm-operator-handoff-vault="pass244"`
- `data-vlm-browser-replay-script="pass245"`

## Walidacja
- `node scripts/verify-pass243-245-ai-brain-real-three-pass-safety.mjs`
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`
- `npm run verify:shield-all`

Pełny `tsc/next build` wymaga lokalnego/Vercelowego `node_modules`.
