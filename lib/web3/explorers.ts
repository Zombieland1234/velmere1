export type ExplorerChain = "evm" | "base" | "ethereum" | "solana" | "sui";

export type ExplorerTarget = "address" | "tx";

export type ExplorerConfig = {
  chainName: string;
  explorerBaseUrl: string;
  addressPath: string;
  txPath: string;
  enabled: boolean;
};

export const EXPLORERS: Record<ExplorerChain, ExplorerConfig> = {
  evm: {
    chainName: "EVM",
    explorerBaseUrl: "https://basescan.org",
    addressPath: "address",
    txPath: "tx",
    enabled: true,
  },
  base: {
    chainName: "Base",
    explorerBaseUrl: "https://basescan.org",
    addressPath: "address",
    txPath: "tx",
    enabled: true,
  },
  ethereum: {
    chainName: "Ethereum",
    explorerBaseUrl: "https://etherscan.io",
    addressPath: "address",
    txPath: "tx",
    enabled: true,
  },
  solana: {
    chainName: "Solana",
    explorerBaseUrl: "https://explorer.solana.com",
    addressPath: "address",
    txPath: "tx",
    enabled: false,
  },
  sui: {
    chainName: "Sui",
    explorerBaseUrl: "https://suiscan.xyz/mainnet",
    addressPath: "account",
    txPath: "tx",
    enabled: false,
  },
};

export function classifyEvmSearch(value: string): ExplorerTarget | null {
  const query = value.trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(query)) return "address";
  if (/^0x[a-fA-F0-9]{64}$/.test(query)) return "tx";
  return null;
}

export function buildExplorerUrl(chain: ExplorerChain, target: ExplorerTarget, value: string) {
  const config = EXPLORERS[chain];
  const path = target === "address" ? config.addressPath : config.txPath;
  return `${config.explorerBaseUrl}/${path}/${value.trim()}`;
}
