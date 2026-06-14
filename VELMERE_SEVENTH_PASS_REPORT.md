# Velmère Seventh Pass Report

Focus: fix the issues shown in the latest screenshots and user notes.

## Main fixes

1. Angel overlay coordination
- Angel now listens for `velmere:close-angel` and closes when Square composer/detail opens.
- Opening Angel dispatches `velmere:close-square-panels` so side panels no longer stack on top of each other.
- Angel panel contrast improved: darker opaque panel, gold border/ring, stronger shadow, safer input contrast.

2. Velmère Square
- Rebuilt Square into a wider, more serious three-column community/feed layout.
- Center feed is wider and more readable.
- Left rail is a structured Square map with rooms/quests/access utilities.
- Right rail contains status, live rooms, rewards and access pulse.
- Removed heavy modal overlay behavior for composer/detail; they now open as right-side panels so the page remains visible.
- Composer is opened by the floating plus dock.
- Post detail also opens as a right-side panel and no longer stacks with Angel.
- Added higher-depth background and larger feed imagery to reduce black emptiness.

3. VLM Pro visual polish
- VLM Pro visual moved labels into a side legend instead of over the orbit.
- Bottom caption width is reduced so it does not clash with labels.
- Visual aspect changed to 4:3 and max width increased.
- Drag rotation still persists after releasing the mouse.

4. VLM Basic/Pro content
- Pro showcase text size and grid proportions reduced to avoid overlapping.
- Pro cards are more compact and separated from the background orbit animation.
- Basic stays cleaner and minimal.
- Model cards on VLM page use smaller values to avoid `1,000,000,000 VLM` and `EVM-first` text collisions.

5. Login page
- Rebuilt login as a premium preview screen instead of a basic flat form.
- Added rounded shapes, lock/account preview, step cards and better contrast.

6. Archive page
- Rebuilt archive into an editorial image-led layout with large asymmetric image cards.
- More luxury/fashion-gallery rhythm, fewer small equal cards.

## Validation

Passed:
- `npm run typecheck`
- `npm run check:i18n`
- `npm run lint`

Build:
- `npm run build` compiles successfully and passes lint/type checks, then times out in this sandbox during `Collecting page data`.
- This same timeout happened in prior passes and appears related to the sandbox/Next worker limits rather than a TypeScript compile error.
- Test on local Node 20 / Vercel Node 20.

## Files changed
- `components/angel/AngelTeaser.tsx`
- `components/angel/AngelPanel.tsx`
- `components/square/VelmereSquareClient.tsx`
- `components/vlm/VlmAccessGatePage.tsx`
- `components/vlm/VlmProVisual.tsx`
- `components/vlm/VlmBasicProShowcase.tsx`
- `app/[locale]/login/page.tsx`
- `app/[locale]/archive/page.tsx`

## Check after install
- `/en/square`
- `/pl/square`
- `/en/vlm-token`
- `/en/vlm-token?mode=pro`
- `/pl/vlm-token?mode=pro`
- `/en/login`
- `/en/archive`

