#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  REV,
  PARENT,
  MANIFEST,
  PARENT_MANIFEST,
  RECEIPT,
  MODE_POLICY,
  sha256,
  canonicalJson,
  readJson,
  collect,
  payload,
} from "./a102r39-source-boundary.mjs";

const root = process.cwd();
const manifest = readJson(root, MANIFEST);
const parent = readJson(root, PARENT_MANIFEST);
let checks = 0;
const ok = (value, id) => { checks += 1; assert.ok(value, id); };
ok(manifest.revisionId === REV && manifest.parentRevisionId === PARENT, "identity");
ok(parent.revisionId === PARENT && manifest.parentDescendantManifestDigestSha256 === parent.manifestDigestSha256, "parent");
const posixInventory = collect(root);
const windowsInventory = collect(root, { platform: "win32" });
ok(posixInventory.rejected.length === 0 && windowsInventory.rejected.length === 0, "rejected");
const posixPayload = payload(posixInventory.rows);
const windowsPayload = payload(windowsInventory.rows);
ok(canonicalJson(manifest.payload) === canonicalJson(posixPayload), "posix-payload");
ok(canonicalJson(manifest.windowsCanonicalPayload) === canonicalJson(windowsPayload), "windows-payload");
ok(canonicalJson(posixPayload) === canonicalJson(windowsPayload), "cross-platform-payload-parity");
ok(manifest.localRegressionReceiptSha256 === sha256(fs.readFileSync(path.join(root, RECEIPT))), "receipt");
ok(manifest.sourceModePolicySha256 === sha256(fs.readFileSync(path.join(root, MODE_POLICY))), "mode-policy");
const core = { ...manifest }; delete core.manifestDigestSha256;
ok(manifest.manifestDigestSha256 === sha256(canonicalJson(core)), "digest");
ok(manifest.claims.a102r39ModePolicyChecks === 21 && manifest.claims.a58CrossPlatformChecks === 45, "target");
ok(manifest.claims.executablePathDenominator === 23 && manifest.claims.windowsFilesystemModeAuthority === false && manifest.claims.posixExactPermissionParity === true, "mode-denominator");
ok(manifest.claims.crossPlatformPayloadParity && manifest.claims.sourceAuthorityReconciled, "closure");
ok(manifest.claims.formalRemainingEntries === 31 && !manifest.claims.exactWindowsBuildBrowserCredit, "formal");
ok(!manifest.claims.liveProven && !manifest.claims.saleEnabled && !manifest.claims.productionApproved && !manifest.claims.worldClassProven, "promotion");
console.log(JSON.stringify({
  status: "PASS_A102R39_DESCENDANT_CROSS_PLATFORM_MODE_IDENTITY_ACTION_REQUIRED_NO_PROMOTION",
  checksPassed: checks,
  checksFailed: 0,
  payload: manifest.payload,
  windowsCanonicalPayload: manifest.windowsCanonicalPayload,
  manifestDigestSha256: manifest.manifestDigestSha256,
}, null, 2));
