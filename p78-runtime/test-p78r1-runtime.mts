import fs from "node:fs";
import path from "node:path";
import { buildAuditAdjudicatedAuthorityEvidence } from "../p75-work/source/lib/security/audit-adjudicated-authority-evidence";
import { buildPass2574AuditClaimLedgerReport } from "../p75-work/source/lib/security/audit-claim-ledger";

const outDir = process.env.P78_RESULT_DIR ?? process.cwd();

const originalFetch = globalThis.fetch;
globalThis.fetch = (async () => {
  throw new Error("p78_unknown_target_must_not_use_network");
}) as typeof fetch;

try {
  const evidence = await buildAuditAdjudicatedAuthorityEvidence({
    chain: "ethereum",
    contractAddress: "0x1111111111111111111111111111111111111111",
  });
  if (evidence.state !== "not_applicable") {
    throw new Error(`p78_unknown_target_not_fail_closed:${JSON.stringify(evidence)}`);
  }
  if (evidence.receipts.length !== 0 || evidence.authorityRoots.length !== 0) {
    throw new Error("p78_unknown_target_created_authority_receipts");
  }
  if (!evidence.blockers.includes("canonical_reference_not_registered")) {
    throw new Error(`p78_unknown_target_blocker_missing:${JSON.stringify(evidence.blockers)}`);
  }

  const ledger = buildPass2574AuditClaimLedgerReport({
    locale: "en",
    chain: "ethereum",
    contractAddress: "0x1111111111111111111111111111111111111111",
    authorityEvidence: evidence,
  } as any);
  if (ledger.claims.some((claim) => claim.id.startsWith("authority-"))) {
    throw new Error("p78_not_applicable_authority_promoted_to_customer_claim");
  }
  if (ledger.advancedRule.includes("manual permissions") || ledger.advancedRule.includes("manual verification")) {
    throw new Error(`p78_manual_advanced_semantics_returned:${ledger.advancedRule}`);
  }
  if (!ledger.advancedRule.includes("automatically queues") || !ledger.advancedRule.includes("optional QA is non-gating")) {
    throw new Error(`p78_automated_advanced_semantics_missing:${ledger.advancedRule}`);
  }

  const receipt = {
    schemaVersion: "velmere.p78r1.audit-authority-customer-path-runtime.v1",
    status: "PASS",
    checks: [
      "unknown_target_short_circuits_without_network",
      "unknown_target_has_no_authority_receipts",
      "not_applicable_authority_does_not_create_customer_claim",
      "advanced_claim_semantics_are_automated",
      "optional_qa_remains_non_gating",
    ],
    zeroFakeCredit: {
      vulnerabilityExploitabilityGroundTruth: 0,
      customerFinal: "0/20",
      auditFinalPdf: "0/3",
      rights: "2/203",
      paidValue: "0/10",
      saleEligible: "0/20",
      live: false,
    },
  };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "P78R1_AUTHORITY_CUSTOMER_PATH_RUNTIME.json"), JSON.stringify(receipt, null, 2) + "\n");
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  globalThis.fetch = originalFetch;
}
