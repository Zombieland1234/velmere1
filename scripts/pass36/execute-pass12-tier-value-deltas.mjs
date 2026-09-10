import fs from "fs";
import path from "path";

const BASE = "http://localhost:3000";

async function main() {
  console.log("=== PASS 12: CUSTOMER TIER VALUE DELTAS (BASIC vs PRO vs ADVANCED) ===");
  fs.mkdirSync("artifacts/tiers", { recursive: true });

  const tiers = ["basic", "pro", "advanced"];
  const auditDeltas = [];

  for (const tier of tiers) {
    const t0 = Date.now();
    const url = `${BASE}/api/security/audit-watch/paid-preview?tier=${tier}&locale=en&format=json`;
    const res = await fetch(url);
    const durationMs = Date.now() - t0;
    const json = await res.json().catch(() => ({}));
    const preview = json?.preview || {};

    const info = {
      tier,
      status: res.status,
      durationMs,
      previewOnly: preview.previewOnly,
      fullContentIncluded: preview.fullContentIncluded,
      sectionsCount: Array.isArray(preview.sections) ? preview.sections.length : 0,
      deliveredSections: preview.sections || []
    };
    console.log(`Tier ${tier.toUpperCase()}: HTTP ${res.status} | previewOnly: ${preview.previewOnly} | sections: ${info.sectionsCount}`);
    auditDeltas.push(info);
  }

  // Verify Pro and Advanced are strictly preview-only and do not leak full paid deliverables
  const proOk = auditDeltas.find((d) => d.tier === "pro")?.previewOnly === true && auditDeltas.find((d) => d.tier === "pro")?.fullContentIncluded === false;
  const advOk = auditDeltas.find((d) => d.tier === "advanced")?.previewOnly === true && auditDeltas.find((d) => d.tier === "advanced")?.fullContentIncluded === false;
  const passed = proOk && advOk;

  const receipt = {
    schemaVersion: "velmere.pass12.tier-value-deltas.receipt.v1",
    executedAt: new Date().toISOString(),
    auditDeltas,
    proEntitlementEnforced: proOk,
    advancedEntitlementEnforced: advOk,
    passed
  };

  const receiptPath = path.resolve("artifacts/tiers/PASS12_TIER_VALUE_DELTAS_RECEIPT.json");
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), "utf8");
  console.log(`Saved Pass 12 Receipt to: ${receiptPath}`);
  if (!passed) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
