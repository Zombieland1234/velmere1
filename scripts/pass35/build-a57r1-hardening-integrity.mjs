#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const baselinePath = path.join(root, "config/pass35/a46-customer-data-plane-acceptance.json");
const outputPath = path.join(root, "config/pass35/a57r1-hardening-integrity.json");
const deterministicEpoch = "2026-07-26T00:00:00.000Z";
const revisionId = "VELMERE_PASS35_A57_CONTROLLED_CANARY_KILL_SWITCH_ROLLBACK_TELEMETRY_ACCEPTANCE";
const sourceRevisionId = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/current-revision.json"), "utf8")).sourceRevisionId;
const categories = Object.freeze([
  ["visualFiles", 338],
  ["publicAssets", 225],
  ["protectedEngineFiles", 510],
]);
const retiredRouteShells = new Map(Object.entries({
  "app/api/market-integrity/investigator/route.ts": ["app/api/market-integrity/[operation]/route.ts", "lib/server/route-registries/market-integrity.ts", "lib/server/market-integrity-route-modules/investigator.ts"],
  "app/api/market-integrity/klines/route.ts": ["app/api/market-integrity/[operation]/route.ts", "lib/server/route-registries/market-integrity.ts", "lib/server/market-integrity-route-modules/klines.ts"],
  "app/api/market-integrity/market-intelligence/route.ts": ["app/api/market-integrity/[operation]/route.ts", "lib/server/route-registries/market-integrity.ts", "lib/server/market-integrity-route-modules/market-intelligence.ts"],
  "app/api/market-integrity/markets/route.ts": ["app/api/market-integrity/[operation]/route.ts", "lib/server/route-registries/market-integrity.ts", "lib/server/market-integrity-route-modules/markets.ts"],
  "app/api/market-integrity/real-markets/route.ts": ["app/api/market-integrity/[operation]/route.ts", "lib/server/route-registries/market-integrity.ts", "lib/server/market-integrity-route-modules/real-markets.ts"],
  "app/api/market-integrity/search/route.ts": ["app/api/market-integrity/[operation]/route.ts", "lib/server/route-registries/market-integrity.ts", "lib/server/market-integrity-route-modules/search.ts"],
  "app/api/market-integrity/vlm/route.ts": ["app/api/market-integrity/[operation]/route.ts", "lib/server/route-registries/market-integrity.ts", "lib/server/market-integrity-route-modules/vlm.ts"],
  "app/api/search/bridge/route.ts": ["app/api/search/[operation]/route.ts", "lib/server/route-registries/search.ts", "lib/server/search-route-modules/bridge.ts"],
  "app/api/search/lens-report/route.ts": ["app/api/search/[operation]/route.ts", "lib/server/route-registries/search.ts", "lib/server/search-route-modules/lens-report.ts"],
  "app/api/search/lens-route/route.ts": ["app/api/search/[operation]/route.ts", "lib/server/route-registries/search.ts", "lib/server/search-route-modules/lens-route.ts"],
  "app/api/search/live-preview/route.ts": ["app/api/search/[operation]/route.ts", "lib/server/route-registries/search.ts", "lib/server/search-route-modules/live-preview.ts"],
  "app/api/search/token-metadata/route.ts": ["app/api/search/[operation]/route.ts", "lib/server/route-registries/search.ts", "lib/server/search-route-modules/token-metadata.ts"],
  "app/api/market-integrity/vlm/access-policy/route.ts": ["app/api/market-integrity/vlm/[operation]/route.ts", "lib/server/route-registries/market-integrity-vlm.ts", "lib/server/market-integrity-vlm-route-modules/access-policy.ts"],
  "app/api/market-integrity/vlm/keys/route.ts": ["app/api/market-integrity/vlm/[operation]/route.ts", "lib/server/route-registries/market-integrity-vlm.ts", "lib/server/lazy-route-modules/market-integrity--vlm--keys.ts"],
  "app/api/market-integrity/vlm/verify/route.ts": ["app/api/market-integrity/vlm/[operation]/route.ts", "lib/server/route-registries/market-integrity-vlm.ts", "lib/server/lazy-route-modules/market-integrity--vlm--verify.ts"],
  "app/api/market-integrity/real-markets/catalog/route.ts": ["app/api/market-integrity/real-markets/[operation]/route.ts", "lib/server/route-registries/real-markets.ts", "lib/server/real-markets-route-modules/catalog.ts"],
  "app/api/market-integrity/real-markets/provider-contract/route.ts": ["app/api/market-integrity/real-markets/[operation]/route.ts", "lib/server/route-registries/real-markets.ts", "lib/server/real-markets-route-modules/provider-contract.ts"],
  "app/api/market-integrity/real-markets/search/route.ts": ["app/api/market-integrity/real-markets/[operation]/route.ts", "lib/server/route-registries/real-markets.ts", "lib/server/real-markets-route-modules/search.ts"]
}));

function lexical(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
function sha256(bytes) { return crypto.createHash("sha256").update(bytes).digest("hex"); }
function validateRelative(relativePath) {
  if (typeof relativePath !== "string" || !relativePath || path.isAbsolute(relativePath) || relativePath.includes("\\") || relativePath.split("/").some((segment) => !segment || segment === "." || segment === "..")) throw new Error(`a57r1_integrity_path_invalid:${String(relativePath)}`);
  const absolute = path.resolve(root, relativePath);
  if (!absolute.startsWith(`${root}${path.sep}`)) throw new Error(`a57r1_integrity_path_escape:${relativePath}`);
  return absolute;
}
function absoluteRegularFile(relativePath) {
  const absolute = validateRelative(relativePath);
  let cursor = root;
  for (const segment of relativePath.split("/")) {
    cursor = path.join(cursor, segment);
    const metadata = fs.lstatSync(cursor);
    if (metadata.isSymbolicLink()) throw new Error(`a57r1_integrity_symlink_forbidden:${relativePath}`);
  }
  if (!fs.statSync(absolute).isFile()) throw new Error(`a57r1_integrity_not_regular_file:${relativePath}`);
  return absolute;
}
function tombstoneDigest(relativePath, replacementPaths) {
  return sha256(Buffer.from(`A59_RETIRED_ROUTE_SHELL\0${relativePath}\0${[...replacementPaths].sort(lexical).join("\0")}`, "utf8"));
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
const integrity = {};
const changedByPath = new Map();
let retiredRouteShellCount = 0;
for (const [category, expectedCount] of categories) {
  const baselineRows = baseline.integrity?.[category];
  if (!Array.isArray(baselineRows) || baselineRows.length !== expectedCount) throw new Error(`a57r1_integrity_baseline_count:${category}:${baselineRows?.length ?? 0}/${expectedCount}`);
  const seen = new Set();
  integrity[category] = baselineRows.map((row) => {
    if (seen.has(row.path)) throw new Error(`a57r1_integrity_duplicate:${category}:${row.path}`);
    seen.add(row.path);
    if (!/^[a-f0-9]{64}$/.test(String(row.currentSha256 ?? ""))) throw new Error(`a57r1_integrity_baseline_sha_invalid:${category}:${row.path}`);
    const absolute = validateRelative(row.path);
    const replacements = retiredRouteShells.get(row.path);
    let currentSha256;
    let classification;
    let present = fs.existsSync(absolute);
    let replacementPaths;
    if (!present && replacements) {
      for (const replacement of replacements) absoluteRegularFile(replacement);
      replacementPaths = [...replacements].sort(lexical);
      currentSha256 = tombstoneDigest(row.path, replacementPaths);
      classification = "A59_RETIRED_ROUTE_SHELL";
      retiredRouteShellCount += 1;
    } else {
      currentSha256 = sha256(fs.readFileSync(absoluteRegularFile(row.path)));
      classification = currentSha256 !== row.currentSha256 ? "A57R1_OR_LATER_APPROVED_CHANGE" : "UNCHANGED_FROM_A46_BASELINE";
    }
    const changed = currentSha256 !== row.currentSha256;
    if (changed) {
      const existing = changedByPath.get(row.path);
      if (existing && existing.baselineSha256 !== row.currentSha256) throw new Error(`a57r1_integrity_baseline_conflict:${row.path}`);
      changedByPath.set(row.path, { path: row.path, categories: [...new Set([...(existing?.categories ?? []), category])].sort(lexical), baselineSha256: row.currentSha256, currentSha256, classification, present, ...(replacementPaths ? { replacementPaths } : {}) });
    }
    return { path: row.path, baselineSha256: row.currentSha256, currentSha256, classification, present, ...(replacementPaths ? { replacementPaths } : {}) };
  });
}
const changedFiles = [...changedByPath.values()].sort((left, right) => lexical(left.path, right.path));
if (changedFiles.length < 22) throw new Error(`a57r1_integrity_changed_file_floor:${changedFiles.length}/22`);
if (retiredRouteShellCount !== retiredRouteShells.size) throw new Error(`a59_retired_route_shell_count:${retiredRouteShellCount}/${retiredRouteShells.size}`);
const output = {
  schemaVersion: "velmere.pass35.a57r1.hardening-integrity.v2",
  parentRevisionId: revisionId,
  sourceRevisionId,
  deterministicEpoch,
  status: "PASS_LOCAL_HARDENING_INTEGRITY_NO_PROMOTION",
  approvedChangeIds: ["A57R1_SECURITY_TRUTH_PDF_QA_HARDENING", "A58_RELEASE_INTEGRITY_RECOVERY", "A59_BUILD_GRAPH_ROUTE_CSS_BUDGET_RECOVERY", "A60_EXACT_FINAL_BYTE_BUILD_BROWSER_ADMISSION", "A61_HISTORICAL_ARTIFACT_RECOVERY_INTAKE", "A62_OFFLINE_EXACT_RUNTIME_DEPENDENCY_BOOTSTRAP", "A63_STAGING_PROGRAM_ORCHESTRATOR_EVIDENCE_CHAIN", "A64_HISTORICAL_CONTROL_METADATA_RECOVERY", "A65_EXTERNAL_COMMAND_EXECUTION_TRUST_BOUNDARY_HARDENING", "A66_AUDIT_TOOL_EXECUTION_TRUST_BOUNDARY_HARDENING", "A67_NETWORK_EGRESS_CREDENTIAL_AND_SAME_ORIGIN_TRUST_BOUNDARY_HARDENING", "A68_FILESYSTEM_PERSISTENCE_TRUST_BOUNDARY_HARDENING", "A69_STRUCTURED_DATA_DESERIALIZATION_TRUST_BOUNDARY_HARDENING", "A70_MULTIPART_UPLOAD_AND_PASSIVE_ATTACHMENT_TRUST_BOUNDARY_HARDENING", "A71_RELEASE_SIGNATURE_AND_TRUST_ANCHOR_BOUNDARY_HARDENING", "A72_DOWNLOAD_RESPONSE_AND_CONTENT_DISPOSITION_TRUST_BOUNDARY_HARDENING", "A73_COOKIE_SESSION_AND_AUTH_FLOW_TRUST_BOUNDARY_HARDENING", "A74_NAVIGATION_REDIRECT_AND_CALLBACK_TRUST_BOUNDARY_HARDENING", "A75_TRUSTED_PROXY_AND_REQUEST_CLIENT_IDENTITY_BOUNDARY_HARDENING", "A76_CURRENT_REVISION_ROADMAP_AND_REGULATORY_PERIMETER_TRUTH_AUTHORITY", "A77_HISTORICAL_LINEAGE_CLEAN_ROOT_MIGRATION_AND_DUAL_CONTROL_GOVERNANCE", "A78_EXACT_RUNTIME_LOCKFILE_DEPENDENCY_BROWSER_BOOTSTRAP_HARDENING", "A79_EXACT_FINAL_BYTE_BUILD_RUNTIME_AND_BROWSER_EVIDENCE_BINDING_HARDENING", "A80_FROZEN_LOCAL_RELEASE_CANDIDATE_ADMISSION_AND_PROMOTION_SEAL_HARDENING", "A81_CANONICAL_BASIC_PRO_ADVANCED_MEGA_MATRIX_ORCHESTRATOR", "A82_AUDIT_BASIC_PRO_ADVANCED_REAL_CONTRACT_MATRIX_AND_OFFICIAL_TOOL_EVIDENCE_BINDING", "A83_BROWSER_LENS_PDF_REAL_PACKET_MATRIX_AND_SECURE_DELIVERY_PARITY", "A84_SHIELD_FULL_CATALOG_TIER_MATRIX_AND_PROVIDER_TRUTH_LEDGER", "A85_SHIELD_PRO_AND_SHIELD_MAP_FULL_DEPTH_IDENTITY_ENTITLEMENT_MATRIX", "A86_REAL_MARKETS_CROSS_ASSET_FULL_MATRIX_AND_DATA_RIGHTS_TRUTH_LEDGER", "A87_MARKET_IMPACT_WHALE_WATCH_COMMON_DENOMINATOR_AND_REAL_EVIDENCE_TRUTH_LEDGER", "A88_BRAIN_ANGEL_RISK_MULTILINGUAL_ADVERSARIAL_EVAL_AND_ADVICE_BOUNDARY", "A88R1_SEMANTIC_GENERALIZATION_ROUTE_EXECUTION_PRIVACY_AND_PDF_EVIDENCE_RETENTION", "A89_ACCOUNT_AUTH_TENANT_PRIVACY_RED_TEAM_AND_TRUST_CENTER_INTAKE", "A102R4_CLIENT_AUTH_PREVIEW_HEADER_LOCAL_STORAGE_AND_ACCOUNT_DATA_FAIL_CLOSED", "A102R5_SERVER_ACCOUNT_ENTITLEMENT_BROWSER_BEARER_AND_PERSISTENT_PAID_ACCESS_FAIL_CLOSED", "A102R6_PRIVATE_ACCOUNT_BROWSER_STATE_LOCAL_STORAGE_CLIENT_FALLBACK_AND_DURABLE_VAULT_FAIL_CLOSED", "A102R7_MOBILE_WALLET_DEEPLINK_QUERY_HASH_PRIVATE_PATH_AND_EXTERNAL_PROVIDER_PRIVACY_FAIL_CLOSED", "A102R8_CHECKOUT_PII_AUDIT_CASE_AND_PDF_ACTIVITY_BROWSER_PERSISTENCE_FAIL_CLOSED", "A102R9_SYSTEM_CLIPBOARD_PRIVATE_ACCOUNT_DOWNLOAD_SESSION_ADMIN_SUPPORT_EXPORT_REDACTION_FAIL_CLOSED", "A102R10_EXTERNAL_NEW_TAB_PRODUCT_IMPORT_SEC_FILING_AND_WALLET_NAVIGATION_FAIL_CLOSED", "A102R11_CLIENT_LENS_PDF_BYTE_BINDING_OBJECT_URL_AND_DOWNLOAD_LIFECYCLE_FAIL_CLOSED", "A102R12_ADMIN_PRODUCT_DRAFT_LOCAL_STORAGE_CROSS_ACCOUNT_AND_STRICT_JSON_FAIL_CLOSED", "A102R13_OPERATIONAL_LOG_CLIENT_ERROR_PAYMENT_PROVIDER_IDENTIFIER_REDACTION_FAIL_CLOSED", "A102R14_SOURCE_PACKAGE_UPLOAD_RECOVERY_AND_BROWSER_SHIELD_HANDOFF_SESSION_STORAGE_QUERY_TIER_PRIVACY_FAIL_CLOSED", "A102R15_ASSET_ANALYSIS_SYSTEM_CLIPBOARD_PACKET_RECEIPT_SOURCE_CLAIM_AND_TIMESTAMP_REDACTION_FAIL_CLOSED", "A102R16_COOKIE_CONSENT_GRANULAR_CHOICE_EXPIRY_STRICT_JSON_AND_LOCAL_LEGAL_PROOF_BOUNDARY", "A102R17_CLIENT_RESPONSE_STRICT_JSON_RAW_SERVER_ERROR_AND_ANGEL_SESSION_STORAGE_FAIL_CLOSED", "A102R18_PUBLIC_COMMUNITY_SYSTEM_CLIPBOARD_TEXT_LINK_CONTROL_BIDI_AND_SAME_ORIGIN_FAIL_CLOSED", "A102R19_ACTIVE_CSS_ANIMATION_NAMESPACE_AND_CUSTOMER_UI_INTERNAL_CHECKPOINT_JARGON_MINIMALISM", "A102R20_SINGLE_CURRENT_AUTHORITY_README_HISTORY_LABEL_STALE_POINTER_AND_PLANNING_ESTIMATE_COHERENCE_MINIMALISM", "A102R21_CUSTOMER_ACCESSIBILITY_AND_OPERATOR_CHECKPOINT_JARGON_MINIMALISM_BOUNDARY", "A102R22_LOCAL_DEV_RUNTIME_DATA_REFERENCE_ICON_AND_CONTINUOUS_ROUTE_TRANSITION_RECOVERY", "A102R23_KLINE_MODE_LOCAL_REFERENCE_DETAIL_ICON_REQUEST_AND_DEV_PREFETCH_STORM_RECOVERY", "A102R24_SHARED_CATALOG_REFERENCE_TRUTH_REMOTE_SEARCH_AND_REFRESH_FLICKER_RECOVERY", "A102R25_LOCAL_REFERENCE_MARKET_INTELLIGENCE_SHORT_CIRCUIT_WITHHELD_BACKOFF_AND_RETRY_TRUTH", "A102R26_ASSET_DETAIL_CHART_SHARED_CACHE_INFLIGHT_RACE_REFERENCE_REFRESH_AND_NO_FLICKER_RECOVERY", "A102R27_ASSET_DETAIL_PROVIDER_SYMBOL_VENUE_CACHE_AND_REQUEST_IDENTITY_COLLISION_RECOVERY", "A102R28_ASSET_DETAIL_ABORTED_INFLIGHT_REOPEN_AND_DEFERRED_IDENTITY_RESET_RACE_RECOVERY", "A102R29_CANONICAL_ASSET_CLASS_LOCALE_INDEPENDENT_CHART_ROUTE_CACHE_AND_NESTED_AUTHORITY_PROGRAM_DRIFT_RECOVERY", "A102R30_CHART_PROVIDER_CADENCE_CANONICAL_SESSION_AND_EVIDENCE_STATE_TRUTH_RECOVERY", "A102R31_ROUTE_TRANSITION_HASH_FOCUS_PREFETCH_BOUND_AND_ACCESSIBILITY_CONTINUITY_RECOVERY", "A102R32_ROUTE_HASH_INVALID_MISSING_TARGET_TIMEOUT_AND_PREFETCH_INTENT_REENTRY_RECOVERY", "A102R33_DIALOG_FOCUS_RETURN_RAPID_REOPEN_NESTED_MODAL_AND_PENDING_OBSERVER_RACE_RECOVERY", "A102R34_DIALOG_TOP_LAYER_ESCAPE_TAB_OUTSIDE_POINTER_AND_NESTED_RETURN_OWNERSHIP_RECOVERY", "A102R35_MODAL_SCROLL_LOCK_PENDING_RESTORE_RAPID_REOPEN_AND_NESTED_OWNER_RACE_RECOVERY"],
  saleEnabled: false,
  liveProven: false,
  promotionAllowed: false,
  counts: {
    visualRows: integrity.visualFiles.length,
    publicAssetRows: integrity.publicAssets.length,
    protectedEngineRows: integrity.protectedEngineFiles.length,
    totalRows: integrity.visualFiles.length + integrity.publicAssets.length + integrity.protectedEngineFiles.length,
    uniqueBaselinePaths: new Set(categories.flatMap(([category]) => integrity[category].map((row) => row.path))).size,
    changedRows: changedFiles.length,
    retiredRouteShellRows: retiredRouteShellCount,
    presentProtectedRows: integrity.protectedEngineFiles.filter((row) => row.present).length
  },
  changedFileCount: changedFiles.length,
  retiredRouteShellCount,
  changedFiles,
  integrity,
  truthBoundary: "This receipt preserves the frozen A46 denominator as integrity rows. A59-retired route shells are cryptographic tombstones bound to exact dispatcher/registry/handler replacements and are not counted as present files. A64 restores exact historical control metadata, A65 hardens operator-configured external signer/publisher execution, A66 migrates pinned solc execution to the same hash-bound isolated process boundary, A67 brokers credential-bearing Supabase egress while forcing active browser transports through a same-origin deadline boundary, A68 binds active filesystem persistence to one no-follow, bounded, atomic durable-file boundary, A69 binds structured JSON parsing at covered production sinks, A70 binds the public contact multipart upload to strict field inventory plus passive PDF/PNG/JPEG structure validation, A71 binds release signatures to detached Ed25519 trust anchors and verified checkpoint chains, A72 centralizes download response filenames, A73 centralizes cookie/session serialization, A74 binds callbacks and browser redirects to explicit same-origin or exact provider profiles, A75 centralizes trusted-proxy client identity for rate limits, security fingerprints and durable computation fallback, A76 separates current source identity from canonical metric, acceptance, visual, engine and legacy compatibility planes, and A77 creates a separate source-bound clean-root lineage while preserving A61 as unresolved 0/2 and requiring dual-control signatures before staging admission. A78-A80 harden exact toolchain, browser evidence and release-candidate admission; A81 binds the cross-surface tier matrix; A82 binds real-contract identities, source-bytecode receipts, rights, blind labels, official tool receipts and tier FP/FN evidence without granting real audit credit; A83 binds the cross-locale physical Browser/Lens/PDF matrix; A84 binds the Shield full-catalog provider truth ledger; A85 binds Shield Pro pagination, Shield Map exact identity, chain/address, labels, depth, lanes and entitlement truth without granting real network, browser, customer or sale credit; A86 binds the Real Markets cross-asset reference universe, exhaustive classification, count coherence, ten-field packets, rights truth and semantic mutation ledger without granting current-data or sale credit. A89 binds callback state/intent/locale, purpose-separated secrets, request-bound trusted account headers, single-use recovery grants, strict account request contracts, granular consent and authorized Trust Center intake without granting staging, legal, LIVE or sale credit. A102R4 removes browser localStorage and spoofable preview/account headers as authentication authority, requires server-confirmed session state, and binds the approved current auth boundary changes without rewriting the frozen A46 baseline. A102R5 removes persistent browser-paid bearer tokens and client paid-header authority, requiring signed account sessions plus exact server account/context entitlement records while preserving a non-secret tab-scoped UX marker only. A102R6 removes persistent and cross-tab browser authority from private Account Vault report/release/download state, purges legacy rows without migration and blocks client-fallback durable vault-ready claims. A102R7 removes current query, fragment and private dynamic-path disclosure from MetaMask/Phantom mobile deeplinks, validates the current origin and emits only allowlisted public routes. A102R8 removes browser-persistent checkout PII, audit-case references and PDF activity metadata, purges legacy rows without reading or migration, and permits only bounded current-tab memory until an account-bound server store confirms durability. A102R9 removes raw private account, download/session/access and admin operational JSON from the operating-system clipboard, permits only secure-context byte-bounded redacted summaries, and explicitly preserves the clipboard as an external non-revocable trust boundary. A102R10 prevents unsafe or nonallowlisted imported URLs from becoming customer external links, requires exact publication-time validation, and centralizes wallet-install, SEC filing and product new-tab navigation behind no-opener/no-referrer controls. A102R11 binds client PDF bytes and Blob URL lifecycle. A102R12 removes persistent cross-admin draft authority. A102R13 centralizes operational error/identifier redaction. A102R14 restores the exact parent source from its deterministic rebuild after a truncated upload and removes Browser-to-Shield sessionStorage/query/tier/source-claim authority, permitting only canonical asset identity plus a mandatory fresh target scan. A102R15 removes full asset-analysis packet, receipt, source-claim, route and timestamp disclosure from the operating-system clipboard while retaining only bounded redacted summaries. A102R16 makes analytics and marketing consent independently selectable and default-off, binds local browser preference to exact policy and 180-day expiry with strict JSON, and explicitly records localStorage as neither server record nor legal proof. A102R17 requires bounded strict-JSON browser responses, prevents raw server/provider body rendering and removes Angel conversation correlation from sessionStorage while retaining account-bound server memory as authority. A102R18 removes remaining direct Square/Community clipboard sinks and binds public text and Square links to one secure-context, byte-bounded, control/bidi-rejecting same-origin boundary. A102R19 removes duplicate/dead active global keyframe owners and customer-visible internal checkpoint jargon on checkout, account report detail and Real Markets safe-mode surfaces while preserving internal proof markers. A102R20 restores one coherent current-source authority across active metadata, A58, compatibility mirrors, planning estimates and human handoff files while leaving app/components/lib bytes unchanged. A102R21 removes confirmed customer-visible, accessibility and operator-facing internal checkpoint jargon across eighteen application files, classifies all 200 parent quoted PASS candidates, preserves internal API/data-proof identifiers and leaves CSS unchanged. A102R22 restores current-authority dev startup, replaces rights-blocked empty local market surfaces with explicitly illustrative non-production reference rows, removes icon 502 retry storms, bypasses locale middleware for fonts and keeps route transitions covered until destination path and layout settle. It does not prove exact final build, production browser parity, LIVE traffic, production payments, independent review, sale eligibility, or promotion readiness. A102R24 unifies Shield and Shield Pro catalog acquisition, reference truth and refresh continuity. A102R25 then prevents local-reference Market Intelligence calls, preserves explicit reference state and applies bounded withheld backoff. A102R28 removes rapid chart abort/reopen and deferred identity-reset races without granting browser or release credit. A102R29 removes localized customer-copy authority from chart endpoint routing and cache identity, uses canonical asset class/provider symbol/venue, and restores nested current-source parent plus living-roadmap program coherence without granting browser or release credit. A102R30 corrects provider cadence, canonical session/surface classification and evidence-state truth. A102R31 binds route-transition hash readiness, focus transfer, bounded intent prefetch and a separate assistive-technology status without granting browser or release credit. A102R23 reconciles the server kline mode contract with Shield Pro, provides exact local-development illustrative OHLC only for local-reference identities, disables development eager route prewarm and development external logo request chains, and preserves production rights blocking with zero synthetic production bars. It does not prove exact final build, production browser parity, LIVE traffic, production payments, independent review, sale eligibility, or promotion readiness."
};
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: output.status, output: path.relative(root, outputPath).split(path.sep).join("/"), counts: output.counts, changedFileCount: output.changedFileCount, sha256: sha256(fs.readFileSync(outputPath)) }, null, 2));
