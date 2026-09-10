# VELMÈRE AUDIT QUALITY SPECIFICATION
**Metric:** Audit Quality Score (0–100, where 100 represents full mathematical proof and on-chain verification)  
**Standard:** Directive v3 Sections 30–34, 88

## 1. Quality Dimensions
The Audit Quality Score reflects how deep, rigorous, and verifiable the audit was—independent of whether vulnerabilities were found.

| Component | Max Points | Evaluation Criteria |
| :--- | :--- | :--- |
| **Evidence Depth** | 35 pts | Number of registered and verified `EvidenceRecord` items (>= 10 records for max points). |
| **Category Coverage** | 30 pts | Breadth of analysis across the 14 recognized evidence categories. |
| **Mathematical Proofs** | 20 pts | Execution of formal SMT solvers (Z3/CVC5) with proven invariants. |
| **Provenance Verification** | 15 pts | On-chain storage slot confirmation and verified source bytecode match. |

## 2. Quality Formula
```typescript
const depthScore = Math.min(35, evidenceRecords.length * 3.5);
const categoryScore = Math.min(30, uniqueCategories.size * 3.0);
const formalScore = solverExecuted ? (allInvariantsProven ? 20 : 10) : 0;
const provenanceScore = sourceVerified && slotsVerified ? 15 : 5;

const AuditQualityScore = Math.round(depthScore + categoryScore + formalScore + provenanceScore);
```
