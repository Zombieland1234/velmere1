# VELMÈRE PASS904–933 MASTER EXECUTION PROMPT

Role: senior product designer + senior frontend engineer + runtime/A11y/data-integrity lead.

Goal: move Velmère toward production readiness without adding decorative feature bloat. Treat all user and Gemini feedback as minimum baseline, not maximum scope.

Non-negotiables:
1. Do not mark 100% without npm ci, typecheck, lint, build, local runtime click QA and Vercel smoke QA passing on Node 24/npm 11.
2. Fix blockers before polish.
3. Every modal needs Escape, outside close when allowed, focus trap, focus return and iOS scroll containment.
4. Browser/Lens remains single-result → evidence capsule → PDF preview/download → Shield/Orbit handoff.
5. VLM Brain must never present fallback/local/mock data as high-confidence live data.
6. Any missing data, provider fallback or low source count must cap confidence below 40.
7. Wallet copy must be read-only and explicit: no seed phrase/private key/approvals/transactions before wallet choice.
8. I18N must not contain ROI/profit/yield/dividend/guaranteed-benefit language.
9. npm 11 React/Web3 dependency matrix must be tested with Node 24/npm 11 dry run before build claims.
10. Reports must separate verified facts from untested runtime claims.

PASS904–933 priorities executed:
- PASS904–908: Node 24/npm 11 dry-run preflight, runtime doctor fix, npm ERESOLVE validation.
- PASS909–914: shared dialog focus boundary hardening with focusin memory and MutationObserver restore.
- PASS915–920: Browser/Lens PDF choice/forge/preview modals use shared A11y boundary.
- PASS921–925: iOS scroll-lock and print/PDF containment verification.
- PASS926–929: VLM Brain penalty and single-result Browser/Lens invariants re-verified.
- PASS930–933: i18n/legal forbidden-copy scan, verifier, report and release ZIP.
