# VELMÈRE EVIDENCE SPECIFICATION
**Schema:** `velmere.v3.evidence-records`  
**Standard:** Directive v3 Sections 1–6

## 1. EvidenceRecord Schema Definition
Every atomic audit artifact produces an `EvidenceRecord` with the following structure:
```typescript
interface EvidenceRecord {
  id: string; // EV-{CATEGORY}-{HASH}
  auditId: string;
  category: EvidenceCategory; // 14 recognized categories
  status: "PASS" | "FAIL" | "WARN" | "INFO" | "NOT_RUN" | "UNKNOWN" | "INSUFFICIENT_EVIDENCE";
  method: "OBSERVED" | "CALCULATED" | "DERIVED" | "SIMULATED" | "SOLVER_PROVEN" | "UNOBSERVED";
  source: string;
  tool: string;
  toolVersion: string;
  timestamp: string; // ISO 8601
  file?: string;
  lineStart?: number;
  lineEnd?: number;
  inputHash: string; // SHA-256 of input data
  outputHash: string; // SHA-256 of result data
  rawInput?: string;
  rawOutput?: any;
}
```

## 2. Merkle Root Construction
Leaves are ordered deterministically by leaf hash (canonical leaf-sorting) prior to computing the SHA-256 Merkle root:
```typescript
function computeMerkleRoot(leafHashes: string[]): string {
  if (leafHashes.length === 0) return zeroHash;
  let currentLevel = [...leafHashes].sort();
  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
      const combined = left < right ? left + right : right + left;
      nextLevel.push(sha256(combined));
    }
    currentLevel = nextLevel;
  }
  return currentLevel[0];
}
```
