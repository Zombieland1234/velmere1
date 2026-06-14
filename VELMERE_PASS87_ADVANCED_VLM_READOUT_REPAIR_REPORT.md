# Velmère PASS 87 — Advanced VLM Readout Operational Repair

Base used: `velmere_pass86_actual_base_vlm_performance_repair.zip`.

## Main implementation

- Rebuilt `VlmAiSequenceOverlay` in `components/market-integrity/TokenRiskModal.tsx` on the correct PASS 85/86 base.
- Advanced mode now has a real 20-point operational readout with grouped neural points: risk, price, liquidity, holders, signals, source and access.
- Basic mode keeps a 10-point public readout.
- Added explicit VLM readout phases: boot, orb inbound, brain forming, data extracting and complete.
- Data cards now reveal through React state, sequentially, after the orb/brain phase instead of relying only on CSS-delayed hidden buttons.
- Cards are clickable after reveal and open a detailed selected neural point panel.
- Advanced selected detail shows extra context: source, confidence and mode.
- Improved random orb entry from eight edge/corner variants.
- Slowed and smoothed the VLM entry so it feels more cinematic and less like a quick demo object.
- Reduced canvas particle count compared with previous heavy versions, especially on low and medium motion quality.
- Added low/medium/high motion quality behavior with lower DPR, lower node count and lower particles on weak/mobile devices.
- On compact/mobile view, the system uses a scrollable neural rail so 20 advanced points remain readable and do not overlap.

## Style additions

Updated `app/globals.css` with:

- `.shield-vlm-topbar`
- `.shield-vlm-phase-pill`
- detail panel reveal animation
- phase pulse animation
- mobile topbar sizing
- reduced-motion safeguards
- `contain` on readout cards for better paint/layout performance

## Validation run

Passed:

```bash
npm run check:i18n
npm run vercel:preflight
npm run verify:shield-all
```

Typecheck note:

`npm run typecheck` could not complete in this sandbox because the provided ZIP does not include installed dependency packages such as `react`, `next`, `lucide-react`, `next-intl`, `@types/node`, etc. The errors start from missing modules and global JSX types, not from this pass specifically.

## Next suggested pass

PASS 88 should focus on Shield Map full-width redesign and cleaning the global VLM/Shield architecture so Basic, Advanced, Shield Map and VLM member layer feel like one premium system.
