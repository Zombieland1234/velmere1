# VELMÈRE MASTER FINDINGS LEDGER

## Cumulative Findings Across Passes
- **PASS_01**:
  - `VLM-SEC-AUTH-TXORIGIN-01`: Calibrated from static HIGH to dynamic CRITICAL when fund drainage is feasible. (RESOLVED)
- **PASS_02**:
  - `VLM-SEC-DEFI-VAULT-INFLATION-01`: Calibrated to CRITICAL for unseeded vaults lacking virtual shares offset. (RESOLVED)
  - `VLM-SEC-DEFI-FLASH-CALLBACK-01`: Created detector for unprotected flash loan callbacks missing caller and initiator guards. (RESOLVED)
