#!/usr/bin/env node
import { collectCurrentSource, sourcePayload, sha256, canonicalJson } from "./current-source-authority-lib.mjs";

export const REV = "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";
export const PARENT = "VELMERE_PASS36_A102R40_ACTION_REQUIRED_CURRENT_SOURCE_AUTHORITY_EXACT_BUILD_PREFLIGHT_AND_STALE_RELEASE_POINTER_RECONCILIATION_NO_LIVE_CREDIT";
export const MANIFEST = "config/pass36/a102r41-current-root-descendant-manifest.json";
export const PARENT_MANIFEST = "config/pass36/a102r40-current-root-descendant-manifest.json";
export const STATE = "config/pass36/a102r41-action-required-current-state.json";
export const PROGRAM = "config/pass36/a102r41-world-class-completion-program.json";
export const MODE_POLICY = "config/pass36/a102r41-cross-platform-source-mode-policy.json";
export const MODE_MIGRATION = "config/pass36/a102r41-source-mode-denominator-migration.json";
export const APPROVED_LEDGER = "config/pass36/a102r41-approved-current-source-changes.json";
export const SPARSE_LEDGER = "config/pass36/a102r41-historical-descendant-sparse-edge-ledger.json";
export const AUTHORITY_MIGRATION = "config/pass36/a102r41-current-source-authority-denominator-migration.json";
export const A78_MIGRATION = "config/pass36/a102r41-a78-lockfile-denominator-migration.json";
export const collect = (root, options = {}) => collectCurrentSource(root, options);
export const payload = sourcePayload;
export { sha256, canonicalJson };
