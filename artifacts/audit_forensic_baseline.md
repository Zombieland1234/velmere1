# VELMÈRE FURNACE — SMART CONTRACT AUDIT FORENSIC BASELINE (PHASE 0)
## Forensic Baseline Audit Report — Pre-Hardening State & Defect Inventory

**Audit Date**: 2026-09-09  
**Engine Under Inspection**: Velmère Furnace Smart Contract Security Assessment Engine (v4.0.0-rc3)  
**Methodology**: Exhaustive AST, schema, pipeline, script, detector, and cryptographic provenance forensic baseline.  
**Strict Reality Rule**: $\text{CLAIM} == \text{OBSERVATION} == \text{EXECUTION RECORD} == \text{EVIDENCE} == \text{ARTIFACT}$. If any link is missing: Fail Closed.

---

### Executive Summary

A comprehensive forensic audit of the entire smart-contract analysis, report generation, and evidence pipeline was conducted prior to code modification. The investigation identified **8 critical structural defects**, **6 high-severity claim integrity issues**, and **6 medium-severity provenance discrepancies**.

While the pipeline possesses advanced foundational capabilities (real PDF-1.7 binary generation with text matrix positioning, Merkle tree commitment structures, deterministic AST visitors for ERC-4626 and reentrancy, and zero mock leakage for legacy fixtures), several components relied on **synthetic assertions**, **hardcoded compiler metadata**, **generic attack path templates**, and **unlinked human reviewer signatures** to achieve visual completeness.

In accordance with Phase 0 through 44 and Overrides 00 through 44, all synthetic shortcuts are cataloged herein and marked for complete replacement with verifiable evidence records, real execution attestations, and fail-closed uncertainty reporting.

---

### 20-Point Forensic Checklist & Defect Registry

| Item # | Forensic Inspection Area | Status | Critical Findings & Code Locations |
| :---: | :--- | :---: | :--- |
| **01** | Complete Current Audit Pipeline | **PARTIAL** | Pipeline in `audit-canonical-report.ts` couples EVM contracts with non-EVM assets (BTC, ETH L1, TradFi) through ad-hoc branching (L240–315). Needs strict domain preflight gate. |
| **02** | Detector Registry | **PARTIAL** | AST detectors `VLM-PROXY-UPGRADE-01` and `VLM-MEV-SANDWICH-01` exist in `vlm-top5-detectors.ts` but lack an immutable, machine-readable execution registry mapping to SCSVS/SWC/CWE. |
| **03** | Canonical Audit Schema | **PARTIAL** | `CanonicalAuditReportModel` defines rich structures, but allows optional `humanReviewer` and unverified fallback fields. |
| **04** | Tier Gating Logic | **DEFECT** | `filterCanonicalReportByEntitlement` displays locked section notice, but report header in `canonicalReportToPdfLines` and `auditScopeManifest` exposed formal percentages even when locked. |
| **05** | PDF Generation | **VERIFIED** | PDF-1.7 binary layout compositor generates compliant stream objects with genuine font matrices, but prints generic disclaimer and synthetic attack paths. |
| **06** | JSON Generation | **VERIFIED** | Canonical JSON serialization is deterministic using key sorting (`canonicalJson`), but contains fields populated with default constants. |
| **07** | Evidence Generation | **PARTIAL** | `evidence-record.ts` generates structured evidence, but claims in canonical reports often use synthetic IDs (`CLM-rep_...`) instead of hashing raw RPC observations. |
| **08** | Merkle Generation | **VERIFIED** | `buildAuditMerkleCommitment` computes legitimate SHA-256 leaves and pairwise tree root over report sections and provenance. |
| **09** | Report Hashing | **DEFECT** | In `auditScopeManifest.cryptographicManifest.reportDigestSha256`, the Merkle root was assigned instead of the canonical JSON digest (L571). |
| **10** | Formal Verification Orchestration | **DEFECT** | Advanced tier reported hardcoded coverage (e.g. 86.4% or 95%) rather than an itemized property registry with Z3/SMT QF_LIA solver proofs. |
| **11** | Test Fixtures | **VERIFIED** | Historical benchmark fixtures in `test/` exist, but live analyzer had potential contamination paths via address prefix lookup. |
| **12** | Audit-Related Scripts | **DEFECT** | `scripts/generate_45_targeted_pdfs.ts:103` and `scripts/generate_180_dowody5_pdfs.ts:760` injected synthetic `Velmère Institutional Principal Auditor` and fake attestation hash. |
| **13** | Hard-coded / Sample Findings | **DEFECT** | Generic findings in `contract-audit-profiles.ts` for non-canonical contracts defaulted to template descriptions without AST line references. |
| **14** | Synthetic Reviewers | **DEFECT** | `humanReviewSignOff` in `audit-canonical-report.ts:596-603` claimed "Level-3 Lead Cryptographic Security Reviewer" without external cryptographic signer. |
| **15** | Generic Attack Paths | **DEFECT** | `audit-canonical-report.ts:576-594` always emitted "Mempool Sandwich" and "Privileged Implementation Rollback" with `< $1,200` impact regardless of whether target was an AMM or proxy. |
| **16** | Fake Confidence Values | **DEFECT** | Default profiles assigned 95%–100% confidence arbitrarily without computing uncertainty bands or execution coverage weights. |
| **17** | Duplicated Findings | **PARTIAL** | Some findings separated SWC mappings into duplicate records rather than keeping 1 canonical finding ID with metadata arrays. |
| **18** | Domain Leakage | **DEFECT** | `audit-canonical-report.ts` handled TradFi equities (AAPL, NVDA) and Shield L1s within the smart contract report builder rather than hard-gating to separate product surfaces. |
| **19** | Stale / Hard-coded Compiler Metadata | **DEFECT** | `auditScopeManifest.compilerSpec` hardcoded `0.8.24+commit.e11b9ed9`, `200 runs`, `cancun` (L551–555) for all contracts regardless of actual pragma/bytecode. |
| **20** | Claims Not Linked to Evidence IDs | **DEFECT** | `attackPathAnalysis` and `humanReviewSignOff` had zero references to `evidenceIds` in the raw evidence store. |

---

### Detailed Findings & Technical Evidence

#### 1. Synthetic Reviewer Identity Leakage (P0 — CRITICAL)
- **File**: `lib/security/audit-canonical-report.ts:596–603`, `scripts/generate_45_targeted_pdfs.ts:103`, `scripts/generate_180_dowody5_pdfs.ts:760`
- **Observed Code**:
  ```typescript
  humanReviewSignOff: {
    auditorIdentity: humanAttestation?.reviewedBy || "Velmère Institutional Automation Council",
    clearanceLevel: "Level-3 Lead Cryptographic Security Reviewer",
    inspectionDate: humanAttestation?.reviewDate || now.slice(0, 10),
    signOffStatus: humanAttestation?.signedHash ? "FORMALLY_SEALED" : "AUTOMATED_COMPLIANT",
    signatureDigest: humanAttestation?.signedHash || sha256Digest(`velmere:signoff:${effectiveAddress}:${now}`),
  }
  ```
- **Violation**: Violates Phase 26 and Override 01/20. An automated tool cannot claim a human reviewer or clearance level without real human attestation artifacts.
- **Remediation**: Remove fallback identity. If no signed external reviewer artifact exists, reviewer state must be `AUTOMATED_ONLY`, `auditorIdentity: "NONE"`, `signatureDigest: "NONE"`.

#### 2. Hardcoded Compiler Metadata (P1 — HIGH)
- **File**: `lib/security/audit-canonical-report.ts:551–555`
- **Observed Code**:
  ```typescript
  compilerSpec: {
    compilerVersion: "0.8.24+commit.e11b9ed9",
    optimizationRuns: 200,
    evmTarget: "cancun",
  }
  ```
- **Violation**: Violates Phase 0 #19 and Override 03. USDT was compiled with solc 0.4.18, DAI with 0.5.12, USDC with 0.6.12. Claiming 0.8.24 Cancun across all contracts is factually incorrect.
- **Remediation**: Extract verified compiler metadata from `SourceProvenance` / Etherscan verified source payload or mark `COMPILATION_METADATA_UNAVAILABLE`.

#### 3. Fabricated Generic Attack Paths (P1 — HIGH)
- **File**: `lib/security/audit-canonical-report.ts:576–594`
- **Observed Code**:
  ```typescript
  synthesizedAttackPaths: [
    {
      id: "VLM-PATH-01",
      vectorTitle: "Mempool Sandwich & Liquidity Skew Vector",
      exploitabilityScore: profile.riskScore < 20 ? 0.05 : 0.35,
      economicImpactUsdEst: profile.riskScore < 20 ? "$0 (Slippage Enforced)" : "< $1,200 (Bounded by Block Gas)",
      solverLemmaRef: "LEMMA-AMM-SWAP-BOUNDED-UNSAT",
    },
    ...
  ]
  ```
- **Violation**: Violates Phase 14 and Override 17. Safe-L2 (multisig) or DAI cannot be subjected to a mempool sandwich attack path if they are not AMM liquidity pools.
- **Remediation**: Only emit attack path graph when AST data flow and CFG prove reachability on the target contract. Otherwise, attack paths must be empty or marked `NO_EXPLOIT_PATH_DETECTED_IN_SCOPE`.

#### 4. Cryptographic Digest Reuse (P2 — MEDIUM)
- **File**: `lib/security/audit-canonical-report.ts:571`
- **Observed Code**:
  ```typescript
  cryptographicManifest: {
    merkleAuditRoot: merkleCommitment.merkleRoot,
    reportDigestSha256: merkleCommitment.merkleRoot, // Digest reuse!
  }
  ```
- **Violation**: Violates Phase 30 and Override 06. The Merkle root is not the canonical report JSON digest.
- **Remediation**: Explicitly separate `pdfSha256`, `canonicalJsonSha256`, `evidenceBundleSha256`, and `merkleRoot`.

---

### Remediation Roadmap & Transition State

1. **Pass 2**: Implement strict domain preflight gate and point-in-time provenance.
2. **Pass 3**: Implement dynamic proxy resolution and authority graph.
3. **Pass 4**: Register all detectors in a versioned registry with execution attestations.
4. **Pass 5**: Wire AST-driven MEV and economic models.
5. **Pass 6**: Build target-specific threat model and attack graphs.
6. **Pass 7**: Incorporate stateful fuzz campaign manifests and fork test snapshots.
7. **Pass 8**: Itemize formal properties into a verifiable SMT registry.
8. **Pass 9**: Enforce strict cumulative tier entitlements.
9. **Pass 10**: Eliminate all synthetic reviewer claims.
10. **Pass 13**: Build standalone adversarial verifier `scripts/qa/verify-audit-artifact.ts`.
