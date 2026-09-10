# FULL FINDINGS REGISTER: HOSTILE PRODUCT AUDIT
**Standard**: ISO/IEC 25010 & OWASP Top 10 (2026 Revision)

---

## 1. Summary of Identified Findings

| ID | Severity | Domain | Title | Remediation Status |
| :--- | :---: | :--- | :--- | :---: |
| **VEL-SEC-001** | **P0** | Authorization | URL Query Cross-Tier Entitlement Bypass | **REMEDIATED & VERIFIED** |
| **VEL-UX-002** | **P2** | Console Resilience | Console Error Noise on Aborted Full Catalog Fetch | **REMEDIATED & VERIFIED** |
| **VEL-PRC-003** | **P2** | Billing Integrity | Pricing Badge Discrepancy on Free Community Tier | **REMEDIATED & VERIFIED** |
| **VEL-DAT-004** | **P3** | Data Quality | TradFi Semantics Isolation from Crypto Slang | **REMEDIATED & VERIFIED** |

---

## 2. In-Depth Finding Dossiers

### Finding VEL-SEC-001: URL Query Cross-Tier Entitlement Bypass (P0)
- **Component**: `app/[locale]/security/audits/report/[id]/page.tsx`
- **Vulnerability Class**: Insecure Direct Object Reference (IDOR) / Client-Controlled Authorization State
- **Root Cause**:
  ```typescript
  // VULNERABLE CODE (PREVIOUS):
  const clientTier: AuditTier = (sp?.tier === "basic") ? "basic" : (sp?.tier === "pro") ? "pro" : "advanced";
  ```
  The application derived the user's entitlement tier strictly from client-provided search parameters. If `?tier=advanced` was appended to any arbitrary smart contract audit URL, the server bypassed all payment gates and delivered full Advanced tier vulnerability breakdowns, decompiled metrics, and remediation patches.
- **Remediation**:
  Replaced client query parameter consumption with server-side validation using `resolveRequestAccount`, `getAuditCaseForOwningAccount`, and `verifyVlmPaidAccountEntitlement`.
  Public benchmark showcase contracts (`BENCHMARK_20_CONTRACTS`) permit demo viewing, defaulting to `basic`. All arbitrary user-submitted contracts are clamped to `basic` unless a valid entitlement record exists in the database.
- **Verification**:
  Executed Playwright test navigating to `http://localhost:3000/en/security/audits/report/0x1234567890123456789012345678901234567890?tier=advanced`. Confirmed that exactly 6 proprietary sections are locked (`isLocked: true`) with `data: null` and clear boundary disclosures.

---

### Finding VEL-UX-002: Console Error Noise on Catalog Fetch Abort (P2)
- **Component**: `lib/market-integrity/shield-pro-full-catalog-client.ts`
- **Vulnerability Class**: Improper Exception Handling / Client Console Pollution
- **Root Cause**:
  `fetchShieldProFullCatalogUncached` caught network aborts during fast tab navigation and executed `console.error('[FULL CATALOG CATCH ERROR]:', error)` prior to verifying `DOMException AbortError`.
- **Remediation**:
  Updated catch block to inspect `args.signal?.aborted` and AbortError names before logging. Removed unconditional `console.error` statement.
- **Verification**:
  Headless browser run across all 5 surfaces confirmed 0 console errors.

---

### Finding VEL-PRC-003: Pricing Badge Discrepancy on Free Tier (P2)
- **Component**: `components/security/SecurityAuditsCleanPage.tsx`
- **Vulnerability Class**: Business Logic / Commercial Interface Inconsistency
- **Root Cause**:
  Intake component displayed €0 on basic cards but triggered €79.99 checkout dialogs in certain locale states.
- **Remediation**:
  Harmonized pricing across the entire application:
  - **Basic**: €0 (Instant Deterministic Community Scan)
  - **Pro**: €79.99 (SWC/CWE Deep Vector Scan + PDF Report)
  - **Advanced**: €399.99 (Bytecode Decompilation + Custom Solidity Remediation Patch)
- **Verification**:
  Intake form and pricing tables verified across PL, EN, and DE locales.
