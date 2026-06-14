export type WalletState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "wrong_network"
  | "contract_not_deployed"
  | "token_not_live"
  | "eligible"
  | "not_eligible"
  | "pending_signature"
  | "signature_rejected"
  | "transaction_pending"
  | "transaction_success"
  | "transaction_failed";

export const CURRENT_VLM_WALLET_STATE: WalletState = "contract_not_deployed";
