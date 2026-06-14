# Velmère Shield — PASS 67

## Scope
PASS 67 fixes real runtime and usability bugs observed on local screenshots:

- token modal crashed with `ReferenceError: FileText is not defined`
- Shield Map opened as an inline block on the main radar instead of a full page
- search suggestions stayed open after clicking outside
- one-letter searches could fall through to analyze and hit external API 429
- table area could trap mouse wheel scrolling
- Shield Map needed a clearer product explanation without exposing private scoring internals
- terminal usability guard had a stale `operatorActionQueue` field reference

## Files changed

- `components/market-integrity/MarketIntegrityClient.tsx`
- `components/market-integrity/TokenRiskModal.tsx`
- `components/market-integrity/ShieldMapClient.tsx`
- `app/[locale]/market-integrity/shield-map/page.tsx`
- `app/market-integrity/shield-map/page.tsx`
- `app/globals.css`
- `lib/market-integrity/terminal-usability-guard.ts`
- `scripts/verify-market-integrity-no-truncation.mjs`
- `scripts/verify-shield-design-safety.mjs`

## Fix details

### Modal crash

`TokenRiskModal.tsx` used `<FileText />` in the Evidence header button without importing the icon from `lucide-react`. PASS 67 imports it explicitly. This directly addresses the shown runtime error.

### Shield Map routing

The main page no longer renders Shield Map as an inline panel below the search area. The Shield Map control now links to a full page:

- `/pl/market-integrity/shield-map`
- `/market-integrity/shield-map` redirects to the Polish route

The full Shield Map page explains:

- intake
- source layers
- agent fusion
- risk routing
- evidence handoff
- operator lanes
- critical review list
- release guardrails

It keeps private scoring weights, thresholds and heuristics hidden.

### Search suggestion closing

The search form now has a ref and a document-level pointer listener. Clicking outside the search shell closes the suggestions dropdown.

### Scan resolver guard

Short one-character input no longer falls through into the remote analyze call. The resolver also checks local market rows after resolving a suggestion so symbols like `SOL` can open from loaded table data instead of calling external providers unnecessarily.

HTTP 429 from external sources is now turned into a clearer user-facing message instead of a confusing generic scan failure.

### Table scroll

The desktop table wrapper now uses `shield-table-scroll-x` and a controlled wheel handler. Vertical wheel movement over the table forwards to the page scroll, while horizontal overflow remains available for wide table layouts.

### Terminal usability guard type fix

`terminal-usability-guard.ts` now uses `control.actionQueue.length`, matching the actual `TerminalControlPlaneBrief` type. The old `operatorActionQueue` reference is removed.

## Verification

Passed:

```bash
node scripts/verify-market-integrity-no-truncation.mjs
node scripts/verify-shield-design-safety.mjs
node scripts/check-i18n.mjs
node scripts/vercel-preflight.mjs
```

Results:

```text
Market integrity no-truncation smoke passed.
Shield design safety checks passed.
i18n ok across 3 locale files
Velmère preflight OK · next 14.2.35 · scanned 313 files
```

`unzip -t` also passes for the output archive.

## Typecheck

`npm run typecheck` was executed. It still does not fully pass in the sandbox because the project package lacks the installed dependency tree / type packages for `next`, `react`, `next-intl`, `lucide-react`, `framer-motion`, `stripe`, `zustand`, `tailwindcss`, Node types, etc. It also reports older project errors outside this pass such as `AuthGate children` and older implicit-any issues.

A relevant stale field issue found during this run was fixed in this pass: `operatorActionQueue` → `actionQueue`.

## Honest status

After PASS 67, the Shield/VLM vision is roughly **35–38%** complete. This pass removes visible UX-breaking bugs and adds the dedicated Shield Map page, but production-grade completion still requires live on-chain sources, durable audit storage, real order-book/depth infrastructure, wallet/session enforcement, billing/access enforcement, rate limits, export infrastructure and legal/data-source policy pages.
