# R13C Supabase SECURITY DEFINER review — 2026-09-16

Scope: the seven current Supabase Advisor `0029_authenticated_security_definer_function_executable` findings in project `yljjyowcvjgjcamffnvd`.

This is a live metadata/code-shape review, not a claim that arbitrary authenticated execution is safe. No grants were changed by this review.

## Shared live facts

- all reviewed functions are owned by `postgres` and are `SECURITY DEFINER`;
- all reviewed functions have an explicit function `search_path`;
- `anon` has **no EXECUTE** on every reviewed callable overload;
- historical overloads without the newer server capability are not executable by `authenticated` or `service_role` where such overloads still exist;
- Supabase lint 0029 is intentionally conservative: an authenticated-callable definer can be legitimate only when the operation is deliberately per-user and strictly validates scope/input.

## Findings

| Function | Authenticated | Guards observed in live definition | R13C classification |
|---|---:|---|---|
| `velmere_claim_current_account_durable_computation(..., p_server_capability)` | yes | `auth.uid()`, server capability assertion, active account binding, authenticated RPC budget | `INTENTIONAL_WITH_GUARDS` |
| `velmere_complete_current_account_durable_computation(..., p_server_capability)` | yes | `auth.uid()`, server capability assertion, active account binding, job ownership/integrity checks | `INTENTIONAL_WITH_GUARDS` |
| `velmere_current_active_session_account_id()` | yes | `auth.uid()`, JWT `session_id`, active `auth.sessions` lookup, subject→account binding; returns only current account id | `INTENTIONAL_PER_USER_READ` |
| `velmere_fail_current_account_durable_computation(..., p_server_capability)` | yes | `auth.uid()`, server capability assertion, active account binding, job ownership checks | `INTENTIONAL_WITH_GUARDS` |
| `velmere_r7_shield_pro_has_paid_entitlement_v1(p_tier)` | yes | `auth.uid()`, entitlement event ownership, expiry/revoke checks | `INTENTIONAL_PER_USER_READ` |
| `velmere_r7_shield_pro_paid_workspace_v1(...)` | yes | `auth.uid()`, tier/locale/operation validation, paid entitlement check, account-owned workspace lookup | `INTENTIONAL_PER_USER_OPERATION` |
| `velmere_store_current_account_customer_artifact_pdf_bundle_v1(..., p_server_capability)` | yes | `auth.uid()`, server capability assertion, active session/account binding, payload/PDF size and scope checks, authenticated RPC budget | `INTENTIONAL_WITH_GUARDS` |

## Decision

Do **not** revoke these seven functions merely to make the Advisor dashboard green. That would break customer/server flows without demonstrating a security improvement.

Before production `GO`, keep these functions covered by adversarial RPC tests for:

- missing/invalid JWT;
- wrong subject/account;
- missing/invalid server capability where applicable;
- cross-account object IDs;
- invalid tier/locale/operation;
- revoked/expired entitlement;
- oversized/malformed payload;
- rate-limit exhaustion where applicable.

If any function later loses its per-user/capability guard, the classification must revert to `FAIL` and `EXECUTE` should be revoked or the function moved out of the exposed API schema.

## Remaining unrelated Supabase blockers

- leaked-password protection remains disabled in Auth;
- Advisor still reports RLS-enabled tables without policies; each must be reconciled against service-role-only design and live grants rather than silenced wholesale;
- historical/diagnostic Edge Functions with `verify_jwt=false` require a separate reachability/retirement review.

Truth boundary: this file records observed live privilege metadata and structural guards. It is not a penetration test, independent security certification, or proof that every internal code path is exploit-free.
