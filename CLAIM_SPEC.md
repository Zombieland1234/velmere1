# VELMÈRE CLAIM SPECIFICATION & BLOCKER RULES
**Standard:** Directive v3 Sections 5, 6, 86, 87

## 1. Prohibited Claim Patterns & Truthful Replacements
| Prohibited Pattern | Category | Truthful Fallback Replacement | Mandated Reason |
| :--- | :--- | :--- | :--- |
| `RFC 3161` | CRYPTOGRAPHIC | `SHA-256 INTEGRITY SEAL [LOCAL DETERMINISTIC]` | No RFC 3161 ASN.1 TimeStampToken from external TSA observed. |
| `PCAOB Certified` | REGULATORY | `EXTERNAL INDEPENDENT AUDITOR [SEC 10-K REFERENCE]` | Velmère cannot award or claim PCAOB certification. |
| `41.2% Dark Pool` | MICROSTRUCTURE | `ATS / Dark Pool Share: NOT OBSERVED [INSUFFICIENT DATA]` | Static 41.2% banned without observed trade tape. |
| `2.8 bps Slippage` | MICROSTRUCTURE | `Kyle Slippage ($10M): ESTIMATED HEURISTIC [UNOBSERVED]` | Static 2.8 bps banned without live order book snapshot regression. |
| `All invariants proven` | FORMAL | `Invariants Analyzed: PARTIAL HEURISTIC [SMT SOLVER NOT EXECUTED]` | Cannot claim mathematical proof without Z3/CVC5 solver proof artifact. |
| `100% Safe / Secure` | VULNERABILITY | `ASSESSMENT: BOUNDED TIME-WINDOW SCAN [NO ACTIVE CRITICAL EXPLOIT OBSERVED]` | Absolute safety guarantees are categorically prohibited. |
| `Human Audited` | HUMAN_REVIEW | `HUMAN REVIEW: NOT PERFORMED [AUTOMATED ENGINE ONLY]` | Requires authenticated reviewer signature and reviewId. |
| `Direct L3/SIP` | MARKET_DATA | `Market Data Source: DERIVED CONSOLIDATED QUOTES [SIP DERIVED]` | Requires licensed multicast ITCH/OUCH hardware tap. |
| `Best Execution PASS` | MARKET_DATA | `Best Execution: NOT ASSESSED [NO EXECUTION ROUTING DATA]` | Requires tick-by-tick NBBO execution timestamps. |
| `Multisig 3-of-5` | ACCESS_CONTROL | `Multisig: THRESHOLD UNKNOWN [NO ON-CHAIN CALL EXECUTED]` | Cannot claim 3-of-5 without querying getThreshold()/getOwners(). |
| `Timelock 48h` | ACCESS_CONTROL | `Timelock: DELAY UNOBSERVED [NO ON-CHAIN GETMINDELAY EXECUTED]` | Cannot claim 48h without querying getMinDelay(). |
| `Zero Risk` | VULNERABILITY | `Risk Level: RESIDUAL RISK CANNOT BE ZERO` | Absolute zero-risk claims are invalid. |
| `Bug-Free Guarantee` | FORMAL | `Defect Assurance: MATHEMATICAL ABSENCE CANNOT BE GUARANTEED` | Dijkstra Principle: testing shows presence of bugs, not absence. |
