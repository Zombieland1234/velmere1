# PASS_02 DATA PROVENANCE: ECONOMIC SIMULATION REPRODUCIBILITY

## 1. Simulation Lineage
All DeFi economic simulations record:
`Target Bytecode` -> `Initial State Invariant` -> `Simulated Flash-Loan Capital` -> `Pool State Skew` -> `Extracted Value`.
Deterministic seeds ensure that rerunning `simulateDefiEconomicAttacks` yields identical capital requirements and profit figures.
