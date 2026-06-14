import { VLM_CONTRACTS } from "./contracts";

export type VlmAccessEligibility =
  | {
      status: "contract_not_deployed";
      eligible: false;
      requiresApproval: false;
      reason: "VLM contract address is not configured.";
    }
  | {
      status: "eligible" | "not_eligible";
      eligible: boolean;
      requiresApproval: false;
      balance: bigint;
      threshold: bigint;
    };

export function getVlmAccessEligibility(): VlmAccessEligibility {
  if (!VLM_CONTRACTS.evm.address) {
    return {
      status: "contract_not_deployed",
      eligible: false,
      requiresApproval: false,
      reason: "VLM contract address is not configured.",
    };
  }

  return {
    status: "not_eligible",
    eligible: false,
    requiresApproval: false,
    balance: BigInt(0),
    threshold: BigInt(1),
  };
}
