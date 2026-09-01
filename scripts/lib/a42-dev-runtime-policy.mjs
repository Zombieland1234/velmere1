import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const PASS35_A42_REVISION_ID = "VELMERE_PASS35_A42_DEV_RUNTIME_CACHE_RECOVERY";
export const PASS35_A42_RUNTIME_ID = "velmere.pass35.a42.dev-runtime-policy.v2";
export const GLOBAL_JSON_PARSE_SIGNATURE = "Unexpected non-whitespace character after JSON";
export const GLOBAL_JSON_PARSE_RECOVERY_THRESHOLD = 3;
export const GLOBAL_JSON_PARSE_RECOVERY_WINDOW_MS = 15_000;

export const A42_CRITICAL_RUNTIME_TARGETS = Object.freeze([
  { id: "home", path: "/pl", expected: [200], contentTypes: ["text/html"] },
  { id: "browser", path: "/pl/search", expected: [200], contentTypes: ["text/html"] },
  { id: "shield", path: "/pl/market-integrity", expected: [200], contentTypes: ["text/html"] },
  { id: "shield_pro", path: "/pl/shield-pro", expected: [200], contentTypes: ["text/html"] },
  { id: "shield_map", path: "/pl/shield-map", expected: [200], contentTypes: ["text/html"] },
  { id: "intelligence", path: "/pl/intelligence", expected: [200], contentTypes: ["text/html"] },
  { id: "atelier", path: "/pl/atelier", expected: [200], contentTypes: ["text/html"] },
  { id: "security_audits", path: "/pl/security/audits", expected: [200], contentTypes: ["text/html"] },
  { id: "manifest", path: "/manifest.webmanifest", expected: [200], contentTypes: ["application/manifest+json", "application/json"] },
  { id: "locale_manifest", path: "/en/manifest.webmanifest", expected: [200], contentTypes: ["application/manifest+json", "application/json"] },
  { id: "icon", path: "/icon.svg", expected: [200], contentTypes: ["image/svg+xml"] },
  { id: "locale_icon", path: "/pl/icon.svg", expected: [200], contentTypes: ["image/svg+xml"] },
  { id: "locale_favicon", path: "/pl/favicon.ico", expected: [200, 404], contentTypes: [] },
  { id: "auth_session", path: "/api/auth/session", expected: [200, 401, 403], contentTypes: ["application/json"] },
  { id: "market_feed", path: "/api/market-integrity/markets?perPage=3", expected: [200, 424, 429, 503], contentTypes: ["application/json"] },
]);

const DEFAULT_FINGERPRINT_FILES = Object.freeze([
  "VELMERE_ACTIVE_PASS.txt",
  "package.json",
  "package-lock.json",
  "next.config.mjs",
  "tsconfig.json",
  "proxy.ts",
  "i18n.ts",
  "routing.ts",
  "app/layout.tsx",
  "app/[locale]/layout.tsx",
  "app/manifest.ts",
  "app/icon.svg",
  "app/[locale]/page.tsx",
  "app/[locale]/search/page.tsx",
  "app/[locale]/market-integrity/page.tsx",
  "app/[locale]/shield-pro/page.tsx",
  "app/[locale]/shield-map/page.tsx",
  "messages/pl.json",
  "messages/en.json",
  "messages/de.json",
  "config/pass35/a41-critical-route-recovery.json",
  "config/pass35/a42-dev-runtime-cache-recovery.json",
  "config/pass36/current-release-authority.json",
  "components/PageTransition.tsx",
  "components/ui/VelmereRouteTransition.tsx",
  "lib/ui/route-transition-policy.ts",
  "lib/ui/dialog-focus-return-policy.ts",
  "lib/market-integrity/local-development-market-reference.ts",
  "lib/market-integrity/asset-logo-resolver.ts",
  "lib/server/market-integrity-route-modules/markets.ts",
  "lib/server/market-integrity-route-modules/brand-icon.ts",
  "lib/server/market-integrity-route-modules/icon.ts",
  "scripts/velmere-dev-bootstrap.mjs",
  "scripts/velmere-dev-runner.mjs",
  "scripts/lib/a42-dev-runtime-policy.mjs",
  "scripts/a42-runtime-diagnostics.mjs",
  "scripts/a42-runtime-smoke.mjs",
]);

export function normalizeBundler(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "webpack" || normalized === "turbopack") return normalized;
  return null;
}

export function selectDevBundler({ platform = process.platform, env = process.env, explicit = null } = {}) {
  const selected = normalizeBundler(explicit) ?? normalizeBundler(env.VELMERE_DEV_BUNDLER);
  if (selected) return selected;
  // The reported crash happened on Windows under Turbopack and affected every
  // route through one repeated JSON.parse failure. A42 therefore chooses the
  // mature Webpack dev path on Windows by default. Turbopack remains explicit.
  return platform === "win32" ? "webpack" : "turbopack";
}

export function sanitizeNextChildEnvironment(baseEnv = process.env, bundler = "turbopack") {
  const env = { ...baseEnv };
  const removed = [];
  for (const key of Object.keys(env)) {
    if (/^(?:__NEXT_PRIVATE_|NEXT_PRIVATE_)/u.test(key)) {
      removed.push(key);
      delete env[key];
    }
  }
  env.VELMERE_DEV_BUNDLER = bundler;
  // Do not reuse Turbopack's filesystem cache unless it is explicitly enabled
  // after A42 runtime smoke has passed on the current machine.
  env.VELMERE_TURBOPACK_DEV_CACHE = bundler === "turbopack" && env.VELMERE_TURBOPACK_DEV_CACHE === "1" ? "1" : "0";
  return { env, removed: removed.sort() };
}

export function countGlobalJsonParseSignatures(text) {
  if (!text) return 0;
  return String(text).split(GLOBAL_JSON_PARSE_SIGNATURE).length - 1;
}

export function shouldRecoverFromGlobalJsonParse({ bundler, occurrenceTimes, now = Date.now() }) {
  if (bundler !== "turbopack") return false;
  const recent = occurrenceTimes.filter((timestamp) => now - timestamp <= GLOBAL_JSON_PARSE_RECOVERY_WINDOW_MS);
  return recent.length >= GLOBAL_JSON_PARSE_RECOVERY_THRESHOLD;
}

export function generatedNextDirectory(root) {
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, ".next");
  if (path.dirname(target) !== resolvedRoot || path.basename(target) !== ".next") {
    throw new Error("A42 refused unsafe generated Next path");
  }
  return target;
}

export function a42StateDirectory(root) {
  return path.join(root, ".velmere", "dev-runtime");
}

export function sourceFingerprintPath(root) {
  return path.join(a42StateDirectory(root), "source-fingerprint.json");
}

export function sessionMarkerPath(root) {
  return path.join(a42StateDirectory(root), "active-session.json");
}

export function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

export function writeJsonFileAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, filePath);
}

export function removeFileIfPresent(filePath) {
  try {
    fs.rmSync(filePath, { force: true });
  } catch {
    // Stale markers are deliberately treated as unclean sessions next time.
  }
}

export function clearGeneratedNextState(root, reason = "A42 recovery") {
  const target = generatedNextDirectory(root);
  if (!fs.existsSync(target)) return { cleared: false, target, reason };
  fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
  return { cleared: true, target, reason };
}

export function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function computeSourceFingerprint(root, files = DEFAULT_FINGERPRINT_FILES) {
  const hash = crypto.createHash("sha256");
  const included = [];
  const missing = [];
  for (const relativePath of [...files].sort()) {
    const absolutePath = path.join(root, relativePath);
    hash.update(relativePath);
    hash.update("\0");
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      missing.push(relativePath);
      hash.update("MISSING");
      hash.update("\0");
      continue;
    }
    const bytes = fs.readFileSync(absolutePath);
    included.push({ path: relativePath, bytes: bytes.length });
    hash.update(bytes);
    hash.update("\0");
  }
  return {
    schemaVersion: "velmere.pass35.a42.source-fingerprint.v2",
    revisionId: PASS35_A42_REVISION_ID,
    digest: `sha256:${hash.digest("hex")}`,
    files: included,
    missing,
  };
}

export function classifyExpectedStatus(target, status) {
  return Array.isArray(target?.expected) && target.expected.includes(status);
}

export function contentTypeMatches(target, contentType) {
  if (!Array.isArray(target?.contentTypes) || target.contentTypes.length === 0) return true;
  const normalized = String(contentType ?? "").toLowerCase();
  return target.contentTypes.some((expected) => normalized.includes(String(expected).toLowerCase()));
}
