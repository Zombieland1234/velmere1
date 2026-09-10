# VELMÈRE SMART CONTRACT ANALYSIS METHODOLOGY
**Standard:** Directive v3 Sections 7–15

## 1. Static AST Parsing
1. **Grammar Extraction:** AST parses contracts, libraries, interfaces, inheritance trees, state variables, and function definitions.
2. **Modifier & Control Flow Mapping:** Maps `onlyOwner`, role modifiers, external calls, `delegatecall`, and inline assembly.

## 2. Proxy & Storage Slot Architecture
1. **EIP-1967 Verification:**
   - Implementation slot: `0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc`
   - Admin slot: `0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103`
   - Beacon slot: `0xa3f0ad74e5423aeb0d0795f00e3a074202b3d9f2da8e88ddfd4385f43d082c`
2. **Minimal Proxy (ERC-1167):** Bytecode pattern scan for `363d3d373d3d3d363d73bebebebebebebebebebebebebebebebebebebebe5af43d82803e903d91602b57fd5bf3`.

## 3. Institutional Vulnerability Ruleset
- `VLM-SEC-01`: Phishable `tx.origin` authorization.
- `VLM-SEC-02`: Checks-Effects-Interactions (CEI) violation / reentrancy risk.
- `VLM-SEC-03`: Arbitrary / unrestricted `delegatecall` in public functions.
- `VLM-SEC-04`: Unchecked return value of low-level `.call{...}("")`.
- `VLM-SEC-05`: Deprecated / dangerous `selfdestruct` opcode (EIP-6780).
- `VLM-SEC-06`: Miner/validator timestamp manipulation vulnerability.
- `VLM-SEC-07`: Vulnerability to spot reserves AMM flash-loan manipulation.
