#!/usr/bin/env node
import fs from "node:fs";

const ui = fs.readFileSync("components/security/SecurityAuditsCleanPage.tsx", "utf8");
const api = fs.readFileSync("lib/server/security-route-modules/audit-intake.ts", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(ui.includes('nextAction?: "basic_prescreen_queue" | "verify_account_entitlement_before_analysis"'), "intake_next_action_type_missing");
assert(ui.includes('chainName: selectedChainId === "56" ? "BSC"'), "ui_bsc_canonical_name_missing");
assert(!ui.includes('chainName: selectedChainId === "1" ? "Ethereum Mainnet" : selectedChainId === "42161" ? "Arbitrum One" : selectedChainId === "137" ? "Polygon POS" : "BNB Smart Chain (BSC)"'), "legacy_bsc_label_still_sent_to_api");

const authIdx = ui.indexOf("const basicAnalysisAuthorized =");
const redirectGuardIdx = ui.indexOf("if (basicAnalysisAuthorized)", authIdx);
const redirectIdx = ui.indexOf("window.location.assign(", authIdx);
const paywallIdx = ui.indexOf("if (tierToRun !== \"basic\") setAuditPaywallModal(tierToRun);", authIdx);
assert(authIdx >= 0, "basic_analysis_authorization_guard_missing");
assert(redirectGuardIdx > authIdx && redirectIdx > redirectGuardIdx, "report_redirect_not_guarded_by_basic_server_authorization");
assert(paywallIdx > redirectIdx, "paid_intake_does_not_return_to_paywall");
assert(ui.includes('payload.nextAction === "basic_prescreen_queue"'), "server_next_action_not_required_for_redirect");

assert(api.includes('nextAction:\n        result.record.status === "queued_basic_prescreen"'), "server_next_action_contract_missing");
assert(api.includes('? "basic_prescreen_queue"\n          : "verify_account_entitlement_before_analysis"'), "server_paid_next_action_not_fail_closed");
assert(api.includes('requiredChain: { chainId: "56", chainName: "BSC" }'), "server_bsc_canonical_contract_missing");

console.log(JSON.stringify({ status: "PASS", checks: 10 }, null, 2));
