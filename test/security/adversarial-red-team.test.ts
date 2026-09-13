import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateAuditValidity } from "../../lib/security/audit-validity-engine";
import { isFieldApplicableToAsset, diagnoseFieldCompleteness } from "../../lib/data/completeness-root-cause-engine";
import { verifyQuorumConsensus } from "../../lib/data/multi-provider-failover";

describe("Velmère Furnace V3 - Adversarial Red Team Suite", () => {
  describe("Persona 1: Impatient VIP & Double-Click Invariance", () => {
    it("should deterministically produce identical audit validity hashes on repeated rapid calls", () => {
      const input = {
        assessmentDate: new Date().toISOString(),
        bytecodeHashAtAssessment: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        bytecodeHashCurrent: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      };
      const eval1 = evaluateAuditValidity(input);
      const eval2 = evaluateAuditValidity(input);
      assert.equal(eval1.validity, eval2.validity);
      assert.equal(eval1.validity, "CURRENT");
    });
  });

  describe("Persona 2: Script Kiddie & Payload Fuzzing", () => {
    it("should reject malicious or corrupted bytecode mutations immediately", () => {
      const input = {
        assessmentDate: new Date().toISOString(),
        bytecodeHashAtAssessment: "0x1111111111111111111111111111111111111111111111111111111111111111",
        bytecodeHashCurrent: "0x2222222222222222222222222222222222222222222222222222222222222222",
      };
      const auditEval = evaluateAuditValidity(input);
      assert.equal(auditEval.validity, "OUTDATED");
      assert.equal(auditEval.reason, "IMPLEMENTATION_UPGRADED");
    });
  });

  describe("Persona 3: Sophisticated Attacker & Divergence Exploit", () => {
    it("should detect and reject cross-provider divergence exceeding 2%", () => {
      const quorum = verifyQuorumConsensus(64200.0, 66000.0, 0.02);
      assert.equal(quorum.consensus, false);
      assert.ok(quorum.divergencePct > 0.02);
    });
  });

  describe("Persona 4: Compliance Auditor & Truth Over Coverage", () => {
    it("should never fabricate missing data and correctly flag genuinely unavailable fields", () => {
      const diagnosis = diagnoseFieldCompleteness({
        fieldKey: "custom_insurance_coverage",
        fieldLabel: "Protocol Insurance Fund",
        category: "security",
        assetClass: "evm_contract",
        value: null,
        attempts: [
          { provider: "NexusMutual", timestamp: new Date().toISOString(), status: "FAILED" },
          { provider: "InsurAce", timestamp: new Date().toISOString(), status: "FAILED" },
        ],
      });
      assert.equal(diagnosis.state, "GENUINELY_UNAVAILABLE");
      assert.equal(diagnosis.resolvedValue, null);
      assert.equal(diagnosis.attempts.length, 2);
    });
  });

  describe("Persona 5: Offline User & Freshness Enforcement", () => {
    it("should mark values exceeding freshness tolerance as STALE_SNAPSHOT", () => {
      const diagnosis = diagnoseFieldCompleteness({
        fieldKey: "spot_price",
        fieldLabel: "Spot Price",
        category: "market",
        assetClass: "market_asset",
        value: 100.5,
        observedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
        maxFreshnessSeconds: 300,
      });
      assert.equal(diagnosis.state, "STALE_SNAPSHOT");
    });
  });

  describe("Persona 6: Native Asset Architectural Verification", () => {
    it("should exclude smart contract fields for native chains without flagging them as missing", () => {
      const applicability = isFieldApplicableToAsset("is_proxy", "native_chain");
      assert.equal(applicability.isApplicable, false);
      const diagnosis = diagnoseFieldCompleteness({
        fieldKey: "is_proxy",
        fieldLabel: "Upgradeable Proxy Contract",
        category: "security",
        assetClass: "native_chain",
        value: null,
      });
      assert.equal(diagnosis.state, "UNSUPPORTED_BY_CONTRACT");
    });
  });

  describe("Persona 7: Audit Freshness Expiry", () => {
    it("should invalidate audit snapshots older than 90 days", () => {
      const auditEval = evaluateAuditValidity({
        assessmentDate: new Date(Date.now() - 95 * 86400 * 1000).toISOString(),
        maxValidityDays: 90,
      });
      assert.equal(auditEval.validity, "OUTDATED");
      assert.equal(auditEval.reason, "FRESHNESS_WINDOW_ELAPSED");
    });
  });

  describe("Persona 8: Upstream Rate Limit Protection", () => {
    it("should classify HTTP 429 response as RATE_LIMIT_THROTTLED", () => {
      const diagnosis = diagnoseFieldCompleteness({
        fieldKey: "orderbook_depth_l2",
        fieldLabel: "Orderbook L2 Depth",
        category: "liquidity",
        assetClass: "market_asset",
        value: null,
        attempts: [{
          provider: "KrakenL2",
          timestamp: new Date().toISOString(),
          status: "RATE_LIMITED",
          httpStatus: 429,
        }],
      });
      assert.equal(diagnosis.state, "RATE_LIMIT_THROTTLED");
    });
  });

  describe("Persona 9: Dependency Vulnerability Invalidation", () => {
    it("should mark audit outdated when high/critical dependency CVE is disclosed", () => {
      const auditEval = evaluateAuditValidity({
        assessmentDate: new Date().toISOString(),
        knownCVEs: true,
      });
      assert.equal(auditEval.validity, "OUTDATED");
      assert.equal(auditEval.reason, "CVE_DEPENDENCY_DISCLOSED");
    });
  });

  describe("Persona 10: Multi-Venue Quorum Agreement", () => {
    it("should pass consensus when providers report values within 1.5%", () => {
      const quorum = verifyQuorumConsensus(100.0, 101.2, 0.02);
      assert.equal(quorum.consensus, true);
      assert.ok(quorum.divergencePct < 0.02);
    });
  });

  describe("Persona 11: Forensic State Tampering Resistance", () => {
    it("should detect supersession by newer audit snapshot", () => {
      const auditEval = evaluateAuditValidity({
        assessmentDate: new Date().toISOString(),
        supersededBySnapshotId: "SNAP_V2_AUDIT",
      });
      assert.equal(auditEval.validity, "OUTDATED");
      assert.equal(auditEval.reason, "METHODOLOGY_SUPERSEDED");
      assert.equal(auditEval.supersededBy, "SNAP_V2_AUDIT");
    });
  });
});
