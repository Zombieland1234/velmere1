/**
 * Compatibility entry point for the canonical security engine registry.
 *
 * The implementation lives in ./index.ts. Keeping this narrow re-export avoids
 * duplicating registry state while preserving the historical import contract.
 */
export { resolveSecurityEngine } from "./index";
export type { CanonicalAssetIdentity, SecurityAuditEngine } from "./types";
