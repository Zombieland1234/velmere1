import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log(`PASS: ${message}`);
};

const integrity = read("lib/ai/vlm-source-integrity.ts");
const arbitration = read("lib/ai/vlm-source-arbitration.ts");
const quorum = read("lib/ai/vlm-evidence-quorum.ts");
const packet = read("lib/ai/vlm-fact-packet.ts");
const provider = read("lib/ai/vlm-provider-registry.ts");
const epistemic = read("lib/ai/vlm-epistemic-governor.ts");
const brain = read("lib/ai/vlm-brain.ts");
const firewall = read("lib/ai/vlm-claim-firewall.ts");
const shadow = read("lib/ai/vlm-shadow-governor.ts");
const security = read("lib/ai/vlm-security.ts");
const events = read("lib/ai/vlm-security-events.ts");
const ledger = read("lib/security/security-event-ledger.ts");
const contract = read("lib/ai/vlm-contract.ts");
const receipt = read("lib/ai/vlm-analysis-receipt.ts");

expect(
  integrity.includes("assessVlmSourceIntegrity") &&
    integrity.includes("normalizeVlmProviderFamily") &&
    integrity.includes('status: VlmSourceIntegrityStatus') &&
    integrity.includes("confidencePenalty"),
  "Source Integrity Sentinel is implemented as executable assessment code",
);
expect(
  integrity.includes("duplicateProviderSourceCount") &&
    integrity.includes("futureTimestampSourceCount") &&
    integrity.includes("invalidTimestampSourceCount") &&
    integrity.includes("nonHttpsUrlCount") &&
    integrity.includes("poisonedMetadataCount"),
  "source integrity detects duplicate provider families, timestamp abuse, URL weakness and poisoned metadata",
);
expect(
  arbitration.includes("sourceIntegrity") &&
    arbitration.includes('sourceIntegrity.status === "quarantined"') &&
    arbitration.includes('sourceIntegrity.status === "degraded"'),
  "source arbitration applies source integrity to confidence caps",
);
expect(
  quorum.includes("quarantinedSourceIds") &&
    quorum.includes("No usable non-quarantined source identifier") &&
    quorum.includes("Quarantined source records are excluded from evidence quorum"),
  "Evidence Quorum excludes quarantined source records instead of counting them",
);
expect(
  packet.includes("sourceIntegrityStatus") &&
    packet.includes("source integrity:") &&
    packet.includes("Source Integrity Sentinel quarantined evidence"),
  "fact packet carries source integrity into confidence governance and missing-data semantics",
);
expect(
  provider.includes("SOURCE_INTEGRITY=") &&
    provider.includes("Apply Source Integrity Sentinel strictly") &&
    provider.includes("degraded/quarantined Source Integrity Sentinel"),
  "main provider and Shadow Brain receive source integrity rules",
);
expect(
  epistemic.includes("sourceIntegrity.score") &&
    epistemic.includes("source-integrity limitation") &&
    epistemic.includes("duplicate provider-family records"),
  "Epistemic Governor treats degraded sources as uncertainty, not conviction",
);
expect(
  firewall.includes("sourceIntegrityTrusted") &&
    firewall.includes("source-integrity-overclaim"),
  "claim firewall rejects robust-source wording when source integrity is not trusted",
);
expect(
  shadow.includes("sourceIntegrityOverconfidence") &&
    shadow.includes("source_integrity_overclaim") &&
    shadow.includes("source_integrity_${sourceIntegrity.status}"),
  "Shadow Governor revises or rejects overconfident source-integrity claims",
);
expect(
  security.includes("SOURCE_INTEGRITY_MANIPULATION_PATTERNS") &&
    security.includes("source_integrity_manipulation"),
  "central VLM Security detects prompts trying to bypass Source Integrity Sentinel",
);
expect(
  events.includes('"source"') && ledger.includes("vlm_source_quarantined"),
  "source integrity incidents are routed into VLM Security event ledger",
);
expect(
  brain.includes('packet.sourceArbitration.sourceIntegrity.status === "trusted"') &&
    brain.includes("sourceIntegrityStatus") &&
    brain.includes("sourceIntegrityScore") &&
    brain.includes("integralność źródeł"),
  "brain live-mode and diagnostics require trusted source integrity in PL/EN/DE-safe wording",
);
expect(
  contract.includes("sourceIntegrityStatus") &&
    contract.includes("quarantinedSourceIds"),
  "output diagnostics contract exposes source integrity without UI changes",
);
expect(
  receipt.includes("sourceIntegritySentinel: true"),
  "signed receipt policy hash changes when Source Integrity Sentinel is active",
);

console.log("PASS2020 Source Integrity Sentinel verifier complete");
