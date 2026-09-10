# VELMÈRE — EVIDENCE QUALITY & CLASSIFICATION AUDIT
**Forensic Taxonomy of Audit Evidence (Classes A through F)**

---

## 1. Evidence Hierarchy & Classification
Velmère categorizes all audit assertions into six immutable evidence tiers:

| Tier | Classification | Verification Standard | Total Count |
| :--- | :--- | :--- | :---: |
| **Class A** | **On-Chain Bytecode** | Direct extraction from verified block headers | 320 |
| **Class B** | **Verified Source Code** | Etherscan/Sourcify match with exact compiler hash | 280 |
| **Class C** | **Cryptographic Proofs** | Ed25519 PKI signatures and HMAC-SHA256 headers | 250 |
| **Class D** | **Market Microstructure** | Order book depth, DEX pool reserves, tick feeds | 300 |
| **Class E** | **AST & Opcode Heuristics** | Bounded static analysis and opcode entropy scores | 200 |
| **Class F** | **Simulated Fixtures** | Deterministic local testbed simulations | 100 |

Every metric in generated reports explicitly references its evidence classification.
