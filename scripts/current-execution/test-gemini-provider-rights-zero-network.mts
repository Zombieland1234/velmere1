import assert from "node:assert/strict";
import fs from "node:fs";

import { brokeredEgressFetch } from "../../lib/network/brokered-egress.ts";
import { VelmereEgressPolicyError } from "../../lib/network/safe-egress.ts";

const providerRegistrySource = fs.readFileSync(
  new URL("../../lib/ai/vlm-provider-registry.ts", import.meta.url),
  "utf8",
);
const brokerSource = fs.readFileSync(
  new URL("../../lib/network/brokered-egress.ts", import.meta.url),
  "utf8",
);

assert.match(
  providerRegistrySource,
  /brokeredEgressFetch[\s\S]*?profile:\s*["']gemini["'][\s\S]*?operation:\s*["']vlm_generate_content["']/u,
  "The active Gemini REST client must remain bound to the rights-gated Gemini broker profile.",
);

const brokerHelperOffset = brokerSource.indexOf("async function brokeredEgressFetchWithCapability");
const brokerWrapperOffset = brokerSource.indexOf("export function brokeredEgressFetch", brokerHelperOffset);
assert.ok(brokerHelperOffset >= 0, "The production broker helper must exist.");
assert.ok(brokerWrapperOffset > brokerHelperOffset, "The public broker must remain downstream of its gated helper.");
const brokerFunction = brokerSource.slice(brokerHelperOffset, brokerWrapperOffset);
const rightsGateOffset = brokerFunction.indexOf("RIGHTS_GATED_PROVIDER_PROFILES.has(options.profile)");
const transportOffset = brokerFunction.indexOf("await dispatchBrokeredTransport");
assert.ok(rightsGateOffset >= 0, "The production rights gate must exist in brokeredEgressFetch.");
assert.ok(transportOffset > rightsGateOffset, "The production rights gate must execute before transport dispatch.");

const originalFetch = globalThis.fetch;
let globalFetchCalls = 0;
globalThis.fetch = (async () => {
  globalFetchCalls += 1;
  throw new Error("physical_network_call_forbidden");
}) as typeof fetch;

try {
  await assert.rejects(
    () => brokeredEgressFetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": "current-execution-fixture-only-not-a-credential",
        },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "fixture" }] }] }),
      },
      {
        profile: "gemini",
        operation: "current_execution_gemini_zero_network",
        maxRequestBytes: 2_097_152,
        maxResponseBytes: 2_097_152,
      },
    ),
    (error: unknown) =>
      error instanceof VelmereEgressPolicyError
      && error.code === "provider_rights_not_verified",
  );
  assert.equal(globalFetchCalls, 0, "A rights-withheld Gemini request must not reach a global network transport.");

  process.stdout.write(`${JSON.stringify({
    schemaVersion: "velmere.current-execution.gemini-provider-rights-zero-network.v1",
    status: "PASS_LOCAL_ONLY_NO_PROVIDER_AUTHORITY_NO_FINAL_CREDIT",
    activeClientProfile: "gemini",
    productionRequestBlockedBeforeTransport: true,
    rejectionCode: "provider_rights_not_verified",
    physicalNetworkCalls: globalFetchCalls,
    legalReviewRequired: true,
    ownerDecisionRequired: true,
  }, null, 2)}\n`);
} finally {
  globalThis.fetch = originalFetch;
}
