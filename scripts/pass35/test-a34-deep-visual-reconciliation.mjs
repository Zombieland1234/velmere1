import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/a34-deep-visual-reconciliation.json"), "utf8"));
let checks = 0;
const assert = (condition, message) => { checks += 1; if (!condition) throw new Error(`A34_RECONCILIATION_FAIL: ${message}`); };
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const allFiles = (dir) => {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...allFiles(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
};
const aggregate = (rels) => {
  const h = crypto.createHash("sha256");
  for (const rel of [...rels].sort()) h.update(`${rel}\0${sha(path.join(root, rel))}\n`);
  return { count: rels.length, digest: h.digest("hex") };
};
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

assert(policy.schemaVersion === "velmere.pass35.a34.deep-visual-reconciliation.v1", "policy schema");
assert(policy.revisionId === "VELMERE_PASS35_A34_DEEP_VISUAL_RECONCILIATION", "revision ID");
assert(policy.base.engine === "PASS35_A32", "A32 engine base");
assert(policy.base.visualMerge === "PASS35_A33", "A33 visual base");
assert(policy.truthBoundary.visualAndInstallReconciliationOnly === true, "reconciliation-only boundary");
assert(policy.truthBoundary.canonicalPercentChanged === false, "canonical percent changed");
assert(policy.truthBoundary.canonicalWeightedPercent === 59.3, "canonical weighted percent");
assert(policy.truthBoundary.canonicalStrictPercent === 39.5, "canonical strict percent");
assert(policy.truthBoundary.zeroBudgetWeightedPercent === 91.9, "zero-budget percent");
assert(policy.truthBoundary.sellEnabled === false, "sellEnabled must remain false");
assert(policy.truthBoundary.globalDecision === "NO_GO", "global decision");
assert(policy.truthBoundary.exactRuntimeExecuted === false, "exact runtime falsely claimed");
assert(policy.truthBoundary.fullBuildExecuted === false, "full build falsely claimed");
assert(policy.truthBoundary.browserE2EExecuted === false, "browser E2E falsely claimed");

const protectedNow = aggregate(policy.protectedEngine.files);
assert(protectedNow.count === policy.protectedEngine.base.count, "protected file denominator changed");
assert(protectedNow.digest === policy.protectedEngine.base.digest, "protected A32/A33 engine changed");
assert(policy.protectedEngine.byteIdentical === true, "protected engine not byte-identical");
assert(policy.protectedEngine.base.digest === policy.protectedEngine.merged.digest, "recorded protected digest mismatch");

const pkg = JSON.parse(read("package.json"));
const packagePayload = {};
for (const key of ["dependencies","devDependencies","optionalDependencies","peerDependencies","engines","devEngines","packageManager"]) packagePayload[key] = pkg[key] ?? null;
// Recompute with canonical recursive sorting to match the policy.
const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map((k) => [k, canonical(value[k])])) : value;
const canonicalPackageDigest = crypto.createHash("sha256").update(JSON.stringify(canonical(packagePayload))).digest("hex");
assert(canonicalPackageDigest === policy.packageContract.mergedSha256, "package dependency/toolchain contract changed");
assert(policy.packageContract.unchanged === true, "package dependency graph changed");
assert(sha(path.join(root, "package-lock.json")) === policy.packageContract.packageLockBaseSha256, "package-lock changed");
assert(pkg.scripts?.["diagnose:install:a34"] === "node scripts/a34-install-diagnostics.mjs", "diagnostic script missing");
assert(String(pkg.scripts?.["setup:windows:a34"] || "").includes("VELMERE_SETUP_WINDOWS_A34.ps1"), "Windows setup script missing");

for (const item of policy.mergeInventory.requiredFiles) {
  const p = path.join(root, item.path);
  assert(fs.existsSync(p), `missing required A34 file ${item.path}`);
  assert(fs.statSync(p).size === item.size, `size mismatch ${item.path}`);
  assert(sha(p) === item.sha256, `hash mismatch ${item.path}`);
}
assert(policy.mergeInventory.removed.length === 0, "A34 removed source files");
for (const forbidden of policy.guardrails.forbiddenDirectories) assert(!fs.existsSync(path.join(root, forbidden)), `forbidden directory ${forbidden}`);
assert(allFiles(root).filter((p) => p.toLowerCase().endsWith(".pdf")).length === 0, "SOURCE_ONLY contains PDF files");
for (const locale of policy.guardrails.requiredLocales) assert(fs.existsSync(path.join(root, `messages/${locale}.json`)), `missing locale ${locale}`);

const status = JSON.parse(read("config/pass35/current-status-register.json"));
assert(status.globalDecision === "NO_GO", "status global decision changed");
assert(status.sellEnabledCount === 0, "status sellEnabled changed");
assert(status.truthBoundary.includes("59.3% weighted / 39.5% strict"), "status canonical metrics changed");
assert(status.zeroBudgetFunctionalTrack.currentWeightedPlanningPercent === 91.9, "status zero-budget changed");
assert(sha(path.join(root, "config/pass35/current-status-register.json")) === policy.statusIdentity.baseSha256, "current status bytes changed");

const navbar = read("components/Navbar.tsx");
assert(navbar.includes("deleteVelmereAccountSession"), "secure server-session logout missing");
assert(!navbar.includes("setVelmereLocalSession"), "local-only logout regression present");
assert(navbar.includes('href: "/atelier"'), "Atelier menu route missing");
assert(navbar.includes('href: "/intelligence"'), "Intelligence menu route missing");
assert(navbar.includes("legalLinksByLocale"), "localized legal menu missing");
assert(navbar.includes("primaryNavigation") && navbar.includes("marketNavigation"), "navigation accessibility copy missing");

const angel = read("components/angel/AngelPanel.tsx");
assert(angel.includes("readTextResponseBounded"), "Angel bounded response missing");
assert(angel.includes("createBrowserSecureId"), "Angel secure browser ID missing");
assert(angel.includes('depth: "basic"'), "Angel Basic depth boundary missing");
assert(angel.includes("VShieldPulse"), "Angel visual loader missing");
assert(!angel.includes("response.text().catch"), "Angel unbounded response regression");

const square = read("components/square/VelmereSquareClient.tsx");
assert(square.includes("fetchWithCustomerAuth"), "Square customer-auth missing");
assert(square.includes('operation: "square_comment_create"'), "Square authenticated comment operation missing");

const shieldPro = read("components/market-integrity/ShieldProCleanTerminalClient.tsx");
assert(shieldPro.includes('partial: "PARTIAL · NOT LIVE"'), "Shield Pro partial truth label missing");
assert(!shieldPro.includes('partial: "LIVE · PARTIAL"'), "false Shield Pro LIVE/PARTIAL label present");
assert(shieldPro.includes("readJsonResponseBounded"), "Shield Pro bounded JSON missing");

const overlay = read("components/ui/OverlayPrimitives.tsx");
assert(overlay.includes("presenceActive"), "overlay exit-presence ownership missing");
assert(overlay.includes("useReducedMotion"), "overlay reduced-motion handling missing");
assert(overlay.includes("onExitComplete"), "overlay exit completion ownership missing");
assert(overlay.includes('@/lib/ui/overlay-constitution'), "current overlay constitution path missing");

const transition = read("components/PageTransition.tsx");
assert(transition.includes("initial={false}"), "route hydration-visible transition missing");
const motionProfile = read("components/ui/useVelmereMotionProfile.ts");
assert(motionProfile.includes("mediaReady"), "motion hydration gate missing");
assert(motionProfile.includes('@/lib/ui/motion-constitution'), "current motion constitution path missing");
const motionLab = read("app/[locale]/motion-lab/page.tsx");
assert(motionLab.includes('redirect(`/${locale}/atelier`)'), "Motion Lab to Atelier redirect missing");

const security = read("components/security/SecurityTrustPage.tsx");
assert(security.includes("Security Intelligence"), "Security Intelligence section missing");
assert(security.includes("no live data") || security.includes("bez danych live") || security.includes("keine Live-Daten"), "Security no-live boundary missing");
assert(security.includes("not a guarantee of zero risk") || security.includes("nie gwarancja zerowego ryzyka") || security.includes("nicht Nullrisiko"), "Security zero-risk limitation missing");
assert(!security.includes("SecurityConsolePanel"), "operator security console leaked into public page");
assert(fs.existsSync(path.join(root, "components/security/SecurityTrustPage.module.css")), "Security CSS module missing");

const install = read("VELMERE_SETUP_WINDOWS_A34.ps1");
for (const token of ["24.18.0","11.16.0","E503","ETIMEDOUT","ECONNRESET","npm ci","install:trusted-native","verify:runtime-contract"]) assert(install.includes(token), `install contract token missing ${token}`);
assert(!install.includes("npm.cmd ci --force"), "installer bypasses runtime contract with --force");
const diagnostic = read("scripts/a34-install-diagnostics.mjs");
assert(diagnostic.includes("TOOLCHAIN_MISMATCH"), "toolchain diagnostic missing");
assert(diagnostic.includes("HTTP 503/ETIMEDOUT/ECONNRESET"), "registry guidance missing");

console.log(JSON.stringify({
  status: "PASS_A34_DEEP_VISUAL_RECONCILIATION",
  checks,
  protectedEngineFiles: protectedNow.count,
  protectedEngineDigest: protectedNow.digest,
  addedFiles: policy.mergeInventory.added.length,
  changedFiles: policy.mergeInventory.changed.length,
  removedFiles: policy.mergeInventory.removed.length,
  canonicalWeightedPercent: 59.3,
  canonicalStrictPercent: 39.5,
  zeroBudgetWeightedPercent: 91.9,
  sellEnabled: false,
  globalDecision: "NO_GO",
  exactRuntimeExecuted: false,
}, null, 2));
