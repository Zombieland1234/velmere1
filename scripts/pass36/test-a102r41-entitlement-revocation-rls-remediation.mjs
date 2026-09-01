#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const historicalPath = "supabase/migrations/20260625000001_2649_entitlement_revocation_ledger_adapter_rls.sql";
const repairPath = "supabase/migrations/20260801000001_a102r41_entitlement_revocation_ledger_rls_fail_closed.sql";
const normalize = (value) => value
  .replace(/--[^\n]*/gu, " ")
  .replace(/\s+/gu, " ")
  .trim()
  .toLowerCase();

function evaluate(sql) {
  const text = normalize(sql);
  const checks = {
    revokeTable: /revoke all on table public\.audit_entitlement_revocation_ledger from public, anon, authenticated;/u.test(text),
    revokeView: /revoke all on table public\.audit_entitlement_revocation_public_receipts from public, anon, authenticated;/u.test(text),
    dropView: /drop view if exists public\.audit_entitlement_revocation_public_receipts;/u.test(text),
    dropBroadPolicy: /drop policy if exists audit_entitlement_revocation_public_select on public\.audit_entitlement_revocation_ledger;/u.test(text),
    ownerPolicy: /create policy audit_entitlement_revocation_owner_select on public\.audit_entitlement_revocation_ledger for select to authenticated using \( account_id is not null and public\.velmere_current_account_id\(\) is not null and account_id = public\.velmere_current_account_id\(\) \);/u.test(text),
    authenticatedColumnsOnly: /grant select \( receipt_hash, report_id, entitlement_id, reason_class, status, safe_pdf_locked, duplicate_replay_denied, stale_replay_denied, created_at, updated_at \) on public\.audit_entitlement_revocation_ledger to authenticated;/u.test(text),
    noAnonGrant: !/grant select[^;]*(?:to|,)\s*anon(?:\s*[,;]|;)/u.test(text),
    noUsingTrue: !/using\s*\(\s*true\s*\)/u.test(text),
    noSensitiveAuthenticatedColumns: !/grant select \([^;]*(?:account_id|provider_event_hash|previous_receipt_hash|public_payload)[^;]*\) on public\.audit_entitlement_revocation_ledger to authenticated;/u.test(text),
  };
  return { checks, passed: Object.values(checks).every(Boolean) };
}

const historical = fs.readFileSync(path.join(root, historicalPath), "utf8");
const repair = fs.readFileSync(path.join(root, repairPath), "utf8");
const assertions = [];
const add = (id, passed, detail = null) => assertions.push({ id, passed: Boolean(passed), detail });

add("historical:exposure-physically-present", /grant select on public\.audit_entitlement_revocation_public_receipts to anon, authenticated;/iu.test(historical) && /using\s*\(\s*true\s*\)/iu.test(historical));
add("descendant:ordered-after-historical", repairPath.localeCompare(historicalPath, "en") > 0, { historicalPath, repairPath });
const canonical = evaluate(repair);
for (const [id, passed] of Object.entries(canonical.checks)) add(`repair:${id}`, passed);
add("repair:canonical-pass", canonical.passed, canonical.checks);

const mutations = [
  ["retain-public-view", repair.replace("drop view if exists public.audit_entitlement_revocation_public_receipts;", "")],
  ["retain-broad-policy", repair.replace("drop policy if exists audit_entitlement_revocation_public_select\n  on public.audit_entitlement_revocation_ledger;", "")],
  ["cross-tenant-using-true", repair.replace(/using \([\s\S]*?\n {2}\);/u, "using (true);")],
  ["anon-select", repair.replace("to authenticated;", "to authenticated, anon;")],
  ["leak-account-id", repair.replace("receipt_hash,", "account_id,\n  receipt_hash,")],
  ["drop-owner-binding", repair.replace(/and account_id = public\.velmere_current_account_id\(\)/u, "and account_id is not null")],
];
for (const [id, mutation] of mutations) add(`negative:${id}-rejected`, evaluate(mutation).passed === false);

const failed = assertions.filter((row) => !row.passed);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r41.entitlement-revocation-rls-remediation-test.v1",
  status: failed.length ? "FAIL_A102R41_ENTITLEMENT_REVOCATION_RLS" : "PASS_A102R41_ENTITLEMENT_REVOCATION_RLS_LOCAL_STATIC_NO_STAGING_CREDIT",
  checks: assertions.length,
  passed: assertions.length - failed.length,
  failed: failed.length,
  failures: failed,
  stagedTenantCasesExecuted: 0,
  truthBoundary: "Static SQL remediation and mutation-kill evidence only. Disposable staging must still prove anon denial, owner access and two-tenant cross-account denial before A96 credit.",
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
}, null, 2));
process.exit(failed.length ? 1 : 0);
