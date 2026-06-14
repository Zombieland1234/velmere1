# Velmère Client-Ready Repair Pass

## What changed

- Treated every WMR reference as VLM direction. No public WMR naming was added.
- Added `components/wallet/WalletConnectOptions.tsx` for MetaMask, Phantom and an honest Other Wallets / WalletConnect-ready list.
- Removed the redundant Account dashboard header Connect Wallet CTA; wallet binding now lives inside the Wallet tab and Account gate only.
- Added a temporary `/motion-lab` page with 20 selectable animation / interaction concepts so the final site does not get polluted by unapproved effects.
- Reworked the home garment section into a visible four-product luxury grid directly after the hero.
- Reduced the neural brain projection scale so clothing nodes no longer clip as aggressively inside the hero visual.
- Square center feed alignment adjusted; the middle column no longer has extra top offset.
- Square post modal now opens as a centered modal instead of feeling pinned to the top after scrolling.
- Square create button moved next to the Angel trigger; Square composer hides Angel while open.
- Product size guide now hides Angel while open and renders above the page chrome with a higher z-index.
- VLM buy/access panel trigger was raised above standard page layers and uses the shared wallet option component.
- Sidebar menu now groups routes and includes Men's Collection / Women's Collection plus Motion Lab.
- Account/Dashboard copy received PL/EN/DE localization for the main dashboard layer.

## What remains blocked by business data

- Real Google OAuth needs provider credentials and callback URLs.
- Live VLM purchase/swap needs final contract, ABI, chain, audit link, legal approval and token classification.
- Legal production launch needs seller legal name, registered address, support email, VAT/registration status, return address, carriers, shipping regions and privacy controller details.
- Real extra wallets beyond MetaMask/Phantom should go through WalletConnect/Reown project ID and production provider setup.

## Manual QA checklist

- Desktop: 1440px and 1024px header spacing, Square modal center, VLM side panel above header, Account wallet tab.
- Tablet: 768px Square layout, product size guide, Motion Lab grid.
- Mobile: 390px and 360px product size guide above Angel, Square plus next to Angel, menu groups, language picker.
- Wallet: one wallet at a time; Other Wallets list is honest preview, not fake connection.
- VLM: Basic/Pro route must start at top; no `#vlm-mode` scroll bug.
