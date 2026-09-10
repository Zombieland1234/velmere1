# VELMÈRE RISK SCORING SPECIFICATION
**Metric:** Risk Score (0–100, where 0 is lowest risk and 100 is critical risk)  
**Standard:** Directive v3 Sections 30–34, 60–64

## 1. Scoring Formula
```
RiskScore = min(100, max(0, BaseScore + FindingPenalties + AccessControlAdjustment + MicrostructureAdjustment))
```

## 2. Severity Penalties
- **CRITICAL Finding:** +35 to +50 points per issue (e.g. arbitrary delegatecall, reentrancy with state mutation).
- **HIGH Finding:** +20 to +30 points per issue (e.g. tx.origin authorization, unchecked low-level call).
- **MEDIUM Finding:** +10 to +15 points per issue (e.g. timestamp equality dependence).
- **LOW / INFO Finding:** +2 to +5 points.

## 3. Access Control Mitigation & Penalties
- Owner with immediate upgrade authority without timelock: +15 points.
- Owner with verified multi-sig and timelock: -10 points.
- Unknown access control status: +5 points uncertainty margin.
