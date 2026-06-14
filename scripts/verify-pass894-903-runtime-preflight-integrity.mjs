#!/usr/bin/env node
import { readFileSync } from "node:fs";

const checks = [];
const read = (path) => readFileSync(path, "utf8");
const assert = (name, ok, detail = "") => checks.push({ name, ok: Boolean(ok), detail });

const pkg = JSON.parse(read("package.json"));
const npmrc = read(".npmrc");
const brain = read("components/market-integrity/VlmBrainWorkspace.tsx");
const lens = read("components/search/VelmereIntelligenceSearchClient.tsx");
const wallet = read("components/wallet/WalletConnectOptions.tsx");
const en = JSON.stringify(JSON.parse(read("messages/en.json")));
const pl = JSON.stringify(JSON.parse(read("messages/pl.json")));
const de = JSON.stringify(JSON.parse(read("messages/de.json")));

assert(
  "package exposes PASS894-903 verifier",
  pkg.scripts?.["verify:pass894-903-runtime-preflight-integrity"] ===
    "node scripts/verify-pass894-903-runtime-preflight-integrity.mjs",
);
assert(
  "npm 11 peer policy is explicit for Vercel install",
  npmrc.includes("legacy-peer-deps=true") && npmrc.includes("strict-peer-deps=false") && npmrc.includes("engine-strict=true"),
);
assert(
  "React/Web3 overrides remain pinned for npm 11 matrix",
  pkg.overrides?.react === "$react" &&
    pkg.overrides?.["@wagmi/core"] === "2.22.1" &&
    pkg.overrides?.["@wagmi/connectors"] === "6.2.0" &&
    pkg.overrides?.viem === "$viem",
);
assert(
  "resolutions mirror dependency matrix for external scanners",
  pkg.resolutions?.react === "19.2.7" &&
    pkg.resolutions?.wagmi === "2.19.5" &&
    pkg.resolutions?.viem === "2.52.2",
);
assert(
  "VLM confidence governor hard caps fallback/missing data below 40",
  brain.includes("providerFallback") &&
    brain.includes("Math.min(39, penalizedConfidence)") &&
    brain.includes("originalConfidence * 0.75"),
);
assert(
  "VLM UI says fallback confidence is capped",
  brain.includes("confidence capped below 40%") &&
    brain.includes("pewność ograniczona poniżej 40%") &&
    brain.includes("Konfidenz auf unter 40% begrenzt"),
);
assert(
  "Lens caps suggestions and detail result to one asset",
  lens.includes("const LENS_SINGLE_RESULT_LIMIT = 1") &&
    lens.includes("suggestions.slice(0, LENS_SINGLE_RESULT_LIMIT)") &&
    lens.includes("items.slice(0, LENS_SINGLE_RESULT_LIMIT)"),
);
assert(
  "Lens PL duplicate velmere key removed",
  (lens.match(/velmere: "Velmère"/g) || []).length === 3,
  "expected one PL, one EN and one DE mode label",
);
assert(
  "Lens toolbar spatial navigation still preserves Escape close",
  lens.includes("handlePreviewToolbarKeyDown") &&
    lens.includes('(currentIndex + direction + controls.length) % controls.length') &&
    lens.includes('event.key === "Escape"') &&
    lens.includes("closePreview();"),
);
assert(
  "Wallet read-only warning appears even when status block is hidden",
  wallet.includes("function WalletConsentNotice") &&
    wallet.includes('data-wallet-read-only-warning="visible-before-wallet-choice"') &&
    wallet.includes("{!showStatus ? <WalletConsentNotice compact={compact} /> : null}"),
);
assert(
  "Wallet warning forbids keys approvals and transactions before choice",
  wallet.includes("never asks for private keys, seed phrases, token approvals or transactions"),
);
for (const [locale, source] of [
  ["en", en],
  ["pl", pl],
  ["de", de],
]) {
  assert(
    `${locale} i18n has no literal yield/dividend/guarantee finance jargon`,
    !/yield|dividend|guarantee|guaranteed/i.test(source),
  );
}
assert("English token copy uses future-benefit boundary", en.includes("future-benefit claim"));
assert("Polish token copy uses neutral access-token boundary", pl.includes("przyszła korzyść"));
assert("German token copy uses neutral access-token boundary", de.includes("künftiger Vorteil"));

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}${check.detail ? ` — ${check.detail}` : ""}`);
}
if (failed.length) {
  console.error(`PASS894-903 verifier failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`PASS894-903 verifier passed: ${checks.length}/${checks.length}`);
