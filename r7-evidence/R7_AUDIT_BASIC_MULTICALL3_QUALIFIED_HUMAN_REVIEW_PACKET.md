# Velmère R7 — Audit Basic Qualified Human Review Packet

## Review identity — immutable scope

- Product row: **Audit Basic**
- Case: `AUD-REAL-MULTICALL3-56`
- Chain: BSC (`56`)
- Deployment: `0xca11bde05977b3631167028862be2a173976ca11`
- Exact deployed source SHA-256: `3f05fc95b3bfd3d41e96fa281e00a71302e35b8fff59f81f399a419cdb9f577e`
- Runtime SHA-256: `2756d7c52baee85cacb504f6ee1df7aad6809ac8d94a4a111d76991f90d36d6e`
- Source authority: Sourcify API v2 `exact_match` + fresh BSC `eth_getCode`
- Source license: MIT
- Compiler: Solidity `0.8.12+commit.f00d7308`, optimizer 10,000,000 runs, EVM London

This packet is deliberately narrow. Do not review current repository HEAD as a substitute for the exact deployed source above.

## Maintainer security boundary

The official Multicall3 repository states that the contract is **unaudited** and explicitly warns integrators to ensure it never holds funds after a transaction; the project notes that funds held by Multicall3 can be stolen. That upstream statement is treated here as project-maintainer business-logic/security context, **not** as an external security audit or as qualified review credit.

## Velmère technical evidence already completed

1. **Real target / rights / currentness** — BSC deployment + pinned MIT source authority; zero paid provider.
2. **Sourcify exact deployed evidence** — exact deployed source, ABI, compiler settings, runtime and transformation metadata.
3. **Compiler AST transport** — pinned solc 0.8.12 Standard JSON output; AST/IR/storage/bytecode evidence generated.
4. **Velmère local A01/A02** — structure/provenance passes; bytecode accepted after strict Solidity metadata handling in the preliminary real run.
5. **External analyzer family #1: Slither 0.11.6** — highlights `aggregate3Value` value-sending surface; does not confirm the local unchecked-call heuristic as a vulnerability.
6. **External analyzer family #2: Aderyn 0.6.8** — independently highlights ETH transfer without address checks on `aggregate3Value`; does not confirm the local unchecked-call heuristic.
7. **Mythril** — timed out and is explicitly **not counted** toward the two-family denominator.
8. **Exact-source behavioral reproduction** — value-bearing `allowFailure=true` failed subcall leaves the failed amount on Multicall3 while the outer transaction succeeds.
9. **Bounded remediation retest** — candidate guard prohibiting nonzero value together with `allowFailure=true` passes the focused regression set while preserving tested zero-value failure-tolerant behavior and successful value calls.
10. **Secure customer artifact bridge** — account-bound create/read/complete exact PDF, A/B isolation, service role internal to Supabase Edge.
11. **Formal Browser baseline** — Velmère Customer FINAL already has Browser Basic at `1/20`; Audit Basic review must not alter Browser evidence.

## Adjudicated detector signals

### A. Local `Unchecked low-level call result`

**AI-assisted classification:** False positive / informational.

Reason: the strict `aggregate` path stores the call result in `success` and immediately requires success. Failure-tolerant variants explicitly parameterize whether failure is accepted. Slither and Aderyn do not independently report the local heuristic as an unchecked-call vulnerability.

### B. Slither `arbitrary-send-eth` / Aderyn ETH-transfer warning

**AI-assisted classification:** generic high-risk surface evidence, not a separate vulnerability by itself.

Reason: arbitrary target/value forwarding is a core multicall capability. The customer-relevant issue is the separately reproduced retained-value behavior below.

## Confirmed finding requiring qualified human severity/business-logic approval

### `MC3-VALUE-RETENTION-ON-ALLOWED-FAILED-CALL`

**Working severity candidate:** Medium, with escalation to High if the separately bounded local-only retained-balance drain reproduction proves that an unrelated caller can spend the retained balance without matching value. Never infer or test that condition on the public BSC deployment.

**Affected surface:** `aggregate3Value(Call3Value[])`

**Confirmed behavior:**

- a subcall has nonzero `value`;
- `allowFailure=true`;
- target subcall reverts;
- the subcall value transfer reverts;
- the outer Multicall3 transaction can still succeed;
- that failed call's value remains on Multicall3;
- the audited ABI exposes no explicit withdraw/sweep/recover/rescue function.

**Demonstrated impact boundary:** caller fund retention/loss of access. The already-completed reproduction does **not** by itself prove third-party theft, privilege escalation or unauthorized transfer. Any higher-impact claim requires the separate bounded local exploitability evidence plus qualified human approval.

**Current-deployment balance context:** a non-zero balance was observed. Do not attribute that balance to this exact path; forced ETH and other causes remain possible.

### Bounded remediation candidate

```solidity
require(
    !(calli.allowFailure && val != 0),
    "Multicall3: value+allowFailure unsupported"
);
```

Remediation retest: **6/6 PASS** on the bounded exact-source local model. The deployed Multicall3 contract was not modified.

## Required qualified-human decisions

A reviewer must independently inspect the exact source and evidence above and answer all items below. Velmère must remain `WITHHELD` if any answer is missing.

- [ ] I reviewed the exact deployed source identified by SHA-256 `3f05fc95...f577e`, not a later repository HEAD.
- [ ] I reviewed `aggregate3Value` as architecture/business logic, not only detector output.
- [ ] I reviewed the failure-tolerant value semantics and their interaction with the project's stated "must not hold funds" security boundary.
- [ ] I reviewed the Slither and Aderyn raw outputs and agree they are supporting correlation rather than independent duplicates of the same finding.
- [ ] I reviewed the behavioral reproduction evidence.
- [ ] I reviewed the remediation and regression evidence.
- [ ] I explicitly approve the final finding state and severity.
- [ ] I confirm whether any higher-impact retained-balance drain claim is supported by the bounded local evidence; no public-chain exploit is required or permitted for this review.

## Reviewer decision

**Finding decision:** `CONFIRMED` / `DOWNGRADED` / `REJECTED`

**Approved severity:** `MEDIUM` / `HIGH` / `CRITICAL`

**Reviewer name:**

**Reviewer role:**

**Reviewer organization (optional):**

**Reviewer qualification / relevant experience:**

**Architecture/business-logic review notes:**

**Finding adjudication notes:**

**Reviewed at (UTC):**

### Required attestation

> I performed an independent human review of the exact deployed source and the evidence identified in this packet. I did not treat Velmère's AI-assisted adjudication as a substitute for my own architecture/business-logic and severity assessment. My decision and severity above represent my own qualified review.

Reviewer signature / approved identity mechanism:

---

## Machine-enforced handoff

Velmère's Supabase gate stores qualified reviews append-only and binds them to:

- exact chain/address;
- exact deployed source SHA;
- finding ID;
- fixed technical evidence fingerprint;
- approved severity;
- reviewer identity/role/qualification;
- attestation;
- review timestamp;
- immutable review digest.

Without a legitimate recorded review, Audit Basic must remain **not FINAL**, regardless of how many engineering checks pass.
