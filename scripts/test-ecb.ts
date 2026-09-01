import { withPass4825BrokeredEgressTestTransport, brokeredEgressFetch } from "../lib/network/brokered-egress";

async function main() {
  let calls = 0;
  await withPass4825BrokeredEgressTestTransport(async () => {
    calls++;
    return new Response("hi", { status: 200 });
  }, async () => {
    try {
      await brokeredEgressFetch("https://data-api.ecb.europa.eu/service/data/EXR/D.USD+PLN+GBP+TRY.EUR.SP00.A", {
        method: "GET",
        headers: { accept: "text/csv", "user-agent": "Velmere/1.0" },
        cache: "no-store",
        redirect: "error",
      }, {
        profile: "ecb_statistics",
        operation: "pass69_ecb_reference_fx",
        timeoutMs: 8000,
        maxRedirects: 0,
        maxRequestBytes: 0,
        maxResponseBytes: 1000000,
      });
      console.log("NO ERROR (calls=" + calls + ")");
    } catch (e) {
      const err = e as { code?: string; message?: string };
      console.log("CAUGHT:", err.code, err.message, "calls=" + calls);
    }
  });
}
main();
