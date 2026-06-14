import type { TokenRiskResult } from "./risk-types";
import type { VlmBrainPdfPreviewManifest } from "./vlm-brain-pdf-preview-manifest";
import type { VlmBrainReleaseChainAudit } from "./vlm-brain-release-chain-auditor";
import type { VlmBrainSourceLedgerUiPreview } from "./vlm-brain-source-ledger-ui-preview";

export type VlmBrainLensShieldHandoffRoute = {
  id: "lens_search" | "shield_modal" | "source_ledger" | "report_preview" | "operator_case";
  label: string;
  state: "ready_preview" | "review_locked" | "blocked";
  routeHint: string;
  privacyGate: "no_raw_payload" | "operator_only" | "after_review";
  nextAction: string;
};

export type VlmBrainLensShieldHandoff = {
  schemaVersion: "vlm-brain-lens-shield-handoff-v1-pass223";
  handoffMode: "lens_to_shield_operator_preview";
  handoffId: string;
  createdAt: string;
  token: { symbol: string; name: string };
  searchQuery: string;
  releaseAuditId: string;
  ledgerPreviewId: string;
  manifestId: string;
  handoffDecision: "blocked" | "review_locked" | "ready_preview";
  publicRouteEnabled: false;
  rawQueryPayloadAllowed: false;
  routes: VlmBrainLensShieldHandoffRoute[];
  operatorSummary: string;
  customerBoundary: string;
};

const PASS223_LENS_SHIELD_HANDOFF_SCHEMA = "vlm-brain-lens-shield-handoff-v1-pass223" as const;

function compact(value: unknown, fallback = "Lens handoff review required", limit = 260) {
  return String(value ?? fallback).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-LENS-SHIELD-HANDOFF", 220).toUpperCase().replace(/[^A-Z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function route(input: VlmBrainLensShieldHandoffRoute): VlmBrainLensShieldHandoffRoute {
  return { ...input, label: compact(input.label, "handoff route", 120), routeHint: compact(input.routeHint, "operator route", 160), nextAction: compact(input.nextAction, "review route before export", 260) };
}

export function buildVlmBrainLensShieldHandoff(
  releaseChainAudit: VlmBrainReleaseChainAudit,
  sourceLedgerPreview: VlmBrainSourceLedgerUiPreview,
  pdfPreviewManifest: VlmBrainPdfPreviewManifest,
  result: TokenRiskResult,
): VlmBrainLensShieldHandoff {
  const createdAt = result.generatedAt ?? releaseChainAudit.createdAt ?? new Date().toISOString();
  const symbol = compact(result.token.symbol || releaseChainAudit.token.symbol || "TOKEN", "TOKEN", 32).toUpperCase();
  const blocked = releaseChainAudit.chainDecision === "blocked" || pdfPreviewManifest.routeState === "download_blocked" || sourceLedgerPreview.ledgerDecision === "blocked";
  const review = !blocked && (releaseChainAudit.reviewCount > 0 || pdfPreviewManifest.reviewSectionCount > 0 || sourceLedgerPreview.serverRequiredCount > 0);
  const routes = [
    route({ id: "lens_search", label: "Lens search context", state: "ready_preview", routeHint: `/lens?q=${encodeURIComponent(symbol)}`, privacyGate: "no_raw_payload", nextAction: "Keep query context short; do not pass raw adapter payloads through URL or client state." }),
    route({ id: "shield_modal", label: "Shield modal focus", state: blocked ? "blocked" : "ready_preview", routeHint: `Shield modal: ${symbol}`, privacyGate: "operator_only", nextAction: "Open token modal with source confidence and missing-data chips visible." }),
    route({ id: "source_ledger", label: "Source ledger preview", state: sourceLedgerPreview.ledgerDecision === "blocked" ? "blocked" : "review_locked", routeHint: sourceLedgerPreview.ledgerPreviewId, privacyGate: "operator_only", nextAction: "Connect server ledger before customer proof or report export." }),
    route({ id: "report_preview", label: "Report preview", state: pdfPreviewManifest.routeState === "download_blocked" ? "blocked" : "review_locked", routeHint: pdfPreviewManifest.manifestId, privacyGate: "after_review", nextAction: "Keep HTML/PDF-ready preview operator-only until redaction and browser QA pass." }),
    route({ id: "operator_case", label: "Operator case", state: "review_locked", routeHint: releaseChainAudit.auditId, privacyGate: "operator_only", nextAction: "Attach reviewer note and source coverage before customer copy." }),
  ];
  return {
    schemaVersion: PASS223_LENS_SHIELD_HANDOFF_SCHEMA,
    handoffMode: "lens_to_shield_operator_preview",
    handoffId: stableId(`VLM-LENS-SHIELD-${symbol}-${releaseChainAudit.auditId}-${createdAt}`),
    createdAt,
    token: { symbol, name: releaseChainAudit.token.name || result.token.name || symbol },
    searchQuery: symbol,
    releaseAuditId: releaseChainAudit.auditId,
    ledgerPreviewId: sourceLedgerPreview.ledgerPreviewId,
    manifestId: pdfPreviewManifest.manifestId,
    handoffDecision: blocked ? "blocked" : review ? "review_locked" : "ready_preview",
    publicRouteEnabled: false,
    rawQueryPayloadAllowed: false,
    routes,
    operatorSummary: blocked ? "Lens-to-Shield handoff is blocked until release chain and PDF route gates clear." : "Lens-to-Shield handoff is operator preview only; public route remains disabled.",
    customerBoundary: "Lens handoff may link search context to Shield analysis, but it cannot expose raw payloads, private evidence, or a final verdict.",
  };
}

export const PASS223_VLM_BRAIN_LENS_SHIELD_HANDOFF_CONTRACT = true;
