#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const mappingPath = path.join(root, "config/pass23/i18n-final-translations.json");
const mapping = JSON.parse(fs.readFileSync(mappingPath, "utf8"));

function tokens(key) {
  const out = [];
  for (const part of key.split(".")) {
    const match = /^([^[]+)(.*)$/u.exec(part);
    if (!match) throw new Error(`Invalid path segment: ${part}`);
    out.push(match[1]);
    for (const index of match[2].matchAll(/\[(\d+)\]/gu)) out.push(Number(index[1]));
  }
  return out;
}

function getAt(object, key) {
  let cursor = object;
  for (const token of tokens(key)) cursor = cursor?.[token];
  return cursor;
}
function setAt(object, key, value) {
  const parts = tokens(key);
  let cursor = object;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const token = parts[index];
    if (cursor?.[token] === undefined) throw new Error(`Missing translation path: ${key}`);
    cursor = cursor[token];
  }
  cursor[parts.at(-1)] = value;
}
function placeholders(value) {
  return [...String(value).matchAll(/\{[^{}]+\}/gu)].map((row) => row[0]).sort();
}

const localeFiles = {
  en: path.join(root, "messages/en.json"),
  pl: path.join(root, "messages/pl.json"),
  de: path.join(root, "messages/de.json")
};
const messages = Object.fromEntries(Object.entries(localeFiles).map(([locale, file]) => [locale, JSON.parse(fs.readFileSync(file, "utf8"))]));
const failures = [];
const seen = new Set();
for (const row of mapping.translations ?? []) {
  if (seen.has(row.key)) failures.push(`${row.key}:duplicate_mapping`);
  seen.add(row.key);
  const english = getAt(messages.en, row.key);
  if (typeof english !== "string") failures.push(`${row.key}:missing_english_source`);
  for (const locale of ["pl", "de"]) {
    if (typeof row[locale] !== "string" || !row[locale].trim()) failures.push(`${row.key}:${locale}:missing_translation`);
    if (JSON.stringify(placeholders(row[locale])) !== JSON.stringify(placeholders(english))) failures.push(`${row.key}:${locale}:placeholder_mismatch`);
  }
  if (!failures.some((value) => value.startsWith(`${row.key}:`))) {
    setAt(messages.pl, row.key, row.pl);
    setAt(messages.de, row.key, row.de);
  }
}
if ((mapping.translations ?? []).length !== 300) failures.push(`expected_300_mappings_got_${mapping.translations?.length ?? 0}`);
if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}
for (const locale of ["pl", "de"]) fs.writeFileSync(localeFiles[locale], `${JSON.stringify(messages[locale], null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: true, translationsApplied: mapping.translations.length, locales: ["pl", "de"] }, null, 2));
