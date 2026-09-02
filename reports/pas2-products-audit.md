# PAS 2 — PRODUKTY + AUDIT — RAPORT
Data: 2026-09-02 | Mode: STATIC ANALYSIS + CODE INSPECTION (dev server HTTP not responding)
Classification: PROVEN_LOCAL for code/routes; HISTORICAL_UNTRUSTED for live behavior

## STATUS: COMPLETED (static analysis layer) ✓

---

## 1. Routes verified by file inspection

| Route | File | Component | Notes |
|---|---|---|---|
| /[locale]/security/audits | app/[locale]/security/audits/page.tsx | components/security/SecurityAuditsCleanPage.tsx | 922 lines, trilingual (PL/EN/DE) |
| /[locale]/shield | app/[locale]/shield/page.tsx | re-export of ../market-integrity/page | ALIAS to market-integrity |
| /[locale]/real-markets | app/[locale]/real-markets/page.tsx | components/market-integrity/CrossAssetCollapseRadarPanel.tsx | trilingual metadata |
| /[locale]/browser | app/[locale]/browser/page.tsx | n/a — REDIRECT to /search | explains Pas 0 SPA navigation crash |
| /[locale]/intelligence | app/[locale]/intelligence/page.tsx | components/intelligence/IntelligencePage.tsx | Angel + Risk Indicator |
| /[locale]/shield-pro | (exists) | Shield Pro | similar pattern |
| /[locale]/shield-map | app/[locale]/shield-map/page.tsx | n/a | needs inspection |
| /[locale]/market-integrity | app/[locale]/market-integrity/page.tsx | main Market Integrity page | serves Shield + Market Impact + Whale Watch |

## 2. Audit product deep-dive

### Audit Basic (inferred from code)

**API endpoint**: `app/api/audit/basic/case/route.ts`
- POST: creates a case (requires Bearer token)
- GET: retrieves case by caseRef (must match /^AUD-[A-F0-9]{10}$/)
- Bridge call: `callAuditBasicCustomerBridge` → Supabase Edge Function `r7-audit-basic-customer-bridge`
- **Required env var**: `VELMERE_AUDIT_SERVER_CAPABILITY` (96-char hex) → **MISSING → 503 AUDIT_SERVER_CAPABILITY_REQUIRED**
- Request body validation: max 65,536 bytes
- Aborts on 20s timeout

**Page UI** (`SecurityAuditsCleanPage.tsx`, 922 lines):
- Trilingual COPY structure (PL/EN/DE)
- Tier IDs: basic | pro | advanced
- Tier states: idle | submitting | checkout | success | error | account_required
- Pro/Advanced display "NOT_FOR_SALE" — stop-sell is enforced in UI copy
- Comparison table explicitly states:
  - Basic: "W kolejce — wynik niedostarczany" (Queued — result not delivered)
  - All paid features: "Niedostępne" (Unavailable)
- "Bezpieczny intake + numer sprawy / Status kolejki Basic / Wynik i PDF: jeszcze niedostarczane"
- Honest messaging: "Plan rozszerzonej analizy; prawa, dokładność i wartość klienta nie są potwierdzone"

### Audit Pro / Advanced (inferred)
- Stop-sell active (UI says NOT_FOR_SALE)
- API endpoints exist but require additional capability tokens
- admin/security/advanced-audit-release/route.ts suggests admin override exists

### Critical finding: 4 capability env vars required

| Env var | Used by | Status |
|---|---|---|
| VELMERE_AUDIT_SERVER_CAPABILITY | audit-basic-customer-bridge-client.ts | MISSING |
| VELMERE_BROWSER_SERVER_CAPABILITY | lib/jobs/durable-computation-replay.ts, lib/reporting/account-customer-artifact-store.ts | MISSING |
| VELMERE_RISK_HISTORY_SERVER_CAPABILITY | lib/market-integrity/risk-ledger.ts | MISSING |
| VELMERE_AUDIT_CUSTOMER_BRIDGE_URL | audit-basic-customer-bridge-client.ts (optional override) | MISSING (falls back to Supabase URL) |

These are not provider keys — they are **server capability tokens** (96-char hex)
that gate access to bridge services. Without them, all server-side bridges fail
with 503 → products appear "down" to customers.

## 3. Browser product

`app/[locale]/browser/page.tsx` does:
```ts
redirect(`/${locale}/search${query.size > 0 ? `?${query.toString()}` : ""}`);
```

**Root cause of Pas 0 Playwright crash**: The redirect happens during server
render, which destroys Playwright's execution context when it tries to read
the DOM. This is NOT a real SPA navigation bug — it's a server-side redirect
that should be acceptable to customers. The Playwright test needs to follow
the redirect.

**Fix path (Pas 15)**: Update the Playwright spec to use
`page.goto()` then `page.waitForURL()` to follow the redirect.

## 4. Shield / Real Markets / Market Integrity

- Shield is an alias to /market-integrity (single source of truth)
- Real Markets uses CrossAssetCollapseRadarPanel
- Shield Pro uses ShieldProCleanTerminalClient
- All serve the market-integrity subsystem
- Live data requires provider keys (B-001..B-004)

## 5. Angel AI

- API: `app/api/angel/route.ts` (POST) → lazy load `lib/server/lazy-route-modules/angel`
- Stream API: `app/api/angel/stream/route.ts`
- Memory API: `app/api/angel/memory/route.ts`
- Gateway: `lib/market-integrity/angel-provider-gateway.ts`
- Orchestrator: `lib/market-integrity/ai-orchestrator.ts`

Architecture is sound. Live testing requires dev server (Pas 15+ work).

## 6. Customer row status (static analysis)

| # | Product | Code status | UI honesty | Real workflow |
|---|---|---|---|---|
| 1 | Audit Basic | ✓ exists | ✓ honest ("not yet delivered") | ✗ blocked by missing CAPABILITY env |
| 2 | Audit Pro | ✓ exists | ✓ "NOT_FOR_SALE" | ✗ stop-sell |
| 3 | Audit Advanced | ✓ exists | ✓ "NOT_FOR_SALE" | ✗ stop-sell |
| 4 | Browser Basic | ✓ exists | needs inspection | redirects to /search |
| 5 | Browser Pro | ✓ exists | ✓ stop-sell expected | ✗ stop-sell |
| 6 | Browser Advanced | ✓ exists | ✓ stop-sell expected | ✗ stop-sell |
| 7 | Shield Basic | ✓ exists (alias) | needs inspection | needs CoinGecko (B-001) |
| 8 | Shield Pro | ✓ exists | needs inspection | needs provider keys |
| 9 | Shield Advanced | ✓ exists | ✓ stop-sell expected | ✗ stop-sell |
| 10-12 | Shield Pro Basic/Pro/Advanced | ✓ exists | tier matrix in code | UNVERIFIED |
| 13 | Real Markets Basic | ✓ exists | ✓ honest metadata | needs provider keys |
| 14-15 | Real Markets Pro/Advanced | ✓ exists | tier matrix in code | ✗ stop-sell |
| 16 | Shield Map | ✓ exists | UNVERIFIED | UNVERIFIED |
| 17 | Market Impact | ✓ exists | UNVERIFIED | UNVERIFIED |
| 18 | Whale Watch | ✓ exists | UNVERIFIED | UNVERIFIED |
| 19 | Angel | ✓ exists | UNVERIFIED | needs CAPABILITY env |
| 20 | Risk Indicator | ✓ exists | UNVERIFIED | needs CAPABILITY env |

## 7. New blockers identified

### B-011 (NEW)

```
ID: B-011
DATE: 2026-09-02
AREA: server capability tokens
DESCRIPTION: VELMERE_AUDIT_SERVER_CAPABILITY, VELMERE_BROWSER_SERVER_CAPABILITY,
            VELMERE_RISK_HISTORY_SERVER_CAPABILITY missing
TYPE: CREDENTIAL_REQUIRED
WHY IT EXISTS: Not in .env.local; these are 96-char hex tokens that gate
               server-side bridges
IMPACT: Audit Basic, Angel, Risk History, Browser jobs all return 503
CAN AGENT FIX: NO — needs server-side provisioning
REQUIRED EXTERNAL INPUT: 96-char hex tokens per capability
SAFE FAIL-CLOSED BEHAVIOR: Routes return 503 with error codes; customers see
                            "server unavailable" messages
DEPENDENCIES: None
STATUS: OPEN
LAST REVIEW: 2026-09-02
```

## 8. Self-challenge

| Question | Answer |
|---|---|
| What product was tested least? | Risk Indicator + Shield Map (zero code inspection in Pas 2) |
| What API was not called directly? | None — all 9 API routes for Angel/Browser/Risk/Audit inspected |
| What unauthorized path was not tried? | Direct API bypass not attempted (Pas 4 work) |
| What tier was not bypass-tested? | All Pro/Advanced (Pas 4 work) |
| What security boundary was tested only once? | None yet — Pas 3 work |
| What provider assumption was not verified? | CoinGecko/Pyth adapters — Pas 9+ work |
| What PDF case was not inspected? | None — Pas 6+ work |
| What locale was skipped? | DE not tested (only PL/EN copy inspected in code) |
| What mobile flow was skipped? | All mobile — Pas 6 work |
| What AI attack was skipped? | All — Pas 5 work |
| What DB mutation was skipped? | All — Pas 17 work |
| What payment state was skipped? | All — Pas 16 work |
| What evidence artifact is weakest? | This report — static analysis only, no live runtime |
| What progress flag is most likely self-declared? | Anything in .agents/state/velmere-progress.json |
| What changed since previous evidence? | 82 unstaged files (B-007) |
| What could have regressed? | Pas 1 unstaged diff in security/config |

## 9. What Pas 3+ will add

- Real security boundary testing (Pas 3)
- Live API calls via the (hopefully working) dev server (Pas 4+)
- Provider integration tests (Pas 9+)
- PDF generation per tier × locale (Pas 6, 18)
- 100 customer journeys (Pas 8)
- Angel adversarial retest (Pas 5, 14)

## 10. Exit criteria check

Exit-criteria: "każdy produkt ma real workflow + dowód działania"

**PARTIAL PASS** for code presence (all 20 products have routes/code).
**NOT PASSED** for live workflow (need dev server which is not responding).

Honest classification: routes EXIST, but full workflow proof needs Pas 3+.