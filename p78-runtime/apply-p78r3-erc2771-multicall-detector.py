from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

PARENT = {
    "fileCount": 1601,
    "payloadBytes": 21040272,
    "pathSetSha256": "40b966b3bc2497a1d1d18b967ec867f182f76030af23d15329e42c6057268d59",
    "sourceContentAggregateSha256": "7f161ad862642233a7f7984bd681353f4a1aced3a0f14e1492400a4609c0146f",
}

PREIMAGE = {
    "lib/security/audit-claim-ledger.ts": {"bytes": 16238, "sha256": "1834f057f666198c3a0957163f596ce3f86cfbe73f5bfb6ae59078decfe2fa23"},
    "lib/security/audit-report-assembler.ts": {"bytes": 26736, "sha256": "8ca934e68c0d432479f9faf25d5bcd1f54a157abeab80082bc89d9a6f3b171f0"},
    "lib/security/audit-watch-post-handler.ts": {"bytes": 40441, "sha256": "50d4a1585186f3c4fe716f45fdec2ddabf409396d13e5e5d6e9df277b6c54546"},
}

NEW_PATH = "lib/security/erc2771-multicall-source-detector.ts"

DETECTOR_SOURCE = r'''import { createHash } from "node:crypto";

import type { Pass2572VerifiedStaticEvidence } from "./audit-provider-runtime-client";

export const PASS5002_ERC2771_MULTICALL_SOURCE_DETECTOR_ID = "erc2771-multicall-source-detector" as const;

export type Pass5002SourcePatternState =
  | "confirmed_source_pattern"
  | "mitigated_source_pattern"
  | "not_detected"
  | "blocked"
  | "not_applicable";

export type Pass5002Erc2771MulticallSourceDetectorReport = {
  passId: typeof PASS5002_ERC2771_MULTICALL_SOURCE_DETECTOR_ID;
  generatedAt: string;
  target: { contractAddress?: string; chain: string };
  state: Pass5002SourcePatternState;
  family: "ERC2771_CONTEXT_MULTICALL_SENDER_SPOOFING";
  detectorClass: "PURE_VERIFIED_SOURCE_PATTERN";
  provider?: string;
  responseDigest?: string;
  sourceDigest?: string;
  sourceUnitCount: number;
  signals: {
    erc2771LogicalSenderContext: boolean;
    arbitrarySelfDelegatecallBatch: boolean;
    authorizationUsesLogicalSender: boolean;
    logicalSenderPreservedAcrossDelegatecall: boolean;
  };
  confidence: number;
  severityCandidate: "elevated" | null;
  exploitabilityBoundary: string;
  customerLine: string;
  proPdfLine: string;
  advancedAction: string;
  evidenceRefs: string[];
  remediation: string[];
  retest: {
    required: boolean;
    negativeControl: string;
    positiveControl: string;
  };
  blockers: string[];
  truthBoundary: string;
};

type DetectorInput = {
  locale?: string;
  contractAddress?: string | null;
  chain?: string | null;
  verifiedStaticEvidence?: Pass2572VerifiedStaticEvidence | null;
};

type SourceUnit = { id: string; content: string };

const MAX_SOURCE_BYTES = 2_000_000;
const MAX_SOURCE_UNITS = 128;
const MAX_UNIT_BYTES = 240_000;
const ZERO_SIGNALS = {
  erc2771LogicalSenderContext: false,
  arbitrarySelfDelegatecallBatch: false,
  authorizationUsesLogicalSender: false,
  logicalSenderPreservedAcrossDelegatecall: false,
};

function t(locale: string, pl: string, de: string, en: string) {
  return locale === "pl" ? pl : locale === "de" ? de : en;
}

function normalizedLocale(value: unknown) {
  return value === "pl" || value === "de" || value === "en" ? value : "en";
}

function normalizedChain(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().toLowerCase().slice(0, 40) : "ethereum";
}

function normalizedAddress(value: unknown) {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value.trim()) ? value.trim().toLowerCase() : undefined;
}

function sha256(value: string) {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function safeUnitId(value: string, fallback: string) {
  const cleaned = value.replace(/[\r\n\0<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
  return cleaned || fallback;
}

function extractJsonUnits(value: unknown): SourceUnit[] {
  const record = asRecord(value);
  if (!record) return [];
  const sources = asRecord(record.sources) ?? record;
  const rows: SourceUnit[] = [];
  for (const [key, raw] of Object.entries(sources)) {
    if (rows.length >= MAX_SOURCE_UNITS) break;
    const item = asRecord(raw);
    const content = typeof item?.content === "string" ? item.content : typeof raw === "string" ? raw : "";
    if (!content.trim() || Buffer.byteLength(content, "utf8") > MAX_UNIT_BYTES) continue;
    rows.push({ id: safeUnitId(key, `unit-${rows.length + 1}`), content });
  }
  return rows;
}

function decodeVerifiedSourceUnits(sourceText: string): SourceUnit[] {
  if (!sourceText.trim() || Buffer.byteLength(sourceText, "utf8") > MAX_SOURCE_BYTES) return [];
  const trimmed = sourceText.trim();
  const candidates = [trimmed];
  if (trimmed.startsWith("{{") && trimmed.endsWith("}}")) candidates.push(trimmed.slice(1, -1));
  for (const candidate of candidates) {
    if (!(candidate.startsWith("{") || candidate.startsWith("["))) continue;
    try {
      const units = extractJsonUnits(JSON.parse(candidate) as unknown);
      if (units.length > 0) return units;
    } catch {
      // Plain verified Solidity remains a valid fallback below.
    }
  }
  if (/\b(?:abstract\s+)?(?:contract|interface|library)\s+[A-Za-z_][A-Za-z0-9_]*/.test(trimmed)) {
    return [{ id: "verified-source.sol", content: trimmed }];
  }
  return [];
}

function stripSolidityProse(source: string) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n\r]*/g, " ")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
}

function evidenceRefs(units: SourceUnit[], responseDigest: string, sourceDigest: string, signals: Pass5002Erc2771MulticallSourceDetectorReport["signals"]) {
  const refs = [`${responseDigest}#verified-static-response`, `${sourceDigest}#verified-source`];
  const signalNames = Object.entries(signals).filter(([, value]) => value).map(([name]) => name);
  for (const unit of units.slice(0, 6)) {
    for (const signal of signalNames.slice(0, 4)) refs.push(`${sourceDigest}#unit=${encodeURIComponent(unit.id)}&signal=${signal}`);
  }
  return Array.from(new Set(refs)).slice(0, 18);
}

function baseReport(args: {
  locale: string;
  chain: string;
  contractAddress?: string;
  state: Pass5002SourcePatternState;
  provider?: string;
  responseDigest?: string;
  sourceDigest?: string;
  sourceUnitCount?: number;
  signals?: Pass5002Erc2771MulticallSourceDetectorReport["signals"];
  confidence?: number;
  severityCandidate?: "elevated" | null;
  customerLine: string;
  proPdfLine: string;
  advancedAction: string;
  evidenceRefs?: string[];
  remediation?: string[];
  blockers?: string[];
}): Pass5002Erc2771MulticallSourceDetectorReport {
  const required = args.state === "confirmed_source_pattern";
  return {
    passId: PASS5002_ERC2771_MULTICALL_SOURCE_DETECTOR_ID,
    generatedAt: new Date().toISOString(),
    target: { contractAddress: args.contractAddress, chain: args.chain },
    state: args.state,
    family: "ERC2771_CONTEXT_MULTICALL_SENDER_SPOOFING",
    detectorClass: "PURE_VERIFIED_SOURCE_PATTERN",
    provider: args.provider,
    responseDigest: args.responseDigest,
    sourceDigest: args.sourceDigest,
    sourceUnitCount: args.sourceUnitCount ?? 0,
    signals: args.signals ?? ZERO_SIGNALS,
    confidence: Math.max(0, Math.min(100, Math.round(args.confidence ?? 0))),
    severityCandidate: args.severityCandidate ?? null,
    exploitabilityBoundary: required
      ? "Verified source preconditions are present; runtime exploit reproduction and deployed-runtime-bytecode equivalence are not proven."
      : "No runtime exploitability claim is made from this source-pattern detector.",
    customerLine: args.customerLine,
    proPdfLine: args.proPdfLine,
    advancedAction: args.advancedAction,
    evidenceRefs: args.evidenceRefs ?? [],
    remediation: args.remediation ?? [],
    retest: {
      required,
      negativeControl: "A trusted-forwarder sender-spoof attempt through multicall must fail authorization after remediation.",
      positiveControl: "Legitimate direct calls and legitimate trusted-forwarder multicalls should remain functional after remediation.",
    },
    blockers: args.blockers ?? [],
    truthBoundary: "This detector can confirm a verified-source pattern only. It never claims deployed reachability, runtime exploitability, customer FINAL, certification, paid value, sale eligibility or LIVE readiness by itself.",
  };
}

export function buildPass5002Erc2771MulticallSourceDetectorReport(input: DetectorInput): Pass5002Erc2771MulticallSourceDetectorReport {
  const locale = normalizedLocale(input.locale);
  const chain = normalizedChain(input.chain);
  const contractAddress = normalizedAddress(input.contractAddress);
  if (!contractAddress) {
    return baseReport({
      locale, chain, state: "not_applicable",
      customerLine: t(locale, "Detektor ERC-2771/Multicall nie dotyczy celu bez poprawnego adresu EVM.", "ERC-2771/Multicall-Detektor ist ohne gueltige EVM-Adresse nicht anwendbar.", "ERC-2771/Multicall detector is not applicable without a valid EVM address."),
      proPdfLine: "ERC2771_MULTICALL state=not_applicable; reason=invalid_or_missing_evm_address",
      advancedAction: t(locale, "Brak akcji detektora dla tego celu.", "Keine Detektor-Aktion fuer dieses Ziel.", "No detector action for this target."),
    });
  }

  const evidence = input.verifiedStaticEvidence;
  const evidenceAddress = normalizedAddress(evidence?.contractAddress);
  const evidenceChain = normalizedChain(evidence?.chain);
  const digest = evidence?.responseDigest?.replace(/^sha256:/i, "").toLowerCase() ?? "";
  const trusted = Boolean(
    evidence &&
    evidenceAddress === contractAddress &&
    evidenceChain === chain &&
    evidence.provider.trim() &&
    Number.isFinite(Date.parse(evidence.observedAt)) &&
    /^[a-f0-9]{64}$/.test(digest)
  );
  if (!trusted || !evidence?.sourceText) {
    return baseReport({
      locale, chain, contractAddress, state: "blocked", provider: evidence?.provider,
      responseDigest: digest ? `sha256:${digest}` : undefined,
      customerLine: t(locale, "Zweryfikowane źródło nie jest dostępne dla tego detektora; brak findingu.", "Verifizierter Source ist fuer diesen Detektor nicht verfuegbar; kein Finding.", "Verified source is unavailable for this detector; no finding is asserted."),
      proPdfLine: "ERC2771_MULTICALL state=blocked; verified_source=false",
      advancedAction: t(locale, "Pozyskać source związany z dokładnym chain+contract+digest i uruchomić detektor ponownie.", "An exakte Chain+Contract+Digest gebundenen Source beschaffen und Detektor erneut ausfuehren.", "Acquire source bound to the exact chain+contract+digest and rerun the detector."),
      blockers: ["verified_static_source_unavailable_or_identity_mismatch"],
    });
  }

  const units = decodeVerifiedSourceUnits(evidence.sourceText);
  if (units.length === 0) {
    return baseReport({
      locale, chain, contractAddress, state: "blocked", provider: evidence.provider,
      responseDigest: `sha256:${digest}`,
      sourceDigest: sha256(evidence.sourceText),
      customerLine: t(locale, "Zweryfikowane source nie mogło zostać bezpiecznie rozbite na jednostki Solidity; brak findingu.", "Verifizierter Source konnte nicht sicher in Solidity-Einheiten zerlegt werden; kein Finding.", "Verified source could not be safely decoded into Solidity units; no finding is asserted."),
      proPdfLine: "ERC2771_MULTICALL state=blocked; source_units=0",
      advancedAction: t(locale, "Naprawić format source acquisition i uruchomić detektor ponownie.", "Source-Acquisition-Format reparieren und Detektor erneut ausfuehren.", "Repair source-acquisition decoding and rerun the detector."),
      blockers: ["verified_source_decode_failed_or_size_cap_exceeded"],
    });
  }

  const clean = units.map((unit) => stripSolidityProse(unit.content)).join("\n");
  const metaContext = /\bERC2771Context\b/.test(clean) && /\b_msgSender\s*\(\s*\)/.test(clean);
  const selfDelegatecall = /(?:functionDelegateCall\s*\(\s*address\s*\(\s*this\s*\)|address\s*\(\s*this\s*\)\s*\.\s*delegatecall\s*\()/.test(clean);
  const batchedUserCalldata = /bytes\s*\[\s*\]\s+calldata\s+[A-Za-z_][A-Za-z0-9_]*/.test(clean);
  const authUsesLogicalSender = /(?:hasRole|require|revert|owner|authorized|isAuthorized)[^;{}]{0,220}_msgSender\s*\(\s*\)/i.test(clean);
  const preservation = /address\s+[A-Za-z_][A-Za-z0-9_]*\s*=\s*_msgSender\s*\(\s*\)\s*;/.test(clean)
    && /abi\s*\.\s*encodePacked\s*\([^;]{0,260},\s*[A-Za-z_][A-Za-z0-9_]*\s*\)/.test(clean)
    && /msg\s*\.\s*sender\s*!=/.test(clean);
  const signals = {
    erc2771LogicalSenderContext: metaContext,
    arbitrarySelfDelegatecallBatch: selfDelegatecall && batchedUserCalldata,
    authorizationUsesLogicalSender: authUsesLogicalSender,
    logicalSenderPreservedAcrossDelegatecall: preservation,
  };
  const vulnerablePattern = metaContext && selfDelegatecall && batchedUserCalldata && authUsesLogicalSender && !preservation;
  const mitigatedPattern = metaContext && selfDelegatecall && batchedUserCalldata && preservation;
  const state: Pass5002SourcePatternState = vulnerablePattern ? "confirmed_source_pattern" : mitigatedPattern ? "mitigated_source_pattern" : "not_detected";
  const sourceDigest = sha256(evidence.sourceText);
  const responseDigest = `sha256:${digest}`;
  const refs = evidenceRefs(units, responseDigest, sourceDigest, signals);
  const remediation = vulnerablePattern ? [
    "Preserve the logical ERC-2771 sender across each self-delegatecall and make _msgSender/_msgData recover it consistently.",
    "Alternatively remove or strictly constrain arbitrary self-delegatecall batching across meta-transaction context.",
    "Add a trusted-forwarder spoof regression plus legitimate direct/forwarded multicall compatibility controls.",
  ] : [];

  if (vulnerablePattern) {
    return baseReport({
      locale, chain, contractAddress, state, provider: evidence.provider, responseDigest, sourceDigest,
      sourceUnitCount: units.length, signals, confidence: 92, severityCandidate: "elevated",
      customerLine: t(locale,
        "Zweryfikowany source zawiera wzorzec ERC-2771 logical sender + arbitralny self-delegatecall multicall bez zachowania nadawcy. Potwierdza to wzorzec source, nie runtime exploitability.",
        "Verifizierter Source enthaelt ERC-2771 Logical-Sender + beliebiges Self-Delegatecall-Multicall ohne Sender-Erhalt. Das bestaetigt das Source-Muster, nicht Runtime-Exploitability.",
        "Verified source contains the ERC-2771 logical-sender + arbitrary self-delegatecall multicall pattern without sender preservation. This confirms the source pattern, not runtime exploitability."),
      proPdfLine: `ERC2771_MULTICALL state=confirmed_source_pattern; confidence=92/100; units=${units.length}; runtimeExploitability=not_reproduced; response=${responseDigest}; source=${sourceDigest}`,
      advancedAction: t(locale,
        "Zastosować sender preservation lub ograniczyć self-delegatecall, potem wykonać spoof negative-control i compatibility positive-control.",
        "Sender Preservation anwenden oder Self-Delegatecall begrenzen; danach Spoof-Negativkontrolle und Kompatibilitaets-Positivkontrolle ausfuehren.",
        "Apply sender preservation or constrain self-delegatecall, then run the spoof negative-control and compatibility positive-control."),
      evidenceRefs: refs,
      remediation,
      blockers: ["runtime_exploit_reproduction_not_executed", "deployed_runtime_bytecode_equivalence_not_proven"],
    });
  }

  return baseReport({
    locale, chain, contractAddress, state, provider: evidence.provider, responseDigest, sourceDigest,
    sourceUnitCount: units.length, signals, confidence: mitigatedPattern ? 88 : 70,
    customerLine: mitigatedPattern
      ? t(locale, "Wzorzec multicall/meta-tx zawiera sender-preservation; ten detector nie zgłasza findingu.", "Multicall/Meta-Tx-Muster enthaelt Sender Preservation; dieser Detektor meldet kein Finding.", "The multicall/meta-transaction pattern includes sender preservation; this detector raises no finding.")
      : t(locale, "Detektor nie potwierdził wzorca ERC-2771/Multicall sender spoofing w zweryfikowanym source.", "Detektor hat das ERC-2771/Multicall-Sender-Spoofing-Muster im verifizierten Source nicht bestaetigt.", "The detector did not confirm the ERC-2771/Multicall sender-spoofing pattern in verified source."),
    proPdfLine: `ERC2771_MULTICALL state=${state}; confidence=${mitigatedPattern ? 88 : 70}/100; units=${units.length}; response=${responseDigest}; source=${sourceDigest}`,
    advancedAction: t(locale, "Brak findingu; zachować kontrolę przy kolejnych zmianach source.", "Kein Finding; Kontrolle bei spaeteren Source-Aenderungen beibehalten.", "No finding; retain the control for future source changes."),
    evidenceRefs: refs,
  });
}
'''


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def identity(rows: list[dict]) -> dict[str, object]:
    ordered = sorted(rows, key=lambda row: row["path"])
    path_set = hashlib.sha256("\n".join(row["path"] for row in ordered).encode()).hexdigest()
    aggregate = hashlib.sha256()
    for row in ordered:
        aggregate.update(f"{row['path']}\0{row['byteLength']}\0{row['sha256']}\n".encode())
    return {
        "fileCount": len(ordered),
        "payloadBytes": sum(int(row["byteLength"]) for row in ordered),
        "pathSetSha256": path_set,
        "sourceContentAggregateSha256": aggregate.hexdigest(),
    }


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"P78R3 replacement anchor mismatch:{label}:{count}")
    return text.replace(old, new, 1)


def patch_claim_ledger(text: str) -> str:
    text = replace_once(
        text,
        'import { verifyAuditAdjudicatedAuthorityEvidence, type AuditAdjudicatedAuthorityEvidence } from "./audit-adjudicated-authority-evidence";',
        'import { verifyAuditAdjudicatedAuthorityEvidence, type AuditAdjudicatedAuthorityEvidence } from "./audit-adjudicated-authority-evidence";\nimport type { Pass5002Erc2771MulticallSourceDetectorReport } from "./erc2771-multicall-source-detector";',
        "claim_detector_import",
    )
    text = replace_once(
        text,
        '  adverseKind?: "deployment_identity";\n  adverseRiskFloor?: number;\n  evidenceRefs?: string[];',
        '  adverseKind?: "deployment_identity" | "source_pattern";\n  adverseRiskFloor?: number;\n  evidenceRefs?: string[];\n  severityCandidate?: "info" | "watch" | "elevated" | "critical";\n  exploitabilityBoundary?: string;\n  remediation?: string[];\n  retest?: { required: boolean; negativeControl: string; positiveControl: string };',
        "claim_structured_finding_fields",
    )
    text = replace_once(
        text,
        '  runtimeConfidence?: Pass2573AuditRuntimeConfidenceReport | null;\n  authorityEvidence?: AuditAdjudicatedAuthorityEvidence | null;',
        '  runtimeConfidence?: Pass2573AuditRuntimeConfidenceReport | null;\n  authorityEvidence?: AuditAdjudicatedAuthorityEvidence | null;\n  sourcePatternEvidence?: Pass5002Erc2771MulticallSourceDetectorReport | null;',
        "claim_input_detector",
    )
    detector_claim = r'''  const sourcePatternEvidence = input.sourcePatternEvidence;
  const sourcePatternClaims: Pass2574AuditClaim[] = sourcePatternEvidence?.state === "confirmed_source_pattern"
    ? [{
        id: `source-pattern-${sourcePatternEvidence.family.toLowerCase()}`,
        category: "security_flags",
        label: "ERC-2771 / Multicall sender-context source pattern",
        grade: "confirmed",
        sourceFamily: `${sourcePatternEvidence.provider ?? "verified source"} + Velmere source-pattern detector`,
        claim: sourcePatternEvidence.customerLine,
        customerLine: sourcePatternEvidence.customerLine,
        proPdfLine: sourcePatternEvidence.proPdfLine,
        advancedAction: sourcePatternEvidence.advancedAction,
        canShowAsFact: true,
        confidence: clamp(sourcePatternEvidence.confidence, 0, 100),
        missing: sourcePatternEvidence.blockers,
        adverseKind: "source_pattern",
        evidenceRefs: sourcePatternEvidence.evidenceRefs,
        severityCandidate: sourcePatternEvidence.severityCandidate ?? "elevated",
        exploitabilityBoundary: sourcePatternEvidence.exploitabilityBoundary,
        remediation: sourcePatternEvidence.remediation,
        retest: sourcePatternEvidence.retest,
      }]
    : [];

  const authorityEvidence = input.authorityEvidence;'''
    text = replace_once(text, '  const authorityEvidence = input.authorityEvidence;', detector_claim, "claim_source_pattern_mapping")
    text = replace_once(
        text,
        '  const claims = uniqueClaims([...authorityClaims, ...runtimeClaims, ...quorumClaims, ...derivedClaims]).slice(0, 24);',
        '  const claims = uniqueClaims([...sourcePatternClaims, ...authorityClaims, ...runtimeClaims, ...quorumClaims, ...derivedClaims]).slice(0, 24);',
        "claim_detector_precedence",
    )
    return text


def patch_assembler(text: str) -> str:
    text = replace_once(
        text,
        '  advancedAction: string;\n  sourceFamily: string;\n};',
        '  advancedAction: string;\n  sourceFamily: string;\n  evidenceRefs?: string[];\n  exploitabilityBoundary?: string;\n  remediation?: string[];\n  retest?: { required: boolean; negativeControl: string; positiveControl: string };\n};',
        "assembler_top_finding_structured_fields",
    )
    old_fn = r'''function findingFromAdverseClaim(claim: Pass2574AuditClaimLedgerReport["claims"][number]): Pass2578TopFinding {
  const riskFloor = Math.max(0, Math.min(100, Math.round(claim.adverseRiskFloor ?? 0)));
  return {
    id: `finding-${claim.id}`,
    severity: riskFloor >= 85 ? "critical" : riskFloor >= 65 ? "elevated" : "watch",
    title: claim.adverseKind === "deployment_identity" ? "Deployment identity mismatch · confirmed" : `${claim.label} · confirmed`,
    publicLine: claim.customerLine,
    proLine: claim.proPdfLine,
    advancedAction: claim.advancedAction,
    sourceFamily: claim.sourceFamily,
  };
}'''
    new_fn = r'''function findingFromAdverseClaim(claim: Pass2574AuditClaimLedgerReport["claims"][number]): Pass2578TopFinding {
  const riskFloor = Math.max(0, Math.min(100, Math.round(claim.adverseRiskFloor ?? 0)));
  const severity = claim.adverseKind === "source_pattern"
    ? claim.severityCandidate ?? "elevated"
    : riskFloor >= 85 ? "critical" : riskFloor >= 65 ? "elevated" : "watch";
  return {
    id: `finding-${claim.id}`,
    severity,
    title: claim.adverseKind === "deployment_identity"
      ? "Deployment identity mismatch · confirmed"
      : claim.adverseKind === "source_pattern"
        ? `${claim.label} · source pattern confirmed`
        : `${claim.label} · confirmed`,
    publicLine: claim.customerLine,
    proLine: claim.proPdfLine,
    advancedAction: claim.advancedAction,
    sourceFamily: claim.sourceFamily,
    evidenceRefs: claim.evidenceRefs,
    exploitabilityBoundary: claim.exploitabilityBoundary,
    remediation: claim.remediation,
    retest: claim.retest,
  };
}'''
    text = replace_once(text, old_fn, new_fn, "assembler_adverse_mapper")
    old_risk = r'''  const confirmedAdverseClaims = (input.claimLedger?.claims ?? []).filter((claim) =>
    claim.grade === "confirmed" && claim.canShowAsFact && Number.isFinite(claim.adverseRiskFloor) && Number(claim.adverseRiskFloor) > 0);
  const adverseRiskFloor = confirmedAdverseClaims.length > 0
    ? Math.max(...confirmedAdverseClaims.map((claim) => Math.max(0, Math.min(100, Math.round(Number(claim.adverseRiskFloor))))))
    : null;'''
    new_risk = r'''  const confirmedAdverseClaims = (input.claimLedger?.claims ?? []).filter((claim) =>
    claim.grade === "confirmed" && claim.canShowAsFact && (
      claim.adverseKind === "source_pattern" || (Number.isFinite(claim.adverseRiskFloor) && Number(claim.adverseRiskFloor) > 0)
    ));
  const riskFloorClaims = confirmedAdverseClaims.filter((claim) => Number.isFinite(claim.adverseRiskFloor) && Number(claim.adverseRiskFloor) > 0);
  const adverseRiskFloor = riskFloorClaims.length > 0
    ? Math.max(...riskFloorClaims.map((claim) => Math.max(0, Math.min(100, Math.round(Number(claim.adverseRiskFloor))))))
    : null;'''
    text = replace_once(text, old_risk, new_risk, "assembler_source_pattern_no_risk_floor")
    return text


def patch_handler(text: str) -> str:
    text = replace_once(
        text,
        'import { buildPass2572AuditProviderRuntimeExecution } from "@/lib/security/audit-provider-runtime-client";',
        'import { buildPass2572AuditProviderRuntimeExecution } from "@/lib/security/audit-provider-runtime-client";\nimport { buildPass5002Erc2771MulticallSourceDetectorReport } from "@/lib/security/erc2771-multicall-source-detector";',
        "handler_detector_import",
    )
    text = replace_once(
        text,
        '  const pass2572VerifiedStaticEvidence = pass2572AuditProviderRuntimeExecution.verifiedStaticEvidence ?? null;\n  const pass2573AuditRuntimeConfidence',
        '  const pass2572VerifiedStaticEvidence = pass2572AuditProviderRuntimeExecution.verifiedStaticEvidence ?? null;\n  const pass5002Erc2771MulticallSourceDetector = buildPass5002Erc2771MulticallSourceDetectorReport({\n    locale,\n    chain: normalized.chain,\n    contractAddress: customerContractAddress,\n    verifiedStaticEvidence: pass2572VerifiedStaticEvidence,\n  });\n  const pass2573AuditRuntimeConfidence',
        "handler_detector_execution",
    )
    text = replace_once(
        text,
        '    runtimeConfidence: pass2573AuditRuntimeConfidence,\n    authorityEvidence: pass5001AuditAdjudicatedAuthorityEvidence,\n  });',
        '    runtimeConfidence: pass2573AuditRuntimeConfidence,\n    authorityEvidence: pass5001AuditAdjudicatedAuthorityEvidence,\n    sourcePatternEvidence: pass5002Erc2771MulticallSourceDetector,\n  });',
        "handler_detector_claim_handoff",
    )
    return text


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source-root", required=True)
    ap.add_argument("--parent-manifest", required=True)
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--receipt", required=True)
    args = ap.parse_args()

    root = Path(args.source_root)
    parent = json.loads(Path(args.parent_manifest).read_text(encoding="utf-8"))
    for key, expected in PARENT.items():
        observed = parent["projection"].get(key)
        if observed != expected:
            raise SystemExit(f"P78R3 parent projection mismatch:{key}:{observed}:{expected}")

    rowmap = {row["path"]: dict(row) for row in parent["files"]}
    if NEW_PATH in rowmap or (root / NEW_PATH).exists():
        raise SystemExit(f"P78R3 detector path already exists:{NEW_PATH}")

    changed = []
    for rel, guard in PREIMAGE.items():
        path = root / rel
        before = path.read_bytes(); before_sha = sha256(before)
        if len(before) != guard["bytes"] or before_sha != guard["sha256"]:
            raise SystemExit(f"P78R3 preimage mismatch:{rel}:{len(before)}/{guard['bytes']}:{before_sha}/{guard['sha256']}")
        text = before.decode("utf-8")
        if rel.endswith("audit-claim-ledger.ts"):
            after_text = patch_claim_ledger(text)
        elif rel.endswith("audit-report-assembler.ts"):
            after_text = patch_assembler(text)
        else:
            after_text = patch_handler(text)
        after = after_text.encode("utf-8"); after_sha = sha256(after)
        if after == before: raise SystemExit(f"P78R3 no-op patch:{rel}")
        path.write_bytes(after)
        rowmap[rel]["byteLength"] = len(after); rowmap[rel]["sha256"] = after_sha
        changed.append({"path": rel, "beforeBytes": len(before), "beforeSha256": before_sha, "afterBytes": len(after), "afterSha256": after_sha})

    detector_path = root / NEW_PATH
    detector_path.parent.mkdir(parents=True, exist_ok=True)
    detector_bytes = DETECTOR_SOURCE.encode("utf-8")
    detector_path.write_bytes(detector_bytes)
    detector_sha = sha256(detector_bytes)
    rowmap[NEW_PATH] = {"path": NEW_PATH, "byteLength": len(detector_bytes), "sha256": detector_sha}
    changed.append({"path": NEW_PATH, "beforeBytes": None, "beforeSha256": None, "afterBytes": len(detector_bytes), "afterSha256": detector_sha})

    rows = sorted(rowmap.values(), key=lambda row: row["path"])
    observed = identity(rows)
    if observed["fileCount"] != PARENT["fileCount"] + 1:
        raise SystemExit(f"P78R3 file-count mismatch:{observed}")

    new_manifest = dict(parent)
    new_manifest["schemaVersion"] = "velmere.p78r3.build-relevant-projection.v1"
    new_manifest["classification"] = "CURRENT_PRODUCT_PROJECTION_P78R3_ERC2771_MULTICALL_SOURCE_PATTERN"
    new_manifest["projection"] = dict(parent["projection"])
    new_manifest["projection"].update(observed)
    new_manifest["projection"]["purpose"] = "Detect a verified-source ERC2771 + arbitrary self-delegatecall multicall sender-context pattern, bind it into claim/report remediation+retest structure, and keep runtime exploitability/risk-floor promotion withheld."
    new_manifest["projection"]["excludedFromCredit"] = ["runtime exploitability proof", "deployed bytecode equivalence", "formal detector accuracy", "Customer FINAL", "Audit FINAL PDF", "rights expansion", "paid value", "sale eligibility", "LIVE", "world-class proof"]
    new_manifest["files"] = rows
    new_manifest["p78r3Delta"] = {"parent": "P78R2/V17", "changedBuildRelevantFiles": changed, "riskFloorPromotion": False, "runtimeExploitabilityPromotion": False, "customerFinalOutputCredit": 0, "auditFinalPdfCredit": 0, "rightsCredit": 0, "paidValueCredit": 0, "saleCredit": 0, "live": False}
    Path(args.manifest).write_text(json.dumps(new_manifest, indent=2) + "\n", encoding="utf-8")

    receipt = {
        "schemaVersion": "velmere.p78r3.erc2771-multicall-source-pattern-source-patch.v1",
        "status": "PASS",
        "parentProjection": PARENT,
        "projection": observed,
        "changedFiles": changed,
        "semanticRepairs": [
            "new detector consumes only exact identity+chain+digest-bound verified static source",
            "Etherscan plain Solidity and standard-json/double-brace source containers are bounded and decoded",
            "comments and string literals are excluded from pattern matching",
            "confirmed source pattern maps into claim ledger with evidence refs, exploitability boundary, remediation and retest",
            "report assembler surfaces the source-pattern finding without applying an adverse risk floor",
            "reachable audit handler executes detector before claim ledger and passes the structured result",
        ],
        "zeroFakeCredit": {"runtimeExploitability": 0, "deployedBytecodeEquivalence": 0, "formalDetectorAccuracy": "WITHHELD", "customerFinal": "0/20", "auditFinalPdf": "0/3", "rights": "2/203", "paidValue": "0/10", "saleEligible": "0/20", "live": False},
        "truthBoundary": "P78R3 may confirm only a verified-source vulnerability pattern. It cannot claim deployed reachability/runtime exploitability or promote FINAL/PDF/value/rights/sale/LIVE by itself.",
    }
    Path(args.receipt).write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
