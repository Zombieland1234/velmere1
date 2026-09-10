# VELMÈRE SECURITY ENGINE V2 — SYSTEM ARCHITECTURE & IMPLEMENTATION GUIDE

## 1. Executive Architectural Overview

Velmère Security Engine V2 represents a complete generational leap in automated smart contract security analysis. Moving beyond naive AST syntax checks and isolated opcode heuristics ("selector = vulnerability"), Velmère V2 operates as a formal, multi-layered verification system combining:
1. **Linear EVM Disassembly & Direct CFG Basic Block Partitioning**
2. **Contextual Checks-Effects-Interactions (CEI) & Mutex-Aware Reentrancy Analysis**
3. **Directed Privilege Graph Modeling & Authorization Anti-Pattern Trapping**
4. **Contextual Oracle Engine (TWAP vs Spot Reserves, Chainlink Freshness, L2 Sequencer Uptime)**
5. **DeFi Economic Attack Simulation Engine (ERC-4626 Vault Inflation & Flash-Loan Sandwich MEV)**
6. **ERC/EIP Conformance & Non-Standard Token Engine (USDT Void Return, Fee-on-Transfer, Blacklists)**
7. **EIP-1967 Upgradeability & Storage Collision Sentinel**
8. **Low-Level Solidity & EVM Hazards (Transient Storage EIP-1153, ECDSA Malleability, Selfdestruct)**
9. **Property-Based Mutational Fuzzing & Invariant Verification Engine**
10. **Bounded Symbolic Execution & SMT Formal Assurance Engine**
11. **Automated Patch Validation & Regression Life-Cycle Engine**
12. **Multi-Dimensional Risk Scoring (Security, Centralization, Upgrade, Oracle, Economic)**
13. **Cryptographically Deterministic Audit Snapshot ID Generation**

---

## 2. Directory Layout & Subsystem Responsibilities

```
lib/security/v2/
├── types.ts                               # Unified AST, CFG, Taint, Finding, Invariant, and Evidence Types
├── evm-cfg-dataflow-engine.ts             # Linear Disassembler, Basic Blocks, Taint Tracker, Mutex Detector
├── contextual-reentrancy-engine.ts        # Mutex-Guarded CEI Reentrancy, Read-Only Reentrancy, ERC-777
├── contextual-access-control-engine.ts    # Privilege Graph, tx.origin, Single-Step Ownable, Unprotected Mint/Burn
├── contextual-oracle-engine.ts            # TWAP Accumulators, Spot Reserve Guards, Chainlink, L2 Sequencer
├── defi-economic-attack-engine.ts         # ERC-4626 Vault Inflation, Euler Donation, Flash-Loan Sandwiches
├── erc-and-nonstandard-token-engine.ts    # EIP-20/2612/4626, USDT Missing Bool Return, Blacklists
├── upgradeability-engine.ts               # EIP-1967 Storage Slots, UUPS _authorizeUpgrade, Initializer Front-running
├── solidity-evm-edge-case-engine.ts       # EIP-1153 Transient Storage, ECDSA Malleability, Selfdestruct
├── fuzzing-and-invariant-engine.ts        # Mutational Sequence Generation, Invariant Checks, Trace Shrinking
├── symbolic-formal-engine.ts              # Bounded CFG Path Exploration, EVM Arithmetic Formal Assertions
├── patch-validation-engine.ts             # Automated Git Patch Application, Syntax Proof, Regression Prevention
├── scoring-and-evidence-engine.ts         # Multi-Dimensional Risk Weights, AuditSnapshotId Fingerprint
└── master-audit-orchestrator.ts           # End-to-End Analysis Pipeline Coordinating All Engines

golden/
├── known-clean/                           # CleanERC20.sol, GuardedVault.sol
├── known-vulnerable/                      # ReentrancyBank.sol, InsecureTxOriginWallet.sol, SpotReserveLending.sol, VulnerableInflationVault.sol
├── known-edge/                            # WeirdUSDTToken.sol, FeeOnTransferToken.sol
├── known-exploited/                       # EulerExploitModel.sol, SafeMoonExploitModel.sol
└── known-upgradeable/                     # Eip1967TransparentProxy.sol

scripts/qa/
├── benchmark-security-engine-v2.ts        # Confusion Matrix (TP, FP, TN, FN, Precision, Recall, F1)
├── test-famous-exploits.ts                # Historical Incident Exploit Replay ($500M+ Stolen Capital Models)
└── test-security-v2-full.ts               # 30-Assertion Comprehensive Regression Suite
```

---

## 3. Core Engine Mechanics & Data-Flow Details

### 3.1 EVM CFG & Stack Taint Engine (`evm-cfg-dataflow-engine.ts`)
- **Linear Opcode Disassembler**: Traverses raw runtime bytecode handling `PUSH1` through `PUSH32` with 256-bit BigInt operands. Accurately maps Program Counters (PC) to canonical mnemonic operations.
- **Basic Block Partitioning**: Identifies control-flow leaders:
  1. Target of any conditional/unconditional branch (`JUMPDEST`).
  2. Instruction immediately following a branch or terminal opcode (`JUMP`, `JUMPI`, `RETURN`, `REVERT`, `STOP`, `SELFDESTRUCT`, `INVALID`).
- **Abstract Stack & Storage Simulation**: Emulates EVM stack depth, tracking untrusted taint sources (`CALLDATACOPY`, `CALLDATALOAD`, `CALLER`, `ORIGIN`) to sensitive sinks (`SSTORE`, `DELEGATECALL`, `SELFDESTRUCT`).
- **Mutex Lock Discovery**: Detects reentrancy locks matching `SLOAD slot -> PUSH 1/2 -> SSTORE slot` without requiring hardcoded storage slots.

### 3.2 Contextual Reentrancy Engine (`contextual-reentrancy-engine.ts`)
- **Elimination of False Positives**: Silences classic reentrancy alerts when the containing block or its predecessor executes an active mutex guard (`nonReentrant` or `_status = _ENTERED`).
- **Read-Only Reentrancy**: Identifies view queries to Curve/Balancer (`get_virtual_price`, `getRate`) within protocols lacking cross-contract reentrancy locks.
- **ERC-777 / ERC-1363 Callbacks**: Detects unsafe transfers invoking external recipient hooks (`tokensReceived`) before internal balances are finalized.

### 3.3 Contextual Oracle & AMM Engine (`contextual-oracle-engine.ts`)
- **TWAP Accumulators vs Spot Manipulation**: Silences `getReserves()` alerts when contracts incorporate Uniswap V2/V3 cumulative price accumulators (`price0CumulativeLast`, `consult()`, `observe()`).
- **Chainlink Staleness & Completeness**: Asserts that `latestRoundData()` outputs validate `updatedAt != 0`, `answeredInRound >= roundId`, and `answer > 0`.
- **L2 Sequencer Downtime Sentinel**: Enforces L2 Sequencer Uptime Feed validation and restart grace periods on Arbitrum (42161), Optimism (10), and Base (8453).

### 3.4 DeFi Economic Attack Engine (`defi-economic-attack-engine.ts`)
- **Strict Analytical Tagging**: All economic models are explicitly marked `SIMULATION / ESTIMATE / ASSUMPTIONS`.
- **ERC-4626 Vault Inflation**: Detects 1-wei initial deposits combined with direct underlying asset transfers causing subsequent depositor shares to round down to 0. Enforces OpenZeppelin virtual shares (`_decimalsOffset() = 3`) or dead-shares burn.
- **Euler Finance Self-Liquidation**: Flags uncollateralized collateral donations (`donateToReserves`) lacking post-donation borrower solvency checks (`checkLiquidity`).
- **Flash-Loan Sandwich MEV Modeling**: Quantifies front-run and back-run arbitrage extraction potential, estimating capital requirements, profit bounds, and slippage thresholds.

### 3.5 Property-Based Fuzzing & Invariant Suite (`fuzzing-and-invariant-engine.ts`)
- **Dynamic Invariant Inference**:
  - `INV-01-SUPPLY-CONSERVATION`: `forall s in States: s.totalSupply == sum(s.balances)`
  - `INV-02-NO-UNAUTHORIZED-MINT`: `forall a not in Admins: State.totalSupply after a.mint() == revert`
  - `INV-03-SOLVENCY`: `Vault.totalAssets() >= sum(Vault.sharesOf(u) * sharePrice)`
  - `INV-04-NO-NEGATIVE-BALANCES`: `forall u in Users: u.balance >= 0`
- **Mutational Sequence Generation**: Generates multi-actor execution graphs with boundary values (`0`, `1`, `2^256 - 1`).
- **Trace Shrinking (Minimization)**: On invariant failure, minimizes execution sequence to the shortest reproducible PoC.

### 3.6 Automated Patch Validation Lifecycle (`patch-validation-engine.ts`)
- Implements an automated remediation proof loop:
  1. Ingests candidate unified diff (`-` / `+`).
  2. Applies patch to simulated contract source code.
  3. Re-runs static analysis and invariant checks.
  4. Verifies vulnerability elimination without introducing regressions.
  5. Cryptographically seals verification with a SHA-256 validation proof digest.

---

## 4. Multi-Dimensional Risk Model

Risk is evaluated across 5 independent risk axes (0-100) and synthesized into an overall institutional grade:
- **Security Risk (0-100)**: Direct exploitability (reentrancy, selfdestruct, memory corruption).
- **Centralization Risk (0-100)**: Administrative control, blacklists, single-step ownership transfers.
- **Upgrade Risk (0-100)**: Proxy configuration, storage collisions, uninitialized implementations.
- **Oracle Risk (0-100)**: Spot price manipulation, stale Chainlink rounds, missing L2 sequencer feeds.
- **Economic Risk (0-100)**: Vault share inflation, flash loan sandwich MEV, rounding loss extraction.
- **Overall Score**: Weighted composite reflecting total protocol safety.
- **Assessment Confidence**: Statistical metric (80-98%) reflecting bytecode depth, CFG completeness, and evidence coverage.

---

## 5. Standard Finding Layout

Every finding emitted by Velmère V2 strictly contains:
1. **Finding ID & Title**: Structured unique identifier (e.g. `VLM-SEC-REENTRANCY-01`).
2. **Severity vs Confidence Matrix**: Decoupled severity (`critical`, `high`, `medium`, `low`) and confidence (`certain`, `high`, `medium`, `low`).
3. **Multi-Standard Taxonomy**: SWC ID, MITRE CWE ID, EEA EthTrust Level (S/M/Q), and OWASP SCSVS v2 Category.
4. **Location & Offsets**: Affected contract, function, source line, and EVM bytecode PC offset.
5. **Attack Scenario & Step-by-Step PoC**: Chronological sequence of actor actions to exploit the vulnerability.
6. **Opcode & Storage Evidence**: Disassembly trace excerpt, storage slot dependencies, and reproducibility hash proof.
7. **Actionable Remediation**: Concrete strategy and production-ready unified patch diff.
