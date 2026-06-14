# Velmère Master Build Map — PASS300

PASS300 adds the Adapter Fault Sweep Gate across Lens, Shield terminal and Shield Map. The pass follows the new operating rule: every chat/pass starts with error scanning before new product surfaces are added.

## PASS300 marker

- `velmere_adapter_fault_sweep_gate_v1_pass300`
- `data-pass300-adapter-fault-sweep="vlm-browser"`
- `data-pass300-result-sweep="adapter-fault-receipt"`
- `data-pass300-adapter-fault-sweep="shield-terminal"`
- `data-pass300-adapter-fault-sweep="shield-map"`

## New UI innovation

**Adapter Fault Sweep**: a visible preflight rail for runtime, type/prop, search portal, adapter quorum and provenance trace. It turns FOMO into friction and keeps elite status behind proof.

## PASS300 delta

| ID | Area | Previous | Current | Change |
|---|---:|---:|---:|
| A06 | Runtime observability | 81 | 85 | +4 |
| A03 | TypeScript sanity / static sweep | 98 | 99 | +1 |
| C02 | Shield search dropdown | 100 | 100 | +0 |
| C03 | Global token lookup | 72 | 73 | +1 |
| L06 | Adapter timeouts / fallbacks | 47 | 50 | +3 |
| K02 | Source freshness registry | 55 | 56 | +1 |
| D16 | Source confidence lanes | 95 | 96 | +1 |
| J04 | Scroll lock / z-index layers | 100 | 100 | +0 |
| M08 | PDF/browser replay boundary | 53 | 54 | +1 |

**PASS300 product delta:** +12 points.

## Validation status

- `verify:pass300-adapter-fault-sweep-gate` — PASS
- `verify:pass299-runtime-search-quarantine-gate` — PASS
- `verify:pass298-reserve-provenance-twin-gate` — PASS
- `check:i18n` — PASS
- `vercel:preflight` — PASS, 620 files scanned
- `typecheck` — not green in this sandbox because dependency/type packages are not installed and older inherited type errors remain.

<!-- PASS300 marker: Adapter Fault Sweep Gate active across Lens, Shield terminal and Shield Map. -->
