# VELMÈRE MASTER BUILD MAP — PASS361

## PASS361 — Browser PDF modal header lock + Shield Map suggestion portal

Scope: Velmère Browser/Lens and Velmère Shield Map.

### Fixed
- Browser PDF forge and A4 preview now render through a React portal into `document.body`, so the fixed navbar/header no longer covers the centered PDF preview.
- Browser PDF modal locks body scroll and adds `body[data-velmere-pdf-modal-open="true"]`, lowering the fixed header while the modal is open.
- Removed the visible `min. 5s...` micro-copy from the PDF forge card.
- Replaced `podpis V` wording with the existing brand wording `Velmère signature`.
- Shield Map token suggestions now render through a viewport-level portal instead of being trapped inside the card/container frame.
- Shield Map suggestion panel uses measured `getBoundingClientRect()` position, fixed viewport coordinates, internal scroll, and top/bottom max-height guard.

### Guard
- `scripts/verify-pass361-modal-header-shieldmap-portal.mjs`
- `npm run verify:pass361-modal-header-shieldmap-portal`

### Relevant files
- `components/search/VelmereIntelligenceSearchClient.tsx`
- `components/market-integrity/ShieldMapClient.tsx`
- `app/globals.css`
- `package.json`

### Next recommended pass
PASS362 should focus only on Velmère Browser PDF content quality: per-asset copy engine, clearer A4 hierarchy, stronger human-readable source explanation, and fewer generic repeated paragraphs.
