# PASS4818 — Code-only product completion runbook

## Purpose

PASS4818 is deliberately limited to code-only product truth. It does not execute or claim staging, production, real-provider, Stripe, Supabase, KMS/HSM, incident, chaos or LIVE evidence.

The pass closes four concrete product gaps:

1. customer-facing source evidence must be bound to the actual normalized response content;
2. Shield and Real Markets must distinguish requested tier from the strongest tier that automation can honestly deliver;
3. an Advanced purchase must never impersonate a completed human review;
4. the downloadable PDF must be a deterministic replay of the same canonical customer report payload.

Visual files remain frozen.

## Required environment for the final production build

- Node `24.18.0`;
- npm `11.16.0`;
- dependencies installed using the committed lockfile;
- server-only render-token secrets configured;
- no token secret exposed to browser code.

PASS4818 was locally checked on Node `22.16.0`. The targeted typechecks and parser gate are valid code-only evidence, but they do not replace the required Node 24 full build.

## Configuration

Configure server-side secrets:

- `VELMERE_CUSTOMER_REPORT_RENDER_TOKEN_SECRET_CURRENT` — at least 32 characters;
- `VELMERE_CUSTOMER_REPORT_RENDER_TOKEN_KEY_ID`;
- `VELMERE_CUSTOMER_REPORT_RENDER_TOKEN_SECRET_PREVIOUS` during rotation;
- `VELMERE_CUSTOMER_REPORT_RENDER_TOKEN_PREVIOUS_KEY_ID` during rotation.

Production must fail closed if no current key is present. The development fallback derived from the provider-receipt secret is disabled in production.

## Code-only verification commands

Run from the project root:

```bash
npm run verify:pass4818:static
npm run test:pass4818:product
npm run verify:pass4818:pdf-physical
npm run typecheck:pass4818:product-core
npm run typecheck:pass4818:routes
npm run verify:pass4818
```

The one-shot verifies:

- 68 static architecture/product assertions;
- 12 PASS4818 product tests;
- a physical A4 PDF through `pdfinfo`, `pdftotext` and Ghostscript;
- two targeted semantic TypeScript projects;
- PASS4807 evidence regressions;
- PASS4808 render and account-download regressions;
- all non-archive TypeScript/TSX files through the parser gate.

## Shield report acceptance rules

A provider name or registry entry is not evidence. A receipt contributes to paid readiness only when all of the following are true:

- provider result state is `confirmed`;
- asset identity is matched;
- observation is fresh;
- normalized response content has a valid SHA-256 hash;
- the receipt is marked commercially eligible;
- the upstream is independent from other counted upstreams.

`stressTestExecuted` and `evidenceLedgerPresent` must reflect actual code-path evidence. Tier selection, provider labels and source registry membership must not set them to true.

For an Advanced request without a trusted payload-bound manual-review receipt:

- the requested tier remains Advanced for entitlement and order history;
- automation may return only the strongest eligible Pro report;
- the Advanced appendix remains locked;
- the response explicitly states that payment does not prove review completion.

## Real Markets report acceptance rules

Each upstream observation must bind:

- requested symbol;
- resolved symbol;
- upstream family;
- source timestamp;
- normalized quote values;
- response-content hash;
- freshness and eligibility state.

Yahoo and Stooq are separate upstream roots only when both actual responses are present and both resolve the requested symbol. Two adapter labels pointing at one response do not create quorum.

Real Markets Pro requires at least two independent, fresh, content-bound upstreams plus the remaining coverage and entitlement gates. Advanced requires a stronger evidence threshold and a verified human-review boundary; otherwise a Pro fallback is delivered.

## PDF delivery contract

The report route returns a short-lived signed render token. The token binds:

- full canonical report payload;
- requested and delivered tiers;
- account hash for paid reports;
- payload digest;
- deterministic page-plan digest;
- exact PDF SHA-256;
- exact byte length;
- page count;
- key ID, issue time and expiry.

The PDF endpoint must:

1. reject missing, malformed, expired or incorrectly signed tokens;
2. verify account binding for paid reports;
3. verify the appropriate Shield/Real Markets entitlement using the requested paid tier;
4. rerender from the canonical payload;
5. compare every bound digest and byte count;
6. block an Advanced artifact without verified manual-review permission;
7. return private, non-cacheable PDF bytes with integrity headers.

Basic reports may use an unbound public token by design. Pro and Advanced tokens are account-bound.

## Physical PDF acceptance

The local artifact must pass:

- valid PDF parser;
- A4 page size;
- no encryption;
- no JavaScript;
- no form fields;
- successful Ghostscript page processing;
- text extraction retaining Polish characters, German characters and the euro sign.

This is physical document validation. It is not browser screenshot or pixel-perfect parity proof.

## Failure policy

The report must downgrade or block rather than fabricate value when:

- only registry labels exist;
- a content hash is absent;
- symbol identity differs;
- sources are stale;
- upstream roots are not independent;
- paid entitlement is missing;
- a report token is invalid;
- rerendered bytes differ;
- Advanced manual review is incomplete.

No fallback may silently claim that an unexecuted test was executed.

## Remaining code-only work after PASS4818

- finish browser-preview and PDF shared layout parity without changing the frozen visual design;
- remove remaining duplicate and legacy report/PDF paths after compatibility mapping is complete;
- finish the Advanced review-result resolver so a valid immutable review can unlock the appendix without route-specific branching;
- expand the offline asset matrix for all report families and tier-specific decision sections;
- run full Node 24 `npm ci`, semantic typecheck, ESLint and Next production build;
- continue modularizing oversized core files and remove dead/scaffold paths;
- audit every Basic/Pro/Advanced field for measurable customer value.

LIVE work remains intentionally frozen until the code-only roadmap is complete.
