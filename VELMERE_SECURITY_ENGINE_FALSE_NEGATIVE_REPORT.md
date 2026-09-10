# VELMÈRE SECURITY ENGINE V2 — FALSE NEGATIVE SUPPRESSION REPORT

## 1. Zero False Negative Policy on Known Exploit Models
False negatives in smart contract security can lead to multi-million-dollar protocol exploits.

## 2. Coverage of Vulnerable and Exploited Variants
- **Classic Reentrancy (`ReentrancyBank.sol` - DEV)**: Successfully detected with call trace, state mutation timing, and remediation diff.
- **Phishing Authorization (`InsecureTxOriginWallet.sol` - DEV)**: Successfully detected with `tx.origin` evaluation.
- **Historical Solvency Invariant Bypass (`EulerExploitModel.sol` - DEV)**: Caught missing health check on `donateToReserves`.
- **Spot Oracle Manipulation (`SpotReserveLending.sol` - VALIDATION)**: Successfully flagged for atomic flash loan risk on instantaneous AMM reserves.
- **Non-Standard Return (`WeirdUSDTToken.sol` - VALIDATION)**: Caught missing boolean return on transfer.
- **Historical Pair Burn Exploit (`SafeMoonExploitModel.sol` - VALIDATION)**: Caught public arbitrary pair token burn flaw.
- **First-Depositor Vault Inflation (`VulnerableInflationVault.sol` - BLIND_HOLDOUT)**: Caught integer division rounding down exploit in unseen holdout vault.

## 3. Total False Negatives Measured: 0
False Negative Rate: **0.00%** on golden vulnerable corpus.
Recall (Sensitivity): **100.00%**.
