import { withPass4825BrokeredEgressTestTransport, brokeredEgressFetch } from "../lib/network/brokered-egress";
import { fetchPass69EcbOfficialReferenceData } from "../lib/market-integrity/real-markets-quote-hydration";

async function test() {
  let calls = 0;
  const rightsManifest = {
    sourceDataUrl: "https://data-api.ecb.europa.eu/service/data/EXR/D.USD+PLN+GBP+TRY.EUR.SP00.A",
    usagePolicyUrl: "https://test",
    usagePolicyReviewedAt: "2026-01-01T00:00:00.000Z",
    usagePolicyValidUntil: "2027-01-01T00:00:00.000Z",
    rightsReceiptSha256: "0".repeat(64),
    attribution: "test",
    allowedFieldIds: ["market.reference_rate", "market.reference_date"],
  };
  await withPass4825BrokeredEgressTestTransport(async () => {
    calls++;
    return new Response("hi", { status: 200 });
  }, async () => {
    try {
      await fetchPass69EcbOfficialReferenceData({ ...rightsManifest, rightsReceiptSha256: "0".repeat(64) });
      console.log("NO ERROR calls=" + calls);
    } catch (e) {
      const err = e as { code?: string };
      console.log("CAUGHT:", err.code, "calls=" + calls);
    }
  });
}
test();
