#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { applyTranslationKeyValueMap, applyTranslationWave } from "../../lib/i18n/merge-messages.mjs";

const root = process.cwd();
const results = [];
function expect(name, fn) {
  try { fn(); results.push({ name, ok: true }); }
  catch (error) { results.push({ name, ok: false, error: String(error?.message ?? error) }); }
}
function expectThrows(name, expected, fn) {
  try { fn(); results.push({ name, ok: false, error: "did_not_throw" }); }
  catch (error) {
    const message = String(error?.message ?? error);
    results.push({ name, ok: message.startsWith(expected), error: message.startsWith(expected) ? null : message });
  }
}
function readJson(relative) { return JSON.parse(fs.readFileSync(path.join(root, relative), "utf8")); }
function sortedKeySha256(keys) { return crypto.createHash("sha256").update([...keys].sort().join("\n")).digest("hex"); }

expect("updates_existing_path_without_mutating_base", () => {
  const base = { section: { label: "Label" } };
  const result = applyTranslationWave(base, [{ key: "section.label", pl: "Etykieta", de: "Bezeichnung" }], "pl");
  if (result.section.label !== "Etykieta") throw new Error("translation_not_applied");
  if (base.section.label !== "Label") throw new Error("base_mutated");
});
expect("updates_array_element_without_dropping_siblings", () => {
  const base = { requirements: ["One", "Two", "Three"] };
  const result = applyTranslationWave(base, [{ key: "requirements[1]", pl: "Dwa", de: "Zwei" }], "de");
  if (JSON.stringify(result.requirements) !== JSON.stringify(["One", "Zwei", "Three"])) throw new Error("array_sibling_loss");
});
expectThrows("missing_path_fails_closed", "translation_path_missing:", () => applyTranslationWave({ present: "x" }, [{ key: "missing", pl: "x", de: "x" }], "pl"));
expectThrows("duplicate_key_fails_closed", "translation_key_duplicate:", () => applyTranslationWave({ a: "x" }, [{ key: "a", pl: "1", de: "1" }, { key: "a", pl: "2", de: "2" }], "pl"));
expectThrows("prototype_path_fails_closed", "translation_key_unsafe:", () => applyTranslationWave({ safe: "x" }, [{ key: "__proto__.polluted", pl: "x", de: "x" }], "pl"));
expectThrows("unsupported_locale_fails_closed", "translation_locale_unsupported:", () => applyTranslationWave({ a: "x" }, [{ key: "a", pl: "1", de: "1" }], "en"));
expectThrows("supplemental_source_drift_fails_closed", "translation_source_unmapped:", () => applyTranslationKeyValueMap({ a: "changed" }, { keys:["a"], expectedKeyCount:1, expectedSourceValueCount:1, valueMap:{ original:{ pl:"x", de:"y" } } }, "pl"));
expectThrows("supplemental_duplicate_key_fails_closed", "translation_key_duplicate:", () => applyTranslationKeyValueMap({ a:"source" }, { keys:["a","a"], valueMap:{ source:{ pl:"x", de:"y" } } }, "pl"));

expect("primary_300_and_supplemental_359_bind_to_current_catalogs", () => {
  const primary = readJson("config/pass23/i18n-final-translations.json");
  const supplemental = readJson("config/pass23/i18n-supplemental-value-map.json");
  if (!Array.isArray(primary.translations) || primary.translations.length !== 300) throw new Error("primary_translation_denominator_mismatch");
  if (!Array.isArray(supplemental.keys) || supplemental.keys.length !== 359) throw new Error("supplemental_translation_denominator_mismatch");
  if (Object.keys(supplemental.valueMap ?? {}).length !== 211) throw new Error("supplemental_source_value_denominator_mismatch");
  if (supplemental.sourceSubjectSha !== "c9e194e21804c55c27ccecfac537814d62a66493") throw new Error("supplemental_source_subject_mismatch");
  if (supplemental.reviewStatus !== "PENDING_NATIVE_REVIEW") throw new Error("supplemental_false_review_status");
  if (new Set(supplemental.keys).size !== 359) throw new Error("supplemental_duplicate_key");
  if (sortedKeySha256(supplemental.keys) !== supplemental.sortedKeySha256) throw new Error("supplemental_key_digest_mismatch");
  const primaryKeys = new Set(primary.translations.map((row) => row.key));
  if (supplemental.keys.some((key) => primaryKeys.has(key))) throw new Error("cross_wave_duplicate_key");
  for (const locale of ["pl", "de"]) {
    const base = readJson(`messages/${locale}.json`);
    const before = JSON.stringify(base);
    const afterPrimary = applyTranslationWave(base, primary.translations, locale);
    const afterSupplemental = applyTranslationKeyValueMap(afterPrimary, supplemental, locale);
    if (JSON.stringify(base) !== before) throw new Error(`base_mutated:${locale}`);
    if (JSON.stringify(afterSupplemental) === JSON.stringify(afterPrimary)) throw new Error(`supplemental_no_effect:${locale}`);
  }
});

const failed = results.filter((row) => !row.ok);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass23.i18n-translation-wave-tests.v3",
  tests: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  primaryTranslations: 300,
  supplementalTranslationKeys: 359,
  supplementalSourceValues: 211,
  effectiveDraftTranslations: 659,
  results,
  truthBoundary: "These tests prove deterministic source-bound application of the 300-value path wave plus the 359-key supplemental value-map and fail-closed drift handling only. They do not prove translation quality, native-language review, legal review or browser rendering."
}, null, 2));
if (failed.length > 0) process.exit(1);
