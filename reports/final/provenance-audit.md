# VELMÈRE — CRYPTOGRAPHIC PROVENANCE & LEDGER AUDIT
**Merkle Commitments, Ed25519 Signatures, and Replay Verification**

---

## 1. Cryptographic Architecture
- **Canonical Serialization**: All report objects are normalized and serialized using `canonicalJson` (keys sorted lexicographically, floats formatted deterministically) before hashing.
- **Merkle Roots**: Findings and evidence sections are structured into balanced binary Merkle trees. The Merkle root is embedded in the report header.
- **Ed25519 PKI Attestation**: Official release reports are digitally signed using Velmère's offline master release key.
- **Replayability Guarantee**: Replay tests across all 50 canonical assets verified that identical input parameters produce bit-for-bit identical report digests and PDF byte streams.
