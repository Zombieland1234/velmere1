# VELMÈRE PRICING & COMMERCIAL TRUTH — R10 CANDIDATE

**Document status:** `R10_CANDIDATE_COMMERCIAL_TRUTH`  
**Release authority:** none  
**Payment activation authority:** none  
**Purpose:** define what a tier may promise without upgrading unverified capabilities into customer claims.

## Commercial truth boundary

Pricing does not create capability. A feature may be described as available only when the exact customer-facing path has the required entitlement, evidence, runtime and provider-rights receipts.

Current R10 rules:

- API access or adapter code alone does not establish customer-facing live-provider readiness.
- A local SHA-256 digest proves file integrity only.
- A local Ed25519 report signature is a local integrity attestation, not an external TSA timestamp or content certification.
- Formal verification is not included or claimed unless formal execution evidence exists for the exact audit scope.
- Human review is not included by default in any tier.
- Paid checkout remains stop-sell / unavailable until the product-level payment and fulfillment gates authorize it.

## Security Audit tiers

| Tier | Automated product scope | Human+ | Customer claim rule |
| --- | --- | --- | --- |
| Basic | bounded automated Smart Contract screening and the evidence exposed by the current release | Not available | only capabilities with current machine-readable evidence may be described as executed |
| Pro | deeper automated Smart Contract analysis than Basic where the current release enables it | Not available | no Human Review or formal-proof claim without exact-scope evidence |
| Advanced | deepest automated Smart Contract analysis enabled by the current release | **Optional add-on only** | Human+ remains `NOT_EXECUTED` until a confirmed review receipt is bound to the exact audit |

### Human+ rule

Human+ is an optional service for **Advanced Smart Contract audits only**. It is not part of Shield, Real Markets, Browser, or the default Advanced Smart Contract output.

A report may say Human Review was executed only when all required review evidence is present for that exact audit, including the reviewer identity and a confirmed review status. Before that point, the customer-visible state must remain equivalent to `HUMAN REVIEW: NOT VERIFIED / NOT EXECUTED`.

The existence of a queue, UI button, entitlement, provider relationship, or pricing line is not evidence that a review occurred.

## Formal-analysis rule

No tier promises “FORMAL SOLVER STATUS REQUIRES EXACT-SCOPE RECEIPT,” “all invariants proven,” or equivalent formal-verification language by default.

If a future release executes a formal solver for the exact scope, the claim must be derived from the corresponding formal evidence receipt, including solver/method provenance and coverage. Otherwise the customer-facing state remains `FORMAL VERIFICATION: NOT VERIFIED FOR THIS SCOPE` or the more specific execution state produced by the evidence system.

## Shield and Real Markets

Tier names may change analysis depth, history, visualization, export, or workflow features. They must not change the identity of the underlying asset or instrument.

For Real Markets:

- canonical instrument identity is tier-independent;
- spot/physical descriptions must not silently point to futures identifiers;
- regulatory jurisdiction is instrument-specific;
- provider identity, freshness and live status require observed receipts;
- customer display/derived-analysis use is governed by the exact provider rights applicable to that use case.

## Provider commercial-use rule

An API key is technical access, not by itself a commercial-rights receipt. Conversely, Velmère does not require raw-data redistribution rights when it does not redistribute the raw feed.

The relevant rights decision is the exact Velmère use case, such as:

`provider data → Velmère analysis/derived risk information → customer report/UI`

Before a provider-dependent feature is marked customer-runtime-ready, the evidence pack must document the applicable rights for that use, including any display, derived-data, caching, retention, attribution and redistribution restrictions.

## Pricing values

Historical documents contained example price points such as `$0 / $39 / $99` and `0 / 149 / 399 PLN`. This R10 truth document does not authorize those amounts for live checkout.

Price display and payment activation are separate decisions:

1. a displayed price must match the current SKU configuration;
2. the feature set behind that SKU must be evidence-backed;
3. checkout/entitlement/webhook paths must pass the current payment gates;
4. fulfillment must be available for the purchased scope;
5. stop-sell remains active when any mandatory release condition is not met.

## Current candidate status

This document defines truthful commercial semantics only. It does not certify production readiness, provider rights, Human+ execution, payment readiness, or release eligibility.

Final commercial activation requires the authoritative R10 release receipts for the exact packaged release.
