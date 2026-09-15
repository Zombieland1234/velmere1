# R13 infrastructure integration checkpoint — NOT QUALIFIED

No UI/UX or PDF-layout change is included. No production deployment or charge is authorized by this checkpoint. Public sale remains NO_GO.

There are two distinct source identities:

- Local application candidate: verified R12G working archive, SHA-256 `817466ecc440bbbf85dadf9c897a5ccced090ed16c191211a8b40720fccae286`, plus the R13 delta.
- This remote review branch: `main` at `76fbcdf104345338eac60c867602b28d1dbef754`, plus only reviewed R13 files. It is an integration carrier, **not a complete upload of R12G**. Its tests cannot qualify the local full application.

The historical R12G local SHA `ac4dfca9b4a57c1fd367a2206540bfbb3ab8ecf8` returned 404 when read from GitHub. Do not equate it with an upstream commit. Do not deploy this carrier as though it were R12G/R13 product code. Reconcile and import the full application without overwriting parallel UI work first.

Before modifying existing remote files, the read Git blobs matched the R12G bytes:

- `.gitignore`: `ff4986aa13f47265155f36329effb61743a257b7`
- `lib/checkout/runtime-payment-authority.ts`: `18466f485b452ff8e2088ded82b2661519f44ce3`
- `lib/stripe/server.ts`: `037881c381333f337094908b228e97869e16c66e`

The payment guard prevents inherited LIVE configuration from authorizing preview/development. Tests use synthetic strings and do not make Stripe transactions. Existing stop-sell gates remain active.

`/api/internal/r13/release` is preview-only, requires a separate diagnostics token and returns bounded platform identity. It is not an independent build attestation or a readiness certificate. It grants no product access.

The Actions job runs narrow backend tests and bounded, read-only infrastructure probes. Missing services or credentials produce BLOCKED and a nonzero exit code. An HTTP health response is not Auth, tenancy, purchase or export E2E. The probe never posts fabricated funnel events. Raw credentials and response bodies are not logged.

Observed access blockers: Vercel scope authorization rejected (403), Supabase SQL connection timed out despite ACTIVE_HEALTHY management status, connected Stripe account is LIVE-only, and PostHog has no verified product flow. None is silently converted to PASS.
