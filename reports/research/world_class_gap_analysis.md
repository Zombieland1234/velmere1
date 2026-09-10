# VELMÈRE WORLD-CLASS EVIDENCE INTELLIGENCE GAP MATRIX

*Date: September 2026*  
*Objective: Rigorous gap analysis of current codebase vs. World-Class Evidence Intelligence requirements.*

---

## 1. Executive Summary

While the previous audit passes established PDF rendering stability and eliminated basic cross-asset text contamination in locked teasers, a forensic gap analysis reveals several **critical architectural deficiencies** that prevent the platform from legitimately qualifying as **Evidence-Native Intelligence**.

Most notably:
1. **Fallback Optimism Defect:** When bytecode is missing or zero-length, the system previously defaulted to positive assertions (e.g. `"Zero Destructive Opcodes: verified"`) and invented a fallback risk score rather than failing closed.
2. **Missing Relational Evidence Model:** Findings and metrics contained text snippets labeled `evidence`, but lacked discrete `claim_id` and `evidence_id` schemas with immutable raw/normalized cryptographic hashes and source provenance.
3. **No Independent Verification CLI:** The system computed SHA-256 digests and simulated PKI blocks, but offered no standalone command-line verification tool (`velmere verify-report`, `velmere verify-evidence`) to replay and validate reports.

---

## 2. Requirement-by-Requirement Gap Analysis

| Directives Area | World-Class Requirement | Current State | Gap Severity | Targeted Architectural Remedy |
| :--- | :--- | :--- | :--- | :--- |
| **01. Invariant: Missing Bytecode** | $\text{bytecode} == \text{missing} \implies \text{bytecode-derived\\_claims} == 0$. Never claim opcode, reentrancy, oracle, or proxy verification. | Defaults to `"Zero Destructive Opcodes: verified"` and `"Direct Execution (Non-Proxy): verified"`. | **P0 (Critical)** | Build \`MalformedBytecodeGuard\` in \`lib/security/bytecode/\`. Fail-closed: 0 bytecode claims, output \`NOT ANALYZABLE FROM AVAILABLE EVIDENCE\`. |
| **02. Scoring: Insufficient Evidence** | Insufficient data $\implies$ \`SECURITY RISK = NOT SCORED\`. Never invent arbitrary default score. | Defaults to score formula producing ~72 / 100 on unlisted contracts without bytecode. | **P0 (Critical)** | Refactor \`resolveContractAuditProfile\` & \`domain-score-engine\`: return \`riskScore: null\`, label \`NOT_SCORED\`. |
| **03. Claim / Evidence System** | Discrete \`claim_id\` (\`CLM-...\`) mapped to \`evidence_id\` (\`EVD-...\`) with raw/normalized input hashes and source URI. | Findings have unstructured string \`evidence: "..."\`. No claim IDs or evidence IDs. | **P0 (Critical)** | Create \`lib/security/evidence/claim-evidence-model.ts\` with authoritative relational schemas. |
| **04. Evidence Graph & Traceability** | Tracing: \`Asset -> Snapshot -> Source -> Observation -> Analysis -> Finding -> ScoreContribution\`. | Ad-hoc object aggregation in \`audit-canonical-report.ts\`. No graph relations or orphan claim detection. | **P0 (Critical)** | Implement \`lib/security/evidence/evidence-graph.ts\` supporting lineage queries and invalidation. |
| **05. Asset-Class Firewall** | 8 canonical classes: \`EVM_CONTRACT\`, \`NATIVE_BLOCKCHAIN\`, \`TRADITIONAL_EQUITY\`, \`ETF\`, \`COMMODITY_FUTURE\`, \`FX\`, \`OTHER_TRADITIONAL\`, \`SIMULATED_FIXTURE\`. Declared \`supported_asset_classes[]\`. | 3 coarse classes: \`evm_contract\`, \`native_chain\`, \`market_asset\`. | **P0 (Critical)** | Expand \`lib/security/asset-class-firewall.ts\` to all 8 classes with strict fail-closed analyzer gates. |
| **06. Signed Attestations & CLI** | Ed25519 digital signature of manifest and reports. CLI tool: \`velmere verify-report <file>\`, \`velmere verify-evidence <id>\`. | SHA-256 hashes generated in JSON manifest; no interactive verification CLI. | **P1 (High)** | Build \`scripts/velmere-cli.ts\` with Ed25519 signing, verification commands, and public key export. |
| **07. Proxy & Upgradeability Engine** | Deep detection: EIP-1967, implementation/admin/beacon slots, upgrade authorities, storage collision indicators. | Basic regex for \`0x360894...bc89\` slot in \`evm-contract-engine.ts\`. | **P1 (High)** | Implement dedicated \`lib/security/proxy/proxy-analysis-engine.ts\` tracking slots and authorities. |
| **08. Oracle Risk Engine** | Map to OWASP SC03, provider detection, heartbeat, deviation, spot vs TWAP, manipulation surface. | Simple string check for \`oracle\` or \`chainlink\` keyword. | **P1 (High)** | Implement \`lib/security/oracle/oracle-risk-engine.ts\` with OWASP SCS mapping and manipulation bounds. |
| **09. Attack Surface Model** | Structured attack surface mapped to OWASP Smart Contract Top 10 (SC01-SC10). | Generic attack categories in report templates. | **P1 (High)** | Implement \`lib/security/attack-surface/attack-surface-model.ts\` mapped to OWASP SC01-SC10. |
| **10. Data Freshness Engine** | \`observed_at\`, \`source_timestamp\`, \`stale_after\`, \`freshness_status\` (\`LIVE\`, \`FRESH\`, \`AGING\`, \`STALE\`, \`UNAVAILABLE\`). | Only \`createdAt\` timestamp on the report object. | **P1 (High)** | Implement \`lib/security/freshness/data-freshness-engine.ts\` with configurable freshness thresholds. |
| **11. Deterministic Replay & Differential** | Replay command: \`PASS\` or \`MISMATCH\` with diff details. Differential comparison: Snapshot A vs B. | Static generation scripts without differential comparison or automated replay diffing. | **P1 (High)** | Implement \`lib/security/replay/evidence-replay-engine.ts\` for automated replay and differential analysis. |
| **12. Remediation State Machine** | Strict lifecycle: \`FOUND\`, \`ACKNOWLEDGED\`, \`FIX IN PROGRESS\`, \`FIXED\`, \`RETESTED\`, \`RESOLVED\`, \`REOPENED\`. | Static status string on findings. | **P1 (High)** | Implement \`lib/security/remediation/remediation-lifecycle.ts\` with evidence requirement for \`FIXED\`/\`RESOLVED\`. |
| **13. Continuous Monitoring (Watch)** | Architecture for monitoring events: proxy changes, admin transfers, tax changes, oracle staleness. | Absent from current codebase. | **P2 (Design)** | Design and implement \`lib/security/monitoring/velmere-watch-engine.ts\`. |

---

## 3. Remediation Roadmap

To resolve all P0 and P1 gaps before entering the 10-Cycle Furnace:

1. **Step 1 (P0): Claim & Evidence System**  
   Create `lib/security/evidence/claim-evidence-model.ts` and `lib/security/evidence/evidence-graph.ts`.
2. **Step 2 (P0): Malformed Bytecode Safety & Fail-Closed Scoring**  
   Create `lib/security/bytecode/malformed-bytecode-guard.ts` and update `lib/security/contract-audit-profiles.ts` and `lib/security/audit-canonical-report.ts` so that missing bytecode yields strictly 0 bytecode-derived claims and `riskScore: null (NOT_SCORED)`.
3. **Step 3 (P0): 8 Canonical Asset Classes Firewall**  
   Upgrade `lib/security/asset-class-firewall.ts` to support the full 8 classes with explicit `supported_asset_classes[]` declarations.
4. **Step 4 (P1): Domain Engines (Proxy, Oracle, Attack Surface, Freshness, Remediation)**  
   Create dedicated engines in `lib/security/` mapped to current standards (OWASP SC01-SC10, EIP-1967).
5. **Step 5 (P1): Cryptographic Attestation & Standalone Verification CLI**  
   Implement `scripts/velmere-cli.ts` supporting `velmere verify-report` and `velmere verify-evidence`.
6. **Step 6 (P1): Replay & Differential Engine**  
   Implement `lib/security/replay/evidence-replay-engine.ts`.
7. **Step 7: Expanded Adversarial Corpus**  
   Create `tests/adversarial/world-class-adversarial-corpus.test.ts` covering 40+ failure vectors.
8. **Step 8: 10-Cycle Autonomous Furnace Execution**  
   Execute 10 complete cycles with 11 attacker personas into `artifacts/cycle-01/` through `artifacts/cycle-10/`.
9. **Step 9: Final Certified Release**  
   Generate final 150 PDFs and signed attestation package in `artifacts/final/`.
