#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const strict = process.argv.includes("--strict");
const messagesDirectory = path.join(root, "messages");
const locales = ["pl", "en", "de"];

function flatten(value, prefix = "", output = {}) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) flatten(child, prefix ? `${prefix}.${key}` : key, output);
  } else {
    output[prefix] = value;
  }
  return output;
}
function normalized(value) {
  return String(value ?? "").replace(/\s+/gu, " ").trim();
}
function likelyLanguageNeutral(value) {
  const text = normalized(value);
  if (!text) return true;
  if (/^(?:https?:\/\/|\/|0x)[^\s]*$/iu.test(text)) return true;
  if (/^[\d\s.,:%+\-–—/()€$£¥]+$/u.test(text)) return true;
  if (/^[A-Z0-9_.:/+-]{1,12}$/u.test(text)) return true;
  if (/^(?:Velmère|VLM|API|PDF|URL|HTTP|HTTPS|EVM|BTC|ETH|USD|USDT|USDC|ETF|FX|RLS|KMS|WCAG|OSINT)$/iu.test(text)) return true;
  return false;
}

const flattened = {};
for (const locale of locales) {
  flattened[locale] = flatten(JSON.parse(fs.readFileSync(path.join(messagesDirectory, `${locale}.json`), "utf8")));
}
const allKeys = new Set(locales.flatMap((locale) => Object.keys(flattened[locale])));
const missingByLocale = Object.fromEntries(locales.map((locale) => [locale, [...allKeys].filter((key) => !(key in flattened[locale])).sort()]));
const identical = [];
const likelyUntranslated = [];
for (const key of [...allKeys].sort()) {
  if (locales.some((locale) => !(key in flattened[locale]))) continue;
  const values = locales.map((locale) => normalized(flattened[locale][key]));
  if (new Set(values).size !== 1) continue;
  const row = { key, value: values[0] };
  identical.push(row);
  if (!likelyLanguageNeutral(values[0]) && /\p{L}/u.test(values[0])) likelyUntranslated.push(row);
}
const result = {
  schemaVersion: "velmere.pass14.i18n-semantic-parity.v1",
  generatedAt: new Date().toISOString(),
  truthBoundary: "Static translation-key and identical-value audit. Identical strings are candidates, not automatic translation defects; strict release review must maintain an explicit language-neutral allowlist.",
  summary: {
    locales,
    totalKeys: allKeys.size,
    keyParity: Object.values(missingByLocale).every((rows) => rows.length === 0),
    identicalAcrossAllLocales: identical.length,
    identicalPercent: allKeys.size ? Number(((identical.length / allKeys.size) * 100).toFixed(2)) : 0,
    likelyUntranslated: likelyUntranslated.length,
    likelyUntranslatedPercent: allKeys.size ? Number(((likelyUntranslated.length / allKeys.size) * 100).toFixed(2)) : 0
  },
  missingByLocale,
  likelyUntranslated,
  identicalAcrossAllLocales: identical
};
const directory = path.join(root, ".velmere", "pass14-diagnostics");
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(path.join(directory, "i18n-semantic-parity.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result.summary, null, 2));
if (!result.summary.keyParity || (strict && likelyUntranslated.length > 0)) process.exit(1);
