import type { VlmBrainOutput } from "./vlm-contract";
import type { VlmCanonicalFactPacket } from "./vlm-fact-packet";
import { inspectVlmText, sanitizeVlmText } from "./vlm-security";
import { recordVlmPolicyRejection } from "./vlm-security-events";
import { evaluateVlmDecisionReversibility } from "./vlm-narrative-drift";

export type ClaimFirewallResult = {
  ok: boolean;
  output?: VlmBrainOutput;
  rejectedClaims: string[];
};

type VlmFinding = VlmBrainOutput["keyFindings"][number];
type VlmContradiction = VlmBrainOutput["contradictions"][number];

function numericTokens(value: string) {
  return value.match(/(?<![A-Za-z])[-+]?\d+(?:[.,]\d+)?%?/g) ?? [];
}

function normalizeToken(value: string) {
  return value.replace(",", ".").replace(/^\+/, "").replace(/\.0+$/, "").toLowerCase();
}

function allowedNumbers(packet: VlmCanonicalFactPacket) {
  const allowed = new Set(["1", "7", "10", "24", "30", "100"]);
  for (const fact of packet.facts) {
    if (typeof fact.value === "number") {
      const values = [fact.value, Math.round(fact.value), Number(fact.value.toFixed(2))];
      for (const value of values) allowed.add(normalizeToken(String(value)));
    }
    for (const token of numericTokens(fact.label)) allowed.add(normalizeToken(token));
  }
  allowed.add(normalizeToken(String(packet.deterministicScore)));
  allowed.add(normalizeToken(String(packet.confidenceCap)));
  return allowed;
}

function unsupportedNumbers(text: string, allowed: Set<string>) {
  return numericTokens(text).filter((token) => {
    const normalized = normalizeToken(token.replace("%", ""));
    return !allowed.has(normalized);
  });
}

const PROHIBITED_DECISION_PATTERNS: Array<[RegExp, string]> = [
  [/\b(?:buy|sell)\s+now\b/i, "trade-instruction"],
  [/\b(?:kup|sprzedaj)\s+(?:teraz|natychmiast)\b/i, "trade-instruction"],
  [/\bjetzt\s+(?:kaufen|verkaufen)\b/i, "trade-instruction"],
  [/\b(?:guaranteed|risk[- ]?free|definitely safe|safe investment)\b/i, "guarantee"],
  [/\b(?:gwarantowan\w*|bez ryzyka|pewna inwestycja|na pewno bezpieczn\w*)\b/i, "guarantee"],
  [/\b(?:garantiert|risikofrei|sichere anlage|definitiv sicher)\b/i, "guarantee"],
  [/\b(?:scam confirmed|fraud proven|criminal project)\b/i, "unsupported-accusation"],
  [/\b(?:potwierdzon\w* scam|udowodnion\w* oszustw\w*|projekt przestępcz\w*)\b/i, "unsupported-accusation"],
  [/\b(?:betrug bewiesen|scam bestätigt|kriminelles projekt)\b/i, "unsupported-accusation"],
  [/\b(?:last chance|do not miss out|act immediately)\b/i, "urgency-pressure"],
  [/\b(?:ostatnia szansa|nie przegap|działaj natychmiast)\b/i, "urgency-pressure"],
  [/\b(?:letzte chance|nicht verpassen|sofort handeln)\b/i, "urgency-pressure"],
];

function prohibitedDecisionClaims(text: string) {
  return PROHIBITED_DECISION_PATTERNS
    .filter(([pattern]) => pattern.test(text))
    .map(([, reason]) => reason);
}

export function applyVlmClaimFirewall(
  candidate: VlmBrainOutput,
  packet: VlmCanonicalFactPacket,
): ClaimFirewallResult {
  const allowedSourceIds = new Set(packet.allowedSourceIds);
  const allowedNumericTokens = allowedNumbers(packet);
  const weakFactIds = new Set(packet.sourceArbitration.evidenceQuorum.weakFactIds);
  const quorumIsStrong = packet.sourceArbitration.evidenceQuorum.status === "strong";
  const sourceIntegrity = packet.sourceArbitration.sourceIntegrity;
  const sourceIntegrityTrusted = sourceIntegrity.status === "trusted";
  const temporalConsistency = packet.sourceArbitration.temporalConsistency;
  const temporalCurrent = temporalConsistency.status === "current";
  const reversibility = evaluateVlmDecisionReversibility(packet);
  const rejectedClaims: string[] = [];

  const keyFindings = candidate.keyFindings
    .map((finding: VlmFinding) => {
      const sourceIds = finding.sourceIds.filter((sourceId: string) => allowedSourceIds.has(sourceId)).slice(0, 8);
      const inspection = inspectVlmText(`${finding.title} ${finding.explanation}`, 1060);
      const unsupported = unsupportedNumbers(`${finding.title} ${finding.explanation}`, allowedNumericTokens);
      const weakFindingId = finding.id.startsWith("fact-") ? finding.id.replace(/^fact-/, "") : null;
      const weakQuorumOverconfidence = Boolean(weakFindingId && weakFactIds.has(weakFindingId) && finding.confidence > 39);
      if (!sourceIds.length || unsupported.length || !inspection.safe || weakQuorumOverconfidence) {
        const reason = !sourceIds.length
          ? "missing-source"
          : unsupported.length
            ? `unsupported-number:${unsupported.join(",")}`
            : weakQuorumOverconfidence
              ? `weak-quorum-overconfidence:${weakFindingId}`
              : `security-policy:${inspection.flags.join(",")}`;
        rejectedClaims.push(`${finding.id}:${reason}`);
        return null;
      }
      return {
        ...finding,
        title: sanitizeVlmText(finding.title, 160),
        explanation: sanitizeVlmText(finding.explanation, 900),
        confidence: Math.round(Math.min(finding.confidence, packet.confidenceCap)),
        sourceIds,
      };
    })
    .filter((finding: VlmFinding | null): finding is VlmFinding => Boolean(finding));

  const contradictions = candidate.contradictions
    .map((item: VlmContradiction) => {
      const inspection = inspectVlmText(item.description, 500);
      if (!inspection.safe) {
        rejectedClaims.push(`contradiction:security-policy:${inspection.flags.join(",")}`);
        return { description: "", sourceIds: [] };
      }
      return {
        description: sanitizeVlmText(item.description, 500),
        sourceIds: item.sourceIds.filter((sourceId: string) => allowedSourceIds.has(sourceId)).slice(0, 8),
      };
    })
    .filter((item: Pick<VlmContradiction, "description" | "sourceIds">) => item.description && item.sourceIds.length);

  const narrativeFields = [
    candidate.headline,
    candidate.summary,
    candidate.report.executiveSummary,
    candidate.report.marketStructure,
    candidate.report.liquidityAnalysis,
    candidate.report.holderAnalysis,
    candidate.report.contractAnalysis,
    candidate.report.sourceAssessment,
    candidate.report.riskScenarios,
    candidate.report.conclusion,
  ];
  for (const text of narrativeFields) {
    const inspection = inspectVlmText(text, 2200);
    if (!inspection.safe) rejectedClaims.push(`narrative:security-policy:${inspection.flags.join(",")}`);
    const unsupported = unsupportedNumbers(text, allowedNumericTokens);
    if (unsupported.length) rejectedClaims.push(`narrative:unsupported-number:${unsupported.join(",")}`);
    const prohibited = prohibitedDecisionClaims(text);
    if (prohibited.length) rejectedClaims.push(`narrative:prohibited-decision-copy:${prohibited.join(",")}`);
    if (!quorumIsStrong && /\b(?:proven|definitive|confirmed safe|high confidence|udowodnion\w*|pewne|na pewno bezpieczn\w*|bewiesen|endgültig|sicher bestätigt)\b/i.test(text)) {
      rejectedClaims.push("narrative:weak-quorum-overclaim");
    }
    if (!sourceIntegrityTrusted && /\b(?:verified source coverage|robust sources|trusted source set|source integrity confirmed|zrodla zweryfikowane|solidne zrodla|zaufane zrodla|źr[oó]dła zweryfikowane|solidne źr[oó]dła|zaufane źr[oó]dła|quellenintegritaet bestaetigt|quellenintegrität bestätigt|robuste quellen|vertrauenswuerdige quellen|vertrauenswürdige quellen)\b/i.test(text)) {
      rejectedClaims.push("narrative:source-integrity-overclaim");
    }
    if (!temporalCurrent && /\b(?:live evidence|real[- ]time|up[- ]to[- ]date|freshly verified|current market proof|świeżo potwierdzon\w*|dane live|dane w czasie rzeczywistym|aktualny dowód|echtzeitdaten|aktuell verifiziert|frisch bestätigt|live[- ]daten)\b/i.test(text)) {
      rejectedClaims.push("narrative:temporal-consistency-overclaim");
    }
    if (/\b(?:ignore previous analysis|narrative can change freely|no narrative drift|pomiń poprzednią analizę|ignoruj poprzednią analizę|bez dryfu narracji|vorherige analyse ignorieren|kein narrative drift)\b/i.test(text)) {
      rejectedClaims.push("narrative:narrative-drift-bypass");
    }
    if (reversibility.tier !== "high" && /\b(?:fully reversible|easy to reverse|no execution friction|no slippage risk|łatw\w* do odwrócenia|bez poślizgu|bez tarcia wykonania|vollständig umkehrbar|leicht umkehrbar|kein slippage risiko)\b/i.test(text)) {
      rejectedClaims.push("narrative:decision-reversibility-overclaim");
    }
  }
  for (const text of [...candidate.missingData, ...candidate.nextChecks]) {
    const inspection = inspectVlmText(text, 320);
    if (!inspection.safe) rejectedClaims.push(`list-item:security-policy:${inspection.flags.join(",")}`);
  }

  if (!keyFindings.length || rejectedClaims.some((claim) => claim.includes("security-policy") || claim.startsWith("narrative:"))) {
    recordVlmPolicyRejection({
      vector: "claim",
      reason: rejectedClaims.some((claim) => claim.includes("security-policy"))
        ? "output_security_policy"
        : "unsupported_or_prohibited_claim",
      score: 90,
      flags: rejectedClaims.some((claim) => claim.includes("security-policy"))
        ? ["prompt_injection"]
        : undefined,
    });
    return { ok: false, rejectedClaims };
  }

  return {
    ok: true,
    rejectedClaims,
    output: {
      ...candidate,
      asset: packet.asset,
      headline: sanitizeVlmText(candidate.headline, 200),
      summary: sanitizeVlmText(candidate.summary, 2200),
      confidence: Math.round(Math.min(candidate.confidence, packet.confidenceCap)),
      facts: packet.facts,
      sources: packet.sources,
      keyFindings,
      contradictions,
      missingData: Array.from(new Set([...packet.missingData, ...candidate.missingData.map((item: string) => sanitizeVlmText(item, 260))])).filter(Boolean).slice(0, 24),
      nextChecks: Array.from(new Set(candidate.nextChecks.map((item: string) => sanitizeVlmText(item, 320)))).filter(Boolean).slice(0, 14),
      report: {
        executiveSummary: sanitizeVlmText(candidate.report.executiveSummary, 2200),
        marketStructure: sanitizeVlmText(candidate.report.marketStructure, 2200),
        liquidityAnalysis: sanitizeVlmText(candidate.report.liquidityAnalysis, 2200),
        holderAnalysis: sanitizeVlmText(candidate.report.holderAnalysis, 2200),
        contractAnalysis: sanitizeVlmText(candidate.report.contractAnalysis, 2200),
        sourceAssessment: sanitizeVlmText(candidate.report.sourceAssessment, 2200),
        riskScenarios: sanitizeVlmText(candidate.report.riskScenarios, 2200),
        conclusion: sanitizeVlmText(candidate.report.conclusion, 2200),
      },
    },
  };
}
