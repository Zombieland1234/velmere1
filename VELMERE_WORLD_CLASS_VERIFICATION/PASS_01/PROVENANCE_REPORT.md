# PASS_01 DATA PROVENANCE & AUDIT TRAIL

## 1. Result Lineage
Every material output produced by Velmère follows a strict reproducible lineage:
`Raw Input / Bytecode` -> `Disassembler` -> `CFG Partitioning` -> `Taint & Pattern Analysis` -> `Cryptographic Snapshot Digest` -> `Report / UI / PDF`.

## 2. Reproducibility Proof
- **Snapshot ID**: SHA-256 digest computed across bytecode, compiler metadata, chain ID, and engine version.
- Independent verification can reconstruct the exact findings by supplying the identical bytecode and configuration.
