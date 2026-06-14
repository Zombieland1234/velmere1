import type { RiskSignalId, TokenRiskResult } from "./risk-types";

export type ContractTrapTone = "gold" | "cyan" | "amber" | "red" | "green" | "neutral";

export type ContractTrapRail = {
  id: "address" | "owner" | "mint" | "blacklist" | "tax" | "sell";
  label: string;
  value: string;
  tone: ContractTrapTone;
  note: string;
};

export type ContractTrapRegime = {
  version: "velmere_contract_trap_v1_pass271";
  status: "blocked_address" | "contract_trap_gate" | "privilege_review" | "source_gap" | "calm_proxy";
  headline: string;
  trustBadge: string;
  operatorCue: string;
  rails: ContractTrapRail[];
  blockers: string[];
  nextAction: string;
};

const CONTRACT_SIGNAL_IDS = new Set<RiskSignalId>([
  "contract_privileges",
  "honeypot_risk",
  "high_sell_tax",
  "mint_risk",
  "blacklist_risk",
]);

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function hasSignal(result: TokenRiskResult, ids: RiskSignalId[]) {
  const wanted = new Set(ids);
  return result.signals.some((signal) => wanted.has(signal.id));
}

function signalSeverityPoints(result: TokenRiskResult, ids: RiskSignalId[]) {
  const wanted = new Set(ids);
  return result.signals
    .filter((signal) => wanted.has(signal.id))
    .reduce((sum, signal) => sum + signal.points, 0);
}

function shortAddress(value?: string) {
  if (!value) return "needed";
  if (value.length <= 12) return value;
  return `${value.slice(0, 5)}…${value.slice(-4)}`;
}

function compactPercent(value?: number, fallback = "source required") {
  if (!Number.isFinite(value)) return fallback;
  return `${Number(value).toFixed(value && Math.abs(value) < 10 ? 1 : 0)}%`;
}

function toneFromScore(score: number): ContractTrapTone {
  if (score >= 74) return "red";
  if (score >= 52) return "amber";
  if (score >= 30) return "gold";
  return "green";
}

function toneFromPresence(active: boolean, missing: boolean): ContractTrapTone {
  if (active) return "red";
  if (missing) return "amber";
  return "green";
}

export function buildContractTrapRegime(result: TokenRiskResult): ContractTrapRegime {
  const tokenAddress = result.token.tokenAddress;
  const chainId = result.token.chainId;
  const hasContractAddress = Boolean(tokenAddress && chainId);
  const contractSignals = result.signals.filter((signal) => CONTRACT_SIGNAL_IDS.has(signal.id));

  const honeypot = hasSignal(result, ["honeypot_risk"]);
  const tax = hasSignal(result, ["high_sell_tax"]);
  const mint = hasSignal(result, ["mint_risk"]);
  const blacklist = hasSignal(result, ["blacklist_risk"]);
  const privileges = hasSignal(result, ["contract_privileges"]);
  const sellTax = result.metrics.sellTaxPercentage;
  const buyTax = result.metrics.buyTaxPercentage;
  const taxSpread =
    sellTax !== undefined && buyTax !== undefined ? Math.max(0, sellTax - buyTax) : undefined;

  const addressScore = hasContractAddress ? 8 : 62;
  const ownerScore = clamp((privileges ? 58 : 22) + (hasContractAddress ? 0 : 18));
  const mintScore = clamp((mint ? 68 : 16) + (privileges ? 10 : 0));
  const blacklistScore = clamp((blacklist ? 74 : 16) + (privileges ? 8 : 0));
  const taxScore = clamp(
    (tax ? 66 : 14) +
      (sellTax !== undefined ? Math.min(28, sellTax * 1.6) : 15) +
      (taxSpread !== undefined ? Math.min(18, taxSpread * 2) : 0),
  );
  const sellScore = clamp(
    (honeypot ? 92 : 16) +
      (tax ? 16 : 0) +
      (blacklist ? 12 : 0) +
      signalSeverityPoints(result, ["honeypot_risk", "high_sell_tax"]) * 0.28,
  );

  const totalTrapScore = Math.round(
    addressScore * 0.12 +
      ownerScore * 0.16 +
      mintScore * 0.16 +
      blacklistScore * 0.18 +
      taxScore * 0.18 +
      sellScore * 0.2,
  );

  const blockers = [
    !hasContractAddress ? "chain + contract address" : null,
    result.dataQuality !== "live" ? "contract analyzer freshness" : null,
    sellTax === undefined && buyTax === undefined ? "tax simulator source" : null,
    privileges && !tokenAddress ? "owner/admin permission source" : null,
    contractSignals.length ? null : "verified permission scan",
  ].filter(Boolean) as string[];

  const status = !hasContractAddress
    ? "blocked_address"
    : honeypot || (blacklist && tax) || totalTrapScore >= 72
      ? "contract_trap_gate"
      : contractSignals.length || totalTrapScore >= 48
        ? "privilege_review"
        : blockers.length >= 3
          ? "source_gap"
          : "calm_proxy";

  const headline =
    status === "blocked_address"
      ? "contract address needed"
      : status === "contract_trap_gate"
        ? "contract trap gate active"
        : status === "privilege_review"
          ? "owner privileges need review"
          : status === "source_gap"
            ? "contract source gap"
            : "contract proxy calm";

  return {
    version: "velmere_contract_trap_v1_pass271",
    status,
    headline,
    trustBadge: `contract ${totalTrapScore}/100`,
    operatorCue:
      status === "blocked_address"
        ? "Do not present contract safety until chain, address and analyzer source are attached."
        : status === "contract_trap_gate"
          ? "Pause public confidence: sell path, blacklist, mint and tax controls require direct explorer/analyzer proof."
          : status === "privilege_review"
            ? "Open Pro/Advanced only after owner, proxy, mint, pause, blacklist and tax controls are compared."
            : status === "source_gap"
              ? "Keep contract copy soft until analyzer freshness and tax simulation are visible."
              : "Contract proxy looks calmer, but still needs live analyzer confirmation before export.",
    blockers,
    nextAction:
      status === "blocked_address"
        ? "Attach chain + address, then run owner/proxy/mint/pause/blacklist/tax scan."
        : "Compare explorer source, bytecode/proxy status, owner/admin controls, tax simulator and sell simulation.",
    rails: [
      {
        id: "address",
        label: "address",
        value: shortAddress(tokenAddress),
        tone: toneFromPresence(false, !hasContractAddress),
        note: chainId ? `chain ${chainId}` : "chain missing",
      },
      {
        id: "owner",
        label: "owner/proxy",
        value: privileges ? "privileges" : hasContractAddress ? "scan" : "missing",
        tone: toneFromScore(ownerScore),
        note: privileges ? "admin rights cue" : "renounce/proxy proof",
      },
      {
        id: "mint",
        label: "mint/pause",
        value: mint ? "active flag" : "verify",
        tone: toneFromScore(mintScore),
        note: mint ? "supply can change" : "authority scan needed",
      },
      {
        id: "blacklist",
        label: "blacklist",
        value: blacklist ? "flagged" : "verify",
        tone: toneFromScore(blacklistScore),
        note: blacklist ? "transfer control risk" : "policy/source needed",
      },
      {
        id: "tax",
        label: "tax",
        value: sellTax !== undefined ? compactPercent(sellTax) : tax ? "flagged" : "source required",
        tone: toneFromScore(taxScore),
        note: taxSpread !== undefined ? `sell-buy ${compactPercent(taxSpread)}` : "buy/sell simulator",
      },
      {
        id: "sell",
        label: "sell path",
        value: honeypot ? "blocked?" : tax || blacklist ? "review" : "simulate",
        tone: toneFromScore(sellScore),
        note: honeypot ? "honeypot review" : "not a safety verdict",
      },
    ],
  };
}
