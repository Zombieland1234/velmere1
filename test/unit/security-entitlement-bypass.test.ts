import test from "node:test";
import assert from "node:assert/strict";
import { verifyVlmPaidAccountEntitlement, verifyVlmPaidEntitlementById } from "../../lib/commerce/vlm-entitlement-ledger";
import { sanitizeContractInput, assertNoPathTraversal, isValidEthereumAddress, isSafeRpcEndpoint } from "../../lib/security/input-sanitizer";

test("PASS 27 — Security: Unpaid Pro/Advanced access denied without valid entitlement", async () => {
  // Verify entitlement ledger denies access for unauthenticated / unpaid requests
  const verdict = await verifyVlmPaidAccountEntitlement({
    productId: "vlm_advanced_audit_human_review",
    context: {
      accountIdHash: "unauthenticated_hash_attacker",
      auditCaseRef: "case_victim_12345",
    },
  });

  assert.equal(verdict.ok, false, "Must reject unpaid access without valid entitlement record");
});

test("PASS 27 — Security: URL parameter tampering cannot escalate tier without cryptographic token", async () => {
  const forgedEntitlementId = "ent_forged_99999999999";
  const dummySha256 = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const verdict = await verifyVlmPaidEntitlementById({
    entitlementId: forgedEntitlementId,
    allowedProductIds: ["vlm_advanced_audit_human_review"],
    accountIdHash: dummySha256,
  });

  assert.equal(verdict.ok, false, "Must reject arbitrary entitlement ID injection");
  assert.equal(verdict.error, "entitlement_not_found", "Forged entitlement ID must return not found");
});

test("PASS 27 — Security: IDOR protection on caseRef prevents accessing other accounts' audits", async () => {
  const attackerAccountHash = "attacker_evil_hash_xyz789";

  // Simulate cross-account entitlement verification
  const verdict = await verifyVlmPaidEntitlementById({
    entitlementId: "test_entitlement_legitimate",
    allowedProductIds: ["vlm_pro_audit_review"],
    accountIdHash: attackerAccountHash,
    auditCaseRef: "case_victim_owned",
  });

  assert.equal(verdict.ok, false, "Attacker cannot access case owned by another account");
});

test("PASS 27 — Security: Path traversal protection blocks directory traversal characters", () => {
  const maliciousInputs = [
    "../../etc/passwd",
    "..\\..\\windows\\system32",
    "....//....//config.json",
    "reports/../../secret.key",
    "/absolute/path/override",
  ];

  for (const input of maliciousInputs) {
    assert.throws(
      () => assertNoPathTraversal(input),
      /path_traversal_detected/,
      `Must block path traversal in: ${input}`
    );
  }

  // Valid filename stem must pass
  assert.doesNotThrow(() => assertNoPathTraversal("dai-stablecoin-pro-audit"));
});

test("PASS 27 — Security: Input sanitization protects against XSS and control characters", () => {
  const xssPayloads = [
    "<script>alert(1)</script>",
    "MakerDAO <img src=x onerror=alert('xss')>",
    "javascript:void(0)",
    "Contract\x00Name\x08With\x1bEscapes",
  ];

  for (const payload of xssPayloads) {
    const sanitized = sanitizeContractInput(payload);
    assert.ok(!sanitized.includes("<script>"), "Must strip script tags");
    assert.ok(!sanitized.includes("onerror="), "Must strip onerror handlers");
    assert.ok(!/[\x00-\x1f\x7f]/.test(sanitized), "Must strip control characters");
  }
});

test("PASS 27 — Security: Ethereum address validation strictly validates 20-byte hex format", () => {
  assert.equal(isValidEthereumAddress("0x6B175474E89094C44Da98b954EedeAC495271d0F"), true);
  assert.equal(isValidEthereumAddress("0xinvalid"), false);
  assert.equal(isValidEthereumAddress("0x6B175474E89094C44Da98b954EedeAC495271d0F; DROP TABLE audits;"), false);
  assert.equal(isValidEthereumAddress(""), false);
});

test("PASS 27 — Security: SSRF protection validates EVM RPC endpoints against multi-vector bypasses", () => {
  const invalidRpcUrls = [
    "http://169.254.169.254/latest/meta-data/", // AWS/Azure IMDSv1
    "http://metadata.google.internal/computeMetadata/v1/", // GCP IMDS
    "http://127.0.0.1:8545",                    // Standard loopback
    "http://localhost:22",                       // Hostname loopback
    "http://2130706433:8545",                   // Decimal integer IP (127.0.0.1)
    "http://0177.0.0.1:8545",                   // Octal IP (127.0.0.1)
    "http://0x7f.0.0.1:8545",                   // Hex dotted IP
    "http://0x7f000001:8545",                   // Hex integer IP
    "http://127.1:8545",                        // 2-part shorthand IP (127.0.0.1)
    "http://[::1]:8545",                        // IPv6 loopback
    "http://[::ffff:127.0.0.1]:8545",           // IPv4-mapped IPv6 loopback
    "http://[fe80::1]:8545",                    // IPv6 link-local
    "http://[fd00::1]:8545",                    // IPv6 ULA private
    "http://100.64.0.1:8545",                   // CGNAT
    "http://10.0.0.1:8545",                     // Private 10/8
    "http://172.16.0.1:8545",                   // Private 172.16/12
    "http://192.168.1.1:8545",                  // Private 192.168/16
    "file:///etc/passwd",                        // File scheme
    "ftp://internal.vault/keys",                 // FTP scheme
    "gopher://127.0.0.1:8545",                  // Gopher scheme
    "http://user:pass@127.0.0.1:8545",          // URL credential injection
  ];

  for (const urlStr of invalidRpcUrls) {
    assert.equal(isSafeRpcEndpoint(urlStr), false, `Must reject SSRF endpoint: ${urlStr}`);
  }

  const validRpcUrls = [
    "https://eth.llamarpc.com",
    "https://arb1.arbitrum.io/rpc",
    "https://polygon-rpc.com",
    "https://bsc-dataseed.binance.org",
    "https://mainnet.infura.io/v3/YOUR-KEY",
  ];

  for (const urlStr of validRpcUrls) {
    assert.equal(isSafeRpcEndpoint(urlStr), true, `Must accept legitimate public RPC: ${urlStr}`);
  }
});
