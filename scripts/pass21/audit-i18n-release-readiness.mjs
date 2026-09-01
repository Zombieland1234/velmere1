#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const locales = ["pl", "en", "de"];
const criticalNamespaces = new Set(["Auth", "Account", "Cookie", "Errors", "Home", "Square", "MarketIntegrity", "Angel", "Legal", "VlmGate", "AdminImport"]);
const allowlist = JSON.parse(fs.readFileSync(path.join(root, "config/pass21/i18n-neutral-allowlist.json"), "utf8"));
const exactNeutral = new Set(allowlist.exact ?? []);
const regexNeutral = (allowlist.regex ?? []).map((source) => new RegExp(source, "u"));
const keyNeutral = (allowlist.keyRegex ?? []).map((source) => new RegExp(source, "u"));
const legalMarkers = [
  /template copy/iu,
  /replace .* before/iu,
  /full legal address to be confirmed/iu,
  /not published until/iu,
  /to be confirmed in merchant records/iu,
  /before commercial launch/iu,
  /before accepting orders/iu,
];
const englishLeak = {
  pl: /\b(?:sign in|sign out|create account|account access|private account|wallet preview|page not found|return to collection|add a comment|post note|link copied|risk score|evidence|missing proof|next safe check|loading|open playbook|watchlist|pending moderation)\b/iu,
  de: /\b(?:sign in|sign out|create account|account access|private account|wallet preview|page not found|return to collection|add a comment|post note|link copied|risk score|evidence|missing proof|next safe check|loading|open playbook|watchlist|pending moderation)\b/iu,
};
function flatten(value, prefix = "", output = {}) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => flatten(child, `${prefix}[${index}]`, output));
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) flatten(child, prefix ? `${prefix}.${key}` : key, output);
  } else output[prefix] = value;
  return output;
}
function text(value) { return typeof value === "string" ? value.replace(/\s+/gu, " ").trim() : String(value ?? "").trim(); }
function neutral(value, key = "") {
  const normalized = text(value);
  if (!normalized) return true;
  if (keyNeutral.some((regex) => regex.test(key))) return true;
  if (exactNeutral.has(normalized)) return true;
  if (regexNeutral.some((regex) => regex.test(normalized))) return true;
  if (!/\p{L}/u.test(normalized)) return true;
  return false;
}
const flat = {};
for (const locale of locales) flat[locale] = flatten(JSON.parse(fs.readFileSync(path.join(root, `messages/${locale}.json`), "utf8")));
const keys = [...new Set(locales.flatMap((locale) => Object.keys(flat[locale])))].sort();
const missingByLocale = Object.fromEntries(locales.map((locale) => [locale, keys.filter((key) => !(key in flat[locale]))]));
const identicalNonNeutral = [];
const criticalIdenticalNonNeutral = [];
const leakage = { pl: [], de: [] };
for (const key of keys) {
  if (locales.some((locale) => !(key in flat[locale]))) continue;
  const values = locales.map((locale) => text(flat[locale][key]));
  if (new Set(values).size === 1 && !neutral(values[0], key)) {
    const row = { key, value: values[0] };
    identicalNonNeutral.push(row);
    if (criticalNamespaces.has(key.split(".")[0])) criticalIdenticalNonNeutral.push(row);
  }
  for (const locale of ["pl", "de"]) {
    const value = text(flat[locale][key]);
    if (criticalNamespaces.has(key.split(".")[0]) && englishLeak[locale].test(value)) leakage[locale].push({ key, value });
  }
}
const legalPlaceholders = [];
for (const locale of locales) {
  for (const [key, value] of Object.entries(flat[locale])) {
    if (!key.startsWith("Legal.")) continue;
    const normalized = text(value);
    if (legalMarkers.some((marker) => marker.test(normalized))) legalPlaceholders.push({ locale, key, value: normalized });
  }
}
const namespaceRows = {};
for (const namespace of [...criticalNamespaces].sort()) {
  const namespaceKeys = keys.filter((key) => key.split(".")[0] === namespace);
  const identical = criticalIdenticalNonNeutral.filter((row) => row.key.split(".")[0] === namespace);
  const leaks = [...leakage.pl, ...leakage.de].filter((row) => row.key.split(".")[0] === namespace);
  namespaceRows[namespace] = { values: namespaceKeys.length, identicalNonNeutral: identical.length, englishLeakCandidates: leaks.length, status: identical.length || leaks.length ? "NEEDS_REVIEW" : "PASS_STATIC" };
}
const keyParity = Object.values(missingByLocale).every((rows) => rows.length === 0);
const criticalStaticPass = criticalIdenticalNonNeutral.length === 0 && leakage.pl.length === 0 && leakage.de.length === 0;
const result = {
  schemaVersion: "velmere.pass21.i18n-release-readiness.v1",
  generatedAt: "2026-07-20T12:00:00.000Z",
  truthBoundary: "Static per-value locale audit with an explicit language-neutral allowlist. It does not replace native-speaker review, browser overflow checks or final legal review.",
  summary: {
    locales,
    flattenedValues: keys.length,
    keyParity,
    identicalNonNeutral: identicalNonNeutral.length,
    criticalIdenticalNonNeutral: criticalIdenticalNonNeutral.length,
    criticalEnglishLeakCandidates: leakage.pl.length + leakage.de.length,
    legalPlaceholderBlockers: legalPlaceholders.length,
    criticalStaticPass,
    commercialLaunchLanguageStatus: criticalStaticPass && legalPlaceholders.length === 0 ? "PASS_STATIC" : "NO_GO"
  },
  criticalNamespaces: namespaceRows,
  missingByLocale,
  criticalIdenticalNonNeutral,
  criticalEnglishLeakCandidates: leakage,
  legalPlaceholders,
  allIdenticalNonNeutral: identicalNonNeutral
};
const merchant = JSON.parse(fs.readFileSync(path.join(root, ".velmere/pass21-diagnostics/merchant-legal-readiness.json"), "utf8"));
result.summary.merchantRegistryBlockers = merchant.registryBlockers;
result.summary.commercialLaunchLanguageStatus = criticalStaticPass && legalPlaceholders.length === 0 && merchant.registryBlockers === 0 ? "PASS_STATIC" : "NO_GO";
const out = path.join(root, ".velmere/pass21-diagnostics/i18n-release-readiness.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result.summary, null, 2));
if (!keyParity || !criticalStaticPass) process.exit(1);
