#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { applyTranslationWave } from "../../lib/i18n/merge-messages.mjs";

const root = process.cwd();
const results = [];
function expect(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: String(error?.message ?? error) });
  }
}
function expectThrows(name, expected, fn) {
  try {
    fn();
    results.push({ name, ok: false, error: "did_not_throw" });
  } catch (error) {
    const message = String(error?.message ?? error);
    results.push({ name, ok: message.startsWith(expected), error: message.startsWith(expected) ? null : message });
  }
}

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
expectThrows("missing_path_fails_closed", "translation_path_missing:", () => {
  applyTranslationWave({ present: "x" }, [{ key: "missing", pl: "x", de: "x" }], "pl");
});
expectThrows("duplicate_key_fails_closed", "translation_key_duplicate:", () => {
  applyTranslationWave({ a: "x" }, [{ key: "a", pl: "1", de: "1" }, { key: "a", pl: "2", de: "2" }], "pl");
});
expectThrows("prototype_path_fails_closed", "translation_key_unsafe:", () => {
  applyTranslationWave({ safe: "x" }, [{ key: "__proto__.polluted", pl: "x", de: "x" }], "pl");
});
expectThrows("unsupported_locale_fails_closed", "translation_locale_unsupported:", () => {
  applyTranslationWave({ a: "x" }, [{ key: "a", pl: "1", de: "1" }], "en");
});
expect("full_300_record_wave_binds_to_current_pl_and_de_catalogs", () => {
  const wave = JSON.parse(fs.readFileSync(path.join(root, "config/pass23/i18n-final-translations.json"), "utf8"));
  if (!Array.isArray(wave.translations) || wave.translations.length !== 300) throw new Error("translation_wave_denominator_mismatch");
  for (const locale of ["pl", "de"]) {
    const base = JSON.parse(fs.readFileSync(path.join(root, `messages/${locale}.json`), "utf8"));
    const before = JSON.stringify(base);
    applyTranslationWave(base, wave.translations, locale);
    if (JSON.stringify(base) !== before) throw new Error(`base_mutated:${locale}`);
  }
});

const failed = results.filter((row) => !row.ok);
console.log(JSON.stringify({ schemaVersion: "velmere.pass23.i18n-translation-wave-tests.v1", tests: results.length, passed: results.length - failed.length, failed: failed.length, results, truthBoundary: "These tests prove deterministic draft-wave binding and fail-closed path handling only. They do not prove translation quality, native-language review or browser rendering." }, null, 2));
if (failed.length > 0) process.exit(1);
