import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const DIGEST = /^(?:sha256:)?[a-f0-9]{64}$/iu;
const ADDRESS = /^0x[a-f0-9]{40}$/iu;
const CASE_REF = /^AUD-[A-Z0-9-]{8,64}$/u;
const RULE_ID = /^A17_[A-Z0-9_]{4,64}$/u;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const REQUIRED_RULE_TYPES = ["ADMIN_CHANGE", "PROXY_UPGRADE", "PAUSE_STATE", "SUPPLY_CHANGE", "LIQUIDITY_DROP", "ORACLE_DEVIATION"];

function stable(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
}
function sha256(value) { return `sha256:${createHash("sha256").update(value).digest("hex")}`; }
function digest(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!DIGEST.test(text)) return null;
  return text.startsWith("sha256:") ? text : `sha256:${text}`;
}
function insideRoot(root, relative, code) {
  if (typeof relative !== "string" || !relative.trim() || path.isAbsolute(relative)) throw new Error(code);
  const resolved = path.resolve(root, relative);
  const rel = path.relative(root, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) throw new Error(code);
  if (!existsSync(resolved) || !statSync(resolved).isFile()) throw new Error(`${code}_missing`);
  return resolved;
}

function validateCase(input) {
  const blockers = [];
  const add = (ok, code) => { if (!ok) blockers.push(code); };
  add(input?.schemaVersion === "velmere.pass35.audit-a8-monitoring-handoff-case.v1", "a8_monitoring_schema_invalid");
  add(["SYNTHETIC_OFFLINE", "CUSTOMER_SUPPLIED_UNVERIFIED", "CUSTOMER_SUPPLIED_VERIFIED"].includes(input?.inputClass), "a8_monitoring_input_class_invalid");
  add(CASE_REF.test(String(input?.caseRef ?? "")), "a8_monitoring_case_ref_invalid");
  add(ISO.test(String(input?.observedAt ?? "")), "a8_monitoring_observed_at_invalid");
  add(/^\d+$/u.test(String(input?.chainId ?? "")) && BigInt(input.chainId) > 0n, "a8_monitoring_chain_id_invalid");
  add(ADDRESS.test(String(input?.contractAddress ?? "")), "a8_monitoring_contract_address_invalid");
  for (const field of ["runtimeBytecodeSha256", "auditReportSha256", "monitoringProviderConfigurationSha256", "incidentPlaybookRootSha256", "customerHandoffSha256"]) {
    add(digest(input?.[field]) !== null, `a8_monitoring_${field}_invalid`);
  }
  if (input?.providerCommercialRightsEvidenceSha256 != null) add(digest(input.providerCommercialRightsEvidenceSha256) !== null, "a8_monitoring_provider_rights_invalid");
  const rules = Array.isArray(input?.rules) ? input.rules : [];
  add(rules.length >= REQUIRED_RULE_TYPES.length && rules.length <= 64, "a8_monitoring_rule_count_invalid");
  add(new Set(rules.map((row) => row?.ruleId)).size === rules.length, "a8_monitoring_rule_duplicate_id");
  for (const type of REQUIRED_RULE_TYPES) add(rules.some((row) => row?.type === type), `a8_monitoring_required_rule_missing:${type}`);
  for (const row of rules) {
    add(RULE_ID.test(String(row?.ruleId ?? "")), "a8_monitoring_rule_id_invalid");
    add(REQUIRED_RULE_TYPES.includes(row?.type), "a8_monitoring_rule_type_invalid");
    add(["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(row?.severity), "a8_monitoring_rule_severity_invalid");
    add(Number.isSafeInteger(row?.maxDetectionDelaySec) && row.maxDetectionDelaySec >= 15 && row.maxDetectionDelaySec <= 86400, "a8_monitoring_detection_delay_invalid");
    add(typeof row?.signal === "string" && row.signal.trim().length >= 6, "a8_monitoring_signal_invalid");
    add(typeof row?.condition === "string" && row.condition.trim().length >= 6, "a8_monitoring_condition_invalid");
    add(/^PB-[A-Z0-9-]{4,64}$/u.test(String(row?.responsePlaybookId ?? "")), "a8_monitoring_playbook_invalid");
    add(typeof row?.ownerRole === "string" && row.ownerRole.trim().length >= 3, "a8_monitoring_owner_invalid");
    add(typeof row?.customerCommunicationRequired === "boolean", "a8_monitoring_customer_communication_invalid");
  }
  return [...new Set(blockers)].sort();
}

export function executeMonitoringHandoffAdapter({ rootPath = process.cwd(), casePath, caseInput }) {
  const root = path.resolve(rootPath);
  const blockers = validateCase(caseInput);
  let caseFileSha256 = null;
  try {
    const absolute = insideRoot(root, casePath, "a8_monitoring_case_path_outside_root");
    const bytes = readFileSync(absolute);
    caseFileSha256 = sha256(bytes);
    const disk = JSON.parse(bytes.toString("utf8"));
    if (sha256(stable(disk)) !== sha256(stable(caseInput))) blockers.push("a8_monitoring_case_file_content_mismatch");
  } catch (error) { blockers.push(error instanceof Error ? error.message : String(error)); }
  if (caseInput?.inputClass === "CUSTOMER_SUPPLIED_VERIFIED") {
    if (!caseInput?.providerCommercialRightsEvidenceSha256) blockers.push("a8_monitoring_verified_case_provider_rights_missing");
    blockers.push("a8_monitoring_live_delivery_receipt_missing");
  }
  const uniqueBlockers = [...new Set(blockers)].sort();
  const rules = uniqueBlockers.length ? [] : [...caseInput.rules].map((row) => ({
    ruleId: row.ruleId,
    type: row.type,
    severity: row.severity,
    maxDetectionDelaySec: row.maxDetectionDelaySec,
    signalSha256: sha256(row.signal),
    conditionSha256: sha256(row.condition),
    responsePlaybookId: row.responsePlaybookId,
    ownerRole: row.ownerRole,
    customerCommunicationRequired: row.customerCommunicationRequired,
  })).sort((a, b) => a.ruleId.localeCompare(b.ruleId));
  const criticalRules = rules.filter((row) => row.severity === "CRITICAL").length;
  const communicationRules = rules.filter((row) => row.customerCommunicationRequired).length;
  const core = {
    schemaVersion: "velmere.pass35.audit-a8-monitoring-handoff-receipt.v1",
    familyId: "post_audit_monitoring_handoff",
    caseRef: caseInput?.caseRef ?? null,
    inputClass: caseInput?.inputClass ?? null,
    caseFileSha256,
    target: {
      chainId: String(caseInput?.chainId ?? ""),
      contractAddress: String(caseInput?.contractAddress ?? "").toLowerCase(),
      runtimeBytecodeSha256: digest(caseInput?.runtimeBytecodeSha256),
      auditReportSha256: digest(caseInput?.auditReportSha256),
    },
    handoffBindings: {
      monitoringProviderConfigurationSha256: digest(caseInput?.monitoringProviderConfigurationSha256),
      incidentPlaybookRootSha256: digest(caseInput?.incidentPlaybookRootSha256),
      customerHandoffSha256: digest(caseInput?.customerHandoffSha256),
      providerCommercialRightsEvidenceSha256: digest(caseInput?.providerCommercialRightsEvidenceSha256),
    },
    ruleCount: rules.length,
    criticalRuleCount: criticalRules,
    customerCommunicationRuleCount: communicationRules,
    rules,
    status: uniqueBlockers.length ? "BLOCKED" : "VERIFIED_LOCAL_MONITORING_HANDOFF",
    assuranceClass: "LOCAL_CONTRACT",
    liveMonitoringActive: false,
    alertDeliveryVerified: false,
    realCaseExecution: false,
    paidGateEligible: false,
    fullAuditClaimAllowed: false,
    promotionAllowed: false,
    blockers: uniqueBlockers,
    limitations: [
      "The fixture proves rule completeness, target binding and incident/customer handoff structure only.",
      "No live provider, delivered alert, on-call acknowledgement, pause/upgrade action or customer communication was executed.",
    ],
    truthBoundary: "A8 may prove the local A17 monitoring handoff contract only. It cannot claim live monitoring, incident response effectiveness, SLA compliance or paid lifecycle coverage.",
  };
  return { ...core, receiptSha256: sha256(stable(core)) };
}
