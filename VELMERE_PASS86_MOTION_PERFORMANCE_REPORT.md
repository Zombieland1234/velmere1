# Velmère PASS 86 — Motion Performance + VLM Neural Readout Stabilization

## Scope
This pass takes control of the current Velmère store codebase and focuses on the biggest blocker before more visual expansion: animation quality, lag reduction, mobile behavior, and clearer VLM neural readout structure.

## Modified files
- `lib/motion/useMotionQuality.ts`
- `components/home/NeuralBrainVisual.tsx`
- `components/vlm/VlmProVisual.tsx`
- `components/vlm/VlmAccessGatePage.tsx`
- `components/vlm/VlmBasicProShowcase.tsx`
- `app/globals.css`

## What changed
### 1. Adaptive motion quality system
Added a reusable client-side motion quality hook:
- `high` for strong desktop devices,
- `medium` for tablets/laptops,
- `low` for phones, coarse pointer, reduced-motion, or low-core devices.

The system caps canvas DPR, frame rate, and particle budgets so animations do not blindly overload mobile GPUs.

### 2. Home neural brain performance pass
`NeuralBrainVisual.tsx` now:
- uses adaptive DPR instead of fixed high DPR,
- throttles canvas FPS by quality tier,
- reduces grid lines and glow on low quality,
- avoids unnecessary high shadow blur on mobile,
- uses a map lookup for projected nodes instead of repeated `.find()` calls during every draw,
- respects reduced motion with a static render path,
- keeps decorative layers touch-safe on phones.

### 3. VLM Pro visual rebuilt into a real neural readout
`VlmProVisual.tsx` is now mode-aware:
- `basic` mode shows 10 data points,
- `pro` mode shows 20 data points,
- data cards connect to the VLM core through organic curved SVG paths,
- endpoint pulses and sequential card reveal create a clearer “data exits VLM” feeling,
- mobile switches to a lighter scrollable readout rail to avoid overlap and lag,
- particle/transmitter count adapts by motion quality.

### 4. VLM page passes mode into hero visual
`VlmAccessGatePage.tsx` now passes `mode={mode}` into `VlmProVisual`, so Basic and Pro views actually differ visually.

### 5. Basic/Pro showcase particle budget reduced
`VlmBasicProShowcase.tsx` no longer spawns 44 animated DOM particles blindly. It now adapts ring/particle count by device quality and uses slower, cleaner motion.

### 6. Global CSS motion layer
Added reusable VLM animation classes:
- orb breathing,
- slow orbit rings,
- readout sweep,
- SVG path reveal,
- endpoint pulse,
- card materialize,
- card scan.

Includes reduced-motion handling and slower mobile animation durations.

## Validation notes
The uploaded repository snapshot does not include a root `package.json` or `tsconfig.json`, and the included `node_modules` snapshot is incomplete for running a real Next.js build in this sandbox. Because of that, full `npm run build`, `npm run typecheck`, and `npm run lint` cannot be honestly confirmed here.

Manual/static checks performed:
- verified modified files exist,
- checked mode prop wiring,
- checked no old `VlmProVisual` call remains without mode in the VLM page,
- checked custom nonstandard Tailwind opacity values introduced by this pass were converted to standard or arbitrary-safe classes,
- checked ZIP integrity after packaging.

## Next recommended pass
PASS 87 should focus on product architecture:
- split VLM Basic / VLM Pro / Shield Map / Token Intelligence clearly,
- create the actual compact token chart popup if it is not present in this repo snapshot,
- then connect the VLM readout sequence to real token data.
