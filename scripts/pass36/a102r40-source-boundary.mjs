#!/usr/bin/env node
import { collectCurrentSource, sourcePayload, sha256, canonicalJson } from "./current-source-authority-lib.mjs";

export const REV = "VELMERE_PASS36_A102R40_ACTION_REQUIRED_CURRENT_SOURCE_AUTHORITY_EXACT_BUILD_PREFLIGHT_AND_STALE_RELEASE_POINTER_RECONCILIATION_NO_LIVE_CREDIT";
export const PARENT = "VELMERE_PASS36_A102R39_ACTION_REQUIRED_CROSS_PLATFORM_SOURCE_MODE_IDENTITY_WINDOWS_UNPACK_AND_POSIX_EXECUTABLE_POLICY_NO_LIVE_CREDIT";
export const MANIFEST = "config/pass36/a102r40-current-root-descendant-manifest.json";
export const PARENT_MANIFEST = "config/pass36/a102r39-current-root-descendant-manifest.json";
export const STATE = "config/pass36/a102r40-action-required-current-state.json";
export const PROGRAM = "config/pass36/a102r40-world-class-completion-program.json";
export const RECEIPT = "config/pass36/a102r40-local-regression-receipt.json";
export const TEST_RECEIPT = "config/pass36/a102r40-test-receipt.json";
export const MODE_POLICY = "config/pass36/a102r40-cross-platform-source-mode-policy.json";
export const collect = (root, options = {}) => collectCurrentSource(root, options);
export const payload = sourcePayload;
export { sha256, canonicalJson };
