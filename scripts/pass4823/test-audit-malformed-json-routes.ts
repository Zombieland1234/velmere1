import assert from "node:assert/strict";

import { POST as sourceQuorumPost } from "@/lib/server/security-route-modules/audit-source-quorum";
import { buildVelmereAccountCookie, buildVelmereAccountSession } from "@/lib/auth/account-session";
import { POST as providerRuntimePost } from "@/lib/server/security-route-modules/audit-provider-runtime";
import { POST as buildReadinessPost } from "@/lib/server/security-route-modules/audit-runtime-build-readiness-type-safety-sweep";
import { POST as runtimeConfidencePost } from "@/lib/server/security-route-modules/audit-runtime-confidence";
import { POST as providerIntelligencePost } from "@/lib/server/security-route-modules/audit-provider-intelligence";
import { POST as conflictMatrixPost } from "@/lib/server/security-route-modules/audit-provider-conflict-arbitration-matrix";
import { POST as adapterHardeningPost } from "@/lib/server/security-route-modules/audit-real-provider-adapter-hardening";

const routes = [
  ["audit-source-quorum", sourceQuorumPost],
  ["audit-provider-runtime", providerRuntimePost],
  ["audit-runtime-build-readiness-type-safety-sweep", buildReadinessPost],
  ["audit-runtime-confidence", runtimeConfidencePost],
  ["audit-provider-intelligence", providerIntelligencePost],
  ["audit-provider-conflict-arbitration-matrix", conflictMatrixPost],
  ["audit-real-provider-adapter-hardening", adapterHardeningPost],
] as const;

const invalidBodies = ["{", "[]", "null", "\"not-an-object\""] as const;
let assertions = 0;

async function main() {
  const previewSession = buildVelmereAccountSession({ provider: "preview", displayName: "Velmère Preview" });
  const previewCookie = buildVelmereAccountCookie(previewSession).split(";", 1)[0] ?? "";
  for (const [routeId, post] of routes) {
    for (const body of invalidBodies) {
      const response = await post(new Request(`https://velmere.test/api/security/${routeId}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://velmere.test",
          cookie: previewCookie,
        },
        body,
      }));
      assert.equal(response.status, 400, `${routeId} must reject ${body} with 400`);
      assert.equal(response.headers.get("x-velmere-api-security-post-wrapper"), "PASS4281_API_SECURITY_POST_WRAPPER");
      assert.equal(response.headers.get("x-velmere-pass4281-route-id"), routeId);
      const payload = await response.json() as { ok?: unknown; mode?: unknown; routeId?: unknown };
      assert.deepEqual(
        { ok: payload.ok, mode: payload.mode, routeId: payload.routeId },
        { ok: false, mode: "malformed_json", routeId },
      );
      assertions += 4;
    }
  }

  console.log(JSON.stringify({
    gate: "PASS4823_AUDIT_MALFORMED_JSON_ROUTE_NEGATIVE",
    status: "PASS",
    routes: routes.length,
    invalidBodies: invalidBodies.length,
    assertions,
  }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
