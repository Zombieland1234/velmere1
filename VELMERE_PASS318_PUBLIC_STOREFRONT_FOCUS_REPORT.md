# PASS318 — Public Storefront Focus Gate

## Goal
Continue the public cleanup branch after PASS314–PASS317: remove hidden operator walls from customer routes instead of only hiding them with CSS, tighten the buyer path, and keep Velmère looking like a premium store first.

## Implemented
- Added `lib/market-integrity/public-storefront-focus-gate.ts`.
- Added `scripts/verify-pass318-public-storefront-focus-gate-safety.mjs`.
- Removed hidden operator launch panels from public Home, Community, Square, VLM, Security, Shipping and Returns routes.
- Removed hidden commerce audit blocks from Shop and Product surfaces.
- Trimmed Square public client so moderation/trust/launch routing walls no longer sit in the public DOM.
- Trimmed Research Lab release rails into one short boundary note.
- Added a compact Home customer-focus rail and a Shop focus score based on the new gate.

## UX rule
Customer sees one clean path: product → size → delivery/returns → waitlist/checkout. Operator readiness, source debt, envs, WAF, provider internals and launch blockers stay in admin/report lanes, not in public scroll.

## Safety / psychology
- No aggressive FOMO.
- No fake scarcity countdown.
- No buy/sell command.
- Wallet remains optional for clothing.
- Proof copy stays short and evidence-bound.

## Delta
- B01 Home hero / first impression: +2
- B04 Conversion path: +4
- G01 Product cards / storefront clarity: +3
- G02 Product detail truth: +2
- I01 Square public shell: +3
- I03 Research Lab safe public boundary: +2
- F01 Public Security page: +2
- J03 Responsive/public overflow containment: +2

PASS318 total: +20 points.
