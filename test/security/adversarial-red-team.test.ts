import { describe, it, expect } from "vitest";
import { evaluateAuditValidity } from "../../lib/security/audit-validity-engine";
import { isFieldApplicableToAsset, diagnoseFieldCompleteness } from "../../lib/data/completeness-root-cause-engine";
import { verifyQuorumConsensus } from "../../lib/data/multi-provider-failover";

describe("Velmère Furnace V3 - Adversarial Red Team Suite", () => {
  // P1: Impatient VIP (Rapid re-clicks / Double spend / Invariant checks)
  describe("Persona 1: Impatient VIP & Double-Click Invariance", () => {
    it("should deterministically produce identical audit validity hashes on repeated rapid calls", () => {
      const input = {
        assessmentDate: new Date().toISOString(),
        bytecodeHashAtAssessment: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        bytecodeHashCurrent: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      };

      const eval1 = evaluateAuditValidity(input);
      const eval2 = evaluateAuditValidity(input);
      expect(eval1.validity).toBe(eval2.validity);
      expect(eval1.validity).toBe("CURRENT");
    });
  });

  // P2: Script Kiddie (Boundary & Fuzzing Invariance)
  describe("Persona 2: Script Kiddie & Payload Fuzzing", () => {
    it("should reject malicious or corrupted bytecode mutations immediately", () => {
      const input = {
        assessmentDate: new Date().toISOString(),
        bytecodeHashAtAssessment: "0x1111111111111111111111111111111111111111111111111111111111111111",
        bytecodeHashCurrent: "0x2222222222222222222222222222222222222222222222222222222222222222",
      };

      const auditEval = evaluateAuditValidity(input);
      expect(auditEval.validity).toBe("OUTDATED");
      expect(auditEval.reason).toBe("IMPLEMENTATION_UPGRADED");
    });
  });

  // P3: Sophisticated Attacker (HMAC & Consensus Manipulation)
  describe("Persona 3: Sophisticated Attacker & Divergence Exploit", () => {
    it("should detect and reject cross-provider divergence exceeding 2%", () => {
      const coinbasePrice = 64200.0;
      const manipulatedPrice = 66000.0; // 2.8% divergence
      const quorum = verifyQuorumConsensus(coinbasePrice, manipulatedPrice, 0.02);
      expect(quorum.consensus).toBe(false);
      expect(quorum.divergencePct).toBeGreaterThan(0.02);
    });
  });

  // P4: Compliance Auditor (Data Integrity & Ground Truth)
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

      expect(diagnosis.state).toBe("GENUINELY_UNAVAILABLE");
      expect(diagnosis.resolvedValue).toBeNull();
      expect(diagnosis.attempts.length).toBe(2);
    });
  });

  // P5: Intermittent Connectivity & Stale Cache Protection
  describe("Persona 5: Offline User & Freshness Enforcement", () => {
    it("should mark values exceeding freshness tolerance as STALE_SNAPSHOT", () => {
      const staleTimestamp = new Date(Date.now() - 3600 * 1000).toISOString(); // 1 hour old
      const diagnosis = diagnoseFieldCompleteness({
        fieldKey: "spot_price",
        fieldLabel: "Spot Price",
        category: "market",
        assetClass: "market_asset",
        value: 100.5,
        observedAt: staleTimestamp,
        maxFreshnessSeconds: 300, // 5 min tolerance
      });

      expect(diagnosis.state).toBe("STALE_SNAPSHOT");
    });
  });

  // P6: Non-Contract Asset Architecture Integrity
  describe("Persona 6: Native Asset Architectural Verification", () => {
    it("should exclude smart contract fields for native chains without flagging them as missing", () => {
      const applicability = isFieldApplicableToAsset("is_proxy", "native_chain");
      expect(applicability.isApplicable).toBe(false);

      const diagnosis = diagnoseFieldCompleteness({
        fieldKey: "is_proxy",
        fieldLabel: "Upgradeable Proxy Contract",
        category: "security",
        assetClass: "native_chain",
        value: null,
      });

      expect(diagnosis.state).toBe("UNSUPPORTED_BY_CONTRACT");
    });
  });

  // P7: Invalidation Lifecycle (90-Day Freshness Expiration)
  describe("Persona 7: Audit Freshness Expiry", () => {
    it("should invalidate audit snapshots older than 90 days", () => {
      const oldDate = new Date(Date.now() - 95 * 86400 * 1000).toISOString();
      const auditEval = evaluateAuditValidity({
        assessmentDate: oldDate,
        maxValidityDays: 90,
      });
      expect(auditEval.validity).toBe("OUTDATED");
      expect(auditEval.reason).toBe("FRESHNESS_WINDOW_ELAPSED");
    });
  });

  // P8: Rate Limit Throttling Detection
  describe("Persona 8: Upstream Rate Limit Protection", () => {
    it("should classify HTTP 429 response as RATE_LIMIT_THROTTLED", () => {
      const diagnosis = diagnoseFieldCompleteness({
        fieldKey: "orderbook_depth_l2",
        fieldLabel: "Orderbook L2 Depth",
        category: "liquidity",
        assetClass: "market_asset",
        value: null,
        attempts: [
          {
            provider: "KrakenL2",
            timestamp: new Date().toISOString(),
            status: "RATE_LIMITED",
            httpStatus: 429,
          },
        ],
      });

      expect(diagnosis.state).toBe("RATE_LIMIT_THROTTLED");
    });
  });

  // P9: Dependency CVE Disclosure Invalidation
  describe("Persona 9: Dependency Vulnerability Invalidation", () => {
    it("should mark audit outdated when high/critical dependency CVE is disclosed", () => {
      const auditEval = evaluateAuditValidity({
        assessmentDate: new Date().toISOString(),
        knownCVEs: true,
      });
      expect(auditEval.validity).toBe("OUTDATED");
      expect(auditEval.reason).toBe("CVE_DEPENDENCY_DISCLOSED");
    });
  });

  // P10: Quorum Tolerance on Matching Observations
  describe("Persona 10: Multi-Venue Quorum Agreement", () => {
    it("should pass consensus when providers report values within 1.5%", () => {
      const venueA = 100.0;
      const venueB = 101.2; // 1.19% difference
      const quorum = verifyQuorumConsensus(venueA, venueB, 0.02);
      expect(quorum.consensus).toBe(true);
      expect(quorum.divergencePct).toBeLessThan(0.02);
    });
  });

  // P11: Forensic Tamper Detection
  describe("Persona 11: Forensic State Tampering Resistance", () => {
    it("should detect supersession by newer audit snapshot", () => {
      const auditEval = evaluateAuditValidity({
        assessmentDate: new Date().toISOString(),
        supersededBySnapshotId: "SNAP_V2_AUDIT",
      });
      expect(auditEval.validity).toBe("OUTDATED");
      expect(auditEval.reason).toBe("METHODOLOGY_SUPERSEDED");
      expect(auditEval.supersededBy).toBe("SNAP_V2_AUDIT");
    });
  });
});
