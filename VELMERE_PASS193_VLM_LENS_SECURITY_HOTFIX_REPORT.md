# Velmère PASS193 — VLM Brain Layout Hotfix + Security Import Fix + Lens Report Preview

## Scope
This pass directly fixes issues observed in the screenshots and runtime error:
- `SecurityOperationsChecklistPanel is not defined` runtime crash,
- Orbit 360 window too narrow,
- Evidence Board cards clustered around the center instead of using left/right side lanes,
- Advanced/orbit card text too dark,
- missing practical zoom control for Orbit 360,
- Security page gradient/colour bleed outside cards,
- Lens route buttons needing clearer destinations and report preview,
- Shield search suggestions needing stronger logo fallback.

## Implemented
- Added missing `SecurityOperationsChecklistPanel` import in `SecurityTrustPage.tsx`.
- Added Orbit zoom state and mouse wheel zoom controls in `TokenRiskModal.tsx`.
- Widened VLM overlay and centered the core.
- Reworked Evidence Board static card placement into left/right lanes around the VLM core.
- Strengthened Advanced Orbit card contrast and readability.
- Added CSS containment/overflow hardening for Security/Lens cards.
- Added Lens `reportHref` and `reportTitle` route metadata.
- Added `/api/search/lens-report` PDF-ready HTML report preview route.
- Added report preview controls to Lens router cards.
- Added stronger token logo fallback entries and z-index/visibility protection for Shield suggestions.

## Boundary
The Lens report is a PDF-ready evidence note that can be printed/saved by the browser. It is not a safety certificate, investment advice, legal proof or guaranteed result.
