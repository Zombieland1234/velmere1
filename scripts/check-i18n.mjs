import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const messagesDir = new URL("../messages/", import.meta.url);
const appDir = new URL("../app/", import.meta.url);
const componentsDir = new URL("../components/", import.meta.url);

function flatten(value, prefix = "") {
  if (Array.isArray(value)) return { [prefix]: "array" };
  if (!value || typeof value !== "object") return { [prefix]: typeof value };
  return Object.entries(value).reduce((acc, [key, child]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    Object.assign(acc, flatten(child, next));
    return acc;
  }, {});
}

async function readJson(name) {
  return JSON.parse(await readFile(new URL(name, messagesDir), "utf8"));
}

async function walk(dirUrl) {
  const entries = await readdir(dirUrl, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const nextUrl = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, dirUrl);
    if (entry.isDirectory()) {
      files.push(...(await walk(nextUrl)));
    } else if (/\.(tsx|jsx)$/.test(entry.name)) {
      files.push(nextUrl);
    }
  }
  return files;
}

const locales = (await readdir(messagesDir)).filter((file) => file.endsWith(".json"));
const baseName = "en.json";
const base = flatten(await readJson(baseName));
let failed = false;

for (const locale of locales.filter((name) => name !== baseName)) {
  const current = flatten(await readJson(locale));
  const missing = Object.keys(base).filter((key) => !(key in current));
  const extra = Object.keys(current).filter((key) => !(key in base));
  if (missing.length || extra.length) {
    failed = true;
    console.error(`${locale} key mismatch`);
    if (missing.length) console.error(`  missing: ${missing.join(", ")}`);
    if (extra.length) console.error(`  extra: ${extra.join(", ")}`);
  }
}

const rawVisibleKeyPattern =
  />\s*[^<\n]*(navigation\.drawer|navigation\.locales|Home\.heroImageAlt|Home\.productTag|(?<![a-z])Vlm\.|(?<![a-z])Legal\.|(?<![a-z])Token\.)[^<\n]*</;
const wrongTranslationCallPattern =
  /\bt\(\s*["'`](navigation\.|Home\.|Vlm\.|Wallet\.|Legal\.|Token\.)/;
const hardcodedPattern =
  />\s*(Shop|Buy VLM|Connect Wallet|Connect wallet|Smart Contract|Public Sale|Subscribe|VIP|Checkout)\s*</;
const staleVisiblePattern =
  />\s*[^<\n]*(Riemann constraints|impenetrable|secured by Bajak|Phantom connection rejected|15,000 VLM|Social Media|Paryż|Warszawa|On-chain|Audio Wył)[^<\n]*</i;

for (const file of [...(await walk(appDir)), ...(await walk(componentsDir))]) {
  const source = await readFile(file, "utf8");
  if (
    rawVisibleKeyPattern.test(source) ||
    wrongTranslationCallPattern.test(source) ||
    hardcodedPattern.test(source) ||
    staleVisiblePattern.test(source)
  ) {
    failed = true;
    console.error(`possible visible i18n issue: ${file.pathname}`);
  }
}

for (const locale of locales) {
  const text = await readFile(new URL(locale, messagesDir), "utf8");
  if (/Buy VLM|Audio off|Audio wy|Social Media|Paryż|Warszawa|On-chain|Riemann constraints|impenetrable|secured by Bajak|15,000 VLM/.test(text)) {
    failed = true;
    console.error(`stale visible copy in ${locale}`);
  }
}

if (failed) process.exit(1);
console.log(`i18n ok across ${locales.length} locale files`);
