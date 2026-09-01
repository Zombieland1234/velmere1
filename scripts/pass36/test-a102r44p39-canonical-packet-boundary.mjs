#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  verifyAuditCompilerCanonicalPacket,
  verifyAuditCompilerPacketSet,
} from "../../lib/security/audit-compiler-canonical-packet.mjs";

const packetDirectory = path.resolve(process.argv[2] ?? "");
const files = fs.readdirSync(packetDirectory).filter((name) => name.endsWith(".json")).sort();
const cases = new Map();
for (const name of files) {
  const packet = JSON.parse(fs.readFileSync(path.join(packetDirectory, name), "utf8"));
  if (!cases.has(packet.caseRef)) cases.set(packet.caseRef, []);
  cases.get(packet.caseRef).push(packet);
}
const rows = [];
const check = (id, passed, detail = null) => rows.push({ id, passed: Boolean(passed), detail });
check("packet-denominator", files.length === 48 && cases.size === 16, { files: files.length, cases: cases.size });
for (const [caseRef, packets] of [...cases.entries()].sort()) {
  check(`packet-self-digests:${caseRef}`, packets.every((packet) => verifyAuditCompilerCanonicalPacket(packet)));
  const set = verifyAuditCompilerPacketSet(packets);
  check(`packet-set:${caseRef}`, set.failed === 0, set);
}
const sample = structuredClone([...cases.values()][0][0]);
sample.findings[0].title = `${sample.findings[0].title} tampered`;
check("tampered-finding-rejected", verifyAuditCompilerCanonicalPacket(sample) === false);
const tierTamper = structuredClone([...cases.values()][0].find((packet) => packet.tier === "basic"));
tierTamper.availability = "NOT_FOR_SALE";
check("tier-availability-tamper-rejected", verifyAuditCompilerCanonicalPacket(tierTamper) === false);
const confidenceTamper = structuredClone([...cases.values()][0].find((packet) => packet.tier === "pro"));
confidenceTamper.findingConfidence = 99;
check("numeric-confidence-tamper-rejected", verifyAuditCompilerCanonicalPacket(confidenceTamper) === false);
const failed = rows.filter((row) => !row.passed);
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44p39.canonical-packet-boundary.v1",
  status: failed.length ? "FAIL_R44P39_CANONICAL_PACKET_BOUNDARY" : "PASS_R44P39_CANONICAL_PACKET_BOUNDARY",
  checks: rows.length,
  passed: rows.length - failed.length,
  failed: failed.length,
  rows,
}, null, 2));
if (failed.length) process.exit(1);
