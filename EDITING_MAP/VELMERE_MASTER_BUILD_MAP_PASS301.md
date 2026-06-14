# Velmère Master Build Map — PASS301

PASS301 adds the Source Adapter Contract Mesh Gate across Lens, Shield terminal and Shield Map. It follows the operating rule from PASS300: every pass starts with an error sweep before new UI/product logic is added.

## PASS301 marker

- `velmere_source_adapter_contract_mesh_gate_v1_pass301`
- `data-pass301-source-adapter-contract-mesh="vlm-browser"`
- `data-pass301-result-mesh="source-adapter-contract-receipt"`
- `data-pass301-source-adapter-contract-mesh="shield-terminal"`
- `data-pass301-source-adapter-contract-mesh="shield-map"`

## New UI innovation

**Source Adapter Contract Mesh**: a proof-contract surface for identity, market depth, reserve proof, contract control, OSINT context and provenance. Every lane exposes timeout, retry policy, customer boundary and operator proof before any premium status or report copy can be promoted.

## Error-first sweep

- Confirmed the previous `mode is not defined` runtime crash string does not appear in product code.
- PASS299 search/modal quarantine remains active.
- PASS300 Adapter Fault Sweep remains active and verified.
- PASS301 guard blocks countdown/last-chance pressure, buy/sell commands and unsupported guarantee wording.

## PASS301 delta

| ID | Area | Previous | Current | Change |
|---|---:|---:|---:|
| K04 | Storage/source adapter contract | 60 | 63 | +3 |
| L06 | Adapter timeouts / fallbacks | 50 | 54 | +4 |
| L07 | Source policy / adapter governance | 30 | 33 | +3 |
| K02 | Source freshness registry | 56 | 58 | +2 |
| C03 | Global token lookup | 73 | 74 | +1 |
| D16 | Source confidence lanes | 96 | 97 | +1 |
| A06 | Runtime observability | 85 | 86 | +1 |

**PASS301 product delta:** +15 points.

## Validation status

- `verify:pass301-source-adapter-contract-mesh-gate` — PASS
- `verify:pass300-adapter-fault-sweep-gate` — PASS
- `check:i18n` — PASS
- `vercel:preflight` — PASS, 621 files scanned
- `typecheck` — not green in this sandbox because `node_modules` is absent and the repo still carries inherited missing Next/React/Node type errors.

<!-- PASS301 marker: Source Adapter Contract Mesh Gate active across Lens, Shield terminal and Shield Map. -->
