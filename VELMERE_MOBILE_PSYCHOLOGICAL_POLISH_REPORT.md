# VELMÈRE Mobile Psychological Polish Report

## Scope
This pass was built from the live mobile screenshots and the current codebase. The goal was not to add more noise, but to reduce friction and make the interface feel calmer, clearer and more premium on mobile.

## Implemented

### 1. Mobile header correction
- Hid the audio toggle on mobile so it no longer collides with the VELMÈRE wordmark.
- Centered the mobile VELMÈRE logo using absolute centering while preserving desktop layout.
- Kept the menu, account and cart buttons as the primary mobile controls.

### 2. Mobile hero centering
- Centered mobile homepage hero title, paragraph and CTAs.
- Kept desktop editorial left alignment.
- Preserved the current neural/garment visual while making the text hierarchy more intentional.

### 3. Bottom terminal strip cleanup
- The large moving ticker is not rendered on mobile.
- The compact UTC/EPOCH pill remains desktop-only.

### 4. Angel visibility
- Kept Angel as a bottom-right floating assistant.
- Made the mobile bubble brighter/ivory for immediate visibility on black backgrounds.
- Preserved grey floating panel behavior.

### 5. Neural visual card cleanup
- Reduced the explanatory card under the neural visual.
- Centered it on mobile and kept it right-aligned on desktop.
- Updated copy so it feels like brand signal, not technical filler.

### 6. VLM Basic / Pro polish
- Centered VLM hero and Basic/Pro copy on mobile.
- Enlarged the right visual surface on desktop.
- Updated VLM Basic/Pro copy to clarify the psychological difference: Basic = calm cinematic surface, Pro = technical backstage.

### 7. Psychological copy pass
- Updated EN/PL/DE hero copy with stronger scarcity, authority and silence language.
- Updated Angel welcome copy.
- Updated VLM copy while preserving compliance: no profit promise, no deployed-contract claims, no investment framing.

## Validation
- `node scripts/check-i18n.mjs` passed.
- TypeScript/TSX parser check passed across 202 files.

## Notes
- This package is built on top of the previous second god-tier polish package and keeps its backend, Stripe, Gemini, Supabase and Wagmi structure intact.
