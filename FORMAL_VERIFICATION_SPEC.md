# VELMÈRE FORMAL VERIFICATION SPECIFICATION
**Standard:** Directive v3 Sections 16–18, 51

## 1. Invariant Catalog
| Invariant ID | Mathematical Property | Description |
| :--- | :--- | :--- |
| `VLM-FORMAL-01` | `totalSupply() == sum(balances[user])` | Conservation of token balance across all mint/burn/transfer operations. |
| `VLM-FORMAL-02` | `isPaused == true => transfersBlocked` | Guarantee that emergency pause strictly halts state-modifying external transfers. |
| `VLM-FORMAL-03` | `msg.sender != owner => !canUpgradeImplementation` | Verification that unprivileged callers cannot alter proxy implementation pointer. |

## 2. Solver Execution Protocol
1. **SMT Formulation:** Translates contract transition relations into SMT-LIB2 format.
2. **Outcome Classification:**
   - `SAT` (Counterexample found): Finding generated with exploit trace.
   - `UNSAT` (Invariant holds): Invariant marked `SOLVER_PROVEN` with solver proof artifact hash.
   - `TIMEOUT / UNKNOWN`: Invariant downgraded to `NOT_RUN` or `PARTIAL HEURISTIC`.
