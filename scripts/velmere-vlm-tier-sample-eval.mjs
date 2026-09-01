import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const PASS_ID = "pass2176-vlm-output-eval-v1";
const generatedAt = new Date().toISOString();
const repoRoot = process.cwd();
const reportsDir = path.join(repoRoot, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const assets = [
  { id: "btc", symbol: "BTC", name: "Bitcoin", assetClass: "crypto" },
  { id: "eth", symbol: "ETH", name: "Ethereum", assetClass: "crypto" },
  { id: "nvda", symbol: "NVDA", name: "NVIDIA", assetClass: "equity" },
  { id: "gold", symbol: "GOLD", name: "Gold", assetClass: "commodity" },
  { id: "eurusd", symbol: "EUR/USD", name: "Euro / US Dollar", assetClass: "fx" },
  { id: "suspicious-token", symbol: "SUSP", name: "Suspicious Token", assetClass: "token_risk" },
];
const tiers = ["basic", "pro", "advanced"];
const locales = ["pl", "en", "de"];
const budgets = {
  basic: { facts: 8, findings: 8, sources: 3, contradictions: 1, missing: 3, next: 3, access: "free" },
  pro: { facts: 14, findings: 13, sources: 6, contradictions: 3, missing: 6, next: 5, access: "free" },
  advanced: { facts: 22, findings: 20, sources: 10, contradictions: 6, missing: 9, next: 8, access: "paid_advanced" },
};

function copy(locale) {
  if (locale === "de") {
    return {
      source: "Quelle",
      missing: "Fehlende Daten begrenzen die Konfidenz",
      noAdvice: "Dies ist keine Anlageberatung und bestätigt keine Sicherheit des Assets.",
      brief: "Risikoprüfung mit Quellen, Datenlücken und ruhiger Entscheidungshilfe.",
      change: "Was die Einschätzung ändern würde: frische unabhängige Quellen und ein sauberer Gegenbeweis zum Hauptsignal.",
      contradiction: "Contradiction Scan prüft widersprüchliche Provider-Signale.",
    };
  }
  if (locale === "en") {
    return {
      source: "Source",
      missing: "Missing data limits confidence",
      noAdvice: "This is not investment advice and does not certify asset safety.",
      brief: "Risk review with sources, data gaps and calm decision support.",
      change: "What would change the assessment: fresh independent sources and a clean counter-signal to the main risk.",
      contradiction: "Contradiction scan checks conflicting provider signals.",
    };
  }
  return {
    source: "Źródło",
    missing: "Brakujące dane ograniczają pewność",
    noAdvice: "To nie jest porada inwestycyjna i nie potwierdza bezpieczeństwa aktywa.",
    brief: "Analiza ryzyka ze źródłami, brakami danych i spokojną pomocą decyzyjną.",
    change: "Co zmieniłoby ocenę: świeże niezależne źródła i czysty kontrsygnał wobec głównego ryzyka.",
    contradiction: "Contradiction scan sprawdza sprzeczne sygnały providerów.",
  };
}

function sampleOutput(asset, depth, locale) {
  const b = budgets[depth];
  const c = copy(locale);
  const now = generatedAt;
  const sources = Array.from({ length: b.sources }, (_, i) => ({
    id: `src-${asset.id}-${i + 1}`,
    provider: i % 3 === 0 ? "market_provider" : i % 3 === 1 ? "chain_provider" : "news_or_filing_provider",
    label: `${c.source} ${i + 1} for ${asset.symbol}`,
    observedAt: now,
    quality: Math.max(62, 94 - i * 3),
  }));
  const sourceIds = sources.map((source) => source.id);
  const facts = Array.from({ length: b.facts }, (_, i) => ({
    id: `fact-${i + 1}`,
    label: `${asset.symbol} confirmed signal ${i + 1}`,
    value: i % 2 === 0 ? "confirmed but conditional" : i + 1,
    sourceIds: [sourceIds[i % sourceIds.length]],
    observedAt: now,
    freshness: i % 5 === 0 ? "aging" : "fresh",
  }));
  const keyFindings = Array.from({ length: b.findings }, (_, i) => ({
    id: `finding-${i + 1}`,
    title: `${asset.symbol} ${depth} finding ${i + 1}`,
    explanation: `${c.brief} Finding ${i + 1} links visible evidence to a bounded risk interpretation and keeps uncertainty explicit. ${c.noAdvice}`,
    severity: i % 5 === 0 ? "warning" : i % 3 === 0 ? "watch" : "info",
    confidence: Math.max(58, 86 - (i % 7)),
    sourceIds: [sourceIds[i % sourceIds.length]],
  }));
  const contradictions = Array.from({ length: b.contradictions }, (_, i) => ({
    description: `${c.contradiction} Item ${i + 1} is kept conditional until another provider confirms it.`,
    sourceIds: [sourceIds[i % sourceIds.length], sourceIds[(i + 1) % sourceIds.length]],
  }));
  const missingData = Array.from({ length: b.missing }, (_, i) => `${c.missing}: ${asset.symbol} missing-data lane ${i + 1}.`);
  const nextChecks = Array.from({ length: b.next }, (_, i) => `${asset.symbol} next check ${i + 1}: refresh source and compare with a second provider.`);
  if (depth === "advanced") nextChecks.push(c.change);
  const advancedLine = depth === "advanced" ? ` ${c.change} ${c.contradiction} Evidence mode keeps a proof capsule and operator appendix boundary.` : "";
  return {
    schemaVersion: "velmere.vlm.output.v3",
    traceId: randomUUID(),
    generatedAt: now,
    locale,
    depth,
    providerMode: "deterministic_fallback",
    asset,
    verdict: asset.id === "suspicious-token" ? "high_risk" : depth === "basic" ? "observe" : "review",
    headline: `${asset.symbol} ${depth} risk note`,
    summary: `${c.brief} ${asset.symbol} ${depth} summary uses source honesty, missing data and no ROI promise.${advancedLine}`,
    confidence: depth === "advanced" ? 78 : depth === "pro" ? 72 : 64,
    facts,
    keyFindings,
    contradictions,
    missingData,
    nextChecks,
    sources,
    report: {
      executiveSummary: `${asset.symbol}: ${c.brief} ${c.noAdvice}${advancedLine}`,
      marketStructure: `${asset.symbol} market structure is evaluated through supported facts, not hype. ${c.missing}.`,
      liquidityAnalysis: `${asset.symbol} liquidity view remains conditional and requires source freshness checks. ${c.noAdvice}`,
      holderAnalysis: `${asset.symbol} holder analysis names visible limits instead of pretending complete proof. ${c.missing}.`,
      contractAnalysis: `${asset.symbol} contract or instrument lane is bounded by available provider data. ${c.noAdvice}`,
      sourceAssessment: `Every claim must reference a known source id. ${c.missing}.`,
      riskScenarios: `Scenario matrix stays calm and avoids ROI/FOMO language. ${advancedLine || c.brief}`,
      conclusion: `${c.noAdvice} ${depth === "advanced" ? c.change : c.missing}.`,
    },
    diagnostics: {
      model: "deterministic-golden-fixture",
      cached: false,
      schemaValid: true,
      sourceCount: sources.length,
      contradictionCount: contradictions.length,
      missingDataCount: missingData.length,
    },
  };
}

function allText(output) {
  return [
    output.headline,
    output.summary,
    ...Object.values(output.report),
    ...output.keyFindings.flatMap((finding) => [finding.title, finding.explanation]),
    ...output.missingData,
    ...output.nextChecks,
  ].join(" ").replace(/\s+/g, " ").trim();
}
function referencedStats(output) {
  const sources = new Set(output.sources.map((source) => source.id));
  const referenced = new Set();
  for (const fact of output.facts) for (const id of fact.sourceIds) referenced.add(id);
  for (const finding of output.keyFindings) for (const id of finding.sourceIds) referenced.add(id);
  for (const contradiction of output.contradictions) for (const id of contradiction.sourceIds) referenced.add(id);
  const unknown = [...referenced].filter((id) => !sources.has(id));
  return { referenced, unknown };
}
function unsafePromise(text) {
  const directPromise = /\b(guaranteed|risk[- ]?free|100% safe|profit guaranteed|roi guaranteed|moon|next 100x|pewny zysk|bez ryzyka|gwarantowany zysk|garantierte rendite|risikofrei)\b/i.test(text);
  const certificateClaim = /\b(safety certification|certyfikat bezpieczeństwa|sicherheitszertifikat)\b/i.test(text);
  const negatedCertificate = /\b(not|no|without|nie|bez|kein|keine|ohne)\b.{0,32}\b(safety certification|certyfikat bezpieczeństwa|sicherheitszertifikat)\b/i.test(text);
  return directPromise || (certificateClaim && !negatedCertificate);
}
function evaluate(output) {
  const b = budgets[output.depth];
  const text = allText(output);
  const refs = referencedStats(output);
  const blockers = [];
  const warnings = [];
  let score = 100;
  if (refs.unknown.length) { score -= 25; blockers.push(`unknown sources: ${refs.unknown.join(",")}`); }
  if (unsafePromise(text)) { score -= 45; blockers.push("unsafe investment/certification promise"); }
  if (!output.missingData.length) { score -= 12; blockers.push("no missing-data honesty"); }
  if (output.depth === "advanced" && !/change|zmieniłoby|ändern|contradiction|sprzecz|widerspruch/i.test(text)) { score -= 18; blockers.push("advanced evidence mode too weak"); }
  if (output.depth === "pro" && output.sources.length < 4) { score -= 8; warnings.push("pro source density weak"); }
  if (output.depth === "basic" && /operator appendix|proof capsule|załącznik operatora/i.test(text)) { score -= 12; warnings.push("basic leaks advanced framing"); }
  if (output.facts.length > b.facts || output.keyFindings.length > b.findings + 1 || output.sources.length > b.sources + 1) { score -= 8; warnings.push("tier budget drift"); }
  if (!/not investment advice|nie jest porada inwestycyjna|keine anlageberatung/i.test(text)) warnings.push("legal safety line could be clearer");
  score = Math.max(0, Math.min(100, Math.round(score)));
  return {
    schemaVersion: PASS_ID,
    generatedAt,
    traceId: output.traceId,
    asset: output.asset,
    locale: output.locale,
    depth: output.depth,
    normalizedScore: score,
    status: blockers.length ? "fail" : score >= 85 ? "pass" : "review",
    blockers,
    warnings,
    counts: {
      facts: output.facts.length,
      findings: output.keyFindings.length,
      sources: output.sources.length,
      contradictions: output.contradictions.length,
      missingData: output.missingData.length,
      nextChecks: output.nextChecks.length,
      referencedSources: refs.referenced.size,
      unknownSourceReferences: refs.unknown,
    },
    tierExpectation: {
      access: b.access,
      target: output.depth === "basic" ? "short confirmed core" : output.depth === "pro" ? "deeper free review" : "paid evidence mode",
    },
  };
}

const outputs = [];
const scorecards = [];
for (const locale of locales) {
  for (const asset of assets) {
    for (const depth of tiers) {
      const output = sampleOutput(asset, depth, locale);
      outputs.push(output);
      scorecards.push(evaluate(output));
    }
  }
}

const cohorts = [];
for (const locale of locales) {
  for (const asset of assets) {
    const group = scorecards.filter((item) => item.locale === locale && item.asset.id === asset.id);
    const basic = group.find((item) => item.depth === "basic");
    const pro = group.find((item) => item.depth === "pro");
    const advanced = group.find((item) => item.depth === "advanced");
    const blockers = [];
    const warnings = [];
    if (!basic || !pro || !advanced) blockers.push("missing tier in cohort");
    if (basic && pro && advanced) {
      if (pro.counts.sources < basic.counts.sources) warnings.push("pro source count below basic");
      if (advanced.counts.sources < pro.counts.sources) blockers.push("advanced source count below pro");
      if (advanced.counts.findings < pro.counts.findings) blockers.push("advanced findings below pro");
      if (advanced.counts.missingData < basic.counts.missingData) warnings.push("advanced missing-data honesty below basic");
    }
    cohorts.push({
      schemaVersion: PASS_ID,
      generatedAt,
      locale,
      assetId: asset.id,
      status: blockers.length ? "fail" : warnings.length ? "review" : "pass",
      blockers,
      warnings,
      tierScores: {
        basic: basic?.normalizedScore ?? 0,
        pro: pro?.normalizedScore ?? 0,
        advanced: advanced?.normalizedScore ?? 0,
      },
    });
  }
}

const avgScore = Math.round(scorecards.reduce((sum, item) => sum + item.normalizedScore, 0) / scorecards.length);
const blockers = [...scorecards.flatMap((item) => item.blockers), ...cohorts.flatMap((item) => item.blockers)];
const warnings = [...scorecards.flatMap((item) => item.warnings), ...cohorts.flatMap((item) => item.warnings)];
const summary = {
  schemaVersion: PASS_ID,
  generatedAt,
  mode: "deterministic_golden_sample_eval_not_live_provider_proof",
  status: blockers.length ? "FAIL" : avgScore >= 85 ? "PASS" : "REVIEW",
  sampleCount: scorecards.length,
  cohortCount: cohorts.length,
  assets: assets.map((asset) => asset.symbol),
  locales,
  tiers,
  averageScore: avgScore,
  blockerCount: blockers.length,
  warningCount: warnings.length,
  liveProviderProofRequired: true,
  note: "This harness proves the scoring contract and tier-quality expectations. It does not replace live Gemini/Supabase/Stripe/provider runtime receipts.",
  scorecards,
  cohorts,
};

const jsonPath = path.join(reportsDir, "PASS2176_VLM_TIER_SAMPLE_EVAL.json");
const mdPath = path.join(reportsDir, "PASS2176_VLM_TIER_SAMPLE_EVAL.md");
fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));
const md = `# PASS2176 — VLM Tier Sample Eval\n\nGenerated: ${generatedAt}\n\nStatus: **${summary.status}**\n\nAverage score: **${avgScore}/100**\n\nMode: deterministic golden sample eval. This proves the eval contract and tier expectations, not live provider truth.\n\n## Samples\n\n- Assets: ${summary.assets.join(", ")}\n- Locales: ${locales.join(", ")}\n- Tiers: ${tiers.join(", ")}\n- Output samples scored: ${scorecards.length}\n- Cohorts compared: ${cohorts.length}\n\n## What this pass adds\n\n1. A reusable VLM output quality scoring contract.\n2. A deterministic Basic / Pro / Advanced golden-set harness.\n3. Tier-difference checks so Advanced cannot become only longer text.\n4. Source-id integrity checks so claims cannot reference unknown sources.\n5. Legal-safety checks for ROI/FOMO/certification wording.\n\n## Remaining proof\n\n- Run the same eval on real VLM outputs from hosted API.\n- Attach Gemini/live provider receipts.\n- Attach Advanced entitlement receipts.\n- Attach PDF render samples for PL/EN/DE.\n`;
fs.writeFileSync(mdPath, md);
console.log(JSON.stringify({ status: summary.status, sampleCount: summary.sampleCount, cohortCount: summary.cohortCount, averageScore: avgScore, jsonPath, mdPath }, null, 2));
if (summary.status === "FAIL") process.exit(1);
