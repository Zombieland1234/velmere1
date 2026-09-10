# VELMÈRE PROVENANCE SPECIFICATION
**Standard:** Directive v3 Sections 7, 8, 22, 65

## 1. Smart Contract Provenance Protocol
1. **Source Code Normalization:** White space and CRLF line endings are normalized before computing `sourceHash` (SHA-256).
2. **Compiler Verification:** Compiler pragma version is extracted and matched against deployed bytecode metadata hash (CBOR suffix).
3. **Repository Lineage:** Git commit hash is recorded or marked as `LOCAL_UNCOMMITTED` if uncommitted changes exist.

## 2. Market Data Provenance Protocol
1. **Quote Origin:** Every market quotation records `retrievedAt`, `observedAt`, `venue`, and `provider`.
2. **Freshness Tracking:**
   - `FRESH`: Observed within < 120 seconds.
   - `STALE`: Observed within 120–900 seconds.
   - `EXPIRED`: Observed > 900 seconds ago (triggers warning flag).
3. **Derivation Tagging:** Values computed via heuristics (e.g. Kyle lambda from aggregated bid/ask depth) are tagged `ESTIMATED_DERIVED`.
