import {  errors, read } from "./context.mjs";

import { setGuardScope } from "./context.mjs";



setGuardScope("pf.runtime-release.012");

// AI risk brain scenario guard
try {
  const scenarioSource = read("scripts/verify-ai-risk-brain-scenarios.mjs");
  for (const needle of [
    "mega_cap_normal_volatility",
    "stablecoin_depeg",
    "low_float_parabolic_pump",
    "contract_trap",
    "no_data_token",
  ]) {
    if (!scenarioSource.includes(needle))
      errors.pushWithId.bind(errors, "release.012.scripts-verify-ai-risk-brain-scenarios-missing-scenario.a001.scripts-verify-ai-risk-brain-scenarios-missing-scenario")(
        `scripts/verify-ai-risk-brain-scenarios.mjs: missing scenario ${needle}.`,
      );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "release.012.scripts-verify-ai-risk-brain-scenarios-missing-scenario.a002.ai-risk-brain-scenario-guard-failed-value")(
    `AI risk brain scenario guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.runtime-release.013");

// AI brain import contract production guard
try {
  const riskFacadeSource = read("lib/market-integrity/risk-engine.ts");
  const riskProfileSource = read("lib/market-integrity/risk-engine-profile.ts");
  const riskModelSource = read("lib/market-integrity/risk-engine-model.ts");
  const riskSource = `${riskFacadeSource}\n${riskProfileSource}\n${riskModelSource}`;
  const typeSource = read("lib/market-integrity/risk-types.ts");
  const promptSource = read(
    "docs/codex-handoff/CODEX_AI_RISK_BRAIN_ONLY_ONE_FILE_PASS3_PROMPT.md",
  );
  for (const [needle, message] of [
    [
      "export function analyzeTokenRisk",
      "analyzeTokenRisk export must remain.",
    ],
    ["computeDataConfidence", "computeDataConfidence must remain."],
    ["buildLimitations", "buildLimitations must remain."],
    ["computeFusedRiskScore", "computeFusedRiskScore must remain."],
    ["buildMetaModel", "buildMetaModel must remain."],
    ["OSINT source ledger not attached", "OSINT limitation must remain."],
    ["vesting/unlock schedule not verified", "vesting limitation must remain."],
  ]) {
    if (!riskSource.includes(needle))
      errors.pushWithId.bind(errors, "release.013.lib-market-integrity-risk-engine-value.a001.lib-market-integrity-risk-engine-value")(`lib/market-integrity/risk-engine.ts: ${message}`);
  }
  for (const forbidden of [
    "fetch(",
    "window.",
    "document.",
    "localStorage",
    "as any",
    "safe investment",
    "scam confirmed",
    "fraud proven",
    "buy signal",
    "sell signal",
  ]) {
    if (riskSource.toLowerCase().includes(forbidden.toLowerCase()))
      errors.pushWithId.bind(errors, "release.013.lib-market-integrity-risk-engine-value.a002.lib-market-integrity-risk-engine-forbidden-risk-engine-c")(
        `lib/market-integrity/risk-engine.ts: forbidden risk-engine content "${forbidden}".`,
      );
  }
  const unionMatch = typeSource.match(/export type RiskSignalId =([\s\S]*?);/);
  if (unionMatch) {
    const allowed = new Set(
      [...unionMatch[1].matchAll(/\|\s+"([^"]+)"/g)].map((match) => match[1]),
    );
    for (const match of riskSource.matchAll(
      /addSignal\(signals,\s*\{[\s\S]*?id:\s+"([^"]+)"/g,
    )) {
      if (!allowed.has(match[1]))
        errors.pushWithId.bind(errors, "release.013.lib-market-integrity-risk-engine-value.a003.lib-market-integrity-risk-engine-signal-id-value-is-miss")(
          `lib/market-integrity/risk-engine.ts: signal id "${match[1]}" is missing from RiskSignalId union.`,
        );
    }
  }
  if (
    !promptSource.includes("edytować dokładnie jeden plik") ||
    !promptSource.includes("NIE OTWIERAJ pełnego repo Velmère")
  ) {
    errors.pushWithId.bind(errors, "release.013.lib-market-integrity-risk-engine-value.a004.docs-codex-handoff-codex-ai-risk-brain-only-one-file-leg")(
      "docs/codex-handoff/CODEX_AI_RISK_BRAIN_ONLY_ONE_FILE_PASS3_PROMPT.md: prompt must force one-file codex workflow.",
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "release.013.lib-market-integrity-risk-engine-value.a005.ai-brain-import-contract-production-guard-failed-value")(
    `AI brain import contract production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.runtime-release.014");

// Locale surface production guard
try {
  const footerSource = read("components/Footer.tsx");
  const homeSource = read("components/home/HomePageClient.tsx");
  const shieldMapSource = read(
    "components/market-integrity/ShieldMapClient.tsx",
  );
  if (
    !footerSource.includes("function footerCopy(locale: string)") ||
    !footerSource.includes("useLocale()")
  ) {
    errors.pushWithId.bind(errors, "release.014.components-footerx-footer-must-use-locale-aware-copy.a001.components-footerx-footer-must-use-locale-aware-copy")("components/Footer.tsx: footer must use locale-aware copy.");
  }
  if (
    !homeSource.includes("function homeCopy(locale: string)") ||
    !(
      homeSource.includes("const copy = homeCopy(useLocale())") ||
      homeSource.includes("const copy = homeCopy(locale)")
    )
  ) {
    errors.pushWithId.bind(errors, "release.014.components-footerx-footer-must-use-locale-aware-copy.a002.components-home-homepageclientx-homepage-must-use-locale")(
      "components/home/HomePageClient.tsx: homepage must use locale-aware copy.",
    );
  }
  for (const needle of [
    "const pageCopy = useMemo",
    "const atlasNodes = useMemo",
    "const commandRoomCards = useMemo",
    "const brainImportLanes = useMemo",
  ]) {
    if (!shieldMapSource.includes(needle))
      errors.pushWithId.bind(errors, "release.014.components-footerx-footer-must-use-locale-aware-copy.a003.components-market-integrity-shieldmapclientx-missing-loc")(
        `components/market-integrity/ShieldMapClient.tsx: missing locale-aware block ${needle}.`,
      );
  }
  if (/"\{pageCopy\./.test(shieldMapSource)) {
    errors.pushWithId.bind(errors, "release.014.components-footerx-footer-must-use-locale-aware-copy.a004.components-market-integrity-shieldmapclientx-pagecopy-pl")(
      "components/market-integrity/ShieldMapClient.tsx: pageCopy placeholder found inside a string literal.",
    );
  }
} catch (error) {
  errors.pushWithId.bind(errors, "release.014.components-footerx-footer-must-use-locale-aware-copy.a005.locale-surface-production-guard-failed-value")(
    `Locale surface production guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
