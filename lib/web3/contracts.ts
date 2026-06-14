export const VLM_CONTRACTS = {
  evm: {
    status: "not_deployed",
    chainId: null,
    address: null,
    explorerUrl: null,
    standard: "OpenZeppelin ERC20 planned",
  },
  solana: {
    status: "planned_later",
    mint: null,
    explorerUrl: null,
  },
  sui: {
    status: "planned_later",
    packageId: null,
    coinType: null,
    explorerUrl: null,
  },
} as const;

export const VLM_CHAIN_STRATEGY = {
  mvp: "evm",
  evm: "EVM / planned MVP",
  solana: "Solana / planned later",
  sui: "Sui / planned later",
} as const;
