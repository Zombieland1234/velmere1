#!/usr/bin/env node
import fs from "node:fs";
import { createHash, createPublicKey, verify as cryptoVerify } from "node:crypto";

const args = Object.fromEntries(process.argv.slice(2).reduce((rows, value, index, all) => {
  if (value.startsWith("--")) rows.push([value.slice(2), all[index + 1]]);
  return rows;
}, []));
const fail = (message) => { console.error(message); process.exit(1); };
const clean = (value) => String(value ?? "").trim();
const sha = (value) => createHash("sha256").update(value).digest("hex");
const stable = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
};
const publicKey = (pem) => {
  const key = createPublicKey(clean(pem).replace(/\\n/g, "\n"));
  if (key.asymmetricKeyType !== "ed25519") fail("witness public key not ed25519");
  return key;
};
const fingerprint = (pem) => sha(publicKey(pem).export({ type: "spki", format: "der" }));
if (!args.quorums || !args.witnesses) fail("usage: --quorums <json> --witnesses <json>");
const quorums = JSON.parse(fs.readFileSync(args.quorums, "utf8"));
const witnesses = JSON.parse(fs.readFileSync(args.witnesses, "utf8"));
if (!Array.isArray(quorums) || !Array.isArray(witnesses)) fail("arrays required");
const witnessMap = new Map(witnesses.map((w) => [w.witnessId, w]));
const treeViews = new Map();
for (const artifact of quorums) {
  if (artifact.schemaVersion !== "velmere.release-transparency-witness-quorum.v1") fail("schema mismatch");
  if (args.environment && artifact.payload.environment !== args.environment) fail("environment mismatch");
  if (args.audience && artifact.payload.audience !== args.audience) fail("audience mismatch");
  const publicWitnesses = [...artifact.witnesses].sort((a, b) => a.witnessId.localeCompare(b.witnessId));
  const signatures = [...artifact.signatures].sort((a, b) => a.witnessId.localeCompare(b.witnessId));
  const expectedSet = sha(stable(publicWitnesses.map((w) => ({ witnessId: w.witnessId, organizationHash: w.organizationHash, publicKeyFingerprint: w.publicKeyFingerprint, status: w.status, validFrom: w.validFrom, validUntil: w.validUntil }))));
  if (expectedSet !== artifact.payload.witnessSetDigest) fail("witness set digest mismatch");
  const seen = new Set(), orgs = new Set(); let active = 0;
  for (const signature of signatures) {
    if (seen.has(signature.witnessId)) fail("duplicate witness");
    seen.add(signature.witnessId);
    const witness = witnessMap.get(signature.witnessId);
    const publicWitness = publicWitnesses.find((w) => w.witnessId === signature.witnessId);
    if (!witness || !publicWitness || witness.status === "revoked") fail("unknown or revoked witness");
    if (fingerprint(witness.publicKeyPem) !== publicWitness.publicKeyFingerprint) fail("fingerprint mismatch");
    const orgHash = sha(witness.organization);
    if (orgHash !== publicWitness.organizationHash || orgs.has(orgHash)) fail("organization threshold invalid");
    orgs.add(orgHash);
    if (witness.status === "active") active += 1;
    if (!cryptoVerify(null, Buffer.from(stable(artifact.payload)), publicKey(witness.publicKeyPem), Buffer.from(signature.signature, "base64url"))) fail("signature invalid");
  }
  if (signatures.length < artifact.payload.threshold || orgs.size < artifact.payload.threshold || active < 1) fail("threshold not met");
  const digest = sha(stable({ payload: artifact.payload, witnesses: publicWitnesses, signatures }));
  if (digest !== artifact.quorumDigest) fail("quorum digest mismatch");
  const key = `${artifact.payload.environment}:${artifact.payload.audienceHash}:${artifact.payload.treeSize}`;
  const view = `${artifact.payload.checkpointDigest}:${artifact.payload.entriesRoot}:${artifact.payload.latestLogRoot}`;
  if (treeViews.has(key) && treeViews.get(key) !== view) fail("split view detected");
  treeViews.set(key, view);
}
console.log(JSON.stringify({ schemaVersion: "velmere.release-transparency-witness-independent-verifier.v1", ok: true, quorums: quorums.length, uniqueTreeViews: treeViews.size }, null, 2));
