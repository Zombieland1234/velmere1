# R13C Supabase RLS-without-policy review — 2026-09-16

Scope: all 25 current Supabase Advisor `rls_enabled_no_policy` INFO findings in project `yljjyowcvjgjcamffnvd`.

## Live result

All 25 tables have RLS enabled and zero policies. Live privilege checks show:

- **0 / 25** allow any `SELECT`, `INSERT`, `UPDATE` or `DELETE` to `anon`;
- **0 / 25** allow any `SELECT`, `INSERT`, `UPDATE` or `DELETE` to `authenticated`;
- all 15 affected tables in `public` are intentionally server/service-facing; `service_role` has DML there;
- the 10 affected `velmere_private` tables have no browser DML grants, and the `velmere_private` schema itself has no `USAGE` grant to `anon` or `authenticated`;
- absence of a policy therefore operates as an explicit **deny-all browser boundary**, not as an allow-all condition.

## Classification

`INTENTIONAL_DENY_ALL_OR_SERVER_ONLY` for the current 25 Advisor rows.

Do not create permissive policies solely to clear the INFO lint. Doing so would weaken the current boundary.

## Public tables in this set

- `velmere_account_supabase_subject_binding_requests`
- `velmere_audit_basic_report_backups`
- `velmere_audit_case_status_history`
- `velmere_audit_intake_cases`
- `velmere_audit_review_orchestration`
- `velmere_auth_security_alerts`
- `velmere_auth_security_events`
- `velmere_auth_session_families`
- `velmere_durable_computation_jobs`
- `velmere_r7_audit_server_capability`
- `velmere_r7_authority_bind_receipts`
- `velmere_r7_customer_final_ledger`
- `velmere_r7_paid_value_final_ledger`
- `velmere_r7_product_e2e_evidence`
- `velmere_risk_history_events`

## Private tables in this set

- `r7_browser_authenticated_rpc_rate_limits`
- `r7_browser_paid_entitlements`
- `r7_browser_pro_diagnostics`
- `r7_component_authority`
- `r7_customer_final_registry`
- `r7_entitlement_oidc_jti_consumptions`
- `r7_paid_value_transition_registry`
- `r7_risk_history_public_rate_limits`
- `r7_risk_v5_e2e_evidence_records`
- `r7_source_authority_history`

## Remaining acceptance requirement

This classification should be rechecked after future migrations. A table moves to `FAIL` if browser DML is granted without an intentional, tested policy/function boundary.

Truth boundary: this is a live privilege/RLS metadata observation, not a claim that every privileged server function accessing these tables is independently safe. Privileged functions are reviewed separately.
