# VELMÈRE — HISTORICAL RELEASE-GATE RECORD

**Document Identifier:** `VLM-DOC-RELEASE-GATE-FINAL-V1`  
**Status:** `SUPERSEDED_HISTORICAL_RECORD`  
**Release authority:** **NONE**  
**R10 release credit:** **0**

> This file is retained only to preserve historical context. Its previous release verdict and production-readiness language are not current Velmère claims and MUST NOT be used to authorize, market, sell, deploy, or certify R10 or any later release.

## Why this record is superseded

The earlier version of this document asserted broad whole-platform PASS states, live-provider readiness, zero critical/high defects, complete customer journeys, Human Review execution, and production/commercial readiness. Those statements were not bound to the exact current release by the evidence standard now required for R10.

R10 uses a stricter rule:

- **NO CURRENT EXACT-SCOPE EVIDENCE → NO CURRENT VERIFIED CLAIM.**
- A historical PASS does not authorize a descendant release.
- Local file hashes prove integrity only; they do not prove audit-content correctness.
- A local signature is not an RFC 3161 timestamp or external trust authority.
- Human Review is not executed unless a confirmed Human+ review receipt exists for the exact Smart Contract audit.
- Live-provider readiness is not established by adapter code or API-key presence alone; it requires current live receipts, provenance/freshness evidence, and the applicable customer-use rights record.
- Static RLS/auth checks do not replace dynamic multi-tenant staging evidence.
- Production readiness requires the exact-runtime build, current authority bindings, current release gates, and zero unresolved release-blocking P0 findings.

## Current authority path

The current R10 candidate authority reset is defined by `config/r10/authority-genesis.json`.

It intentionally records:

- historical chain status: `INCOMPLETE`;
- historical manifest reconstruction: `false`;
- candidate status: `CANDIDATE_NOT_RELEASE_AUTHORITY`;
- candidate release eligibility: `false`.

The R9 artifact SHA may be used as migration input, but it does not confer release authority on R10.

## Current release status

This historical document does **not** declare a current release status.

The current status must be derived only from machine-readable R10 receipts produced by the active gates for the exact source/release artifact. Until final source, manifest and release-ZIP bindings exist and all required gates pass, the release remains **NOT AUTHORIZED BY THIS DOCUMENT**.

## Historical preservation rule

Do not restore the previous certification wording into active release documentation. If historical wording is needed for investigation, recover it from Git history and label it explicitly as historical evidence rather than current product truth.
