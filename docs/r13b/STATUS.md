# R13B security checkpoint — NOT a product release

Parent: `9d365b390c1a4b1cf46eaacdf463091bea79e222` (PR #85). This is the **remote main-derived R13 line**, not the missing local R12G application. Do not equate it with R12G+R13 working source. No UI, CSS, typography, assets or PDF renderer changes.

## Completed before commit
- Recovered original Actions artifact 10423808493, SHA-256 `9e8c884523ebd0ae0439eac7554ab115e0e34e8e89ad6c4c9b2c3225f68e3683`.
- Re-ran 20 original component tests: PASS.
- Frozen tests against original preview: 31/37 PASS, six failures (three array coercions and three uncaught SDK exception paths).
- Updated local component/handler/parser suite: 113/113 PASS under Node 22.16.0. Handlers are executed from actual TypeScript source with ONLY the external Supabase SDK substituted. This is synthetic unit testing, not full TypeScript checking, real tenant tests or payments.
- Applied remote migration `20260916010416_r13b_restrict_finalizer_and_pin_methodology_search_path`: anonymous and ordinary authenticated execution of the SECURITY DEFINER finalizer is revoked; service_role access retained; constant-function search_path pinned. Verified after execution. No business row mutations by this migration.
- Preview function version 2 ACTIVE; bundle `5342693d251a629fb78c43aeefab6e61db365f2135cb4302990d0c4f78d48f7e`. Explicit deno.json fixed a failed first import-map deployment attempt.

## Not deployed / not qualified
- Legacy handler source is included as a tested candidate only. Deployment was BLOCKED by the tool safety layer. No alternate route or CI deployment is provided to bypass it. Legacy remains version 1 until an authorized deployment is separately completed. Its null-to-500 issue is not closed here.
- New HTTP tests are committed for remote execution; their outcomes must be read from the resulting run, not inferred from local tests.
- Vercel lists no teams; project listing for velmere123 failed. No full app preview.
- Stripe connector exposes only LIVE. Zero new transactions, checkout sessions, refunds or test payments.
- No current full R12G source archive in this session; no integrated build, 9-product E2E, new PDFs, legal/provider-rights evidence, backup restore or independent reviewers.
- Finalizer hardening does not retrospectively validate ledger contents and does not add cryptographic provider evidence verification.

`commercialReadyRows = 0`; product verdict **NO_GO**. Historical R12G ratings are not new R13B qualifications.
