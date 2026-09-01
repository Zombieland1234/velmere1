import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

async function main() {
const checks: Array<{ id: string; pass: boolean; detail?: unknown }> = [];
function check(id: string, condition: unknown, detail?: unknown) {
  checks.push({ id, pass: Boolean(condition), detail });
}

const migrationPath = "supabase/migrations/20260821000003_v4_verify_continuous_publication_registry.sql";
const requiredFiles = [
  migrationPath,
  "lib/market-integrity/verify-dynamic-badge.ts",
  "app/api/verify/search/route.ts",
  "app/api/verify/badge/[publicProofId]/route.ts",
  "app/[locale]/verify/page.tsx",
] as const;

for (const path of requiredFiles) {
  check(`required_file:${path}`, existsSync(resolve(path)));
}

const sources = {
  migration: existsSync(resolve(migrationPath)) ? readFileSync(resolve(migrationPath), "utf8") : "",
  resolver: readFileSync(resolve("lib/market-integrity/public-proof-publication-resolver.ts"), "utf8"),
  operations: readFileSync(resolve("lib/db/supabase-rpc-operation-registry.ts"), "utf8"),
  proxy: readFileSync(resolve("proxy.ts"), "utf8"),
  badgeRoute: existsSync(resolve("app/api/verify/badge/[publicProofId]/route.ts"))
    ? readFileSync(resolve("app/api/verify/badge/[publicProofId]/route.ts"), "utf8")
    : "",
  searchRoute: existsSync(resolve("app/api/verify/search/route.ts"))
    ? readFileSync(resolve("app/api/verify/search/route.ts"), "utf8")
    : "",
  publicRecordUi: readFileSync(resolve("components/verify/PublicVerifyRecord.tsx"), "utf8"),
  publicRecordViewModel: readFileSync(resolve("lib/market-integrity/public-verify-record-view-model.ts"), "utf8"),
  searchUi: readFileSync(resolve("components/verify/VerifySearchClient.tsx"), "utf8"),
  accountProofUi: readFileSync(resolve("components/account/MarketActionReportsInboxClient.tsx"), "utf8"),
};

for (const marker of [
  "velmere_verify_publication_identities",
  "velmere_verify_publication_events",
  "velmere_append_verify_publication_event_v1",
  "velmere_resolve_verify_publication_exact_v1",
  "velmere_search_verify_publications_v1",
  "velmere_get_verify_publication_history_v1",
  "verify_publication_event_immutable",
  "MONITORING_UNAVAILABLE",
]) {
  check(`migration_marker:${marker}`, sources.migration.includes(marker));
}

check(
  "migration_tables_are_rls_locked",
  (sources.migration.match(/enable row level security/gu) ?? []).length >= 2,
);
check(
  "migration_tables_have_no_direct_service_role_grant",
  !/grant\s+(?:select|insert|update|delete|all)[^;]*velmere_verify_publication_(?:identities|events)[^;]*service_role/iu.test(sources.migration),
);
check(
  "migration_rpcs_are_service_role_only",
  (sources.migration.match(/grant execute on function public\.velmere_(?:append|resolve|search|get)_verify/gu) ?? []).length >= 4,
);
check(
  "resolver_uses_registered_rpc",
  sources.resolver.includes("runRegisteredServiceRoleRpc"),
);
check(
  "resolver_has_exact_identity_search",
  sources.resolver.includes("searchPublishedPublicProofs"),
);
check(
  "resolver_has_versioned_history",
  sources.resolver.includes("resolvePublishedPublicProofHistory"),
);
check(
  "registered_exact_resolver_rpc",
  sources.operations.includes("verify_publication_resolve_exact"),
);
check(
  "registered_append_rpc",
  sources.operations.includes("verify_publication_event_append"),
);
check(
  "proxy_no_longer_hard_rejects_all_verify_pages",
  sources.proxy.includes("if (!isCanonicalPublicMarketIntegrityProofPath(normalizedPath))")
    && sources.proxy.includes("allowPublicMarketIntegrityProofRoute(securedRequest)"),
);
check(
  "proxy_has_exact_verify_path_classifier",
  sources.proxy.includes("isCanonicalPublicMarketIntegrityProofPath"),
);
check("migration_rejects_stale_status_replay", sources.migration.includes("verify_status_replay_or_chain_conflict"));
check("migration_invalidates_material_change", sources.migration.includes("v_current_deployment_digest <> v_latest.audited_deployment_digest"));
check("migration_rejects_observation_regression", sources.migration.includes("verify_observation_regression"));
check("migration_expires_stale_green", sources.migration.includes("v_event.monitor_due_at <= p_now"));
check("migration_requires_explicit_visibility_event", sources.migration.includes("verify_visibility_requires_explicit_event"));
check("badge_route_is_no_store", sources.badgeRoute.includes('"cache-control": "no-store, private, max-age=0, must-revalidate"'));
check("badge_route_uses_server_projection", sources.badgeRoute.includes("resolvePublishedPublicProof(publicProofId)"));
check("search_route_is_bounded", sources.searchRoute.includes("limit: 30")
  && sources.searchRoute.includes("windowMs: 60_000")
  && sources.searchRoute.includes("canonicalizeVerifySearchInput"));
check("non_green_ui_marks_report_historical",
  sources.publicRecordUi.includes("view.report.contextHeading")
    && sources.publicRecordViewModel.includes("Historical report context")
    && sources.publicRecordViewModel.includes("!proof.reportCurrent"));
check("search_ui_does_not_call_non_green_report_private", sources.searchUi.includes("proof.reportCurrent")
  && sources.searchUi.includes("reportNotCurrent"));
check("account_ui_no_longer_synthesizes_public_proof_id", !sources.accountProofUi.includes("`pubidx-${entry.attestationId}"));
check("account_ui_requires_durable_registry_binding", sources.accountProofUi.includes('publicationRegistryAuthority === "velmere.verify-public-projection.v1"')
  && sources.accountProofUi.includes("WITHHELD_DURABLE_VERIFY_PUBLICATION_ROUTE"));

try {
  const boundary = await import("../../lib/market-integrity/public-proof-publication-resolver");
  const badgeModule = await import("../../lib/market-integrity/verify-dynamic-badge");
  const fixedNow = new Date("2026-08-21T12:30:00.000Z");
  const publicProofId = `pubidx-${"a".repeat(48)}`;
  const contractAddress = `0x${"a".repeat(40)}`;
  const digests = {
    report: "1".repeat(64),
    deployment: "2".repeat(64),
    head: "3".repeat(64),
    older: "4".repeat(64),
  };
  const generatedId = boundary.createVerifyPublicProofId(() => new Uint8Array(24).fill(0xab));
  check("public_proof_id_has_192_bits_of_opaque_entropy", generatedId === `pubidx-${"ab".repeat(24)}`, generatedId);
  const projection = {
    schemaVersion: "velmere.verify-public-projection.v1",
    publicProofId,
    visibility: "PUBLIC",
    currentStatus: "VERIFIED",
    riskStatus: "LOW_DETECTED_RISK",
    chainId: "56",
    contractAddress,
    projectName: "Durable fixture",
    reportTitle: "Exact deployment verification",
    publicSummary: "The exact deployment identity matches the current redacted audit publication.",
    auditVersion: 1,
    publicationVersion: 2,
    reportDigest: digests.report,
    currentDeploymentDigest: digests.deployment,
    lastCheckedAt: "2026-08-21T12:20:00.000Z",
    monitorDueAt: "2026-08-21T13:20:00.000Z",
    statusChangedAt: "2026-08-21T12:20:00.000Z",
    historyVisibility: "PUBLIC",
    headEventDigest: digests.head,
    canonicalPath: `/proof/market-integrity/${publicProofId}`,
    materialChangeDetected: false,
    monitoringCurrent: true,
    reportCurrent: true,
  } as const;

  const canonicalIdentity = boundary.canonicalizeVerifySearchInput({
    chainId: "56",
    contractAddress: contractAddress.toUpperCase().replace("0X", "0x"),
    limit: 1,
  });
  check("identity_input_canonicalizes_address", canonicalIdentity?.mode === "identity"
    && canonicalIdentity.contractAddress === contractAddress, canonicalIdentity);
  check("leading_zero_chain_rejected", boundary.canonicalizeVerifySearchInput({ chainId: "056", contractAddress }) === null);
  check("wrong_address_rejected", boundary.canonicalizeVerifySearchInput({ chainId: "56", contractAddress: "0x1234" }) === null);
  check("mixed_search_modes_rejected", boundary.canonicalizeVerifySearchInput({ chainId: "56", contractAddress, projectName: "Durable fixture" }) === null);

  const exactCalls: Array<{ operation: string; args?: Record<string, unknown> }> = [];
  const exactRpc = async (input: { operation: string; args?: Record<string, unknown> }) => {
    exactCalls.push(input);
    return { data: projection };
  };
  const exact = await boundary.resolvePublishedPublicProof(publicProofId, {
    rpc: exactRpc as never,
    now: () => fixedNow,
  });
  check("exact_rpc_projection_resolves", exact?.headEventDigest === digests.head, exact);
  check("exact_rpc_operation_registered", exactCalls[0]?.operation === "verify_publication_resolve_exact", exactCalls);

  const tampered = await boundary.resolvePublishedPublicProof(publicProofId, {
    rpc: (async () => ({ data: { ...projection, privateReportBody: "must-not-project" } })) as never,
    now: () => fixedNow,
  });
  check("extra_private_field_rejected", tampered === null, tampered);
  const stale = await boundary.resolvePublishedPublicProof(publicProofId, {
    rpc: (async () => ({ data: { ...projection, monitorDueAt: "2026-08-21T12:00:00.000Z" } })) as never,
    now: () => fixedNow,
  });
  check("stale_green_rejected_by_runtime", stale === null, stale);
  const unavailable = await boundary.resolvePublishedPublicProof(publicProofId, {
    rpc: (async () => ({ data: {
      ...projection,
      currentStatus: "MONITORING_UNAVAILABLE",
      riskStatus: "WITHHELD",
      reportDigest: null,
      monitorDueAt: "2026-08-21T12:00:00.000Z",
      monitoringCurrent: false,
      reportCurrent: false,
    } })) as never,
    now: () => fixedNow,
  });
  check("monitoring_failure_is_public_non_green", unavailable?.currentStatus === "MONITORING_UNAVAILABLE"
    && unavailable.monitoringCurrent === false
    && unavailable.reportCurrent === false
    && unavailable.reportDigest === null, unavailable);
  const staleReportReplay = await boundary.resolvePublishedPublicProof(publicProofId, {
    rpc: (async () => ({ data: {
      ...projection,
      currentStatus: "CHANGE_DETECTED",
      riskStatus: "WITHHELD",
      monitoringCurrent: false,
      materialChangeDetected: true,
      reportCurrent: false,
    } })) as never,
    now: () => fixedNow,
  });
  check("non_green_old_report_digest_replay_rejected", staleReportReplay === null, staleReportReplay);
  const { buildPublicVerifyRecordViewModel } = await import(
    "../../lib/market-integrity/public-verify-record-view-model"
  );
  const unavailableView = buildPublicVerifyRecordViewModel(unavailable as never, "technical");
  check("non_green_ui_view_model_renders_historical_not_current_boundary",
    unavailableView.report.historical === true
      && unavailableView.report.contextHeading?.includes("Historical report context")
      && unavailableView.report.contextBody?.includes("withheld from the current projection")
      && unavailableView.report.currentDigest === null
      && unavailableView.green === false,
    unavailableView);

  const identityResults = await boundary.searchPublishedPublicProofs({
    mode: "identity", chainId: "56", contractAddress, limit: 1,
  }, { rpc: (async () => ({ data: [projection] })) as never, now: () => fixedNow });
  check("exact_chain_address_search_resolves", identityResults.length === 1
    && identityResults[0].publicProofId === publicProofId, identityResults);
  const collisionResults = await boundary.searchPublishedPublicProofs({
    mode: "identity", chainId: "1", contractAddress, limit: 1,
  }, { rpc: (async () => ({ data: [projection] })) as never, now: () => fixedNow });
  check("wrong_chain_address_collision_rejected", collisionResults.length === 0, collisionResults);
  const unknownPrivateResults = await boundary.searchPublishedPublicProofs({
    mode: "identity", chainId: "56", contractAddress, limit: 1,
  }, { rpc: (async () => ({ data: [] })) as never, now: () => fixedNow });
  check("unknown_or_private_search_is_same_empty_projection", unknownPrivateResults.length === 0);

  const history = [
    {
      schemaVersion: "velmere.verify-public-history-entry.v1",
      publicProofId,
      publicationVersion: 2,
      auditVersion: 1,
      eventKind: "MONITOR_CHECK",
      status: "VERIFIED",
      riskStatus: "LOW_DETECTED_RISK",
      reportDigest: digests.report,
      currentDeploymentDigest: digests.deployment,
      checkedBlockNumber: "40000001",
      checkedBlockHash: `0x${"b".repeat(64)}`,
      checkedAt: "2026-08-21T12:20:00.000Z",
      monitorDueAt: "2026-08-21T13:20:00.000Z",
      eventAt: "2026-08-21T12:20:01.000Z",
      eventDigest: digests.head,
      previousEventDigest: digests.older,
      historicalReportVisibility: "PUBLIC",
    },
    {
      schemaVersion: "velmere.verify-public-history-entry.v1",
      publicProofId,
      publicationVersion: 1,
      auditVersion: 1,
      eventKind: "INITIAL_VERIFICATION",
      status: "VERIFIED",
      riskStatus: "LOW_DETECTED_RISK",
      reportDigest: digests.report,
      currentDeploymentDigest: digests.deployment,
      checkedBlockNumber: "40000000",
      checkedBlockHash: `0x${"c".repeat(64)}`,
      checkedAt: "2026-08-21T12:00:00.000Z",
      monitorDueAt: "2026-08-21T13:00:00.000Z",
      eventAt: "2026-08-21T12:00:01.000Z",
      eventDigest: digests.older,
      previousEventDigest: null,
      historicalReportVisibility: "PUBLIC",
    },
  ];
  const validHistory = await boundary.resolvePublishedPublicProofHistory(publicProofId, 50, {
    rpc: (async () => ({ data: history })) as never,
  });
  check("versioned_history_chain_resolves", validHistory.length === 2
    && validHistory[0].previousEventDigest === validHistory[1].eventDigest, validHistory);
  const brokenHistory = await boundary.resolvePublishedPublicProofHistory(publicProofId, 50, {
    rpc: (async () => ({ data: [{ ...history[0], previousEventDigest: "9".repeat(64) }, history[1]] })) as never,
  });
  check("history_chain_tamper_rejected", brokenHistory.length === 0, brokenHistory);

  let appendArgs: Record<string, unknown> | undefined;
  const appendReceipt = await boundary.appendVerifyPublicationEvent({
    idempotencyKey: "5".repeat(64),
    publicProofId,
    chainId: "56",
    contractAddress: contractAddress.toUpperCase().replace("0X", "0x"),
    eventKind: "INITIAL_VERIFICATION",
    visibility: "PUBLIC",
    projectName: "Durable fixture",
    reportTitle: "Exact deployment verification",
    publicSummary: "The exact deployment identity matches the current redacted audit publication.",
    riskStatus: "LOW_DETECTED_RISK",
    reportDigest: digests.report,
    deploymentDigest: digests.deployment,
    verificationReceiptDigest: "6".repeat(64),
    actorDigest: "7".repeat(64),
    checkedBlockNumber: "40000000",
    checkedBlockHash: `0x${"8".repeat(64)}`,
    checkedAt: "2026-08-21T12:00:00.000Z",
    monitoringTtlSeconds: 3600,
  }, { rpc: (async (input: { args?: Record<string, unknown> }) => {
    appendArgs = input.args;
    return { data: {
      schemaVersion: "velmere.verify-publication-append-receipt.v1",
      publicProofId,
      publicationVersion: 1,
      auditVersion: 1,
      currentStatus: "VERIFIED",
      visibility: "PUBLIC",
      eventDigest: digests.older,
      previousEventDigest: null,
      idempotent: false,
      eventAt: "2026-08-21T12:00:01.000Z",
    } };
  }) as never });
  check("append_uses_canonical_lowercase_address", appendArgs?.p_contract_address === contractAddress, appendArgs);
  check("append_receipt_is_strict", appendReceipt.currentStatus === "VERIFIED", appendReceipt);

  const badge = badgeModule.buildVerifyDynamicBadge({
    proof: { ...projection, projectName: "<unsafe-project-marker>" } as never,
    canonicalSiteOrigin: "https://verify.velmere.example",
  });
  check("badge_green_only_for_current_green_status", badge?.green === true, badge);
  check("badge_links_exact_canonical_page", badge?.canonicalUrl === `https://verify.velmere.example${projection.canonicalPath}`, badge);
  check("badge_does_not_project_project_controlled_text", Boolean(badge
    && !badge.svg.includes("unsafe-project-marker")
    && !badge.svg.includes("&lt;unsafe-project-marker&gt;")));
  check("badge_projects_registry_owned_risk_status", Boolean(badge
    && badge.svg.includes("RISK LOW DETECTED RISK")), badge);
  const unavailableBadge = badgeModule.buildVerifyDynamicBadge({
    proof: unavailable as never,
    canonicalSiteOrigin: "https://verify.velmere.example",
  });
  check("monitoring_unavailable_badge_never_green", unavailableBadge?.green === false
    && unavailableBadge.svg.includes("MONITORING UNAVAILABLE"), unavailableBadge);

  const proxyModule = await import("../../proxy");
  check("canonical_page_path_allowed", proxyModule.isCanonicalPublicMarketIntegrityProofPath(projection.canonicalPath));
  check("canonical_history_path_allowed", proxyModule.isCanonicalPublicMarketIntegrityProofPath(`${projection.canonicalPath}/audit-trail`));
  for (const invalidPath of [
    `${projection.canonicalPath}/extra`,
    `${projection.canonicalPath}/`,
    `/proof/market-integrity/${publicProofId.toUpperCase()}`,
    `/proof/market-integrity/${publicProofId}%2fverify`,
    "/proof/market-integrity/pubidx-short",
  ]) {
    check(`spoofed_path_rejected:${invalidPath}`, !proxyModule.isCanonicalPublicMarketIntegrityProofPath(invalidPath));
  }
} catch (error) {
  check("runtime_verify_boundary_loads", false, error instanceof Error ? error.stack : error);
}

const failed = checks.filter((row) => !row.pass);
console.log(JSON.stringify({
  schemaVersion: "velmere.v4.verify-durable-registry-boundary-test.v1",
  status: failed.length ? "FAIL" : "PASS_LOCAL_ONLY",
  assertions: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failures: failed,
  truthBoundary: "Current-source local registry and pure UI view-model proof only. React/Next production rendering, Supabase staging, deployment, monitoring uptime, customer, FINAL, LIVE and sale remain unproven.",
  nextReactRuntimeCredit: false,
  finalCredit: false,
  stagingCredit: false,
  liveCredit: false,
}, null, 2));

if (failed.length) process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
