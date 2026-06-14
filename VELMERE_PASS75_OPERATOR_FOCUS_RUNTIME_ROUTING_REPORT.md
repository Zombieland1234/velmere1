# Velmère Shield — PASS 75

## PASS 75 — Operator Focus Router / Modal De-Lag / Shield Map Product OS

This pass continues the Velmère Shield / VLM work from PASS 74 and focuses on a real usability issue: the terminal was growing into a wall of stacked panels. PASS 75 adds an operator-focus layer and changes the main modal lane so only the relevant command console is shown for the active command.

## Main goals

- Reduce perceived lag after clicking a token.
- Keep the chart + command palette available before heavy AI/SOC panels.
- Turn the command palette into a real router, not just a decorative row of buttons.
- Improve Shield Map as a product operating map.
- Keep legal/RegTech wording safe: anomaly, review, uncertainty, not accusation or investment advice.

## Files changed

- `components/market-integrity/TokenRiskModal.tsx`
- `components/market-integrity/ShieldMapClient.tsx`
- `lib/market-integrity/terminal-operator-focus.ts`
- `app/api/market-integrity/operator-focus/route.ts`
- `app/api/market-integrity/report/route.ts`
- `app/globals.css`
- `scripts/verify-market-integrity-no-truncation.mjs`
- `scripts/verify-shield-design-safety.mjs`
- `VELMERE_PASS75_OPERATOR_FOCUS_RUNTIME_ROUTING_REPORT.md`

## Product changes

### 1. New Terminal Operator Focus module

Added `lib/market-integrity/terminal-operator-focus.ts`.

The module creates a focus console with:

- first paint / lag guard
- focused command routing
- source confidence
- AI review workflow
- evidence path
- launch blockers
- operator playbook
- visible panel policy
- anti-lag rules
- blocked-until list
- legal note

The version marker is:

`velmere_terminal_operator_focus_v1_pass75`

### 2. New API endpoint

Added:

`app/api/market-integrity/operator-focus/route.ts`

It returns `terminalOperatorFocus` for a query and mirrors the runtime/source/evidence status of the selected token.

### 3. Full report endpoint extended

Updated:

`app/api/market-integrity/report/route.ts`

The report now includes:

`terminalOperatorFocus`

### 4. Modal command routing improved

Updated `TokenRiskModal.tsx`.

Added command:

`Operator review`

The main chart lane no longer renders every console at once. It now routes by `activeCommand`:

- `review`, `risk`, `copilot` → Operator Focus / Copilot
- `launch` → Launch Bridge
- `sources`, `data` → Source Trust
- `export`, `evidence` → Evidence Export / Evidence Workflow
- `runtime` → Runtime Health
- `usability` → Usability Guard
- `ops` → Product Ops Audit
- `control` → Control Plane
- `workspace` → Risk Workspace
- `production` → Production Hardening
- `chart` → Chart Regime

Heavy panels remain behind `terminalBooted`, so the terminal can paint chart and command palette first.

### 5. New modal panel

Added:

`Operator focus router · PASS75`

The panel shows:

- focus score
- active command state
- route lanes
- operator playbook
- visible panel policy
- anti-lag rules
- legal note

### 6. Shield Map upgraded

Updated `ShieldMapClient.tsx` with:

`operator focus router · PASS75`

The new Shield Map section explains:

- why the terminal uses one active command panel
- why heavy panels are deferred
- how AI/SOC review should work
- what remains blocked for export, VLM session, audit logs and launch controls

This keeps the Shield Map moving toward a product operating system instead of a weak static description.

### 7. CSS design system extended

Added classes:

- `.shield-operator-focus`
- `.shield-operator-focus-lane`
- `.shield-map-operator-focus`
- `.shield-map-focus-card`

### 8. QA scripts extended

Updated:

- `scripts/verify-market-integrity-no-truncation.mjs`
- `scripts/verify-shield-design-safety.mjs`

The scripts now check PASS75 files, command IDs, focus routing, CSS classes, API endpoint and report integration.

## Verification run

Passed:

```bash
node scripts/verify-market-integrity-no-truncation.mjs
node scripts/verify-shield-design-safety.mjs
node scripts/check-i18n.mjs
node scripts/vercel-preflight.mjs
```

Expected result:

- Market integrity no-truncation smoke passed.
- Shield design safety checks passed.
- i18n ok across 3 locale files.
- Velmère preflight OK.

## Typecheck status

`npm run typecheck` was attempted, but still cannot fully pass in the sandbox because the project package does not include full installed dependencies / type packages.

Typical missing packages/types include:

- `next`
- `react`
- `react-dom`
- `next-intl`
- `lucide-react`
- `framer-motion`
- `stripe`
- `zustand`
- `tailwindcss`
- Node types

The failure is consistent with earlier passes and is not a verified PASS75 runtime blocker.

## Real status estimate

After PASS75, the Velmère Shield / VLM vision is around 42–46% complete.

The current project now has a stronger UX/runtime spine: command routing, operator focus, runtime health, source trust, evidence export gates and Shield Map product explanation. The main missing production blocks remain real on-chain APIs, live multi-exchange orderbook/depth, persistent audit logs, server-side rate limits/cache, wallet/session gating, billing/access enforcement and real PDF/JSON evidence export.
