#!/usr/bin/env node
import fs from "node:fs";
import { createHash, createPublicKey, verify as cryptoVerify } from "node:crypto";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((rows, value, index, all) => {
    if (value.startsWith("--")) rows.push([value.slice(2), all[index + 1]]);
    return rows;
  }, []),
);
const fail = (message) => {
  console.error(message);
  process.exit(1);
};
const clean = (value) => String(value ?? "").trim();
const sha = (value) => createHash("sha256").update(value).digest("hex");
const stable = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
};
const publicKey = (pem) => {
  const key = createPublicKey(clean(pem).replace(/\\n/g, "\n"));
  if (key.asymmetricKeyType !== "ed25519") fail("checkpoint public key is not Ed25519");
  return key;
};
const fingerprint = (pem) => sha(publicKey(pem).export({ type: "spki", format: "der" }));
const entryLeaf = (entry) => sha(stable({ schemaVersion: "velmere.release-transparency-checkpoint-leaf.v1", entry }));
const parent = (left, right) => sha(stable({ schemaVersion: "velmere.release-transparency-merkle-node.v1", left, right }));
const root = (entries) => {
  if (!Array.isArray(entries) || entries.length < 1) fail("checkpoint entries missing");
  let level = entries.map(entryLeaf);
  while (level.length > 1) {
    const next = [];
    for (let index = 0; index < level.length; index += 2) next.push(parent(level[index], level[index + 1] ?? level[index]));
    level = next;
  }
  return level[0];
};

if (!args.checkpoints || !args["trust-checkpoints"]) {
  fail("usage: --checkpoints checkpoints.json --trust-checkpoints trust.json [--environment production] [--audience value] [--latest-root sha256] [--trusted-fingerprint sha256]");
}
const checkpoints = JSON.parse(fs.readFileSync(args.checkpoints, "utf8"));
const trustCheckpoints = JSON.parse(fs.readFileSync(args["trust-checkpoints"], "utf8"));
if (!Array.isArray(checkpoints) || checkpoints.length < 1 || !Array.isArray(trustCheckpoints)) fail("invalid checkpoint inputs");
const trustByDigest = new Map(trustCheckpoints.map((item) => [item.checkpointDigest, item]));
const ordered = [...checkpoints].sort((a, b) => a.payload.sequence - b.payload.sequence);
let previous = null;
for (const artifact of ordered) {
  if (artifact.schemaVersion !== "velmere.release-transparency-checkpoint.v1") fail("checkpoint schema invalid");
  const trust = trustByDigest.get(artifact.payload.trustCheckpointDigest);
  if (!trust) fail("trust checkpoint missing");
  if (args.environment && artifact.payload.environment !== args.environment) fail("environment mismatch");
  if (args.audience && artifact.payload.audience !== args.audience) fail("audience mismatch");
  if (artifact.payload.audienceHash !== sha(artifact.payload.audience)) fail("audience hash mismatch");
  if (artifact.payload.sequence === 1) {
    if (artifact.payload.previousCheckpointDigest !== null || previous !== null) fail("genesis chain invalid");
  } else {
    if (!previous || artifact.payload.sequence !== previous.payload.sequence + 1) fail("checkpoint sequence gap");
    if (artifact.payload.previousCheckpointDigest !== previous.checkpointDigest) fail("previous checkpoint digest mismatch");
    if (artifact.payload.previousEntriesRoot !== previous.payload.entriesRoot || artifact.payload.previousTreeSize !== previous.payload.treeSize) fail("previous tree binding mismatch");
    if (artifact.entries.length <= previous.entries.length) fail("tree did not extend");
    if (root(artifact.entries.slice(0, previous.entries.length)) !== previous.payload.entriesRoot) fail("prefix rewrite detected");
  }
  if (artifact.entries.length !== artifact.payload.treeSize) fail("tree size mismatch");
  for (let index = 0; index < artifact.entries.length; index += 1) {
    if (artifact.entries[index].sequence !== index + 1) fail("entry sequence gap");
  }
  if (root(artifact.entries) !== artifact.payload.entriesRoot) fail("entries root mismatch");
  if (artifact.entries[0].entryDigest !== artifact.payload.firstEntryDigest || artifact.entries.at(-1).entryDigest !== artifact.payload.lastEntryDigest) fail("boundary digest mismatch");
  if (artifact.entries.at(-1).logRoot !== artifact.payload.latestLogRoot) fail("latest log root mismatch");
  const consistencyDigest = sha(stable({
    schemaVersion: "velmere.release-transparency-checkpoint-consistency.v1",
    previousCheckpointDigest: artifact.payload.previousCheckpointDigest,
    previousEntriesRoot: artifact.payload.previousEntriesRoot,
    previousTreeSize: artifact.payload.previousTreeSize,
    entriesRoot: artifact.payload.entriesRoot,
    treeSize: artifact.payload.treeSize,
    latestLogRoot: artifact.payload.latestLogRoot,
  }));
  if (consistencyDigest !== artifact.payload.consistencyDigest) fail("consistency digest mismatch");
  const keys = new Map(trust.payload.keys.map((key) => [key.keyId, key]));
  const seen = new Set();
  let active = 0;
  if (artifact.signatures.length < artifact.payload.signatureThreshold) fail("signature threshold not met");
  for (const signature of artifact.signatures) {
    if (seen.has(signature.keyId)) fail("duplicate signer");
    seen.add(signature.keyId);
    const key = keys.get(signature.keyId);
    if (!key || key.status === "revoked") fail("revoked or unknown signer");
    if (key.status === "active") active += 1;
    if (!cryptoVerify(null, Buffer.from(stable(artifact.payload)), publicKey(key.publicKeyPem), Buffer.from(signature.signature, "base64url"))) fail("signature invalid");
  }
  if (active < 1) fail("active signer required");
  const signatures = [...artifact.signatures].sort((a, b) => a.keyId.localeCompare(b.keyId));
  if (artifact.checkpointDigest !== sha(stable({ payload: artifact.payload, entries: artifact.entries, signatures }))) fail("checkpoint digest mismatch");
  previous = artifact;
}
if (args["latest-root"] && ordered.at(-1).payload.entriesRoot !== args["latest-root"]) fail("latest entries root mismatch");
if (args["trusted-fingerprint"]) {
  const latestTrust = trustByDigest.get(ordered.at(-1).payload.trustCheckpointDigest);
  if (!latestTrust.payload.keys.some((key) => key.status === "active" && fingerprint(key.publicKeyPem) === args["trusted-fingerprint"])) fail("trusted fingerprint missing");
}
console.log(JSON.stringify({ schemaVersion: "velmere.release-transparency-checkpoint-independent-verifier.v1", ok: true, checkpoints: ordered.length, latestCheckpointDigest: ordered.at(-1).checkpointDigest, latestEntriesRoot: ordered.at(-1).payload.entriesRoot }, null, 2));
