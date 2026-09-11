# VELMÈRE AUDIT ENGINE: CLAIM REMEDIATION & VERIFICATION MATRIX
**Status:** HISTORICAL / REQUIRES CURRENT-RELEASE REVALIDATION  
**Norma:** Directive v3 Sections 1–92  
**Original verification date:** 2026-09-09  
**R10 correction:** 2026-09-11

> This document is a historical remediation map, not proof that the current release is fully remediated. A later R9 audit found active claim-truth defects. Current status must be derived from fresh release evidence and the current `ClaimAuditBlocker` regression suite.

---

## 1. MACIERZ REMEDIACJI ZNANYCH ZAKAZANYCH / NIESPRAWDZONYCH CLAIMÓW

| Old Claim | Why invalid/unverified | Truthful state/fallback | Evidence required for any stronger wording | Code path | Current rule |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `RFC 3161 Trusted Timestamping` | Brak zewnętrznego tokena TSA nie pozwala na claim RFC 3161. | `SHA-256 INTEGRITY SEAL [LOCAL DETERMINISTIC]` | `PASS` CRYPTOGRAPHIC evidence, `OBSERVED`, identifying an external RFC3161/TSA `TimeStampToken` | `lib/security/evidence/claim-audit-blocker.ts` | Local SHA alone never authorizes RFC 3161 wording. |
| `PCAOB Certified` | Velmère nie jest audytorem finansowym PCAOB. | `EXTERNAL AUDITOR REFERENCE [NOT A VELMÈRE CERTIFICATION]` | No generic Velmère evidence may turn the product into a PCAOB certification. | `lib/security/evidence/claim-audit-blocker.ts` | Claim is rewritten. |
| `41.2% Dark Pool Share` | Arbitralna stała bez exact observed dataset. | `ATS / Dark Pool Share: NOT OBSERVED [INSUFFICIENT DATA]` | `PASS` fresh `MARKET_MICROSTRUCTURE` evidence for the exact instrument/scope | `lib/security/evidence/claim-audit-blocker.ts` | Category presence alone is insufficient. |
| `2.8 bps Kyle slippage` | Sztywna wartość bez exact observed market-depth evidence. | `Kyle Slippage: ESTIMATED HEURISTIC [UNOBSERVED]` | `PASS` fresh `MARKET_MICROSTRUCTURE` evidence for the exact scope | `lib/security/evidence/claim-audit-blocker.ts` | Stale/expired evidence cannot authorize wording. |
| `Wszystkie niezmienniki stanu udowodnione` | Absolutny claim wymaga complete-path proof, którego nie wolno domniemywać. | `Invariants: BOUNDED / PARTIAL; SEE FORMAL EXECUTION COVERAGE` | Explicit complete-path formal evidence; generic category record is not enough. | `lib/security/evidence/claim-audit-blocker.ts` | Absolute all-invariants wording is rewritten. |
| `Full SMT Z3 Solver Verification` | Solver wording bez wykonania i receipt jest overclaimem. | `FORMAL VERIFICATION: NOT VERIFIED FOR THIS SCOPE` | `PASS` + `FORMALLY_PROVEN` + Z3/CVC5/SMT solver provenance for the exact scope | `lib/security/evidence/claim-audit-blocker.ts` | `NOT_RUN`, `FAIL`, `UNKNOWN`, generic `PASS` do not authorize. |
| `Multisig 3-of-5` | Brak zweryfikowanego exact on-chain result. | `Multisig: THRESHOLD UNKNOWN [NO VERIFIED ON-CHAIN RESULT]` | `PASS` `ACCESS_CONTROL` evidence bound to the exact contract | `lib/security/evidence/claim-audit-blocker.ts` | No inferred threshold. |
| `Timelock 48h` | Brak zweryfikowanego exact on-chain result. | `Timelock: DELAY UNKNOWN [NO VERIFIED ON-CHAIN RESULT]` | `PASS` `ACCESS_CONTROL` evidence bound to the exact contract | `lib/security/evidence/claim-audit-blocker.ts` | No inferred delay. |
| `100% SECURE` | Żaden bounded audit nie daje absolutnej gwarancji bezpieczeństwa. | `ASSESSMENT: BOUNDED SECURITY ANALYSIS` | Not evidence-upgradable into an absolute claim. | `lib/security/evidence/claim-audit-blocker.ts` | Always rewritten. |
| `HUMAN AUDITED` / `HUMAN REVIEWED` | Automated pipeline nie może sam potwierdzić human review. | `HUMAN REVIEW: NOT VERIFIED` | `PASS` + `HUMAN_VERIFIED` + `reviewerId` + `reviewStatus=CONFIRMED` | `lib/security/evidence/claim-audit-blocker.ts` | `NOT_RUN` human record is explicitly insufficient. |
| `Direct L3/SIP` | Public/derived data is not a licensed direct feed. | `Market Data Source: DIRECT L3/SIP NOT VERIFIED` | Fresh `PASS` market evidence identifying SIP/ITCH/OUCH/L3 source | `lib/security/evidence/claim-audit-blocker.ts` | Provider/category presence alone is insufficient. |
| `Best Execution PASS` | Requires exact execution-routing evidence. | `Best Execution: NOT VERIFIED FOR THIS SCOPE` | Fresh `PASS` execution/market evidence for the exact scope | `lib/security/evidence/claim-audit-blocker.ts` | Generic market-data evidence is not enough by itself. |
| `Zero Risk` / `Bug-Free Guarantee` | Absolute absence cannot be guaranteed. | residual-risk / bounded-assurance wording | Not evidence-upgradable into an absolute claim. | `lib/security/evidence/claim-audit-blocker.ts` | Always rewritten. |

---

## 2. R10 SELF-CORRECTION: CLAIMAUDITBLOCKER BUG

The previous implementation created a set of valid `PASS` evidence IDs, but did not use it when authorizing claims. Instead it checked whether **any** evidence record existed in the required category.

That meant a record such as:

```text
category = FORMAL
status = NOT_RUN
```

could satisfy the category-presence test and allow a claim to be marked `VERIFIED`.

### R10 correction

`lib/security/evidence/claim-audit-blocker.ts` now requires:

1. exact required evidence category,
2. `status === PASS`,
3. additional method/provenance constraints for strong claims where applicable.

Examples:
- formal solver wording: `PASS + FORMALLY_PROVEN + solver provenance`,
- human review: `PASS + HUMAN_VERIFIED + reviewerId + CONFIRMED`,
- RFC 3161: `PASS + OBSERVED + external TSA/RFC3161 token provenance`.

Regression:
`scripts/r10/test-claim-audit-blocker-evidence-status.ts`

---

## 3. CURRENT AUTHORITY RULE

This matrix does **not** declare the release fully remediated.

A claim is current only when:
- the exact release source is known,
- the relevant test is executed against that release,
- required evidence is current and scope-bound,
- regenerated customer output is re-audited.

R9 historical findings remain historical facts and are not erased by R10 remediation.
