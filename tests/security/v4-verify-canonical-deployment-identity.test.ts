import assert from "node:assert/strict";

import type { P82CurrentDeploymentReadonlyQuorumReceipt } from "@/lib/security/audit-current-deployment-readonly-quorum-v2";
import { canonicalJson } from "@/lib/security/canonical-json";
import { sha256Hex } from "@/lib/security/cryptographic-digest";
import {
  buildVerifyCanonicalDeploymentIdentity,
  deriveVerifyCanonicalDeploymentIdentityFromP82,
  VERIFY_CANONICAL_DEPLOYMENT_IDENTITY_DOMAIN,
} from "@/lib/verify/verify-canonical-deployment-identity";

const proxyInput = {
  chainId: "56",
  contractAddress: `0x${"1".repeat(40)}`,
  runtimeBytecodeSha256: `sha256:${"2".repeat(64)}`,
  proxyKind: "EIP_1167_COMPATIBLE_MINIMAL_PROXY" as const,
  implementationAddress: `0x${"3".repeat(40)}`,
  implementationBytecodeSha256: `sha256:${"4".repeat(64)}`,
  trustedForwarderSelector: "0x572b6c05",
  trustedForwarderAddress: `0x${"5".repeat(40)}`,
  trustedForwarderState: "ACTIVE" as const,
  negativeControlAddress: "0x0000000000000000000000000000000000000001",
  negativeControlState: "INACTIVE" as const,
};

function main() {
  const proxy = buildVerifyCanonicalDeploymentIdentity(proxyInput);
  assert.ok(proxy);
  assert.equal(proxy.digest, sha256Hex(`${VERIFY_CANONICAL_DEPLOYMENT_IDENTITY_DOMAIN}${canonicalJson(proxy.identity)}`));
  assert.match(proxy.digest, /^[a-f0-9]{64}$/);

  const implementationCodeChanged = buildVerifyCanonicalDeploymentIdentity({
    ...proxyInput,
    implementationBytecodeSha256: `sha256:${"6".repeat(64)}`,
  });
  assert.ok(implementationCodeChanged);
  assert.notEqual(implementationCodeChanged.digest, proxy.digest);

  const forwarderChanged = buildVerifyCanonicalDeploymentIdentity({
    ...proxyInput,
    trustedForwarderState: "INACTIVE",
  });
  assert.ok(forwarderChanged);
  assert.notEqual(forwarderChanged.digest, proxy.digest);

  const runtimeChanged = buildVerifyCanonicalDeploymentIdentity({
    ...proxyInput,
    runtimeBytecodeSha256: `sha256:${"7".repeat(64)}`,
  });
  assert.ok(runtimeChanged);
  assert.notEqual(runtimeChanged.digest, proxy.digest);

  const nonProxy = buildVerifyCanonicalDeploymentIdentity({
    ...proxyInput,
    proxyKind: "NO_PROXY",
    implementationAddress: null,
    implementationBytecodeSha256: null,
  });
  assert.ok(nonProxy, "canonical schema has an explicit null/non-proxy path");
  assert.equal(nonProxy.identity.implementationAddress, null);
  assert.equal(nonProxy.identity.implementationBytecodeSha256, null);
  assert.notEqual(nonProxy.digest, proxy.digest);

  assert.equal(buildVerifyCanonicalDeploymentIdentity({
    ...proxyInput,
    implementationBytecodeSha256: null,
  }), null, "proxy identity fails closed when implementation code identity is missing");
  assert.equal(buildVerifyCanonicalDeploymentIdentity({
    ...proxyInput,
    negativeControlState: "WITHHELD" as never,
  }), null, "negative-control proof is mandatory");

  const unresolvedP82 = {
    deployment: {
      proxyKind: "UNRESOLVED",
      runtimeBytecodeSha256: proxyInput.runtimeBytecodeSha256,
      implementationAddress: null,
      implementationBytecodeSha256: null,
    },
    proof: {
      exactBlockConsensusProven: true,
      currentRuntimeStateProven: true,
      currentProxyImplementationProven: false,
    },
    target: { chainId: "56", address: proxyInput.contractAddress },
    trustedForwarder: {
      selector: proxyInput.trustedForwarderSelector,
      address: proxyInput.trustedForwarderAddress,
      state: "WITHHELD",
      callResultSha256: null,
      negativeControlAddress: proxyInput.negativeControlAddress,
      negativeControlState: "WITHHELD",
      negativeControlCallResultSha256: null,
    },
  } as unknown as P82CurrentDeploymentReadonlyQuorumReceipt;
  assert.equal(
    deriveVerifyCanonicalDeploymentIdentityFromP82(unresolvedP82),
    null,
    "P82 UNRESOLVED is not promoted to the explicit NO_PROXY identity",
  );

  console.log("V4 Verify canonical deployment identity: PASS");
}

main();
