import fs from "node:fs";
import path from "node:path";

export const REVISION = "VELMERE_PASS36_A76R0_CURRENT_REVISION_ROADMAP_AND_REGULATORY_PERIMETER_TRUTH_AUTHORITY";
export const PARENT = "VELMERE_PASS36_A75R0_TRUSTED_PROXY_AND_REQUEST_CLIENT_IDENTITY_BOUNDARY_HARDENING";
export const AUTHORITY_PATH = "config/pass36/current-release-authority.json";
export const PROGRAM_PATH = "config/pass36/a76-world-class-completion-program.json";

export function readJson(root, relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
}

function object(value) { return value && typeof value === "object" && !Array.isArray(value); }
function nonEmpty(value) { return typeof value === "string" && value.trim().length > 0; }

export function validateAuthorityBundle(bundle) {
  const checks = [];
  const check = (id, pass, detail = null) => checks.push({ id, pass: Boolean(pass), detail });
  const { authority, program, currentMirror, legacyPointer, pkg, activePass, readme, cleanReadme, roadmap } = bundle;

  check("authority:object", object(authority));
  check("authority:schema", authority?.schemaVersion === "velmere.pass36.current-release-authority.v1", authority?.schemaVersion);
  check("authority:revision", authority?.authorityRevisionId === REVISION, authority?.authorityRevisionId);
  check("authority:parent", authority?.parentRevisionId === PARENT, authority?.parentRevisionId);
  check("authority:path", authority?.authorityPath === AUTHORITY_PATH, authority?.authorityPath);
  check("authority:current-source", authority?.currentSource?.revisionId === REVISION, authority?.currentSource);
  check("authority:active-path", authority?.currentSource?.activePassPath === "VELMERE_ACTIVE_PASS.txt");
  check("authority:mirror-path", authority?.currentSource?.compatibilityMirrorPath === "config/pass35/current-revision.json");

  const planes = authority?.planes || {};
  check("planes:canonical", planes.canonicalInstitutionalMetrics?.revisionId === "VELMERE_PASS35_A32_REPORT_DELIVERY_EVIDENCE_NON_VISUAL");
  check("planes:metrics", planes.canonicalInstitutionalMetrics?.weightedPercent === 59.3 && planes.canonicalInstitutionalMetrics?.strictPercent === 39.5);
  check("planes:zero-budget", planes.zeroBudgetFunctionalCore?.weightedPercent === 91.9);
  check("planes:acceptance", planes.activeAcceptance?.revisionId === "VELMERE_PASS35_A57_CONTROLLED_CANARY_KILL_SWITCH_ROLLBACK_TELEMETRY_ACCEPTANCE" && planes.activeAcceptance?.realExecution === false);
  check("planes:visual-engine", planes.visual?.revisionId === "VELMERE_PASS35_A44_VISUAL_MASTER_ENGINE_BINDING" && planes.engine?.revisionId === "VELMERE_PASS35_A43_WEBPACK_CSS_VISUAL_RUNTIME_RECOVERY");
  check("planes:a60", planes.exactBuildBrowser?.revisionId === "VELMERE_PASS36_A60R0_EXACT_FINAL_BYTE_BUILD_BROWSER_ACCEPTANCE" && planes.exactBuildBrowser?.executed === false);
  check("planes:a61", planes.historicalArtifactRecovery?.verifiedExact === 0 && planes.historicalArtifactRecovery?.requiredExact === 2 && planes.historicalArtifactRecovery?.complete === false);
  check("planes:a63", planes.stagingProgram?.executedStages === 0 && planes.stagingProgram?.requiredStages === 10);
  check("planes:program", planes.roadmapProgram?.revisionId === REVISION && planes.roadmapProgram?.path === PROGRAM_PATH);

  const pointers = Array.isArray(authority?.compatibilityPointers) ? authority.compatibilityPointers : [];
  const pointerPaths = pointers.map((row) => row?.path);
  check("pointers:three", pointers.length === 3, pointerPaths);
  check("pointers:unique", new Set(pointerPaths).size === pointers.length, pointerPaths);
  const legacy = pointers.find((row) => row?.path === "config/current-release.json");
  const mirror = pointers.find((row) => row?.path === "config/pass35/current-revision.json");
  const roadmapPointer = pointers.find((row) => row?.path === "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt");
  check("pointers:legacy-class", legacy?.classification === "LEGACY_PRODUCT_CONTRACT_COMPATIBILITY_POINTER" && legacy?.mayDefineCurrentSource === false, legacy);
  check("pointers:mirror-class", mirror?.classification === "PASS35_COMPATIBILITY_MIRROR_OF_CURRENT_SOURCE_AND_PLANES" && mirror?.mayDefineCurrentSource === false, mirror);
  check("pointers:roadmap-class", roadmapPointer?.classification === "HUMAN_READABLE_CUMULATIVE_ROADMAP" && roadmapPointer?.mayDefineCurrentSource === false, roadmapPointer);
  check("pointers:none-authoritative", pointers.every((row) => row?.mayDefineCurrentSource === false));

  check("rules:single-authority", authority?.requiredTruth?.singleCurrentSourceAuthority === true);
  check("rules:legacy-classified", authority?.requiredTruth?.legacyPointerMustBeExplicitlyClassified === true);
  check("rules:plane-separation", authority?.requiredTruth?.canonicalMetricRevisionMayDifferFromCurrentSourceRevision === true && authority?.requiredTruth?.acceptanceRevisionMayDifferFromCurrentSourceRevision === true);
  check("rules:no-promotion", authority?.requiredTruth?.noHistoricalPlaneMayImplyLiveOrSale === true);
  check("rules:living-roadmap", authority?.requiredTruth?.newGapsAppendToRoadmapAndMayReduceCompletion === true);
  check("claims:closed", Object.values(authority?.claims || {}).every((value) => value === false), authority?.claims);

  check("program:object", object(program));
  check("program:schema", program?.schemaVersion === "velmere.pass36.a76.world-class-completion-program.v1", program?.schemaVersion);
  check("program:revision", program?.revisionId === REVISION && program?.parentRevisionId === PARENT);
  check("program:range", program?.programRange?.firstPass === 76 && program?.programRange?.lastPlannedPass === 110 && program?.programRange?.plannedPassCount === 35 && program?.programRange?.remainingAfterA76 === 34);
  const passes = Array.isArray(program?.passes) ? program.passes : [];
  const numbers = passes.map((row) => row?.passNumber);
  const expected = Array.from({ length: 35 }, (_, index) => index + 76);
  check("program:pass-count", passes.length === 35, numbers);
  check("program:pass-unique", new Set(numbers).size === passes.length, numbers);
  check("program:pass-contiguous", numbers.length === expected.length && numbers.every((value, index) => value === expected[index]), numbers);
  check("program:revision-prefix", passes.every((row) => row?.revisionPrefix === `A${row?.passNumber}`));
  check("program:titles", passes.every((row) => nonEmpty(row?.title) && nonEmpty(row?.waveId) && nonEmpty(row?.requiredExitEvidence)));
  check("program:no-direct-promotion", passes.every((row) => row?.mayEnableLiveOrSale === false));
  check("program:waves", Array.isArray(program?.waves) && program.waves.length === 5 && new Set(program.waves.map((row) => row.waveId)).size === 5);
  const wavePasses = (program?.waves || []).flatMap((row) => row.passes || []);
  check("program:wave-coverage", wavePasses.length === 35 && new Set(wavePasses).size === 35 && expected.every((num) => wavePasses.includes(`A${num}`)), wavePasses);
  check("program:living-rules", program?.programRules?.roadmapIsLivingContract === true && program?.programRules?.newGapMustBeAddedImmediately === true && program?.programRules?.percentagesMustBeRecalculatedHonestly === true && program?.programRules?.noGapMayBeHiddenToPreservePercentage === true);
  check("program:fixture-boundary", program?.programRules?.fixtureCannotPromoteStagingLiveOrSale === true && program?.programRules?.worldClassClaimRequiresIndependentExternalEvidence === true);
  check("program:per-sku", program?.programRules?.perSkuDecisionRequired === true && program?.programRules?.absoluteSecurityClaimForbidden === true);
  check("program:metrics", program?.canonicalMetrics?.weightedPercent === 59.3 && program?.canonicalMetrics?.strictPercent === 39.5 && program?.canonicalMetrics?.zeroBudgetPercent === 91.9 && program?.canonicalMetrics?.unchangedByA76 === true);
  check("program:stop-conditions", Array.isArray(program?.globalStopConditions) && program.globalStopConditions.length >= 7);
  check("program:claims-closed", Object.values(program?.claims || {}).every((value) => value === false), program?.claims);

  const legalItems = Array.isArray(program?.legalAndRegulatoryPerimeter) ? program.legalAndRegulatoryPerimeter : [];
  const legalIds = legalItems.map((row) => row?.itemId);
  check("legal:count", legalItems.length === 16, legalIds);
  check("legal:unique", new Set(legalIds).size === legalItems.length, legalIds);
  check("legal:review-required", legalItems.every((row) => /REVIEW_REQUIRED/u.test(row?.status || "")), legalItems.map((row) => [row?.itemId, row?.status]));
  check("legal:scope", legalItems.every((row) => nonEmpty(row?.scope)));
  check("legal:evidence", legalItems.every((row) => Array.isArray(row?.requiredEvidence) && row.requiredEvidence.length >= 5));
  check("legal:official-source", legalItems.every((row) => /^https:\/\//u.test(row?.officialSource || "")));
  check("legal:blocks", legalItems.every((row) => Array.isArray(row?.blocks) && row.blocks.length >= 1));
  check("legal:core-coverage", ["GDPR_EPRIVACY_DE_PL","EU_AI_ACT","MICA_MIFID_MAR_FINANCIAL_PERIMETER","DSA_COMMUNITY_SQUARE","EAA_ACCESSIBILITY","EU_CONSUMER_DIGITAL_CONTENT_ECOMMERCE","PROVIDER_DATA_DATABASE_AND_AI_RIGHTS"].every((id) => legalIds.includes(id)), legalIds);

  check("mirror:source", currentMirror?.sourceRevisionId === REVISION, currentMirror?.sourceRevisionId);
  check("mirror:authority", currentMirror?.currentReleaseAuthorityRevisionId === REVISION && currentMirror?.currentReleaseAuthorityPath === AUTHORITY_PATH);
  check("mirror:legacy", currentMirror?.legacyCurrentReleasePointerClassified === true && currentMirror?.legacyCurrentReleasePointerMayDefineCurrentSource === false);
  check("mirror:roadmap", currentMirror?.roadmapLivingContract === true && currentMirror?.newGapMustBeAddedAndPercentagesRecalculated === true);
  check("mirror:truth", currentMirror?.liveProven === false && currentMirror?.saleEnabled === false && currentMirror?.worldClassProven === false && currentMirror?.legalSignedDecisions === 0);

  check("legacy:classification", legacyPointer?.pointerClassification === "LEGACY_PRODUCT_CONTRACT_COMPATIBILITY_POINTER" && legacyPointer?.notAuthoritativeCurrentSourcePointer === true);
  check("legacy:authority", legacyPointer?.authoritativeCurrentReleasePath === AUTHORITY_PATH && legacyPointer?.authoritativeCurrentSourceRevisionId === REVISION);
  check("legacy:a32", legacyPointer?.sourceRevisionId === "VELMERE_PASS35_A32_REPORT_DELIVERY_EVIDENCE_NON_VISUAL" && legacyPointer?.legacyCanonicalProductRevisionId === legacyPointer?.sourceRevisionId);
  check("legacy:no-promotion", legacyPointer?.productionPromotionAllowed === false && /must not be used to identify the current source/u.test(legacyPointer?.compatibilityTruthBoundary || ""));

  check("package:test", pkg?.scripts?.["test:pass36:a76"] === "node scripts/pass36/test-a76-current-release-roadmap-regulatory-truth-authority.mjs");
  check("package:verify", pkg?.scripts?.["verify:pass36:a76"] === "node scripts/pass36/verify-a76-current-release-roadmap-regulatory-truth-authority.mjs");
  check("package:authority", pkg?.velmereCurrentReleaseAuthorityPass === REVISION && pkg?.velmereCurrentReleaseAuthorityPath === AUTHORITY_PATH);
  check("package:program", pkg?.velmereWorldClassCompletionProgramPass === REVISION && pkg?.velmereWorldClassCompletionProgramPath === PROGRAM_PATH);
  check("active:exact", activePass === REVISION, activePass);
  check("readme:current", readme?.includes(`Current source revision: \`${REVISION}\``) && readme.includes(AUTHORITY_PATH));
  check("readme:legacy", readme?.includes("legacy A32 product-contract compatibility pointer") && !readme.startsWith("# Velmère — PASS35 offline candidate"));
  check("clean-readme:current", cleanReadme?.includes("PASS36 A76") && cleanReadme.includes(AUTHORITY_PATH));
  check("roadmap:header", roadmap?.startsWith("====================================================================================================\nPASS36 A76R0") && roadmap.includes(REVISION));
  check("roadmap:living", roadmap?.includes("ŻYWA ROADMAPA A76-A110") && roadmap.includes("REGULATORY PERIMETER") && roadmap.includes("0/16"));
  check("truth:separate-revisions", REVISION !== planes.canonicalInstitutionalMetrics?.revisionId && REVISION !== planes.activeAcceptance?.revisionId && REVISION !== planes.visual?.revisionId);

  return checks;
}

export function loadAuthorityBundle(root = process.cwd()) {
  return {
    authority: readJson(root, AUTHORITY_PATH),
    program: readJson(root, PROGRAM_PATH),
    currentMirror: readJson(root, "config/pass35/current-revision.json"),
    legacyPointer: readJson(root, "config/current-release.json"),
    pkg: readJson(root, "package.json"),
    activePass: fs.readFileSync(path.join(root, "VELMERE_ACTIVE_PASS.txt"), "utf8").trim(),
    readme: fs.readFileSync(path.join(root, "README.md"), "utf8"),
    cleanReadme: fs.readFileSync(path.join(root, "CLEAN_SAFE_README.md"), "utf8"),
    roadmap: fs.readFileSync(path.join(root, "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt"), "utf8"),
  };
}
