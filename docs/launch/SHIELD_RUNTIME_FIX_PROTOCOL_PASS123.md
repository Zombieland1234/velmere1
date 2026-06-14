# Velmère PASS 123 — Shield Runtime Fix Protocol

## Fixed incidents

### 1. Token terminal crash
Runtime error:
`ReferenceError: ui is not defined`

Cause:
The action panel inside `TokenRiskModal` used `ui.controlKicker`, `ui.controlTitle`, etc., but the `ui` object existed only inside the VLM readout component, not in the main modal scope.

Fix:
A locale-aware `ui` object now exists in the main `TokenRiskModal` scope.

### 2. Shield Map investigator suggestions hidden behind panel
Issue:
The live investigator console suggestions dropdown was clipped by the console container and hidden near the bottom of the card.

Cause:
The parent console used `overflow: hidden` and the dropdown z-index was too low for the layered Shield UI.

Fix:
- console overflow is visible,
- dropdown z-index raised to 10000,
- form has its own high stacking context,
- dropdown uses outside pointer close,
- blur timeout dependency removed,
- role=listbox added.

### 3. Main terminal token search dropdown layering
Issue:
Token suggestions could appear under other Shield layers.

Fix:
Main token search suggestions now use `shield-token-search-suggest-panel` and `z-[10000]`.

## Regression guard
Added:
- `scripts/verify-shield-runtime-ui-safety.mjs`

This guard checks:
- main TokenRiskModal has its own `ui` object,
- Shield Map suggestions use ref/outside pointer close,
- blur timeout is not used,
- suggestion panels use high overlay CSS.
