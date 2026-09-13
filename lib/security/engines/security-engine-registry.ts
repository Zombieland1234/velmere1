/**
 * Compatibility entrypoint for the canonical security engine registry.
 *
 * The implementation lives in ./index.ts. Keep this shim so older adversarial
 * corpus imports remain resolvable without duplicating registry state.
 */
export { resolveSecurityEngine } from "./index";
export type { CanonicalAssetIdentity, SecurityAuditEngine } from "./types";
