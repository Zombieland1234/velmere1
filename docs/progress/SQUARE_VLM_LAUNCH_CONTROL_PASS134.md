# Velmère PASS 134 — Square + VLM Launch Control

## Purpose
PASS133 created broad page audit coverage. PASS134 turns the Square/VLM part into a concrete launch-control layer: route progress, user promise, safety boundary, blockers and next build step.

## Added runtime/data layer
- `lib/launch/square-vlm-launch-control.ts`
- `components/launch/SquareVlmLaunchControl.tsx`

## Pages integrated
- `/[locale]/square`
- `/[locale]/vlm-token`
- `/[locale]/community`

## Safety model
Square and VLM must stay understandable without hype:
- clothing checkout stays separate,
- Square is a community/signal board,
- VLM is utility/access only,
- no ROI language,
- no public-sale claim,
- no price/listing promise,
- no custody,
- no seed phrase flow.

## Localisation cleanup
Fixed known English leftovers in PL/DE footer trust notes:
- PL risk micro
- PL newsletter offline
- DE risk micro
- DE newsletter offline

## Launch-control progress
| Area | Progress | Status |
|---|---:|---|
| VLM access layer | 57% | launch_control |
| VLM FAQ | 51% | partial |
| Square public board | 48% | partial |
| Community bridge | 45% | partial |
| Member cockpit | 39% | blocked |

## Next blockers
- session gating,
- wallet signature policy,
- contract/audit labels,
- Square moderation,
- abuse controls,
- member-room rules,
- production data storage.
