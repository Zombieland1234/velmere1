# VELMÈRE PERFORMANCE REPAIR REPORT

## Scope
This pass targets the critical scroll and paint bottlenecks introduced by the previous crypto-terminal interaction layer. Backend, Supabase, Stripe, Gemini, Wagmi, and product logic were not altered.

## 1. Cursor Destruction & Native Restoration
- Removed `components/ui/CustomCursor.tsx` from the project.
- Removed `CustomCursor` import and injection from `app/[locale]/layout.tsx`.
- Removed global `[data-magnetic] { will-change: transform; transform-style: preserve-3d; }` CSS that was keeping too many elements promoted and ready for transform work.
- Confirmed there are no `cursor-none` references in `app/`, `components/`, or `lib/`.

## 2. Scroll Repair & Pointer Event Isolation
- `GlobalTerminalTicker` root is now `pointer-events-none`, so it cannot steal drags, wheel events, or mobile touches.
- Root body no longer uses `overscroll-none`; natural native body scroll is restored.
- `globals.css` changed `overscroll-behavior-y` from `none` to `auto` while preserving horizontal overflow protection.
- Added `scroll-touch` utility for inertia scrolling inside constrained panels.
- `CartDrawer` internal scroll area now uses `scroll-touch`.
- Decorative 3D/canvas visuals that do not need touch interaction now use `pointer-events-none` / `touch-pan-y` where safe.

## 3. VLM Pro Mobile Compaction
- `VlmProTerminal` now uses `grid grid-cols-1 md:grid-cols-3`.
- Bento modules are `min-w-0`, tighter on mobile, and no longer force horizontal overflow.
- Registry, security, AMU lab, wallet logic, and production panes are maxed to `max-h-[250px] overflow-y-auto` on mobile.
- Long wallet hashes, AMU ratios, and route strings now use `break-all`, `terminal-break`, `font-mono`, and `tabular-nums`.
- `VlmContractRegistryPanel`, `SecurityReadinessConsole`, and `VlmProductionChecklist` now support `compact` rendering for nested terminal panes.
- `BlockchainSearch` hex stream is constrained to `max-h-[250px] overflow-y-scroll` on mobile and is pointer-transparent.

## 4. Lightweight Audio Cleanup
- `lib/audio/useUiSounds.ts` now uses one shared lazy `AudioContext`.
- Hover tones are throttled to avoid flooding the audio graph during mouse movement.
- Audio nodes are disconnected after playback.
- The hook no longer creates per-component audio contexts.

## 5. Chronometrics Cleanup
- `LiveClock` still uses `requestAnimationFrame`, but DOM writes are throttled to roughly 8Hz instead of writing every frame.
- This preserves the terminal chronometric aesthetic without forcing 60/120 DOM mutations per second.

## Verification
- `node scripts/check-i18n.mjs` passed.
- Parsed all TS/TSX files with TypeScript parser: 188 files, zero parse errors.
- Full `npm install`/`next build` could not complete inside the sandbox because dependency installation timed out, so run the production build locally after copying the package.

## Local commands
```bash
npm install
npm run check:i18n
npm run typecheck
npm run build
```
