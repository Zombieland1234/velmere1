import type { VlmBrainAccessCopyFirewall } from "./vlm-brain-access-copy-firewall";
import type { VlmBrainExportAuthorizationGate } from "./vlm-brain-export-authorization-gate";
import type { VlmBrainWalletAccessGateMatrix } from "./vlm-brain-wallet-access-gate-matrix";

export type VlmBrainWalletSessionPolicyLane = {
  id: "session" | "entitlement" | "wallet_signature" | "seed_phrase" | "roi_copy" | "tier_depth";
  label: string;
  state: "blocked" | "server_required" | "review";
  nextAction: string;
};

export type VlmBrainWalletSessionPolicy = {
  schemaVersion: "vlm-brain-wallet-session-policy-v1-pass250";
  policyMode: "no_seed_session_gate_preview";
  policyId: string;
  createdAt: string;
  token: { symbol: string; name: string };
  policyDecision: "blocked" | "server_required";
  walletAccessAllowed: false;
  seedPhraseAllowed: false;
  privateKeyAllowed: false;
  roiCopyAllowed: false;
  publicSaleAllowed: false;
  lanes: VlmBrainWalletSessionPolicyLane[];
  operatorSummary: string;
  customerBoundary: string;
};

const SCHEMA = "vlm-brain-wallet-session-policy-v1-pass250" as const;
function compact(value: unknown, fallback = "wallet session policy required", limit = 300) { return String(value ?? fallback).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit) || fallback; }
function stableId(value: string) { return compact(value, "VLM-WALLET-SESSION", 260).toUpperCase().replace(/[^A-Z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""); }

export function buildVlmBrainWalletSessionPolicy(
  walletGate: VlmBrainWalletAccessGateMatrix,
  accessCopy: VlmBrainAccessCopyFirewall,
  exportGate: VlmBrainExportAuthorizationGate,
): VlmBrainWalletSessionPolicy {
  const createdAt = walletGate.createdAt ?? accessCopy.createdAt ?? exportGate.createdAt ?? new Date().toISOString();
  const lanes: VlmBrainWalletSessionPolicyLane[] = [
    { id: "session", label: "Server session", state: "server_required", nextAction: "Create signed, expiring server session before unlocking Basic/Pro/Advanced access." },
    { id: "entitlement", label: "Access entitlement", state: walletGate.accessDecision === "blocked" ? "blocked" : "server_required", nextAction: "Map VLM utility/access tier to server-side entitlement, not client-only state." },
    { id: "wallet_signature", label: "Wallet signature", state: "server_required", nextAction: "Use wallet signature only for session proof; never request seed phrase or private key." },
    { id: "seed_phrase", label: "Recovery phrase/private key", state: "blocked", nextAction: "Keep every recovery phrase/private key flow forbidden and blocked by guard." },
    { id: "roi_copy", label: "ROI / public sale copy", state: "blocked", nextAction: "Keep access copy utility-only with no price, profit, public sale or safe investment claim." },
    { id: "tier_depth", label: "Basic / Pro / Advanced depth", state: exportGate.walletAccessAllowed ? "review" : "server_required", nextAction: "Tier depth may affect analysis depth, not investment promises or final verdicts." },
  ];
  return {
    schemaVersion: SCHEMA,
    policyMode: "no_seed_session_gate_preview",
    policyId: stableId(`VLM-WALLET-SESSION-${walletGate.token.symbol}-${walletGate.gateId}-${createdAt}`),
    createdAt,
    token: walletGate.token,
    policyDecision: lanes.some((lane) => lane.state === "blocked") ? "blocked" : "server_required",
    walletAccessAllowed: false,
    seedPhraseAllowed: false,
    privateKeyAllowed: false,
    roiCopyAllowed: false,
    publicSaleAllowed: false,
    lanes,
    operatorSummary: "PASS250 creates a wallet/session policy that keeps VLM access utility-only and blocks seed phrase, private key, ROI and public-sale flows.",
    customerBoundary: "Wallet access is an entitlement/session gate only. It never asks for recovery phrase/private key and never promises financial outcomes.",
  };
}

export const PASS250_VLM_BRAIN_WALLET_SESSION_POLICY_CONTRACT = true;
