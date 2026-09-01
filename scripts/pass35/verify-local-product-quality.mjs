#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const LOCAL_PRODUCT_QUALITY_REPORT_SCHEMA = "velmere.pass35.local-product-quality-report.v1";
export const DEFAULT_LOCAL_PRODUCT_QUALITY_POLICY = "config/pass35/local-product-quality-policy.json";

const HEX_SHA256 = /^(?:sha256:)?[a-f0-9]{64}$/i;
const PDF_MAGIC = Buffer.from("%PDF-", "ascii");

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function integer(value) {
  return Number.isSafeInteger(value) ? value : null;
}

function unique(values) {
  return Array.from(new Set(values));
}

function compactDetail(value) {
  if (Array.isArray(value)) return value.slice(0, 12);
  if (isObject(value)) return Object.fromEntries(Object.entries(value).slice(0, 16));
  return value;
}

function normalizeDigest(value) {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/^sha256:/, "") : "";
}

function normalizedTier(value) {
  if (value === "Basic" || value === "basic") return "Basic";
  if (value === "Pro" || value === "pro") return "Pro";
  if (value === "Advanced" || value === "advanced") return "Advanced";
  return null;
}

function truthHasEvery(value, markers) {
  const truth = typeof value === "string" ? value.toLocaleLowerCase("en-US") : "";
  return Array.isArray(markers) && markers.every((marker) => (
    typeof marker === "string" && marker.length > 0 && truth.includes(marker.toLocaleLowerCase("en-US"))
  ));
}

function exactStringSet(actual, expected) {
  if (!Array.isArray(actual) || !Array.isArray(expected)) return false;
  return actual.length === expected.length
    && unique(actual).length === actual.length
    && [...actual].sort().join("\u0000") === [...expected].sort().join("\u0000");
}

function statusCount(summary, prefix) {
  if (!isObject(summary?.byStatus)) return 0;
  return Object.entries(summary.byStatus)
    .filter(([key]) => key.startsWith(prefix))
    .reduce((total, [, value]) => total + (integer(value) ?? 0), 0);
}

function validatePolicyShape(policy, check) {
  check("policy_schema", policy?.schemaVersion === "velmere.pass35.local-product-quality-policy.v1", policy?.schemaVersion);
  check("policy_mode_synthetic_local", policy?.mode === "synthetic_local_quality_only", policy?.mode);
  check("policy_paths_complete", isObject(policy?.inputs) && [
    "pass16Corpus", "pass17Summary", "pass18Summary", "readinessDashboard", "productCellCatalog", "pdfReceipt",
  ].every((key) => typeof policy.inputs[key] === "string" && policy.inputs[key].trim().length > 0));
  check("policy_pdf_required", policy?.pdfReceipt?.required === true);
  check("policy_zero_external_credit", policy?.decision?.externalCreditOnPass === 0);
  check("policy_no_promotion", policy?.decision?.promotionAllowedOnPass === false);
  check("policy_no_sell_enable", policy?.decision?.sellEnabledOnPass === false);
  check("policy_truth_boundary", truthHasEvery(policy?.truthBoundary, [
    "zero external evidence credit", "authorizes no sale", "not live", "investment-advice",
  ]), policy?.truthBoundary);
}

/**
 * Pure evaluator used by the CLI and mutation tests. Inputs are already parsed;
 * fileFacts binds receipt rows to bytes read by loadLocalProductQualityInputs.
 */
export function evaluateLocalProductQuality(input) {
  const checks = [];
  const failures = [];
  const check = (id, ok, detail = undefined) => {
    const row = { id, ok: ok === true, ...(detail === undefined ? {} : { detail: compactDetail(detail) }) };
    checks.push(row);
    if (!row.ok) failures.push(row);
  };

  const policy = input?.policy;
  const corpus = input?.corpus;
  const pass17 = input?.pass17;
  const pass18 = input?.pass18;
  const dashboard = input?.dashboard;
  const catalog = input?.catalog;
  const pdfReceipt = input?.pdfReceipt;
  const fileFacts = isObject(input?.fileFacts) ? input.fileFacts : {};

  validatePolicyShape(policy, check);

  const pass16Policy = isObject(policy?.pass16) ? policy.pass16 : {};
  const requiredSurfaces = Array.isArray(pass16Policy.requiredSurfaces) ? pass16Policy.requiredSurfaces : [];
  const requiredTiers = Array.isArray(pass16Policy.requiredTiers) ? pass16Policy.requiredTiers : [];
  const requiredLocales = Array.isArray(pass16Policy.requiredLocales) ? pass16Policy.requiredLocales : [];
  const cases = Array.isArray(corpus?.cases) ? corpus.cases : [];
  check("pass16_schema", corpus?.schemaVersion === pass16Policy.schemaVersion, corpus?.schemaVersion);
  check("pass16_base_case_count", cases.length === pass16Policy.baseCases && corpus?.counts?.baseCases === pass16Policy.baseCases, {
    actualCases: cases.length,
    declaredCases: corpus?.counts?.baseCases,
    expected: pass16Policy.baseCases,
  });
  check("pass16_declared_cases_per_surface", corpus?.counts?.casesPerSurface === pass16Policy.casesPerSurface, corpus?.counts?.casesPerSurface);
  check("pass16_tier_set", exactStringSet(corpus?.tiers, requiredTiers), corpus?.tiers);
  check("pass16_locale_set", exactStringSet(corpus?.locales, requiredLocales), corpus?.locales);
  check("pass16_unique_case_ids", cases.length > 0 && unique(cases.map((row) => row?.id)).length === cases.length);
  for (const surface of requiredSurfaces) {
    const rows = cases.filter((row) => row?.surface === surface);
    check(`pass16_${surface}_exact_50`, rows.length === pass16Policy.casesPerSurface, rows.length);
    check(`pass16_${surface}_tier_contracts`, rows.length > 0 && rows.every((row) => (
      isObject(row?.expectedByTier) && requiredTiers.every((tier) => isObject(row.expectedByTier[tier]))
    )));
    check(`pass16_${surface}_locale_contracts`, rows.length > 0 && rows.every((row) => (
      exactStringSet(row?.localePolicy?.requiredLocales, requiredLocales)
      && row?.localePolicy?.mustUseRequestedLocale === true
      && row?.localePolicy?.mustNotFallbackToEnglish === true
    )));
  }

  const pass17Policy = isObject(policy?.pass17) ? policy.pass17 : {};
  check("pass17_schema", pass17?.schemaVersion === pass17Policy.schemaVersion, pass17?.schemaVersion);
  check("pass17_status_ok", pass17?.ok === true);
  check("pass17_fixture_count", pass17?.fixtures === pass17Policy.fixtures, pass17?.fixtures);
  check("pass17_matrix_900", pass17?.matrixRowsExecuted === pass17Policy.matrixRows, pass17?.matrixRowsExecuted);
  check("pass17_contract_900", pass17?.contractPass === pass17Policy.contractPass, pass17?.contractPass);
  check("pass17_determinism_900", pass17?.deterministicPass === pass17Policy.deterministicPass, pass17?.deterministicPass);
  check("pass17_lineage_900", pass17?.lineagePass === pass17Policy.lineagePass, pass17?.lineagePass);
  check("pass17_differentiation_complete", pass17?.differentiationGroups === pass17Policy.differentiationGroups && pass17?.differentiationFailures === 0, {
    groups: pass17?.differentiationGroups,
    failures: pass17?.differentiationFailures,
  });
  check("pass17_locale_complete", pass17?.localeChecks === pass17Policy.localeChecks && pass17?.localeFailures === 0, {
    checks: pass17?.localeChecks,
    failures: pass17?.localeFailures,
  });
  check("pass17_failure_count_zero", pass17?.failures === 0, pass17?.failures);
  check("pass17_status_rows_exact", statusCount(pass17, "shield:") === 450 && statusCount(pass17, "real_markets:") === 450, {
    shield: statusCount(pass17, "shield:"),
    realMarkets: statusCount(pass17, "real_markets:"),
  });
  check("pass17_synthetic_truth_boundary", truthHasEvery(pass17?.truthBoundary, pass17Policy.requiredTruthMarkers), pass17?.truthBoundary);

  const pass18Policy = isObject(policy?.pass18) ? policy.pass18 : {};
  check("pass18_schema", pass18?.schemaVersion === pass18Policy.schemaVersion, pass18?.schemaVersion);
  check("pass18_status_ok", pass18?.ok === true);
  check("pass18_case_split", pass18?.baseCases === pass18Policy.baseCases && pass18?.auditCases === pass18Policy.auditCases && pass18?.lensCases === pass18Policy.lensCases, {
    baseCases: pass18?.baseCases,
    auditCases: pass18?.auditCases,
    lensCases: pass18?.lensCases,
  });
  check("pass18_matrix_900", pass18?.matrixRowsExecuted === pass18Policy.matrixRows, pass18?.matrixRowsExecuted);
  check("pass18_contract_900", pass18?.contractPass === pass18Policy.contractPass, pass18?.contractPass);
  check("pass18_determinism_900", pass18?.deterministicPass === pass18Policy.deterministicPass, pass18?.deterministicPass);
  check("pass18_lineage_900", pass18?.lineagePass === pass18Policy.lineagePass, pass18?.lineagePass);
  check("pass18_differentiation_complete", pass18?.differentiationGroups === pass18Policy.differentiationGroups && pass18?.differentiationFailures === 0, {
    groups: pass18?.differentiationGroups,
    failures: pass18?.differentiationFailures,
  });
  check("pass18_locale_complete", pass18?.localeGroups === pass18Policy.localeGroups && pass18?.localeFailures === 0, {
    groups: pass18?.localeGroups,
    failures: pass18?.localeFailures,
  });
  check("pass18_failure_array_empty", Array.isArray(pass18?.failures) && pass18.failures.length === 0, pass18?.failures);
  const advancedBlocked = pass18?.byStatus?.["smart_contract_audit:advanced:blocked"];
  const advancedPassed = pass18?.byStatus?.["smart_contract_audit:advanced:passed"] ?? 0;
  check("pass18_advanced_audit_150_blocked", advancedBlocked === pass18Policy.advancedAuditBlocked
    && pass18?.advancedAuditSafelyBlockedWithoutRealHumanReview === pass18Policy.advancedAuditBlocked
    && statusCount(pass18, "smart_contract_audit:advanced:") === pass18Policy.advancedAuditBlocked
    && advancedPassed === 0, {
    blocked: advancedBlocked,
    safelyBlocked: pass18?.advancedAuditSafelyBlockedWithoutRealHumanReview,
    total: statusCount(pass18, "smart_contract_audit:advanced:"),
    passed: advancedPassed,
  });
  check("pass18_surface_rows_exact", statusCount(pass18, "smart_contract_audit:") === 450 && statusCount(pass18, "lens_pdf:") === 450, {
    audit: statusCount(pass18, "smart_contract_audit:"),
    lensPdf: statusCount(pass18, "lens_pdf:"),
  });
  check("pass18_zero_external_outputs", pass18?.canonicalProviderOrReviewerBoundOutputsExecuted === pass18Policy.canonicalExternalOutputs, pass18?.canonicalProviderOrReviewerBoundOutputsExecuted);
  check("pass18_zero_browser_pdf_credit", pass18?.renderedBrowserPdfOutputsExecuted === pass18Policy.renderedBrowserPdfOutputs, pass18?.renderedBrowserPdfOutputsExecuted);
  check("pass18_synthetic_truth_boundary", truthHasEvery(pass18?.truthBoundary, pass18Policy.requiredTruthMarkers), pass18?.truthBoundary);

  const releasePolicy = isObject(policy?.releaseBoundary) ? policy.releaseBoundary : {};
  check("dashboard_schema", dashboard?.schemaVersion === releasePolicy.dashboardSchemaVersion, dashboard?.schemaVersion);
  check("dashboard_no_go", dashboard?.globalDecision === releasePolicy.globalDecision && dashboard?.promotionAllowed === releasePolicy.promotionAllowed, {
    globalDecision: dashboard?.globalDecision,
    promotionAllowed: dashboard?.promotionAllowed,
  });
  check("dashboard_zero_external_credit", dashboard?.externalEvidenceSummary?.verified === releasePolicy.externalVerifiedCredit, dashboard?.externalEvidenceSummary);
  check("dashboard_30_stop_sell", dashboard?.productCellSummary?.total === releasePolicy.productCells
    && dashboard?.productCellSummary?.sellEnabled === releasePolicy.sellEnabledCells, dashboard?.productCellSummary);
  check("dashboard_local_truth_boundary", truthHasEvery(dashboard?.truthBoundary, ["local control records", "not staging", "live"]), dashboard?.truthBoundary);

  const productCells = Array.isArray(catalog?.productCells) ? catalog.productCells : [];
  check("catalog_schema", catalog?.schemaVersion === releasePolicy.catalogSchemaVersion, catalog?.schemaVersion);
  check("catalog_30_cells", productCells.length === releasePolicy.productCells, productCells.length);
  check("catalog_all_sell_disabled", productCells.length === releasePolicy.productCells && productCells.every((cell) => (
    cell?.sellEnabled === false && Array.isArray(cell?.sellBlockedReasons) && cell.sellBlockedReasons.length > 0
  )));
  check("catalog_policy_stop_sell", catalog?.catalogPolicy?.catalogApproved === false
    && catalog?.catalogPolicy?.sellByDefault === false
    && catalog?.catalogPolicy?.legacySkuMayAuthorizeCharge === false, catalog?.catalogPolicy);

  const pdfPolicy = isObject(policy?.pdfReceipt) ? policy.pdfReceipt : {};
  const pdfs = Array.isArray(pdfReceipt?.pdfs) ? pdfReceipt.pdfs : [];
  check("pdf_receipt_required_present", isObject(pdfReceipt));
  check("pdf_receipt_schema", pdfReceipt?.schemaVersion === pdfPolicy.schemaVersion, pdfReceipt?.schemaVersion);
  check("pdf_receipt_mode", pdfReceipt?.mode === pdfPolicy.mode, pdfReceipt?.mode);
  check("pdf_receipt_status", pdfReceipt?.status === pdfPolicy.status, pdfReceipt?.status);
  check("pdf_receipt_boundaries", isObject(pdfReceipt?.boundaries) && Object.entries(pdfPolicy.requiredBoundaries ?? {}).every(([key, expected]) => (
    pdfReceipt.boundaries[key] === expected
  )), pdfReceipt?.boundaries);
  check("pdf_receipt_exact_total", pdfs.length === pdfPolicy.pdfCount && pdfReceipt?.totals?.pdfCount === pdfPolicy.pdfCount, {
    rows: pdfs.length,
    declared: pdfReceipt?.totals?.pdfCount,
  });
  check("pdf_receipt_total_pages", pdfReceipt?.totals?.totalPages === pdfPolicy.totalPages, pdfReceipt?.totals?.totalPages);
  check("pdf_receipt_tier_totals", Object.entries(pdfPolicy.byTier ?? {}).every(([tier, count]) => (
    pdfReceipt?.totals?.byTier?.[tier] === count
    && pdfs.filter((row) => normalizedTier(row?.tier) === tier).length === count
  )), pdfReceipt?.totals?.byTier);
  check("pdf_receipt_assertions_pass", integer(pdfReceipt?.assertions?.total) !== null
    && pdfReceipt.assertions.total > 0
    && pdfReceipt?.assertions?.passed === pdfReceipt.assertions.total
    && pdfReceipt?.assertions?.failed === 0
    && Array.isArray(pdfReceipt?.failures)
    && pdfReceipt.failures.length === 0, pdfReceipt?.assertions);

  const pdfIds = pdfs.map((row) => row?.id);
  const pdfPaths = pdfs.map((row) => row?.path);
  const pdfDigests = pdfs.map((row) => normalizeDigest(row?.sha256));
  check("pdf_rows_unique_ids", pdfs.length === pdfPolicy.pdfCount && unique(pdfIds).length === pdfs.length && pdfIds.every((id) => typeof id === "string" && id.length > 0));
  check("pdf_rows_unique_paths", pdfs.length === pdfPolicy.pdfCount && unique(pdfPaths).length === pdfs.length && pdfPaths.every((value) => typeof value === "string" && value.endsWith(".pdf")));
  check("pdf_rows_unique_digests", pdfs.length === pdfPolicy.pdfCount && unique(pdfDigests).length === pdfs.length && pdfDigests.every((digest) => HEX_SHA256.test(digest)));
  check("pdf_rows_page_contract", pdfs.length === pdfPolicy.pdfCount && pdfs.every((row) => {
    const tier = normalizedTier(row?.tier);
    const expected = tier ? pdfPolicy.pageCountByTier?.[tier] : null;
    return expected !== null && row?.pageCount === expected && row?.a4PageCount === expected;
  }));
  check("pdf_rows_synthetic_local_only", pdfs.length === pdfPolicy.pdfCount && pdfs.every((row) => (
    row?.syntheticMarkersPresent === pdfPolicy.syntheticMarkersPresent
    && row?.sourceMode === pdfPolicy.requiredSourceMode
    && row?.sourceConfidence === pdfPolicy.requiredSourceConfidence
    && row?.commercialUseAllowed === pdfPolicy.commercialUseAllowed
  )));
  check("pdf_rows_no_transaction_advice", pdfs.length === pdfPolicy.pdfCount && pdfs.every((row) => (
    row?.bannedDirectionalLanguageAbsent === pdfPolicy.bannedDirectionalLanguageAbsent
  )));
  check("pdf_rows_pass", pdfs.length === pdfPolicy.pdfCount && pdfs.every((row) => row?.status === "PASS" && Array.isArray(row?.reasons) && row.reasons.length === 0));
  check("pdf_rows_byte_shape", pdfs.length === pdfPolicy.pdfCount && pdfs.every((row) => (
    HEX_SHA256.test(String(row?.sha256 ?? "")) && integer(row?.byteLength) !== null && row.byteLength > 1_000
  )));

  const tierAssetSets = {};
  for (const tier of Object.keys(pdfPolicy.byTier ?? {})) {
    tierAssetSets[tier] = pdfs
      .filter((row) => normalizedTier(row?.tier) === tier)
      .map((row) => row?.assetId)
      .filter((value) => typeof value === "string" && value.length > 0)
      .sort();
  }
  const assetSetReference = tierAssetSets.Basic ?? [];
  check("pdf_rows_50_unique_assets_per_tier", Object.entries(tierAssetSets).every(([tier, assets]) => (
    assets.length === pdfPolicy.byTier[tier] && unique(assets).length === pdfPolicy.byTier[tier]
  )), Object.fromEntries(Object.entries(tierAssetSets).map(([tier, assets]) => [tier, unique(assets).length])));
  check("pdf_rows_asset_parity_across_tiers", Object.values(tierAssetSets).every((assets) => (
    assets.join("\u0000") === assetSetReference.join("\u0000")
  )));

  check("pdf_files_bound_to_receipt", pdfs.length === pdfPolicy.pdfCount && pdfs.every((row) => {
    const fact = fileFacts[row.path];
    return isObject(fact)
      && fact.exists === true
      && fact.regularFile === true
      && fact.pdfMagic === true
      && fact.byteLength === row.byteLength
      && normalizeDigest(fact.sha256) === normalizeDigest(row.sha256);
  }), { factCount: Object.keys(fileFacts).length, expected: pdfs.length });

  const ok = failures.length === 0;
  return {
    schemaVersion: LOCAL_PRODUCT_QUALITY_REPORT_SCHEMA,
    candidateId: policy?.candidateId ?? null,
    status: ok ? policy?.decision?.pass ?? "PASS_LOCAL_SYNTHETIC_QUALITY_NO_PROMOTION" : policy?.decision?.fail ?? "FAIL_CLOSED_LOCAL_PRODUCT_QUALITY",
    ok,
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failed: failures.length,
      pass16RequiredSurfaceCases: Object.fromEntries(requiredSurfaces.map((surface) => [surface, cases.filter((row) => row?.surface === surface).length])),
      pass17: { executed: pass17?.matrixRowsExecuted ?? null, contract: pass17?.contractPass ?? null, deterministic: pass17?.deterministicPass ?? null, lineage: pass17?.lineagePass ?? null },
      pass18: { executed: pass18?.matrixRowsExecuted ?? null, contract: pass18?.contractPass ?? null, deterministic: pass18?.deterministicPass ?? null, lineage: pass18?.lineagePass ?? null, advancedAuditBlocked: advancedBlocked ?? null },
      pdf: { count: pdfs.length, byTier: pdfReceipt?.totals?.byTier ?? null, totalPages: pdfReceipt?.totals?.totalPages ?? null },
      externalEvidenceCredit: 0,
      globalDecision: dashboard?.globalDecision ?? "NO_GO",
      sellEnabledCells: dashboard?.productCellSummary?.sellEnabled ?? null,
    },
    releaseBoundary: {
      synthetic: true,
      localOnly: true,
      externalEvidenceCredit: 0,
      promotionAllowed: false,
      sellEnabled: false,
      liveClaimed: false,
      investmentRecommendation: false,
    },
    checks,
    failures,
    truthBoundary: policy?.truthBoundary ?? "Missing policy truth boundary; result fails closed.",
  };
}

function resolveInsideRoot(root, relativePath, label) {
  if (typeof relativePath !== "string" || relativePath.trim().length === 0 || path.isAbsolute(relativePath)) {
    throw new Error(`${label}_path_invalid`);
  }
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relativePath);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) throw new Error(`${label}_path_escape`);
  return resolved;
}

function readRequiredJson(root, relativePath, label) {
  const absolute = resolveInsideRoot(root, relativePath, label);
  let text;
  try {
    text = fs.readFileSync(absolute, "utf8");
  } catch (error) {
    throw new Error(`${label}_read_failed:${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label}_json_invalid:${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
}

function fileFact(root, relativePath) {
  const absolute = resolveInsideRoot(root, relativePath, "pdf_artifact");
  try {
    const stat = fs.statSync(absolute);
    if (!stat.isFile()) return { exists: true, regularFile: false, pdfMagic: false, byteLength: stat.size, sha256: null };
    const bytes = fs.readFileSync(absolute);
    return {
      exists: true,
      regularFile: true,
      pdfMagic: bytes.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC),
      byteLength: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  } catch {
    return { exists: false, regularFile: false, pdfMagic: false, byteLength: null, sha256: null };
  }
}

function writeJsonAtomic(root, relativePath, value) {
  const absolute = resolveInsideRoot(root, relativePath, "quality_receipt");
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  const temporary = `${absolute}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temporary, absolute);
}

export function loadLocalProductQualityInputs(options = {}) {
  const root = path.resolve(options.root ?? process.cwd());
  const policyRelative = options.policyPath ?? DEFAULT_LOCAL_PRODUCT_QUALITY_POLICY;
  const policy = readRequiredJson(root, policyRelative, "policy");
  if (!isObject(policy?.inputs)) throw new Error("policy_inputs_invalid");
  const corpus = readRequiredJson(root, policy.inputs.pass16Corpus, "pass16_corpus");
  const pass17 = readRequiredJson(root, policy.inputs.pass17Summary, "pass17_summary");
  const pass18 = readRequiredJson(root, policy.inputs.pass18Summary, "pass18_summary");
  const dashboard = readRequiredJson(root, policy.inputs.readinessDashboard, "readiness_dashboard");
  const catalog = readRequiredJson(root, policy.inputs.productCellCatalog, "product_cell_catalog");
  const pdfReceipt = readRequiredJson(root, policy.inputs.pdfReceipt, "pdf_receipt");
  const fileFacts = {};
  if (Array.isArray(pdfReceipt?.pdfs)) {
    for (const row of pdfReceipt.pdfs) {
      if (typeof row?.path === "string" && !(row.path in fileFacts)) fileFacts[row.path] = fileFact(root, row.path);
    }
  }
  return { root, policy, corpus, pass17, pass18, dashboard, catalog, pdfReceipt, fileFacts };
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

export function runLocalProductQualityCli(options = {}) {
  const root = path.resolve(options.root ?? process.cwd());
  try {
    const loaded = loadLocalProductQualityInputs({ ...options, root });
    const result = evaluateLocalProductQuality(loaded);
    const outputPath = loaded.policy?.outputs?.currentReceipt;
    if (typeof outputPath !== "string" || outputPath.length === 0) throw new Error("quality_receipt_output_path_missing");
    writeJsonAtomic(root, outputPath, result);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.ok) process.exitCode = 1;
    return result;
  } catch (error) {
    const result = {
      schemaVersion: LOCAL_PRODUCT_QUALITY_REPORT_SCHEMA,
      status: "FAIL_CLOSED_LOCAL_PRODUCT_QUALITY",
      ok: false,
      summary: { checks: 0, passed: 0, failed: 1, externalEvidenceCredit: 0 },
      releaseBoundary: {
        synthetic: true,
        localOnly: true,
        externalEvidenceCredit: 0,
        promotionAllowed: false,
        sellEnabled: false,
        liveClaimed: false,
        investmentRecommendation: false,
      },
      checks: [],
      failures: [{ id: "input_load_failure", ok: false, detail: error instanceof Error ? error.message : String(error) }],
      truthBoundary: "Input loading failed. No local-quality claim, external credit, sale or promotion is allowed.",
    };
    try {
      const policyPath = options.policyPath ?? DEFAULT_LOCAL_PRODUCT_QUALITY_POLICY;
      const policy = readRequiredJson(root, policyPath, "policy");
      const outputPath = policy?.outputs?.currentReceipt;
      if (typeof outputPath === "string" && outputPath.length > 0) writeJsonAtomic(root, outputPath, result);
    } catch (ignoredError) { void ignoredError; }
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = 1;
    return result;
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runLocalProductQualityCli({
    root: argumentValue("--root") ?? process.cwd(),
    policyPath: argumentValue("--policy") ?? DEFAULT_LOCAL_PRODUCT_QUALITY_POLICY,
  });
}
