# Tasks Discovered During Research & Deep Codebase Review

## Initial Discoveries (V2 Architecture Genesis)

### 1. Blind Spots in Bytecode Pattern Matching
- **Issue**: Linear opcode scanning flags `CALL` followed by `SSTORE` even when `nonReentrant` mutex lock (`SLOAD -> JUMPI -> SSTORE 1 -> ... -> SSTORE 0`) is present in the block.
- **Remedy**: Construct basic blocks with CFG traversal and stack tracking to verify if storage slot 0 or custom mutex slot is updated before the call and reset after.
- **Status**: Placed on V2 execution roadmap.

### 2. False Positives on Function Selectors
- **Issue**: Presence of `getReserves()` (`0x0902f1ac`) was flagged as SWC-114 unconditionally. If the contract only reads reserves for view/quoting or calculates a cumulative TWAP, this is a False Positive.
- **Remedy**: Check whether the caller consumes reserves directly in an arithmetic swap/collateral valuation calculation or passes it through an accumulator/TWAP logic.
- **Status**: Placed on V2 execution roadmap.

### 3. Missing Support for Modern Multi-Chain RPC Networks
- **Issue**: `evm-rpc-fetcher.ts` only configured Ethereum (1), BSC (56), Arbitrum (42161), Polygon (137). Missing Base (8453), Optimism (10), Avalanche (43114).
- **Remedy**: Expand `SUPPORTED_CHAINS` in `evm-rpc-fetcher.ts` to include Base, Optimism, Avalanche with public failover RPC endpoints.
- **Status**: Placed on V2 execution roadmap.

### 4. Non-Standard Token Reentrancy & Accounting Quirks
- **Issue**: ERC-777 `tokensReceived` hook allows arbitrary execution before internal state updates. USDT does not return a boolean on `transfer()` and reverts on standard `IERC20.transfer()`.
- **Remedy**: Implement dedicated `NonStandardTokenEngine` handling USDT non-boolean returns, fee-on-transfer discrepancies, and ERC-777 callbacks.
- **Status**: Placed on V2 execution roadmap.

### 5. ERC-4626 Vault Inflation (First-Depositor) Attack
- **Issue**: First depositor deposits 1 wei and donates large asset balance, artificially inflating share price and causing subsequent depositors to receive 0 shares due to rounding down.
- **Remedy**: Implement `DeFiEconomicAttackEngine` detecting `convertToShares` rounding down without virtual shares offset or minimum liquidity burn.
- **Status**: Placed on V2 execution roadmap.

### 6. Chainlink Oracle Staleness & L2 Sequencer Downtime
- **Issue**: Many contracts call `latestRoundData()` without checking `updatedAt`, `roundId`, or whether the L2 sequencer is down (Arbitrum, Optimism, Base).
- **Remedy**: Add `ContextualOracleEngine` checking round timestamp and L2 Sequencer Uptime Sentinel checks.
- **Status**: Placed on V2 execution roadmap.

### 7. Automated Patch Validation Lifecycle
- **Issue**: Remediation diffs were static text templates without automated re-verification.
- **Remedy**: Build `PatchValidationEngine` that applies the diff, verifies syntax, re-runs static detectors, and asserts vulnerability elimination without regression.
- **Status**: Placed on V2 execution roadmap.

## Deep System & UI Discoveries (Passes 00 - 06)

### 8. Background Body Scroll-Through in Shield Metric Explainer Modal
- **Issue**: `ShieldMetricExplainerModal.tsx` handles `Escape` key and backdrop click, but does NOT lock `document.body` scroll via `useModalScrollLock()`, allowing the underlying page to scroll while the modal is open.
- **Remedy**: Integrate `useModalScrollLock(true)` to lock `overflow: hidden`, cache exact scroll position, and restore it seamlessly upon modal dismissal.
- **Status**: Identified in Pass 00; slated for immediate fix in Pass 20.

### 9. Asymmetric Grid Layout Misaligning Metric Cards in Shield Pro
- **Issue**: `.shield-pro-v4608-status-grid` uses `grid-template-columns: 1.65fr .75fr .75fr`. With 6 cards, row 1 (Markets, Integrity, Market Cap) and row 2 (Risk, Coverage, Confidence) have jarring, non-uniform widths, causing Market Cap and Capitalization cards to look cramped and misaligned.
- **Remedy**: Refactor `.shield-pro-v4608-status-grid` to a symmetrical 6-column grid on desktop (`repeat(6, 1fr)`), 3-column on tablet (`repeat(3, 1fr)`), and 1-column on mobile (`1fr`), ensuring uniform padding, balanced card width, and aligned headers.
- **Status**: Identified in Pass 00; slated for immediate fix in Pass 14 / 20.

### 10. Absence of Global Data Availability Engine (DAS)
- **Issue**: No centralized calculation exists to determine usable data coverage (0-100%) before users purchase €14.99/€49.99/€79.99/€399.99 tiers, risking purchase blind spots.
- **Remedy**: Implement `DataAvailabilityEngine` calculating DAS across 7 distinct dimensions: Contract verification (20%), Security data (20%), Market data (15%), Candle density (15%), Orderbook/Liquidity (10%), Holder data (10%), Historical continuity (10%).
- **Status**: Identified in Pass 00; slated for implementation in Pass 06.

### 11. Missing Premium Interactive "How Risk is Calculated" Modal
- **Issue**: Risk calculation explanations in some views are displayed as static text or basic tables rather than the required multi-stage animated factor flow.
- **Remedy**: Build a luxury interactive modal breaking down the composite score into: Market Data -> Liquidity Depth -> Volatility Stress -> Holder Concentration -> Smart Contract Audit -> Oracle Freshness -> Final Weighted Score.
- **Status**: Slated for Pass 21.

### 12. Clarification of Candle Sparse Policy
- **Issue**: Historical text in comments referenced "sparse ranges must fall back to generated OHLC", which contradicts the absolute "Zero Random Candles" policy.
- **Remedy**: Remove misleading comments and strictly enforce: skeleton animation while loading, real verified candles when available, or explicit "Market data temporarily unavailable" banner if the provider fails.
- **Status**: Completed in Pass 05 & Pass 19.

## PASS 36 — Blind Independent Audit Discoveries & Hardening

### 13. Multi-Vector SSRF Bypasses (Hex/Decimal/Octal & IPv4-Mapped IPv6)
- **Issue**: Initial `isSafeRpcEndpoint` relied on naive string prefixes. Attackers could bypass loopback/IMDS protections using integer IPs (`2130706433`), octal notation (`0177.0.0.1`), hex dotted/integer IPs (`0x7f000001`), CGNAT ranges (`100.64.0.0/10`), or IPv4-mapped IPv6 hex addresses (`[::ffff:7f00:1]`).
- **Remedy**: Re-engineered `lib/security/input-sanitizer.ts` with a full 32-bit uint32 IP normalizer, RFC 1918 / 3927 / 6598 subnet bitmask matching, IPv6 link-local/ULA/multicast filters, and URL credential rejection.
- **Status**: Fully resolved and verified with 20+ adversarial test vectors in `test/unit/security-entitlement-bypass.test.ts`.

### 14. Data Availability Aggregate Score Masking Missing Contract Code
- **Issue**: A token could score up to 60-80% overall from market volume, exchange candles, and holder metrics even if smart contract bytecode and source code were 100% missing, potentially misleading users into buying an empty Audit tier.
- **Remedy**: Added strict **field-level availability gating** in `lib/data-integrity/data-availability-engine.ts`. If `hasBytecode` and `hasSourceCode` are both false, the engine injects `CRITICAL_CONTRACT_UNAVAILABLE` and forcibly overrides `canPurchasePro = false` and `canPurchaseAdvanced = false`.
- **Status**: Implemented and verified in `test/unit/data-availability-engine.test.ts`.

### 15. Continuous Float Boundary Classification in DAS Engine
- **Issue**: Availability status boundaries (29.9% vs 30.0%, 59.9% vs 60.0%, 84.9% vs 85.0%) were not tested with continuous floating-point scores.
- **Remedy**: Built `classifyAvailabilityStatus` with strict boundary tolerances and added comprehensive boundary assertions.
- **Status**: Verified in `test/unit/data-availability-engine.test.ts`.

### 16. Lack of Cryptographic Data Lineage Trace
- **Issue**: Key metrics (Market Cap, Risk Score, Liquidity, Volume, Price, Holder Concentration) lacked an explicit, auditable trace showing the 8 lifecycle stages from provider to PDF.
- **Remedy**: Created `lib/data-integrity/data-lineage-and-versioning.ts` with `buildMetricLineage` which compiles and cryptographically hashes the 8-stage pipeline (`provider -> raw_response -> normalization -> validation -> calculation -> final_value -> ui_render -> pdf_export`).
- **Status**: Implemented and verified in `test/unit/determinism-and-race-condition.test.ts`.

### 17. Risk Engine Formula Versioning & Deterministic Fingerprinting
- **Issue**: Historical risk evaluations risked drifting if formula weights were updated in subsequent releases.
- **Remedy**: Bound all evaluations to explicit `riskEngineVersion: "2.1.0"`, `formulaVersion: "VLM-RISK-2026.1"`, static weights, and a deterministic SHA-256 `dataSnapshotId`.
- **Status**: Verified across 20 consecutive runs in `test/unit/determinism-and-race-condition.test.ts`.

### 18. Out-of-Order Race Conditions in Asynchronous Asset Selection
- **Issue**: Rapid navigation across assets (e.g. requesting BTC, then switching to ETH) could result in slower BTC responses overwriting newer ETH views.
- **Remedy**: Enforced `AbortController` teardown and sequence-guarded state updates in client components (`ShieldProCleanTerminalClient.tsx`, `AssetDetailModal.tsx`).
- **Status**: Simulated and verified passing in `test/unit/determinism-and-race-condition.test.ts`.

### 19. Claim Calibration: Decoupling Ground-Truth Benchmark from Mainnet Compatibility Corpus
- **Issue**: Prior documentation conflated the 11-contract golden benchmark (used for Precision/Recall metrics) with the 100-contract mainnet compatibility corpus, and claimed "0 false negatives" without scope boundaries.
- **Remedy**: Explicitly separated:
  - 11 Contracts = Quantitative Ground-Truth Benchmark (Precision: 100%, Recall: 100%, 0 FN within the evaluated benchmark).
  - 100 Contracts = Real-world compatibility and parser robustness corpus.
  - Replaced misleading "CERTIFIED RELEASE READY" with "RELEASE READY — EVIDENCE-BACKED AUTOMATED SECURITY ASSESSMENT".
- **Status**: Updated across all documentation, scorecards, and release gate files.


