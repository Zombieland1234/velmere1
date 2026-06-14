export const PASS267_LENS_SHIELDMAP_BRAIN_UI_HOTFIX_DELTA = true;

export const velmerePass267ProgressDeltas = [
  { id: "D06", area: "Orbit tile readability", previous: 88, current: 90, delta: 2, note: "Removed the live-source badge from Orbit/static cards so the visible tile data is not covered." },
  { id: "D07", area: "Tile detail popup", previous: 94, current: 96, delta: 2, note: "Moved the clicked-tile drawer to the right edge and strengthened scroll containment/sticky header behavior." },
  { id: "D18", area: "Basic / Pro / Advanced depth contract", previous: 87, current: 90, delta: 3, note: "Basic now hides deep release/export panels, Pro keeps mid-depth review lanes and Advanced keeps the full stack." },
  { id: "C02", area: "Shield search dropdown", previous: 95, current: 96, delta: 1, note: "Shield Map search now uses a Shield-style fixed suggestion portal with glyph avatars and no clipping." },
  { id: "E02", area: "Lens search UX", previous: 83, current: 87, delta: 4, note: "Velmère Lens gained token/contract/OSINT suggestions with emoji/logo avatars and direct Shield handoff." },
  { id: "J04", area: "Scroll lock / z-index layers", previous: 94, current: 96, delta: 2, note: "Dropdowns and the VLM Brain drawer are pushed above surrounding panels with explicit z-index/overflow containment." },
] as const;

export const velmerePass267Summary = {
  pass: "PASS267",
  title: "Lens / Shield Map / VLM Brain UI screenshot hotfix",
  userVisibleFixes: [
    "VLM Brain cards no longer show the small source-live badge over card data.",
    "Clicked tile drawer is right-edge, scrollable and mode-aware.",
    "Lens and Shield Map searches now share Shield-style suggestion rows with avatars.",
  ],
  totalDelta: velmerePass267ProgressDeltas.reduce((sum, item) => sum + item.delta, 0),
};
