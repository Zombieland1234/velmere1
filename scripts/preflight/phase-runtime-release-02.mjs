import {  errors, read } from "./context.mjs";
import { setGuardScope } from "./context.mjs";

setGuardScope("pf.runtime-release.015");
// VLM brain performance guard
try {
  const modalFile = "components/market-integrity/TokenRiskModal.tsx";
  const modalSource = read(modalFile);
  const vlmForbidden = [
    [
      "RISK ${riskScore}%",
      "Duplicated risk score under the VLM orb must not return.",
    ],
    [
      "ctx.fillText(`RISK",
      "Canvas risk text under the VLM orb must not return.",
    ],
    [
      "Math.random()",
      "VLM brain graph should use deterministic seeded randomness, not Math.random().",
    ],
    ["((index % 5)", "Old undefined index transform bug must not return."],
    ["(index % 4)", "Old undefined index transform bug must not return."],
  ];
  for (const [needle, message] of vlmForbidden) {
    if (modalSource.includes(needle)) errors.pushWithId.bind(errors, "release.015.value-value.a001.value-value")(`${modalFile}: ${message}`);
  }
  const vlmRequired = [
    ["maxAnimationLife", "Canvas animation should have a hard max lifetime."],
    [
      "idleFrameBudget",
      "Canvas animation should slow down after the readout is complete.",
    ],
    [
      "randomFrom",
      "VLM brain should use deterministic seeded graph generation.",
    ],
    [
      "advancedTileStyle",
      "Advanced tiles should use the typed 3D cockpit placement helper.",
    ],
    [
      "shield-vlm-tile-anchor",
      "Advanced tile anchors should be present to control 3D placement and overlap.",
    ],
    [
      "prefers-reduced-motion: reduce",
      "Reduced-motion mode should be respected.",
    ],
  ];
  for (const [needle, message] of vlmRequired) {
    if (!modalSource.includes(needle)) errors.pushWithId.bind(errors, "release.015.value-value.a002.value-value")(`${modalFile}: ${message}`);
  }
} catch (error) {
  errors.pushWithId.bind(errors, "release.015.value-value.a003.vlm-brain-performance-guard-failed-value")(
    `VLM brain performance guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}


setGuardScope("pf.runtime-release.016");
// Risk engine production guard
try {
  const riskFile = "lib/market-integrity/risk-engine.ts";
  const riskSource = read(riskFile);
  const riskForbidden = [
    [
      "result.limitations",
      "Limitations must live in metaModel.limitations, not result.limitations.",
    ],
    ["RISK {riskScore}%", "Old duplicated VLM orb risk text must not return."],
    ["odczyt ryzyka", "Old duplicated Polish risk text must not return."],
    ["risk extraction", "Old duplicated English risk text must not return."],
    ["((index % 5)", "Old undefined index transform bug must not return."],
    ["(index % 4)", "Old undefined index transform bug must not return."],
  ];
  for (const [needle, message] of riskForbidden) {
    if (riskSource.includes(needle)) errors.pushWithId.bind(errors, "release.016.value-value.a001.value-value")(`${riskFile}: ${message}`);
  }
  if (
    /\[\s*\.\.\.\s*[^;\n]*(?:\.values\(\)|\.keys\(\)|\.entries\(\))/.test(
      riskSource,
    )
  ) {
    errors.pushWithId.bind(errors, "release.016.value-value.a002.value-do-not-spread-map-set-iterators-directly-use-array")(
      `${riskFile}: do not spread Map/Set iterators directly; use Array.from(...) for Vercel target safety.`,
    );
  }
  if (!/export function analyzeTokenRisk\s*\(/.test(riskSource))
    errors.pushWithId.bind(errors, "release.016.value-value.a003.value-analyzetokenrisk-export-is-missing")(`${riskFile}: analyzeTokenRisk export is missing.`);
  if (!/export function levelFromScore\s*\(/.test(riskSource))
    errors.pushWithId.bind(errors, "release.016.value-value.a004.value-levelfromscore-export-is-missing")(`${riskFile}: levelFromScore export is missing.`);
  if (!/export function badgeFromLevel\s*\(/.test(riskSource))
    errors.pushWithId.bind(errors, "release.016.value-value.a005.value-badgefromlevel-export-is-missing")(`${riskFile}: badgeFromLevel export is missing.`);
  if (
    /\b(buy now|safe buy|guaranteed profit|scam proven|fraud confirmed|moon|easy money)\b/i.test(
      riskSource,
    )
  ) {
    errors.pushWithId.bind(errors, "release.016.value-value.a006.value-unsafe-hype-advice-legal-accusation-language-found")(
      `${riskFile}: unsafe hype/advice/legal-accusation language found.`,
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "release.016.value-value.a007.risk-engine-production-guard-failed-value")(
    `Risk engine production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
