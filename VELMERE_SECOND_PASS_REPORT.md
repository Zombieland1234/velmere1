# Velmère second polish pass

This patch responds to the latest visual QA notes from the local screenshots.

## Changed

- Reintroduced a proper Basic / Pro VLM experience section.
  - Basic is minimal, short, rounded and simple.
  - Pro is more animated, orbital and technical.
  - Uses existing `mode=pro` URL state through `VlmModeSwitch`.
- Improved `VlmProVisual`.
  - The visual can now be dragged/rotated.
  - It no longer snaps back after releasing the pointer; the chosen rotation persists.
  - Added user-facing drag hint translation.
- Improved the homepage neural visual interaction.
  - When the user drags the visual, auto-rotation stops taking over, so the model stays where the user positioned it.
- Reworked Angel AI panel.
  - It now slides from the right side.
  - It does not use a full-screen modal/backdrop.
  - The user can keep browsing the page while the assistant stays open.
- Removed the buggy login hover dropdown from the header.
  - Header now uses a clean `/login` link only.
  - Logged-in actions can be added later after auth exists.
- Added a floating Size Guide panel.
  - Opens from the bottom/right corner.
  - Gives a compact premium size chart without blocking the full page.
- Improved Velmère Square.
  - The composer is smaller and less like a giant dashboard block.
  - The left side shows guest mode instead of a duplicate login CTA.
  - Post detail drawer opens below the fixed header, so the header no longer covers the post view.
- Added PL/EN/DE translation keys for:
  - `VlmBasicPro`
  - `SizeGuide`
  - updated `Angel`
  - updated `Square`
  - `Vlm.proVisual.dragHint`

## Verified

- `npm run check:i18n` passes.
- JSON translation files parse correctly.

## Not rerun locally

- Full typecheck/build could not be rerun in this stripped ZIP environment because dependencies are not installed here. After extracting locally, run:

```bash
npm install
npm run typecheck
npm run check:i18n
npm run lint
npm run build
```

## Remaining design notes

- The project now keeps the direction: luxury fashion first, VLM as a serious access-token pre-launch page.
- Do not reintroduce fake swap/buy UI until contract, testnet, audit/legal status and purchase route are real.
