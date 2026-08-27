# VELMÈRE R7 — Browser/Audit Closure Checkpoint — 2026-08-27

## Truth counters

- Customer FINAL: **0/20** until an individual row crosses every exact gate.
- Paid Value FINAL: **0/10**.
- LIVE: **false**.
- STOP_SELL remains in force.

## Exact promoted Browser + Audit source target

Canonical candidate name: `R7_MERGED_CURRENT_SOURCE`

- full source aggregate SHA-256: `d3a95fb9f8b218e751d9a2d3b75bd2d36a766cff6497207a35156ff46318e1c0`
- full source manifest SHA-256: `b76d26819db32d5cd7eb17258d3c9c1bf4d6b1345c9df985b20e074786f7fd5f`
- execution file count: `3506`
- execution payload bytes: `63055068`
- execution aggregate SHA-256: `504d7d132d7634959eb5643902c5508b2faec954937f3a3a949120913a0fc6c5`
- execution manifest SHA-256: `cd07a81aa556ddb128c6d84e45b3ec752b8bbe0222e96abbf5816504c9bdcfd9`
- deterministic bundle SHA-256: `9154d6be2d62bc07cb786136fe0586b72bcef5e8afabb1e848de759a000d0190`
- package.json SHA-256: `384932e8183ff4ced7850556ee21bb7b71f9a86add02112a4e434bc09f457a61`
- package-lock SHA-256: `5924aa0d679ebd78bcd6da01815fdd4b6ff503db45b17697c00168c06af7de61`
- secret scan: `PASS_SECRETS_0`, receipt SHA-256 `3cf73d3b96b41cf876accc0e6229b0b79528f6a8797c94868ad53f12ee40af34`

Exact delta v4:

- patch bytes: `112009`
- patch SHA-256: `7f32287ca6a13ffb365bcf7eaa2e2b7e522f1316c64a7fb9033c2cd17f3634f0`
- gzip SHA-256: `920b9fb291384c317cc28662379af9ea463b7d07b4e767d620b8c83b0a2169ea`
- local reapply verification: **3510/3510 exact path bytes, 0 mismatches**
- patch receipt SHA-256: `f8ebec356391f46b308bd8b32beffccd7a554c29466d0309506eec3e6ac6e0de`

## Browser Basic — promoted-source E2E

Workflow: `R7 Browser Basic Promoted Successor Zero-Vercel E2E`

Successful run: `33027276183`

Verified receipt gates:

- exact promoted source bytes: PASS
- product hotfix applied during E2E: **false**
- real ECB search: PASS
- rights receipt: PASS
- Lens preview: PASS
- Basic PDF: PASS
- durable computation: **supabase**
- USER_A own durable read: PASS
- USER_B cross-account denial: PASS
- reconnect: PASS
- backup: PASS
- erase: PASS
- restore: PASS
- post-restore USER_A read: PASS
- post-restore USER_B denial: PASS
- restored PDF bytes: **byte-identical**
- service role in application: **false**
- Vercel used: **false**

No Customer FINAL credit is claimed here by itself. Browser Basic still requires canonical exact-Windows/source-authority closure before adjudication.

## Canonical Windows authority lane

Canonical runner v3:

- source bytes: `34222`
- source SHA-256: `3899f9dc9defe2c290771ab9b737334d8c5128e1328cd83f4e92dafd01639065`
- gzip SHA-256: `7db02ddb9d4221dbd8a608141da91dca7f54b4490744c1a7d4b45908387d9231`
- runner receipt SHA-256: `59056cc4623d49b124cd3a1f4057324c67aa64dfcf0073b88395d9a1313fb26d`
- final receipt bindings point to `r7-delta-v2/R7_DELTA_SUCCESSOR_PATCH_RECEIPT_V4.json` and `.github/workflows/r7-successor-v3-exact-windows.yml`.

Canonical run launched: `33027613419`.

A separate OIDC source-authority binder was added. It is designed to bind authority only after it independently verifies via GitHub API that a canonical v3 run is `completed/success`, has the exact branch/head SHA/run attempt, and that the workflow SHA matches the raw workflow at that head. Supabase service-role credentials remain inside Supabase Edge.

## Audit Basic — closure work completed so far

Database foundation:

- current intake fields + account-scoped request uniqueness
- append-only case status history
- private service-role orchestration
- BSC target identity guard
- worker claim/preflight/retry/dead-letter contracts
- immutable exact Basic PDF artifact table
- owner account-hash RLS
- atomic exact-PDF completion RPC

Runtime bug found and fixed:

- Audit worker RPCs used a search path that omitted the `extensions` schema containing `pgcrypto`.
- forward-only fix migration: `20260827000013_r7_audit_basic_pgcrypto_search_path_runtime_fix.sql`
- migration SHA-256: `2efdd7047ca3683633018b906e5b5db755f98ab70f59a90150a093d72220cea9`

Verified bounded DB evidence before this checkpoint:

- claim -> preflight -> retry_wait: PASS
- append-only history: PASS
- atomic completion with real PDF bytes: PASS
- exact PDF digest/record digest persistence: PASS
- direct UPDATE of immutable report: rejected
- direct DELETE of immutable report: rejected
- smoke transactions rolled back; no fake customer credit

Secure zero-Vercel Audit infrastructure deployed:

- separate 96-hex Audit server capability, not reused from Browser
- `r7-audit-basic-customer-bridge`
- real user JWT validation + `velmere_current_account_id` account binding
- service role remains inside Supabase Edge
- actions bounded to Basic/BSC customer case/report operations
- customer PDF integrity verification
- account-bound backup/erase/restore lifecycle
- `r7-audit-basic-e2e-oidc` creates ephemeral owner-authorized USER_A/USER_B and short-lived worker lease only for test runs
- no service-role secret returned to GitHub

Audit lifecycle database support added:

- exact report backup record
- controlled erase path while ordinary immutable UPDATE/DELETE remains forbidden
- exact restore with conflict detection and idempotence

Audit E2E workflows added:

- `R7 Audit Basic Bridge E2E`
- `R7 Audit Basic Lifecycle E2E`

They intentionally carry `customerFinalCredit=false`; secure storage/lifecycle proof is not the same as real audit findings/provider-rights/retest/customer-product completion.

## Audit next-source candidate prepared

Candidate-only patcher:

`diagnostic-current/patch-audit-basic-zero-vercel-app-route-candidate.mjs`

It prepares, without changing the current promoted Browser authority target:

- server-only Audit customer bridge client
- `/api/audit/basic/case` customer POST/GET route
- `/api/audit/basic/report` exact PDF GET + owner DELETE/backup-erasure route
- `/api/audit/basic/report/restore` owner restore route
- no service-role use in Next application code

This patch must be applied only to the next source successor and then pass TypeScript/lint/build/exact Windows/product E2E before any credit.

## Honest immediate order

1. canonical Windows v3 PASS evidence
2. GitHub-verified append-only source-authority bind
3. Browser Basic final adjudication; if all row-specific gates remain green, this is the first eligible `1/20`
4. Audit Basic lifecycle E2E result/fix as needed
5. integrate prepared Audit customer routes into the next exact source successor
6. real Audit Basic evidence -> findings -> retest -> immutable PDF -> customer readback with rights/currentness
7. Risk Indicator lawful customer-publishable evidence lane
8. continue rows until Customer FINAL `20/20`, then Paid Value `10/10`
