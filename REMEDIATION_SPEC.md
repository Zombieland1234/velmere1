# VELMÈRE REMEDIATION SPECIFICATION
**Standard:** Directive v3 Sections 49, 50, 86

## 1. Finding Lifecycle
```
[REPORTED] ──> [ACKNOWLEDGED] ──> [FIX_SUBMITTED] ──> [RE-VERIFIED] ──> [RESOLVED]
                                           │
                                           └──> [FAILED_REGRESSION] ──> [REOPENED]
```

## 2. Verification Protocol
1. **Differential AST Diff:** Verifies that fix code addresses the exact line and vulnerability pattern.
2. **Regression Test Pass:** Executes the specific detector and confirms zero findings on updated source.
