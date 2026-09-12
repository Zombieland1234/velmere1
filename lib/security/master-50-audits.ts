import type { ContractAuditProfile } from "./contract-audit-profiles";

/**
 * Historical R9/R10 synthetic audit profiles are intentionally retired from the
 * current evidence surface.
 *
 * The former entries mixed benchmark/demo copy with customer-like fields such
 * as VERIFIED metrics, formal-proof wording, external timestamp wording and
 * human-review attestations. They are preserved in Git history and in the exact
 * R9 source archive, but they must not be consumed as current report evidence.
 *
 * New benchmark fixtures belong in an explicitly local/fixture namespace and
 * receive zero customer/release credit until independently observed evidence is
 * bound to the exact target and execution.
 */
export const MASTER_50_AUDITS: Record<string, ContractAuditProfile> = Object.freeze({});

export const MASTER_50_AUDITS_CURRENT_STATUS = "RETIRED_HISTORICAL_SYNTHETIC_NO_CURRENT_EVIDENCE_CREDIT" as const;
