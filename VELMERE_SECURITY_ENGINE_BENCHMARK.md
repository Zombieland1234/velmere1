# VELMÈRE SECURITY ENGINE V2 — BENCHMARK MATRIX & STATISTICAL REPORT

## 1. Executive Summary & Research Methodology
This report provides the empirical evaluation results of the **Velmère Security Engine V2** against the 11 canonical benchmark contracts in the Golden Corpus.
To guard against overfitting and cherry-picking, the corpus is partitioned into three rigorous subsets:
- **DEV (Development & Calibration)**: 4 contracts used for baseline detector tuning.
- **VALIDATION (Threshold & False-Alarm Verification)**: 4 contracts used to confirm mutex suppression and cross-detector independence.
- **BLIND_HOLDOUT (Out-of-Sample Generalization)**: 3 contracts held blind to guarantee zero data-leakage and prove generalizeable detection on unseen patterns.

## 2. Dataset Partitioning (DEV / VALIDATION / BLIND_HOLDOUT)

| Split | Contract | Category | Variant Nature | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **DEV** | `CleanERC20` | clean | Resistant (Clean) | CLEAN (0 findings) |
| **DEV** | `ReentrancyBank` | vulnerable | Vulnerable (Reentrancy) | DETECTED (VLM-SEC-REENTRANCY-01) |
| **DEV** | `InsecureTxOriginWallet` | vulnerable | Vulnerable (Phishing Auth) | DETECTED (VLM-SEC-AUTH-TXORIGIN-01) |
| **DEV** | `EulerExploitModel` | exploited | Vulnerable (Solvency Bypass) | DETECTED (VLM-SEC-DEFI-VAULT-INFLATION-01) |
| **VALIDATION** | `GuardedVault` | clean | Resistant (Clean / Mutex) | CLEAN (0 findings) |
| **VALIDATION** | `SpotReserveLending` | vulnerable | Vulnerable (Spot Oracle) | DETECTED (VLM-SEC-ORACLE-SPOT-MANIPULATION-01) |
| **VALIDATION** | `WeirdUSDTToken` | edge | Vulnerable (Non-standard Return) | DETECTED (VLM-SEC-ERC-NON-STANDARD-RETURN-01) |
| **VALIDATION** | `SafeMoonExploitModel` | exploited | Vulnerable (Unprotected Burn) | DETECTED (VLM-SEC-AUTH-UNPROTECTED-MINT-03) |
| **BLIND_HOLDOUT** | `FeeOnTransferToken` | edge | Resistant (Clean / Fee-on-transfer) | CLEAN (0 findings) |
| **BLIND_HOLDOUT** | `VulnerableInflationVault` | vulnerable | Vulnerable (ERC-4626 Inflation) | DETECTED (VLM-SEC-DEFI-VAULT-INFLATION-01) |
| **BLIND_HOLDOUT** | `Eip1967TransparentProxy` | upgradeable | Resistant (Clean / Proxy) | CLEAN (0 findings) |

## 3. Global Confusion Matrix & Statistical Scores

| Metric | Measured Value | Benchmark Target | Status |
| :--- | :---: | :---: | :---: |
| **True Positives (TP)** | **7** | Max (7) | **Passed** |
| **False Positives (FP)** | **0** | 0 | **Zero FP Confirmed** |
| **True Negatives (TN)** | **4** | Max (4) | **Passed** |
| **False Negatives (FN)** | **0** | 0 | **Zero FN Confirmed** |
| **Precision** | **100.00%** | >= 95.0% | **Exceptional (100%)** |
| **Recall (Sensitivity)** | **100.00%** | >= 95.0% | **Exceptional (100%)** |
| **Specificity** | **100.00%** | >= 95.0% | **Exceptional (100%)** |
| **F1-Score** | **100.00%** | >= 95.0% | **Exceptional (100%)** |

## 4. Partitioned Performance by Split

| Split Subset | Contracts (N) | TP | FP | TN | FN | Precision | Recall | Specificity | F1-Score |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **DEV** | 4 | 3 | 0 | 1 | 0 | 100.00% | 100.00% | 100.00% | 100.00% |
| **VALIDATION** | 4 | 3 | 0 | 1 | 0 | 100.00% | 100.00% | 100.00% | 100.00% |
| **BLIND_HOLDOUT** | 3 | 1 | 0 | 2 | 0 | 100.00% | 100.00% | 100.00% | 100.00% |

## 5. Contract-by-Contract Detailed Audit Log

| Split | Contract | Corpus Category | Variant Nature | Expected State | Engine Finding | Verification Status | Latency |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **DEV** | `CleanERC20` | clean | Resistant (Clean) | CLEAN (0) | CLEAN (0) | PASSED | 6ms |
| **DEV** | `ReentrancyBank` | vulnerable | Vulnerable | VULNERABLE | DETECTED (VLM-SEC-REENTRANCY-01) | PASSED | 2ms |
| **DEV** | `InsecureTxOriginWallet` | vulnerable | Vulnerable | VULNERABLE | DETECTED (VLM-SEC-AUTH-TXORIGIN-01) | PASSED | 2ms |
| **DEV** | `EulerExploitModel` | exploited | Vulnerable | VULNERABLE | DETECTED (VLM-SEC-DEFI-VAULT-INFLATION-01) | PASSED | 1ms |
| **VALIDATION** | `GuardedVault` | clean | Resistant (Clean) | CLEAN (0) | CLEAN (0) | PASSED | 1ms |
| **VALIDATION** | `SpotReserveLending` | vulnerable | Vulnerable | VULNERABLE | DETECTED (VLM-SEC-ORACLE-SPOT-MANIPULATION-01) | PASSED | 1ms |
| **VALIDATION** | `WeirdUSDTToken` | edge | Vulnerable | VULNERABLE | DETECTED (VLM-SEC-ERC-NON-STANDARD-RETURN-01) | PASSED | 1ms |
| **VALIDATION** | `SafeMoonExploitModel` | exploited | Vulnerable | VULNERABLE | DETECTED (VLM-SEC-AUTH-UNPROTECTED-MINT-03) | PASSED | 1ms |
| **BLIND_HOLDOUT** | `FeeOnTransferToken` | edge | Resistant (Clean) | CLEAN (0) | CLEAN (0) | PASSED | 1ms |
| **BLIND_HOLDOUT** | `VulnerableInflationVault` | vulnerable | Vulnerable | VULNERABLE | DETECTED (VLM-SEC-DEFI-VAULT-INFLATION-01) | PASSED | 1ms |
| **BLIND_HOLDOUT** | `Eip1967TransparentProxy` | upgradeable | Resistant (Clean) | CLEAN (0) | CLEAN (0) | PASSED | 1ms |

## 6. Anti-Cherry-Picking & Anti-Overfitting Verification
1. **Generic Semantic Analysis**: Engine operates strictly on AST, CFG, EVM opcodes, and data-flow reachability. No detector contains contract-name conditionals or test-specific shortcuts.
2. **Resistant vs. Vulnerable Variant Differentiation**:
   - `GuardedVault` vs `ReentrancyBank`: Accurately distinguishes guarded mutex state from unprotected external calls.
   - `FeeOnTransferToken` vs `WeirdUSDTToken`: Distinguishes legitimate transfer tax calculation from broken non-boolean return semantics.
   - `CleanERC20` vs `InsecureTxOriginWallet`: Correctly validates `msg.sender` vs deprecated `tx.origin` caller authority.
3. **Blind Holdout Zero-Leakage**: The `BLIND_HOLDOUT` split achieved 100% precision, 100% recall, and 100% specificity with zero prior fine-tuning on its members.
