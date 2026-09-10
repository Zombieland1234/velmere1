# VELMÈRE AUDIT SYSTEM FORENSIC INVENTORY
**Engine Version:** Furnace 3.0.0-institutional  
**Standard:** Directive v3 Sections 1–103  
**Status:** FULL AUDIT GRADE (PASS)

## 1. Core Modules Inventory
| Module Path | Primary Responsibility | Deterministic Integrity |
| :--- | :--- | :--- |
| `lib/security/evidence/evidence-record.ts` | Universal EvidenceRecord schema & canonical SHA-256 leaf hashing | SHA-256 Input/Output Bindings |
| `lib/security/evidence/claim-audit-blocker.ts` | Intercepts 15+ marketing buzzwords and enforces truthful fallbacks | Fail-closed regex scanner |
| `lib/security/evidence-vault/merkle-tree.ts` | Canonical leaf-sorted SHA-256 Merkle tree calculation | Deterministic Leaf Sorting |
| `lib/security/evidence-vault/evidence-vault.ts` | Manifest packaging, deterministic seal generation, vault export | SHA-256 Integrity Seal |
| `lib/security/evidence-vault/json-exporter.ts` | Canonical JSON export suite (report, findings, evidence, manifest) | Schema-validated JSON |
| `lib/security/analyzer/contract-analyzer.ts` | AST parsing, EIP-1967 storage slot verification, 7 institutional detectors | AST Line Mapped |
| `lib/security/formal/formal-engine.ts` | Invariant catalog (VLM-FORMAL-01..03), Z3 solver fallback, true fuzz tracking | Zero-solver fabrication |
| `lib/security/market-evidence/market-provenance-engine.ts` | Lorenz curve Gini, Kyle lambda slippage, SEC EDGAR CIK verification | Live/derived tape bindings |
| `lib/security/scoring/two-dimensional-scorer.ts` | Independent Risk Score (0-100) vs Audit Quality Score (0-100) | Mathematical, reproducible |
| `lib/security/pro-audit-pdf/tier-report-builder.ts` | Page budgets (Basic 1-2, Pro 2-4, Advanced 4-8), strict section layout | Budget & disclaimer enforced |
| `lib/security/pro-audit-pdf/customer-safe-renderer.ts` | PDF-1.7 compliance, WinAnsiEncoding, Unicode CMap, dual score meters | Native PDF Stream Engine |
| `app/api/audit/verify/[id]/route.ts` | Machine-readable Merkle verification & JSON endpoint | Dynamic verification |
| `app/[locale]/audit/verify/[id]/page.tsx` | Dedicated verification UI displaying all 9 Section 76 indicators | Interactive Web Interface |

## 2. Evidence Categories Inventory (14 Standards)
1. `SOURCE`: Code ingestion and normalized AST hashing.
2. `AST`: Abstract Syntax Tree parsing and control flow graphs.
3. `STATIC_DETECTOR`: Heuristic vulnerability detectors with exact line bindings.
4. `FORMAL`: SMT solver mathematical proofs (Z3/CVC5).
5. `FUZZING`: Stateful and stateless property-based fuzz runs.
6. `STORAGE_SLOT`: On-chain RPC raw storage slot verification (EIP-1967).
7. `ACCESS_CONTROL`: Role enumeration, multisig thresholds, timelock delays.
8. `MARKET_DATA`: Spot prices, venue bindings, quote depth.
9. `MARKET_MICROSTRUCTURE`: Kyle lambda slippage, order-book imbalance.
10. `ON_CHAIN_PROVENANCE`: Block numbers, chain IDs, deployment receipts.
11. `REGULATORY_DATA`: SEC EDGAR filings, CIKs, PCAOB auditor mappings.
12. `DISCLOSURE`: Public CVEs and transparent methodology notices.
13. `CRYPTOGRAPHIC`: Merkle roots, leaf digests, deterministic hashes.
14. `HUMAN_REVIEW`: Certified reviewer cryptographically signed reports.
