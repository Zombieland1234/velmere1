import { validateA58 as validateLegacyA58 } from "./verify-a102r41-clean-unpack.mjs";
import {
  R44P46_A58_RESULT_SCHEMA,
  validateR44P46A58Result,
} from "./r44p46-a58-release-integrity-lib.mjs";
import {
  PARENT_REVISION_ID,
  REVISION_ID,
  SOURCE_MANIFEST_PATH,
  SOURCE_MANIFEST_SCHEMA,
} from "./r44p46-packaging-lib.mjs";

const R44P46_PROFILE = "R44P46_SOURCE_ONLY_MANIFEST_V1";
const isRecord = (value) => value !== null
  && typeof value === "object"
  && !Array.isArray(value);

export function a58ResultValidatorProfile(a60Policy) {
  const r44p46Discriminators = [
    ["currentSourceProfile", R44P46_PROFILE],
    ["sourceManifestSchema", SOURCE_MANIFEST_SCHEMA],
    ["currentSourceRevisionId", REVISION_ID],
    ["currentSourceParentRevisionId", PARENT_REVISION_ID],
    ["sourceManifestPath", SOURCE_MANIFEST_PATH],
  ];
  const exactR44P46 = isRecord(a60Policy)
    && r44p46Discriminators.every(
      ([key, expected]) => a60Policy[key] === expected,
    );
  if (exactR44P46) {
    return {
      id: "R44P46_CANONICAL_SOURCE_MANIFEST",
      resultSchema: R44P46_A58_RESULT_SCHEMA,
      legacyFixedCountContract: false,
    };
  }
  const hasR44P46Signal = isRecord(a60Policy)
    && r44p46Discriminators.some(
      ([key, expected]) => a60Policy[key] === expected,
    );
  const legacyCompatible = isRecord(a60Policy)
    && a60Policy.currentSourceProfile == null
    && a60Policy.sourceManifestSchema == null
    && typeof a60Policy.currentSourceRevisionId === "string"
    && a60Policy.currentSourceRevisionId.length > 0
    && typeof a60Policy.currentSourceParentRevisionId === "string"
    && a60Policy.currentSourceParentRevisionId.length > 0
    && typeof a60Policy.sourceManifestPath === "string"
    && a60Policy.sourceManifestPath.length > 0;
  if (!hasR44P46Signal && legacyCompatible) {
    return {
      id: "LEGACY_R40_TO_R44_A58",
      resultSchema: "velmere.pass36.a58.release-integrity-verification.v1",
      legacyFixedCountContract: true,
    };
  }
  return {
    id: "INVALID_OR_PARTIAL_CURRENT_SOURCE_PROFILE",
    resultSchema: null,
    legacyFixedCountContract: false,
  };
}

export function validateA58ResultForA60(parsed, a60Policy) {
  const profile = a58ResultValidatorProfile(a60Policy);
  if (profile.id === "R44P46_CANONICAL_SOURCE_MANIFEST") {
    return validateR44P46A58Result(parsed);
  }
  if (profile.id === "LEGACY_R40_TO_R44_A58") {
    return validateLegacyA58(parsed);
  }
  return false;
}
