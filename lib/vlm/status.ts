/** Env-driven VLM status. No hardcoded sale-mode wording. */

export type VlmContractStatus = "published" | "registry_required";
export type VlmRegistryStatus = "published" | "pending";
export type VlmTradingStatus = "route_available" | "route_required" | "opens_after_deployment";
export type VlmAuditStatus = "audit_record_available" | "audit_required";

export type VlmStatus = {
  isLive: boolean;
  contractStatus: VlmContractStatus;
  registryStatus: VlmRegistryStatus;
  tradingStatus: VlmTradingStatus;
  auditStatus: VlmAuditStatus;
  contractAddress: string | null;
  chainId: string | null;
  explorerUrl: string | null;
  dexRouter: string | null;
  poolAddress: string | null;
  auditUrl: string | null;
  treasuryAddress: string | null;
  abiUrl: string | null;
  networkName: string | null;
};

export function isVlmLive(): boolean {
  return (
    process.env.VLM_LIVE === "true" &&
    Boolean(process.env.VLM_CONTRACT_ADDRESS?.trim()) &&
    Boolean(process.env.VLM_CHAIN_ID?.trim())
  );
}

export function getVlmStatus(): VlmStatus {
  const live = isVlmLive();
  const contractAddress = process.env.VLM_CONTRACT_ADDRESS?.trim() || null;
  const chainId = process.env.VLM_CHAIN_ID?.trim() || null;
  const explorerUrl = process.env.VLM_EXPLORER_URL?.trim() || null;
  const dexRouter = process.env.VLM_DEX_ROUTER?.trim() || null;
  const poolAddress = process.env.VLM_POOL_ADDRESS?.trim() || null;
  const auditUrl = process.env.VLM_AUDIT_URL?.trim() || null;
  const treasuryAddress = process.env.VLM_TREASURY_ADDRESS?.trim() || null;
  const abiUrl = process.env.VLM_ABI_URL?.trim() || null;
  const networkName = process.env.VLM_NETWORK_NAME?.trim() || null;

  if (live) {
    return {
      isLive: true,
      contractStatus: "published",
      registryStatus: "published",
      tradingStatus: poolAddress ? "route_available" : "route_required",
      auditStatus: auditUrl ? "audit_record_available" : "audit_required",
      contractAddress,
      chainId,
      explorerUrl,
      dexRouter,
      poolAddress,
      auditUrl,
      treasuryAddress,
      abiUrl,
      networkName,
    };
  }

  return {
    isLive: false,
    contractStatus: "registry_required",
    registryStatus: "pending",
    tradingStatus: "opens_after_deployment",
    auditStatus: "audit_required",
    contractAddress: null,
    chainId: null,
    explorerUrl: null,
    dexRouter: null,
    poolAddress: null,
    auditUrl: null,
    treasuryAddress: null,
    abiUrl: null,
    networkName: null,
  };
}

export function getVlmTradingLabel(status: VlmStatus): string {
  switch (status.tradingStatus) {
    case "route_available":
      return "Registry route available";
    case "route_required":
      return "Registry route required";
    default:
      return "Access opens after official registry publication";
  }
}

export function getVlmAuditLabel(status: VlmStatus): string {
  return status.auditStatus === "audit_record_available"
    ? "Audit record available"
    : "Audit record required";
}

export type RegistryRow = {
  key: string;
  label: string;
  value: string | null;
  isAddress: boolean;
  isUrl: boolean;
};

export function getVlmRegistryRows(status: VlmStatus): RegistryRow[] {
  return [
    { key: "contract", label: "Contract address", value: status.contractAddress, isAddress: true, isUrl: false },
    { key: "chain", label: "Chain ID", value: status.chainId, isAddress: false, isUrl: false },
    { key: "network", label: "Network", value: status.networkName ?? "EVM", isAddress: false, isUrl: false },
    { key: "explorer", label: "Explorer", value: status.explorerUrl, isAddress: false, isUrl: true },
    { key: "router", label: "DEX router", value: status.dexRouter, isAddress: true, isUrl: false },
    { key: "pool", label: "Pool address", value: status.poolAddress, isAddress: true, isUrl: false },
    { key: "treasury", label: "Treasury", value: status.treasuryAddress, isAddress: true, isUrl: false },
    { key: "audit", label: "Audit URL", value: status.auditUrl, isAddress: false, isUrl: true },
    { key: "abi", label: "ABI URL", value: status.abiUrl, isAddress: false, isUrl: true },
  ];
}
