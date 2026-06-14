# PASS1934–1973 Runtime Click Proof / Full Visual Audit

Goal: turn the latest user-reported failures into hard browser proof targets, not just static markers.

## Fixed / strengthened

- Cart trigger now has direct pointer, click and keyboard hard-open paths.
- CartProvider records runtime source, open attempts and exposes `window.__velmereCartRuntime`.
- CartDrawer exposes stable `data-testid` selectors for the drawer and empty state.
- Header language, wallet, account and cart triggers expose stable selectors for Playwright.
- Old e2e expectations for circular/bubble asset modals were replaced by the rectangular chart + Basic/Pro/Advanced rail contract.
- Added a new Playwright spec for cart, dropdown exclusivity, rectangular Shield/Real Markets modals and Audit Registry.
- Added a release gate file and verifier so future passes cannot silently revert the cart/drawer/modal rules.

## Still not claimed

Full `npm ci -> typecheck -> lint -> build -> Playwright` is not claimed inside this sandbox until the dependency install finishes without timeout.
