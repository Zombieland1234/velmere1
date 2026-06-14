# PASS153 — Shield UX Containment + Mode Guide Polish

## Scope
- Keep moving from PASS152 toward launch readiness.
- Improve the visible Shield/VLM modal UX after real browser screenshots.
- Reduce color/glow spill from Shield Map and modal containers.
- Make Basic / Pro / Advanced explanations clearer without opening chat.

## Changes
1. **Shield Map color containment**
   - Added final CSS paint containment for Shield Map panels, nexus, launch bridge, evidence export, runtime health and token popup containers.
   - Reduced pseudo-element glow bleed and forced panel-level isolation.

2. **VLM analysis buttons**
   - Replaced tiny `?` affordance with a visible `opis / Info / info` label.
   - Basic, Pro and Advanced now look more like premium operator actions, not random flat rows.
   - Hover/focus states now stay inside the card frame.

3. **Mode guide behavior**
   - Mode guide can be closed by clicking anywhere outside the guide.
   - The opened guide has stronger solid background and side-drawer style motion.
   - Copy remains explicit: VLM is a summary/readout layer, not a safety certificate, legal audit or investment recommendation.

4. **Token popup cleanup**
   - Hid the lower risk / volume / market cap / confidence mini grid from the right panel, because the popup already shows the important headline data and the user wanted less clutter after opening a token.

5. **Risk tile visual cleanup**
   - Static Basic/Pro rail cards now slide in from the right with better density, left accent rail and reduced glow.
   - Active/hover state is cleaner and does not throw color outside the frame.
   - Detail drawer keeps solid background and click-outside close.

## Validation
Passed locally in artifact environment:
- `npm run check:i18n`
- `npm run repair:codex-handoff`
- `npm run vercel:preflight`
- `npm run verify:shield-all`

Full `next build` was not run locally because dependencies are not installed in the artifact sandbox.
