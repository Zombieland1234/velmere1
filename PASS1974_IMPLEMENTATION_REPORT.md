# PASS1974 — Runtime header click repair + cart full-height sheet

## Fixed
- Restored missing `WalletBoundaryExplainer` import by adding a compatibility wrapper around `WalletSafetyExplainer`.
- Forced dropdown and drawer overlay surfaces to `position: fixed` inline so `.velmere-command-shell { position: relative; }` can no longer push menu/language/wallet panels off-screen.
- Hardened main menu drawer visibility and viewport placement.
- Converted cart into a full-height right/bottom sheet with a slower bottom-origin open animation.

## User-reported issues covered
- Menu darkens the page but the panel is missing.
- Globe language selector does not show the language table.
- Connect wallet does not show the wallet list.
- Missing `WalletBoundaryExplainer` build error.
- Cart opens from bottom-right but does not reach the top and animates too fast.

## Next pass
- Continue with visual cleanup of header/contact/mail and then move into Audit Watch, VLM Brain, Security and Velmère Lab flows.
