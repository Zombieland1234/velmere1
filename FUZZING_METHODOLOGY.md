# VELMÈRE FUZZING METHODOLOGY
**Standard:** Directive v3 Sections 19–21

## 1. Property-Based Fuzz Testing
1. **Stateless Fuzzing:** Random generation of function call arguments within valid type domains.
2. **Stateful Fuzzing:** Sequences of transactions executed against an ephemeral EVM state machine to break invariants.

## 2. True Execution Counting
- Simulated or heuristic audits must report: `Runs: 0 (NOT RUN)`.
- Fabricating run counts (e.g. claiming "50,000 iterations" without raw test execution logs) is strictly prohibited.
