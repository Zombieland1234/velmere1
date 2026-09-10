# VELMÈRE AUDIT ENGINE ARCHITECTURE
**Standard:** Directive v3 Sections 7–21, 67–75  
**Version:** Furnace 3.0.0-institutional

## 1. System Topology & Data Flow
```
[Target Contract / Market Asset]
           │
           ▼
[SmartContractAnalyzer / MarketProvenanceEngine]
           │
           ├──> Computes AST / Microstructure Telemetry
           ├──> Extracts Findings & Exact Line Numbers
           └──> Generates Immutable EvidenceRecords (SHA-256)
                       │
                       ▼
           [Evidence Vault / Merkle Tree]
                       │
                       ├──> Leaf-Sorted Canonical SHA-256 Merkle Root
                       └──> Manifest.json Packaging
                                   │
                                   ▼
           [Claim Audit Blocker & Sanitizer]
                       │
                       ├──> Scans for Prohibited Buzzwords
                       └──> Replaces unproven claims with Truthful Fallbacks
                                   │
                                   ▼
           [Two-Dimensional Scoring Engine]
                       │
                       ├──> Risk Score (0-100, lower is safer)
                       └──> Audit Quality Score (0-100, higher is more rigorous)
                                   │
                                   ▼
     ┌─────────────────────────────┴─────────────────────────────┐
     ▼                                                           ▼
[CustomerSafeRenderer]                                  [JSON Exporter]
     │                                                           │
     ▼                                                           ▼
Canonical PDF-1.7 Report                                 Canonical JSON Suite
(/dowodypdf/, /dowody4/)                                 (report, findings, evidence, manifest)
     │                                                           │
     └─────────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
                    [Live Verification Gateway]
               - /api/audit/verify/[id] (JSON API)
               - /[locale]/audit/verify/[id] (Web UI)
```

## 2. Invariant Architecture Principles
1. **Separation of Risk from Quality:** A contract with zero findings still receives a low Audit Quality Score if only heuristic scans were executed.
2. **Zero-Knowledge Evidence:** Every assertion in a report must be backed by a leaf in the Evidence Merkle Tree.
3. **Fail-Closed Verification:** If an SMT solver fails or times out, the claim is strictly downgraded to `NOT_RUN` or `UNKNOWN`.
