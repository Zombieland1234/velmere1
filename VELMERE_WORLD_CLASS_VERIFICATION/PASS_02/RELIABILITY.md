# PASS_02 RELIABILITY: MEMPOOL & SIMULATION FAULT TOLERANCE

## 1. Error Handling
- Safe division checks prevent division by zero in vault share calculations when `totalAssets == 0`.
- Unknown flash loan selectors fall back to generic access control analysis.
