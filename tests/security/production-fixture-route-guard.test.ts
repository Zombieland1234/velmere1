import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  blockProductionFixtureRoute,
  PRODUCTION_FIXTURE_ROUTE_GUARD_ID,
} from "../../lib/security/production-fixture-route-guard.js";

const GUARDED_ROUTES = [
  "fixtures/route-modules/market-integrity/account-vault-remedy-reopen.ts",
  "fixtures/route-modules/market-integrity/action-report-customer-receipt.ts",
  "fixtures/route-modules/market-integrity/action-report-download-access.ts",
  "fixtures/route-modules/market-integrity/action-report-download-closeout.ts",
  "fixtures/route-modules/market-integrity/action-report-download-consumption.ts",
  "fixtures/route-modules/market-integrity/action-report-download-manifest.ts",
  "fixtures/route-modules/market-integrity/action-report-package.ts",
  "fixtures/route-modules/market-integrity/action-report-package-delivery.ts",
  "fixtures/route-modules/market-integrity/action-report-post-closeout-attestation.ts",
  "fixtures/route-modules/market-integrity/action-report-public-proof-index.ts",
  "fixtures/route-modules/market-integrity/action-report-release.ts",
  "fixtures/route-modules/market-integrity/action-report-review.ts",
  "fixtures/route-modules/market-integrity/action-report-vault.ts",
  "fixtures/route-modules/market-integrity/customer-remedy-refund-credit.ts",
  "fixtures/route-modules/market-integrity/customer-export-archive-retention-legal-hold.ts",
  "fixtures/route-modules/market-integrity/customer-export-delivery-ledger-persistence.ts",
  "fixtures/route-modules/market-integrity/customer-export-dispute-chargeback-hold.ts",
  "fixtures/route-modules/market-integrity/customer-export-dsr-appeal-resolution-closure.ts",
  "fixtures/route-modules/market-integrity/customer-export-dsr-delivery-appeal-reopen.ts",
  "fixtures/route-modules/market-integrity/customer-export-expiry-recall.ts",
  "fixtures/route-modules/market-integrity/customer-export-final-archive-bundle.ts",
  "fixtures/route-modules/market-integrity/customer-export-operator-release-reinstatement.ts",
  "fixtures/route-modules/market-integrity/customer-export-post-purge-privacy-attestation.ts",
  "fixtures/route-modules/market-integrity/customer-export-privacy-case-supervisor-sla.ts",
  "fixtures/route-modules/market-integrity/customer-export-privacy-incident-dsr-escalation.ts",
  "fixtures/route-modules/market-integrity/customer-export-redaction-packet.ts",
  "fixtures/route-modules/market-integrity/customer-export-remediation-ticket-close.ts",
  "fixtures/route-modules/market-integrity/customer-export-retention-purge-execution-tombstone.ts",
  "fixtures/route-modules/market-integrity/customer-export-transactional-outbox-health.ts",
  "fixtures/route-modules/market-integrity/evidence-artifact-state.ts",
  "fixtures/route-modules/market-integrity/incident-disclosure-response.ts",
  "fixtures/route-modules/market-integrity/report-delivery-state.ts",
  "fixtures/route-modules/security/audit-rls-policy-regression-fixture-runner.ts",
] as const;

const BODY_DRIVEN_ENVELOPE_ROUTES = new Set([
  "fixtures/route-modules/market-integrity/action-report-customer-receipt.ts",
  "fixtures/route-modules/market-integrity/action-report-download-access.ts",
  "fixtures/route-modules/market-integrity/action-report-download-closeout.ts",
  "fixtures/route-modules/market-integrity/action-report-download-consumption.ts",
  "fixtures/route-modules/market-integrity/action-report-download-manifest.ts",
  "fixtures/route-modules/market-integrity/action-report-package.ts",
  "fixtures/route-modules/market-integrity/action-report-package-delivery.ts",
  "fixtures/route-modules/market-integrity/action-report-post-closeout-attestation.ts",
  "fixtures/route-modules/market-integrity/action-report-public-proof-index.ts",
  "fixtures/route-modules/market-integrity/action-report-release.ts",
  "fixtures/route-modules/market-integrity/action-report-review.ts",
  "fixtures/route-modules/market-integrity/action-report-vault.ts",
]);

async function main() {
  assert.equal(
    blockProductionFixtureRoute("fixture", { NODE_ENV: "test" }),
    null,
    "offline/test fixture routes must remain available",
  );
  assert.equal(
    blockProductionFixtureRoute("fixture", { NODE_ENV: "development" }),
    null,
    "local development fixture routes must remain available",
  );

  const production = blockProductionFixtureRoute("fixture", {
    NODE_ENV: "production",
  });
  assert.ok(production);
  assert.equal(production.status, 404);
  assert.equal(production.headers.get("cache-control"), "no-store");
  assert.equal(
    production.headers.get("x-velmere-runtime-boundary"),
    PRODUCTION_FIXTURE_ROUTE_GUARD_ID,
  );
  assert.deepEqual(await production.json(), { ok: false, error: "not_found" });

  const vercelProduction = blockProductionFixtureRoute("fixture", {
    NODE_ENV: "test",
    VERCEL_ENV: "production",
  });
  assert.equal(vercelProduction?.status, 404);

  for (const relative of GUARDED_ROUTES) {
    const source = fs.readFileSync(path.resolve(relative), "utf8");
    const guardCall = source.indexOf("blockProductionFixtureRoute(");
    const urlParsing = source.indexOf("new URL(request.url)");
    assert.ok(guardCall >= 0, `${relative} must import/call the production fixture guard`);
    assert.ok(
      urlParsing < 0 || guardCall < urlParsing,
      `${relative} must block before interpreting caller-controlled fixture parameters`,
    );

    if (BODY_DRIVEN_ENVELOPE_ROUTES.has(relative)) {
      const postStart = source.indexOf("export async function POST");
      const bodyParsing = source.indexOf("readPublicMutationJsonBody<", postStart);
      const postGuard = source.indexOf("blockProductionFixtureRoute(", postStart);
      const getStart = source.indexOf("export async function GET");
      const getGuard = source.indexOf("blockProductionFixtureRoute(", getStart);
      assert.ok(postStart >= 0 && getStart >= 0, `${relative} must expose both fixture methods`);
      assert.ok(
        postGuard > postStart && bodyParsing > postGuard,
        `${relative} POST must block before parsing caller-controlled envelope data`,
      );
      assert.ok(getGuard > getStart, `${relative} GET must also be production-inaccessible`);
    }
  }

  console.log(`PASS ${GUARDED_ROUTES.length} synthetic proof routes are production-inaccessible`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
