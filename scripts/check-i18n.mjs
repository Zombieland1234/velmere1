import { readdir, readFile } from "node:fs/promises";

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

function matchRule(source, rule) {
  const match = source.match(rule.pattern);
  if (!match) return null;
  return {
    ruleId: rule.id,
    snippet: match[0].replace(/\s+/gu, " ").trim().slice(0, 320),
  };
}

const locales = (await readdir(messagesDir)).filter((file) => file.endsWith(".json"));
const baseName = "en.json";
const base = flatten(await readJson(baseName));
let failed = false;
let localeMismatchCount = 0;
let sourceIssueCount = 0;
let staleLocaleCopyCount = 0;

for (const locale of locales.filter((name) => name !== baseName)) {
  const current = flatten(await readJson(locale));
  const missing = Object.keys(base).filter((key) => !(key in current));
  const extra = Object.keys(current).filter((key) => !(key in base));
  if (missing.length || extra.length) {
    failed = true;
    localeMismatchCount += 1;
    console.error(`${locale} key mismatch`);
    if (missing.length) console.error(`  missing: ${missing.join(", ")}`);
    if (extra.length) console.error(`  extra: ${extra.join(", ")}`);
  }
}

const sourceRules = [
  {
    id: "RAW_VISIBLE_TRANSLATION_KEY",
    pattern: />\s*[^<\n]*(navigation\.drawer|navigation\.locales|Home\.heroImageAlt|Home\.productTag|(?<![a-z])Vlm\.|(?<![a-z])Legal\.|(?<![a-z])Token\.)[^<\n]*</,
  },
  {
    id: "WRONG_TRANSLATION_CALL_NAMESPACE",
    pattern: /\bt\(\s*["'`](navigation\.|Home\.|Vlm\.|Wallet\.|Legal\.|Token\.)/,
  },
  {
    id: "HARDCODED_VISIBLE_CTA",
    pattern: />\s*(Shop|Buy VLM|Connect Wallet|Connect wallet|Smart Contract|Public Sale|Subscribe|VIP|Checkout)\s*</,
  },
  {
    id: "STALE_VISIBLE_COPY",
    pattern: />\s*[^<\n]*(Riemann constraints|impenetrable|secured by Bajak|Phantom connection rejected|15,000 VLM|Social Media|Paryż|Warszawa|On-chain|Audio Wył)[^<\n]*</i,
  },
];

const sourceFiles = [...(await walk(appDir)), ...(await walk(componentsDir))];
for (const file of sourceFiles) {
  const source = await readFile(file, "utf8");
  const matches = sourceRules.map((rule) => matchRule(source, rule)).filter(Boolean);
  if (matches.length) {
    failed = true;
    sourceIssueCount += 1;
    for (const match of matches) {
      console.error(`possible visible i18n issue [${match.ruleId}]: ${file.pathname}`);
      console.error(`  match: ${match.snippet}`);
    }
  }
}

const staleLocalePattern = /Buy VLM|Audio off|Audio wy|Social Media|Paryż|Warszawa|On-chain|Riemann constraints|impenetrable|secured by Bajak|15,000 VLM/;
for (const locale of locales) {
  const text = await readFile(new URL(locale, messagesDir), "utf8");
  const match = text.match(staleLocalePattern);
  if (match) {
    failed = true;
    staleLocaleCopyCount += 1;
    console.error(`stale visible copy in ${locale}: ${match[0]}`);
  }
}

const summary = {
  localeFiles: locales.length,
  sourceFiles: sourceFiles.length,
  localeMismatchCount,
  sourceIssueCount,
  staleLocaleCopyCount,
  ok: !failed,
};
console.log(`i18n summary: ${JSON.stringify(summary)}`);
if (failed) process.exit(1);
console.log(`i18n ok across ${locales.length} locale files`);
