# PASS_01 FIXES LOG

## 1. Fixes Applied in PASS_01
1. **File**: `lib/security/v2/contextual-access-control-engine.ts`
   - *Issue*: `VLM-SEC-AUTH-TXORIGIN-01` was statically rated as `HIGH`, causing an under-rating discrepancy against Ground Truth when the target contract contains fund transfer capabilities.
   - *Fix*: Added dynamic evaluation of `hasDrainCapability` (checking `hasCall`, `hasSstore`, and fund transfer methods). Escalated severity to `CRITICAL` when funds can be drained via phishing.
   - *Result*: AU-03 now correctly yields CRITICAL rating. Discrepancy count reduced from 1 to 0.
