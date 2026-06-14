# Velmère Shield — PASS 65 Search / Sort / Shield Map Hotfix

## Scope
PASS 65 is a targeted quality and bugfix pass based on real local screenshots and operator feedback. The goal is not to add more decorative panels, but to remove obvious UX friction: one-way sorting, raw JSON buttons, kernel-panic-prone modal opening, noisy main-page modules, and unclear Shield Map behavior.

## Main fixes

### 1. Market table sort toggle
- Table headers now use a bidirectional sort state.
- Clicking a numeric column once sorts high-to-low where appropriate.
- Clicking the same column again flips direction low-to-high.
- Missing values stay at the bottom so incomplete data does not jump above valid rows.
- Active sort arrows show `↑` / `↓`; inactive columns show `↕`.

### 2. Clean search bar
- Removed the visible placeholder copy from the search input.
- Removed the text-heavy `Skanuj token` button.
- Moved scan action into an icon-only search button on the right side.
- Kept the search field clean and premium, matching the rule that the main page should stay minimal.

### 3. SOL / suggestion / local scan handling
- Added a local market resolver before calling the analyze endpoint.
- Exact symbol, id or name matches in the visible market table open the terminal directly.
- Suggestions resolve to stable market ids when possible, so `SOL` can resolve through `solana` instead of falling into ambiguous query handling.
- Search suggestions close cleanly after scan.

### 4. Modal safety / kernel panic reduction
- Added `ShieldModalErrorBoundary` around `TokenRiskModal`.
- If a token terminal render fails, the page should show a controlled safe-mode error card instead of taking the whole UI down.
- The safe-mode message keeps RegTech wording: manual review, source limitations and no investment advice.

### 5. Raw JSON buttons removed from UI
- Removed raw `/api/market-integrity/...` launch links from the Shield quick actions and token modal header.
- AI Bot, Orchestrator, Evidence and VLM actions now route to in-panel command states instead of opening raw JSON pages.
- Browser-visiting an API URL manually can still show JSON because those are developer/data endpoints, but the user-facing UI should no longer push users into those pages.

### 6. Shield Map as a proper main-page action
- Added a dedicated `Shield map` button next to the shield control.
- Removed Shield Map from the overloaded shield inspector quick actions.
- Added a premium `shield-map-panel` with a controlled explanation of the private system basics.
- The panel explains intake, fusion, review and evidence without exposing private scoring weights or internal thresholds.

### 7. Critical review list
- Added a compact critical review list inside the Shield Map panel.
- It merges case inbox and rules engine hits.
- Rows are clickable and open the related token scan/terminal path.
- The copy explicitly states that priority is not proof or accusation.

### 8. CSS / design system
- Added `.shield-map-button`.
- Added `.shield-map-panel`.
- Kept typography, tabular numbers, truncation and `min-w-0` safety patterns.

## Files changed
- `components/market-integrity/MarketIntegrityClient.tsx`
- `components/market-integrity/TokenRiskModal.tsx`
- `app/globals.css`
- `scripts/verify-market-integrity-no-truncation.mjs`
- `scripts/verify-shield-design-safety.mjs`
- `VELMERE_PASS65_SEARCH_SORT_SHIELDMAP_HOTFIX_REPORT.md`

## QA notes
- This pass is a hotfix / UX hardening pass, not a full data-layer pass.
- It does not make live on-chain APIs production-ready yet.
- It does not remove API routes because the product still needs them as internal data endpoints.
- It removes the user-facing paths that opened raw JSON pages from normal UI controls.

## Legal / RegTech wording
- No token accusation language was added.
- The Shield Map uses wording like anomaly, review, uncertainty and evidence limitations.
- VLM remains utility/access only.
- The UI keeps `Not financial advice. Algorithmic risk flag only.`
