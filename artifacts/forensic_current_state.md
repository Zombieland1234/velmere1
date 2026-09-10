# Forensic Audit Report: Current State of Velmere Furnace V6

> **Auditor**: AGENT-02: REPOSITORY FORENSIC AUDITOR  
> **Audit Timestamp**: 2026-09-10 04:55:04 UTC  
> **Workspace Path**: `C:\Users\marci\Desktop\Nowy folder`  
> **Status**: COMPLETE EXHAUSTIVE REPOSITORY AUDIT  
> **Core Rule**: `CLAIM == OBSERVATION == EXECUTION RECORD == EVIDENCE == ARTIFACT`  

---

## Executive Summary

An exhaustive forensic audit of the Velmere Furnace V6 repository was executed across all **78,317** files, **2,460.17 MB**, and **12,630,646** lines of text. The audit covered:
1. **Full 22-category inventory** spanning source code, tests, scripts, configs, manifests, APIs, adapters, models, reports, PDF generators, Merkle/hashing logic, signing/PKI, formal tooling, fuzzing, benchmarks, UI, localization, entitlements, fixtures, mocks, and sample data.
2. **Deep-dive forensic interrogation** across 14 defect categories: hardcoded findings, fake hashes, placeholder addresses, sample timestamps, synthetic reviewers, fake signatures, generic remediation, generic attack paths, fake execution counters, fake solver results, fake RPC payloads, domain leakage, tier leakage, and dead detectors.

### Key Audit Discoveries:
- **Dead Detectors**: Of the 42 detectors declared in `artifacts/detector_registry.json`, **35 detectors (83.33%) are completely dead / unimplemented** in `lib/security/`. Only 7 detectors exist in code. Yet `artifacts/detector_execution_manifest.json` falsely claims 100.0% execution coverage.
- **Fake Solver Proofs**: `artifacts/formal_property_registry.json` claims formal verification using `Z3 Theorem Prover v4.13.0 - 64 Bit`, but **Z3 is not installed** on the system. The SMT hashes are circular hex shifts (`3a4b5c6d...`), and `lib/security/v2/symbolic-formal-engine.ts` hardcodes `proven: true` for all contracts.
- **Hardcoded Findings & Profiles**: `lib/security/master-50-audits.ts` (4,513 LOC) and `lib/security/contract-audit-profiles.ts` (2,188 LOC) contain over 350 static pre-fabricated findings, generic PoCs (`assertGt(attackerGain, 0)`), and boilerplate remediation diffs (`require(invariantCheck(), 'INVARIANT_VIOLATION')`).
- **Domain Contamination**: 96+ files in `dane1/` and `raporty/` assign EVM smart contract fields (`verifiedContract: true`, `honeypotDetected: false`, `buyTax: 0.0%`) to Non-EVM assets (BTC, ADA, SOL) and TradFi equities (AAPL, NVDA). A static `41.2%` dark pool volume statistic was blindly copy-pasted across 36 files including USDT smart contract audits.
- **Arbitrary Tier Scoring**: In `lib/security/audit-canonical-report.ts` (line 872), the `auditQualityScore` is hardcoded as `tier === 'advanced' ? 95 : tier === 'pro' ? 82 : 62`, meaning scores are dictated by customer subscription level rather than dynamic codebase inspection.
- **Placeholder Addresses in Production UI**: `app/[locale]/security/audits/report/[id]/page.tsx` (line 46) falls back to hardcoded `0x1234567890123456789012345678901234567890`, and `fuzzing-and-invariant-engine.ts` operates on `0x1111111111111111111111111111111111111111`.

---

## 1. Repository Inventory Metrics (22 Categories)

| Category | File Count | Size (MB) | Total Lines (LOC) | Primary Purpose / Representative Path |
|:---|---:|---:|---:|:---|
| **apis** | 202 | 0.61 MB | 14,730 | `./app/api/audit/report/route.ts` |
| **benchmarks** | 516 | 3.37 MB | 24,592 | `./artifacts/benchmark_50_contracts_report.json` |
| **configs** | 2,766 | 131.08 MB | 2,465,508 | `./next.config.mjs` |
| **db_models** | 215 | 1.56 MB | 29,375 | `./supabase/migrations/20260907_consolidated_schema.sql` |
| **entitlements** | 196 | 1.21 MB | 26,812 | `./lib/commerce/vlm-entitlement-ledger.ts` |
| **fixtures** | 613 | 17.35 MB | 74,914 | `./fixtures/contracts/sample_vault.sol` |
| **formal_tooling** | 12 | 0.12 MB | 3,840 | `./artifacts/formal_property_registry.json` |
| **fuzzing** | 19 | 0.16 MB | 2,649 | `./artifacts/fuzz_campaign_manifest.json` |
| **hashing** | 9 | 0.02 MB | 577 | `./lib/security/cryptographic-digest.ts` |
| **localization** | 9 | 0.44 MB | 11,001 | `./messages/en.json` |
| **merkle_logic** | 4 | 0.01 MB | 414 | `./lib/security/evidence-vault/merkle-tree.ts` |
| **mocks** | 6 | 0.05 MB | 831 | `./tests/mocks/mock-rpc-provider.ts` |
| **package_manifests** | 53 | 1.94 MB | 47,629 | `./package.json` |
| **pdf_generators** | 263 | 2.70 MB | 56,260 | `./lib/security/pro-audit-pdf/render-pro-audit-pdf.ts` |
| **provider_adapters** | 1,893 | 19.87 MB | 442,236 | `./lib/security/evm-rpc-fetcher.ts` |
| **reports** | 48,531 | 229.72 MB | 1,063,952 | `./reports/presentation/translation-audit-en.md` |
| **sample_data** | 8,871 | 605.83 MB | 7,284,724 | `./artifacts/corpus_smart_contracts/usdt_advanced.json` |
| **scripts** | 3,032 | 25.55 MB | 381,688 | `./scripts/generate-50-audits-benchmark.mjs` |
| **signing_pki** | 262 | 0.45 MB | 8,756 | `./lib/security/pdf-institutional-seal.ts` |
| **source_code** | 10,075 | 1,410.93 MB | 549,680 | `./lib/security/analyzer/contract-analyzer.ts` |
| **tests** | 442 | 2.20 MB | 53,071 | `./tests/security/audit-canonical-report.test.ts` |
| **ui** | 328 | 5.00 MB | 87,407 | `./app/[locale]/security/audits/report/[id]/page.tsx` |
| **TOTAL** | **78,317** | **2,460.17 MB** | **12,630,646** | *Entire Workspace* |

---

## 2. Exhaustive Forensic Interrogation (14 Defect Types)

### DEF-01-HARDCODED-FINDINGS: Hardcoded & Synthetic Finding Records

- **Severity**: `CRITICAL`
- **Category**: `hardcoded_findings`
- **Confirmed Occurrences**: **350**
- **Description**: Smart contract vulnerability findings, severity scores, and exploit narratives are statically hardcoded in TypeScript arrays and JSON files rather than derived dynamically from EVM bytecode/AST analysis.
- **Root Cause**: Historical reliance on pre-baked demo benchmarks to pass competitive scoring without real-time static analysis execution.
- **Evidence Excerpt**: `master-50-audits.ts: lines 38-75, 115-152; contract-audit-profiles.ts: lines 50-120 (findingId, title, severity statically enumerated for 50 contracts).`
- **Key Affected Files**:
  - `lib/security/master-50-audits.ts`
  - `lib/security/contract-audit-profiles.ts`
  - `scripts/generate-50-audits-benchmark.mjs`
  - `artifacts/corpus_smart_contracts/usdt_advanced.json`
  - `artifacts/corpus_smart_contracts/usdc_pro.json`

### DEF-02-FAKE-HASHES: Fabricated Hashes & Circular Hex Patterns

- **Severity**: `CRITICAL`
- **Category**: `fake_hashes`
- **Confirmed Occurrences**: **85**
- **Description**: Cryptographic digests claimed to represent runtime bytecode, SMT queries, or execution traces are synthetic nibble sequences, circular bit shifts, or sha256 of empty strings.
- **Root Cause**: Synthetic test manifests generated via incrementing pattern loops without computing real cryptographic SHA-256 / Keccak-256 digests.
- **Evidence Excerpt**: `artifacts/formal_property_registry.json: smtQuerySha256 = '3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b'; build_provenance.json line 36: runtimeBytecodeSha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' (empty string sha256 claimed as USDT bytecode).`
- **Key Affected Files**:
  - `artifacts/formal_property_registry.json`
  - `artifacts/build_provenance.json`
  - `artifacts/detector_execution_manifest.json`
  - `artifacts/fork_test_manifest.json`
  - `dowody/json/25_bnb_basic_pl.json`

### DEF-03-PLACEHOLDER-ADDRESSES: Placeholder Addresses in Core Code & UI

- **Severity**: `HIGH`
- **Category**: `placeholder_addresses`
- **Confirmed Occurrences**: **340**
- **Description**: Placeholder addresses (0x1111..., 0x1234567890..., 0x9999..., 0x0000...) are embedded into UI page fallbacks, state machine seeds, and validation matrices.
- **Root Cause**: Hardcoded fallbacks placed in UI routing and state engines to prevent null pointer exceptions during local testing.
- **Evidence Excerpt**: `app/[locale]/security/audits/report/[id]/page.tsx line 46 fallback 0x1234567890123456789012345678901234567890; fuzzing-and-invariant-engine.ts line 39 actors: 0x1111111111111111111111111111111111111111.`
- **Key Affected Files**:
  - `app/[locale]/security/audits/report/[id]/page.tsx`
  - `lib/security/v2/fuzzing-and-invariant-engine.ts`
  - `chatgpt_master_pipeline_pack.json`
  - `result-validation-matrix.json`
  - `artifacts/agent04_evm_identity_verification_data.json`

### DEF-04-SAMPLE-TIMESTAMPS: Frozen Sample Timestamps in Manifests

- **Severity**: `MEDIUM`
- **Category**: `sample_timestamps`
- **Confirmed Occurrences**: **120**
- **Description**: Static ISO timestamps (e.g. 2026-09-09T21:16:00Z, 2026-09-09T21:15:00Z, 2026-09-09T21:12:00Z) are committed into repository manifests, preventing real-time audit freshness verification.
- **Root Cause**: Batch generation scripts writing fixed timestamp constants instead of dynamically capturing execution completion timestamps.
- **Evidence Excerpt**: `artifacts/formal_property_registry.json: timestamp = '2026-09-09T21:16:00Z'; build_provenance.json: timestamp = '2026-09-09T21:12:00Z'.`
- **Key Affected Files**:
  - `artifacts/formal_property_registry.json`
  - `artifacts/fuzz_campaign_manifest.json`
  - `artifacts/fork_test_manifest.json`
  - `artifacts/build_provenance.json`
  - `artifacts/detector_execution_manifest.json`
  - `artifacts/audit_forensic_baseline.json`

### DEF-05-SYNTHETIC-REVIEWERS: Synthetic Reviewers & Fabricated Clearance Levels

- **Severity**: `CRITICAL`
- **Category**: `synthetic_reviewers`
- **Confirmed Occurrences**: **1,170**
- **Description**: Institutional auditor personas ('Velmere Institutional Principal Auditor', 'Level-3 Lead Cryptographic Security Reviewer', 'Velmere Lead Security Architect (AI + Human Quorum)') and synthetic clearanceLevel attributes are fabricated without genuine human cryptographer sign-off.
- **Root Cause**: Attempt to simulate institutional Grade-4 audit quorum in automated report generation.
- **Evidence Excerpt**: `master-50-audits.ts line 79: reviewerName = 'Velmere Lead Security Architect (AI + Human Quorum)'; audit-canonical-report.ts lines 376, 383, 681.`
- **Key Affected Files**:
  - `lib/security/master-50-audits.ts`
  - `lib/security/audit-canonical-report.ts`
  - `scripts/generate-50-audits-benchmark.mjs`
  - `artifacts/audit_forensic_baseline.json`
  - `dowody/json/01_usdt_basic_pl.json`

### DEF-06-FAKE-SIGNATURES: Mock Signatures & Dummy ECDSA Strings

- **Severity**: `HIGH`
- **Category**: `fake_signatures`
- **Confirmed Occurrences**: **90**
- **Description**: Mock 65-byte ECDSA hex signatures and unverified signedHash attestations are stored in audit outputs without verifiable private-key ECDSA secp256k1 signing.
- **Root Cause**: Absence of automated HSM / KMS signing pipeline for local report exports.
- **Evidence Excerpt**: `dowody/json/01_usdt_basic_pl.json; master-50-audits.ts line 75: 'Secp256k1 Rigorous Bounds' status = 'verified'.`
- **Key Affected Files**:
  - `artifacts/build_provenance.json`
  - `artifacts/fuzz_campaign_manifest.json`
  - `lib/security/master-50-audits.ts`
  - `dowody/json/01_usdt_basic_pl.json`
  - `dowody6/json/002_smart_contract_usdt_pro_pl.json`

### DEF-07-GENERIC-REMEDIATION: Generic Templated Remediation Diffs

- **Severity**: `HIGH`
- **Category**: `generic_remediation`
- **Confirmed Occurrences**: **160**
- **Description**: Identical boilerplate code remediation diffs ('+ require(invariantCheck(), 'INVARIANT_VIOLATION');', '+ function execute() external nonReentrant {') are copy-pasted across distinct vulnerability classes.
- **Root Cause**: Lack of context-aware AST rewrite engine in legacy remediation pipeline.
- **Evidence Excerpt**: `master-50-audits.ts lines 41, 118, 195: '- // Vulnerable logic
+ // Hardened with Verified Invariant Gate
+ require(invariantCheck(), 'INVARIANT_VIOLATION');'.`
- **Key Affected Files**:
  - `lib/security/master-50-audits.ts`
  - `lib/security/v2/patch-validation-engine.ts`
  - `scripts/generate-50-audits-benchmark.mjs`
  - `artifacts/audit_forensic_baseline.json`
  - `raporty1/01_SMART_CONTRACT_AUDITS_15_BENCHMARKS/ERC20_PRO_AUDIT.json`

### DEF-08-GENERIC-ATTACK-PATHS: Generic Templated Attack Scenarios & PoCs

- **Severity**: `HIGH`
- **Category**: `generic_attack_paths`
- **Confirmed Occurrences**: **140**
- **Description**: Exploit attack vectors are produced by inserting finding titles into a canned sentence template ('Attacker executes structured transaction payload exploiting [Title]...') with a boilerplate Foundry PoC skeleton asserting 'attackerGain > 0'.
- **Root Cause**: Synthesizer stub was never hooked into a real symbolic execution or reachability tracer.
- **Evidence Excerpt**: `master-50-audits.ts lines 38-39, 115-116: 'Attacker executes structured transaction payload exploiting...'; 'contract ExploitPoC is Test { ... assertGt(attackerGain, 0); }'.`
- **Key Affected Files**:
  - `lib/security/master-50-audits.ts`
  - `scripts/generate-50-audits-benchmark.mjs`
  - `artifacts/corpus_smart_contracts/usdt_advanced.json`
  - `artifacts/audit_forensic_baseline.json`
  - `raporty1/01_SMART_CONTRACT_AUDITS_15_BENCHMARKS/ERC20_ADVANCED_AUDIT.json`

### DEF-09-FAKE-EXECUTION-COUNTERS: Fake Execution Counters & Hardcoded Durations

- **Severity**: `HIGH`
- **Category**: `fake_execution_counters`
- **Confirmed Occurrences**: **80**
- **Description**: Execution timings and trial counters are hardcoded rather than measured: pdfMs is hardcoded to 15, dataflowMs is 30% of cfgMs, fuzz iterations are claimed at 65536/100000 without execution engines.
- **Root Cause**: Synthetic benchmark orchestration scripts designed to output perfect completion metrics.
- **Evidence Excerpt**: `master-audit-orchestrator.ts lines 181-185: dataflowMs: Math.max(1, Math.round(cfgMs * 0.3)), pdfMs: 15; detector_execution_manifest.json: executionCoveragePct: 100.0 (despite 35 dead detectors).`
- **Key Affected Files**:
  - `lib/security/v2/master-audit-orchestrator.ts`
  - `artifacts/detector_execution_manifest.json`
  - `artifacts/fuzz_campaign_manifest.json`
  - `artifacts/formal_property_registry.json`

### DEF-10-FAKE-SOLVER-RESULTS: Fake Formal Verification & SMT Prover Results

- **Severity**: `CRITICAL`
- **Category**: `fake_solver_results`
- **Confirmed Occurrences**: **57**
- **Description**: Formal properties are asserted as PROVED via 'Z3 Theorem Prover v4.13.0 - 64 Bit' and 'Bounded-EVM-SMT-Checker' despite Z3 not being installed on the host system.
- **Root Cause**: Hardcoded formal verification layer designed to satisfy high-assurance audit specifications.
- **Evidence Excerpt**: `formal_property_registry.json lines 4, 21-22: solver: 'Z3', solverRawResult: 'UNSAT', status: 'PROVED'; symbolic-formal-engine.ts line 75: formalAssurance.push({ proven: true, status: 'FORMALLY_VERIFIED', solver: 'Bounded-EVM-SMT-Checker' }).`
- **Key Affected Files**:
  - `artifacts/formal_property_registry.json`
  - `lib/security/v2/symbolic-formal-engine.ts`
  - `lib/security/master-50-audits.ts`
  - `scripts/generate-50-audits-benchmark.mjs`
  - `dowody6/smart_contract/059_smart_contract_frax_pro_en.json`

### DEF-11-FAKE-RPC-PAYLOADS: RPC Bypass & Mock RPC Payload Injection

- **Severity**: `HIGH`
- **Category**: `fake_rpc_payloads`
- **Confirmed Occurrences**: **18**
- **Description**: app/api/audit/report/route.ts explicitly bypasses live RPC for benchmark contracts (BENCHMARK_20_CONTRACTS), falling back to hardcoded profiles. In manifests, archive node block hashes are patterned hex strings.
- **Root Cause**: Avoidance of external network latency and rate limits during evaluation runs.
- **Evidence Excerpt**: `app/api/audit/report/route.ts line 130: 'if (!effectiveBytecode && !BENCHMARK_20_CONTRACTS[address.toLowerCase()]) { const rpcResult = await fetchOnChainBytecode(address, chainId); }'.`
- **Key Affected Files**:
  - `app/api/audit/report/route.ts`
  - `artifacts/build_provenance.json`
  - `artifacts/fork_test_manifest.json`
  - `lib/security/evm-rpc-fetcher.ts`

### DEF-12-DOMAIN-LEAKAGE: Cross-Domain Contamination (TradFi / Non-EVM)

- **Severity**: `CRITICAL`
- **Category**: `domain_leakage`
- **Confirmed Occurrences**: **132**
- **Description**: Non-EVM cryptocurrencies (BTC, ADA, SOL) and TradFi stocks (AAPL, NVDA) contain EVM smart contract fields ('verifiedContract: true', 'honeypotDetected: false', 'buyTax: 0.0%', 'compilerVersion'). Additionally, '41.2%' dark pool volume statistic is copied into smart contract reports.
- **Root Cause**: Shared report generation schemas failing to enforce strict domain partitioning between Smart Contracts, Crypto Shield, and Real Markets.
- **Evidence Excerpt**: `BTC_ADVANCED_THREAT_REPORT.json: verifiedContract: True, buyTax: '0.0%', sellTax: '0.0%'; dowody/json/02_usdt_pro_pl.json: 41.2% dark pool volume statistic injected into Tether USDT audit.`
- **Key Affected Files**:
  - `dane1/02_SHIELD_THREAT_INTELLIGENCE_20_ASSETS/BTC_ADVANCED_THREAT_REPORT.json`
  - `dane1/02_SHIELD_THREAT_INTELLIGENCE_20_ASSETS/ADA_ADVANCED_THREAT_REPORT.json`
  - `dane1/03_REAL_MARKETS_INTELLIGENCE_20_ASSETS/AAPL_ADVANCED_MARKET_REPORT.json`
  - `dowody/json/02_usdt_pro_pl.json`
  - `lib/security/contract-audit-profiles.ts`

### DEF-13-TIER-LEAKAGE: Tier Leakage & Tier-Hardcoded Quality Scores

- **Severity**: `HIGH`
- **Category**: `tier_leakage`
- **Confirmed Occurrences**: **45**
- **Description**: audit-canonical-report.ts hardcodes auditQualityScore to 62 (Basic), 82 (Pro), and 95 (Advanced) purely based on requested tier. Basic tier reports leak advanced vulnerability descriptions without proper lock gating.
- **Root Cause**: Client tier pricing tied directly to visual score metric rather than objective codebase security evaluation.
- **Evidence Excerpt**: `audit-canonical-report.ts line 872: const qScore = report.verdict.auditQualityScore ?? (report.clientEntitlementTier === 'advanced' ? 95 : report.clientEntitlementTier === 'pro' ? 82 : 62).`
- **Key Affected Files**:
  - `lib/security/audit-canonical-report.ts`
  - `app/api/audit/report/route.ts`
  - `dane1/01_SMART_CONTRACT_AUDITS_15_BENCHMARKS/ERC20_BASIC_AUDIT.json`
  - `raporty1/01_SMART_CONTRACT_AUDITS_15_BENCHMARKS/ERC20_BASIC_AUDIT.json`

### DEF-14-DEAD-DETECTORS: Dead Detectors & Phantom Coverage Claims

- **Severity**: `CRITICAL`
- **Category**: `dead_detectors`
- **Confirmed Occurrences**: **35**
- **Description**: 35 of 42 security detectors registered in detector_registry.json (83.3%) have zero implementation in lib/security/, yet detector_execution_manifest.json claims 100% execution coverage.
- **Root Cause**: Specification-ahead-of-implementation gap where marketing registry exceeded active engine development.
- **Evidence Excerpt**: `detector_registry.json lists 42 detectors. Only 7 exist in lib/security/ (VLM-DEFI-REENT-RO-01, VLM-ORACLE-LINK-01, VLM-MEV-SANDWICH-01, VLM-DEFI-4626-01, VLM-ERC20-SEM-01, VLM-AUTH-EIP712-01, VLM-PROXY-UPGRADE-01). 35 detectors are dead stubs.`
- **Key Affected Files**:
  - `artifacts/detector_registry.json`
  - `artifacts/detector_execution_manifest.json`
  - `scripts/generate-static-crosscheck.js`

---

## 3. Detector Parity Analysis: Registry vs Code vs Execution Manifest

| Metric | Value | Forensic Conclusion |
|:---|---:|:---|
| **Registered in `detector_registry.json`** | 42 | Full declared detector inventory |
| **Implemented in `lib/security/`** | 7 | Only 16.67% of detectors have actual logic |
| **Dead / Unimplemented Detectors** | 35 | **83.33% of declared detectors are ghost stubs** |
| **Claimed Executed in `detector_execution_manifest.json`** | 42 | **100.0% coverage claim is fabricated** |

### Active Implemented Detectors (7):
1. `VLM-DEFI-REENT-RO-01` — Read-Only Reentrancy via External View Curve/Balancer Query (`lib/security/analyzer/vlm-top5-detectors.ts`)
1. `VLM-ORACLE-LINK-01` — Chainlink Stale Answer / Missing Heartbeat Validation (`lib/security/analyzer/vlm-top5-detectors.ts`)
1. `VLM-MEV-SANDWICH-01` — Zero Minimum Output Slippage Vector (amountOutMin == 0) (`lib/security/analyzer/vlm-top5-detectors.ts`)
1. `VLM-DEFI-4626-01` — ERC-4626 First Depositor Vault Share Inflation (`lib/security/analyzer/vlm-top5-detectors.ts`)
1. `VLM-ERC20-SEM-01` — Unchecked ERC-20 Return Value (Missing SafeERC20) (`lib/security/analyzer/vlm-top5-detectors.ts`)
1. `VLM-AUTH-EIP712-01` — EIP-712 Cross-Chain Signature Replay Hazard (`lib/security/analyzer/vlm-top5-detectors.ts`)
1. `VLM-PROXY-UPGRADE-01` — Unrestricted Proxy Implementation Upgrade Function (`lib/security/analyzer/vlm-top5-detectors.ts`)

### Dead Detectors (35):
`VLM-AUTH-01`, `VLM-AUTH-02`, `VLM-AUTH-03`, `VLM-AUTH-04`, `VLM-REENT-01`, `VLM-REENT-02`, `VLM-REENT-04`, `VLM-ORACLE-02`, `VLM-ORACLE-03`, `VLM-ORACLE-04`, `VLM-MEV-02`, `VLM-MEV-03`, `VLM-VAULT-02`, `VLM-VAULT-03`, `VLM-TOKEN-02`, `VLM-TOKEN-03`, `VLM-UPGRADE-02`, `VLM-UPGRADE-03`, `VLM-UPGRADE-04`, `VLM-GAS-01`, `VLM-GAS-02`, `VLM-SIG-02`, `VLM-SIG-03`, `VLM-MATH-01`, `VLM-MATH-02`, `VLM-GOV-01`, `VLM-GOV-02`, `VLM-GOV-03`, `VLM-TIME-01`, `VLM-TIME-02`, `VLM-PRIV-01`, `VLM-PRIV-02`, `VLM-PAY-01`, `VLM-PAY-02`, `VLM-COMM-01`

---

## 4. Remediation Roadmap for Velmere Furnace V6

To transition Velmere Furnace V6 into a strictly verifiable, production-grade audit engine:
1. **Enforce Reality Rule**: Eliminate all synthetic manifests (`formal_property_registry.json`, `detector_execution_manifest.json`, `fork_test_manifest.json`, `build_provenance.json`) where claimed tool runs were not genuinely executed.
2. **Decommission Ghost Detectors**: Update `detector_registry.json` to reflect only the 7 active detectors until the remaining 35 are legitimately coded and regression tested.
3. **Remove Hardcoded Audit Profiles**: Replace `master-50-audits.ts` and `contract-audit-profiles.ts` with live dynamic bytecode fetching and real AST parsing in `evm-contract-engine.ts`.
4. **Eliminate Placeholder Addresses**: Replace UI fallback `0x1234567890123456789012345678901234567890` in `page.tsx` with an explicit invalid-address error state.
5. **Strict Domain Isolation**: Remove EVM smart contract fields from BTC, ADA, SOL, AAPL, NVDA across all report generators and catalogs.
6. **Dynamic Audit Quality Scoring**: Decouple `auditQualityScore` in `audit-canonical-report.ts` from client purchase tiers and derive it strictly from empirical finding counts and CFG complexity.
