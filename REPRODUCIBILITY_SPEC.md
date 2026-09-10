# VELMÈRE REPRODUCIBILITY SPECIFICATION
**Standard:** Directive v3 Sections 52–56, 102, 103

## 1. Determinism Guarantees
1. **Canonical Leaf Sorting:** All evidence leaf hashes are lexicographically sorted before computing the Merkle root.
2. **Fixed Environment:** Node.js v24.18.0, deterministic timestamp seals, zero random numbers in score computations.
3. **Audit ID Formula:** Deterministic naming: `AUD-{TYPE}-{INDEX}-{SYMBOL}`.

## 2. Independent Verification Command
```bash
# Compute Merkle Root independently from manifest
node -e '
const fs = require("fs");
const { computeMerkleRoot } = require("./lib/security/evidence-vault/merkle-tree.ts");
const manifest = JSON.parse(fs.readFileSync("evidence/AUD-CONTRACT-01-USDT/manifest/manifest.json", "utf8"));
const root = computeMerkleRoot(manifest.leafHashes);
console.log("Calculated:", root, "Manifest:", manifest.evidenceRoot, "Match:", root === manifest.evidenceRoot);
'
```
