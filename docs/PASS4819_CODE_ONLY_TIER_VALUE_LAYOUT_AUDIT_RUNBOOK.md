# PASS4819 Code-Only Verification Runbook

LIVE and staging are out of scope.

## Required project environment

The project declares Node 24.18.0 and npm 11.16.0. The recorded local evidence
was produced on Node 22.16.0 and must not be described as a full production
build.

## Deterministic local checks

```bash
npm run verify:pass4819:static
npm run test:pass4819:product
npm run verify:pass4819:pdf-physical
npm run typecheck:pass4819:product-core
npm run typecheck:pass4819:routes
npm run verify:pass4819
```

## Product acceptance rules

- Pro must have unique Pro decision/evidence/action value.
- Entitlement never compensates for missing report value.
- Advanced requires a verified payload-bound review.
- Preview and PDF use one semantic layout digest.
- Audit paid readiness counts only confirmed exact-response, content-bound,
  independence-eligible lanes.
- Partial and request-bound lanes never count.
- Multiple adapters to one upstream never fake independence.

## Not covered

- full npm ci / lint / Next build;
- browser screenshot parity;
- real provider correctness;
- LIVE 50/50/150;
- real human review;
- staging or production services.
