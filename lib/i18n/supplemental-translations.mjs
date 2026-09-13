import keys1 from "../../config/pass23/i18n-supplemental/keys-1.mjs";
import keys2 from "../../config/pass23/i18n-supplemental/keys-2.mjs";
import values1 from "../../config/pass23/i18n-supplemental/values-1.mjs";
import values2 from "../../config/pass23/i18n-supplemental/values-2.mjs";
import values3 from "../../config/pass23/i18n-supplemental/values-3.mjs";
import values4 from "../../config/pass23/i18n-supplemental/values-4.mjs";

export const supplementalTranslationMeta = Object.freeze({
  schemaVersion: "velmere.pass23.i18n-supplemental-manifest.v3",
  sourceSubjectSha: "c9e194e21804c55c27ccecfac537814d62a66493",
  sourceReceiptArtifactRunId: 34753738993,
  sourceReceiptMergeSha: "7b3a6317d33b19e7b6903fb1b073d15fef4bfb78",
  reviewStatus: "PENDING_NATIVE_REVIEW",
  expectedKeyCount: 359,
  expectedSourceValueCount: 211,
  sortedKeySha256: "186fa57a9e3eef7e8b4729284bb94964427042b0e496a29439d0e638d5ebebdc",
  sourceRowsSha256: "b2f7f6d35813a0c7a0c38664f41e0d5ef794fd3ac1d2d1f6970d0a87af6501f3",
});

const keys = [...keys1, ...keys2];
if (keys.length !== supplementalTranslationMeta.expectedKeyCount) throw new Error("supplemental_key_denominator_mismatch");
if (new Set(keys).size !== keys.length) throw new Error("supplemental_key_duplicate");

const valueMap = {};
for (const shard of [values1, values2, values3, values4]) {
  for (const [source, translated] of Object.entries(shard)) {
    if (Object.prototype.hasOwnProperty.call(valueMap, source)) throw new Error(`supplemental_source_duplicate:${source}`);
    if (!translated || typeof translated.pl !== "string" || typeof translated.de !== "string") throw new Error(`supplemental_source_translation_invalid:${source}`);
    valueMap[source] = Object.freeze({ pl: translated.pl, de: translated.de });
  }
}
if (Object.keys(valueMap).length !== supplementalTranslationMeta.expectedSourceValueCount) throw new Error("supplemental_source_denominator_mismatch");

export const supplementalTranslations = Object.freeze({
  ...supplementalTranslationMeta,
  keys: Object.freeze(keys),
  valueMap: Object.freeze(valueMap),
});
