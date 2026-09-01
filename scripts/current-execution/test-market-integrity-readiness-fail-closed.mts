import assert from "node:assert/strict";
import { buildCustomerReadiness } from "../../lib/market-integrity/customer-readiness";

let assertions = 0;
function check(condition: unknown, message: string) {
  assertions += 1;
  assert.ok(condition, message);
}

for (const fixture of [
  { vercelEnvironment: "production", durablePersistenceConfigured: false },
  { vercelEnvironment: "production", durablePersistenceConfigured: true },
  { vercelEnvironment: "preview", durablePersistenceConfigured: false },
  { vercelEnvironment: "development", durablePersistenceConfigured: false },
]) {
  const readiness = buildCustomerReadiness({
    ...fixture,
    generatedAt: new Date("2026-08-21T10:00:00.000Z"),
  });
  check(readiness.status === "withheld", `${fixture.vercelEnvironment} must not claim available from env presence`);
  check(readiness.operationalHealthProven === false, "configuration presence is not operational health proof");
  check(readiness.customerDeliveryReady === false, "configuration presence is not customer delivery proof");
  check(readiness.blockers.length > 0, "withheld readiness must name a blocker");
  check(!JSON.stringify(readiness).includes('"status":"available"'), "readiness must not emit available");
}

const configured = buildCustomerReadiness({
  generatedAt: new Date("2026-08-21T10:00:00.000Z"),
  vercelEnvironment: "production",
  durablePersistenceConfigured: true,
});
check(
  configured.blockers.includes("live_db_provider_queue_health_not_proven"),
  "configured env must still require a real live health probe",
);

console.log(JSON.stringify({ status: "PASS", assertions }));
