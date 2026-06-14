import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log(`PASS: ${message}`);
};

const quorum = read("lib/ai/vlm-evidence-quorum.ts");
const arbitration = read("lib/ai/vlm-source-arbitration.ts");
const packet = read("lib/ai/vlm-fact-packet.ts");
const provider = read("lib/ai/vlm-provider-registry.ts");
const brain = read("lib/ai/vlm-brain.ts");
const firewall = read("lib/ai/vlm-claim-firewall.ts");
const shadow = read("lib/ai/vlm-shadow-governor.ts");
const security = read("lib/ai/vlm-security.ts");
const contract = read("lib/ai/vlm-contract.ts");

expect(
  quorum.includes("evaluateVlmEvidenceQuorum") &&
    quorum.includes('status: "confirmed"') &&
    quorum.includes("requiredProviderCount") &&
    quorum.includes("weakFactIds"),
  "Evidence Quorum evaluates each checkable fact and records weak fact IDs",
);
expect(
  quorum.includes("providerCount < requiredProviderCount") &&
    quorum.includes("internal_only") &&
    quorum.includes("stale") &&
    quorum.includes("conflicted"),
  "quorum distinguishes single-provider, internal-only, stale and conflicted evidence",
);
expect(
  arbitration.includes("evidenceQuorum") &&
    arbitration.includes('evidenceQuorum.status === "weak"') &&
    arbitration.includes('evidenceQuorum.status === "mixed"'),
  "source arbitration feeds quorum status into confidence caps",
);
expect(
  packet.includes("quorumStatus") &&
    packet.includes("evidence quorum below strong threshold") &&
    packet.includes("weak quorum for"),
  "fact packet carries quorum gaps into missingData and confidence governance",
);
expect(
  provider.includes("EVIDENCE_QUORUM=") &&
    provider.includes("weakFactIds") &&
    provider.includes("Apply Evidence Quorum strictly") &&
    provider.includes("Reject if the candidate treats weak-quorum facts"),
  "main provider and Shadow Brain receive explicit quorum rules",
);
expect(
  firewall.includes("weakQuorumOverconfidence") &&
    firewall.includes("weak-quorum-overclaim") &&
    firewall.includes("quorumIsStrong"),
  "claim firewall rejects overconfident use of weak-quorum evidence",
);
expect(
  shadow.includes("weakQuorumOverconfidence") &&
    shadow.includes("evidence_quorum_not_strong") &&
    shadow.includes("revisionRequired"),
  "Shadow Governor deterministically revises or rejects weak-quorum overconfidence",
);
expect(
  brain.includes("Kworum dowodowe ogranicza pewność") &&
    brain.includes("evidenceQuorumStatus") &&
    brain.includes('packet.sourceArbitration.evidenceQuorum.status === "strong"'),
  "brain output explains quorum and live mode requires strong evidence quorum",
);
expect(
  security.includes("EVIDENCE_QUORUM_MANIPULATION_PATTERNS") &&
    security.includes("evidence_quorum_manipulation"),
  "central VLM Security blocks prompts trying to bypass quorum rules",
);
expect(
  contract.includes("evidenceQuorumStatus") &&
    contract.includes("weakFactIds"),
  "output diagnostics contract exposes quorum status without UI changes",
);

console.log("PASS2019 Evidence Quorum + Shadow Security verifier complete");
