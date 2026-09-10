# VELMÈRE — PRE-FLIGHT REPORT SEMANTIC LINTER SPECIFICATION & VERIFICATION

**System Role:** Principal Security Engineer & Data Integrity Auditor  
**Enforcement Engine:** `lib/security/report-semantic-linter.ts`  
**Test Suite:** `tests/adversarial/report-semantic-linter.test.ts` (100% PASS)  
**Release Gate Status:** HARD GATE (PDF and JSON renderers fail closed on any violation)

---

## 1. Architectural Purpose

The Pre-Flight Report Semantic Linter sits immediately between the analytical computation engine and the output rendering pipeline (PDF-1.4 generator and customer API endpoints). Its single responsibility is to prevent logically contradictory, out-of-bounds, unhedged marketing, or synthetic data from being packaged and delivered as a Velmère security audit report.

No report can be emitted without successfully clearing all 9 semantic invariant checks.

```
┌─────────────────────────────────┐
│     Raw Analytical Inputs       │
│ (Bytecode, AST, Market, Roles)  │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│   Canonical Report Assembly     │
│  (Audit Model & Metric Scores)  │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│   PRE-FLIGHT SEMANTIC LINTER    │◄─── FAILS CLOSED ON CRITICAL/HIGH ISSUES
│  (9 Automated Invariant Checks) │
└────────────────┬────────────────┘
                 │ Passes 9 Invariants
                 ▼
┌─────────────────────────────────┐
│    Final PDF & JSON Artifact    │
│  (Sealed with SHA-256 Digest)   │
└─────────────────────────────────┘
```

---

## 2. The 9 Semantic Invariant Rules

### Rule 1: Confidence vs. Coverage Consistency (`CONTRADICTORY_CONFIDENCE_COVERAGE`)
* **Invariant:** `if (confidenceScore > 80 && evidenceCoverage < 50) => CRITICAL ERROR`
* **Rationale:** A report cannot legitimately claim high analytical confidence when more than half of the applicable evidence was unavailable, missing, or unverified. If evidence coverage is low, confidence MUST be degraded proportionally or marked `RISK_UNDETERMINED`.

### Rule 2: Strict Numeric Bounds (`NUMERIC_BOUNDS_VIOLATION`)
* **Invariant:** `0 <= riskScore <= 100`, `0 <= confidenceScore <= 100`, `0 <= evidenceCoverage <= 100`. NaN, undefined, and null are rejected.
* **Rationale:** Guarantees arithmetic calibration across all downstream scoring components, preventing scale overflow or NaN propagation.

### Rule 3: Unit-Safe Percentage Formatting (`PERCENTAGE_UNIT_SCALING`)
* **Invariant:** Internal percentage representation must never be scaled by 100 twice (e.g. `96` formatted as `9600%`).
* **Rationale:** Historical defect FF-002 showed that raw percentages (96) passed into formatters expecting ratios (0.96) resulted in 9600% display errors.

### Rule 4: Zero Bytecode Decompilation Contradiction (`ZERO_BYTECODE_CONTRADICTION`)
* **Invariant:** An EVM contract report claiming "Exact 100% Bytecode Match" cannot have 0 bytes of bytecode analyzed.
* **Rationale:** Historical defect FF-003: An analyzer cannot claim verified on-chain equivalence when no bytecode was acquired from the RPC node.

### Rule 5: Cross-Domain Terminology Isolation (`CROSS_DOMAIN_TERMINOLOGY_LEAK`)
* **Invariant:** Non-EVM instruments (Equities, ETFs, Commodities, FX, Native UTXO coins) must NEVER contain EVM-specific keywords in findings or metrics: `ERC-20`, `EIP-1967`, `delegatecall`, `reentrancy`, `solidity`, `storage layout`, `taxFee`.
* **Rationale:** Prevents nonsensical findings like "NVIDIA has reentrancy vulnerability" or "Gold futures has an owner blacklist".

### Rule 6: Synthetic & Placeholder Address Detection (`SYNTHETIC_IDENTIFIER_LEAK`)
* **Invariant:** Contract addresses matching synthetic fixture patterns (`fixture:`, `mock:`, `synthetic:`, repeating hex strings like `0x1111...`, `0xbbbb...`) must fail closed and never be released as genuine production reports.
* **Algorithm:** Validates against `isPlaceholderAddress(address)`. Legitimate contracts (e.g. USDT `0xdac17f...`) are validated using entropy set analysis (`new Set(hex).size > 1`) and slice-repetition checks.

### Rule 7: Zero Cross-Tier Finding Leakage (`TIER_DATA_LEAKAGE`)
* **Invariant:** If a customer's entitlement tier is `basic`, sections with `requiredTier: "pro"` or `requiredTier: "advanced"` MUST have `data === null` and `isLocked === true`.
* **Rationale:** Prevents unauthorized access or DOM scraping of proprietary analytical findings on unpurchased tiers.

### Rule 8: Unhedged Marketing Absolute Scrub (`UNHEDGED_MARKETING_ABSOLUTE`)
* **Invariant:** Reports must NOT contain unhedged marketing guarantees: `"100% secure"`, `"unhackable"`, `"guaranteed safe"`, `"fully certified"`, or `"legally protected"`.
* **Rationale:** Velmère reports are automated risk assessments, not cryptographic guarantees or legal indemnifications.

### Rule 9: Independent Human Review Disclosure (`HUMAN_REVIEW_DISCLOSURE_MISSING`)
* **Invariant:** If no human attestation is signed by an attributable engineer, the report must state `INDEPENDENT HUMAN REVIEW NOT COMMISSIONED`.
* **Rationale:** Strictly prohibits misleading users into believing automated scans represent human-auditor equivalence.

---

## 3. Test & Verification Evidence

All 9 semantic invariants are validated via automated adversarial test suites:
* `tests/adversarial/report-semantic-linter.test.ts` (5 automated test cases)
* `tests/adversarial/discovered-failures-regression.test.ts` (Regressions #6, #7, #8, #9)
* `tests/adversarial/extended-mutation-testing.test.ts` (MUT-05, MUT-19, MUT-20)
* Pre-flight run across all 50 generated production PDFs (`scripts/generate_50_production_pdfs.ts`): 50/50 passed with 0 critical and 0 high issues.

---

## 4. Verdict
**APPROVED & PRODUCTION-READY.** The Pre-Flight Semantic Linter enforces complete truth in reporting.
