# Velmère Fix Report

## What was changed

- Rebuilt the public VLM page into one clean pre-launch EVM access-token page.
- Removed the public Basic/Pro mode switch and dashboard-style VLM flow from the public token route.
- Kept VLM as non-custodial, not deployed, not audited and purchase-disabled.
- Added a concrete draft token model in PL/EN/DE:
  - Total supply: 1,000,000,000 VLM
  - EVM-first
  - Minting disabled after deployment
  - Indicative launch scenario: 0.0004 EUR
  - Buy tax: 1%
  - Sell tax: 2.5%
  - Transfer tax: 0%
  - Initial LP scenario already covered in VLM launch scenario section
- Added clearer sections: wallet preview, utility, how to buy after launch, launch scenario, contract plan, security, Bajak Protocol, risk/legal.
- Added Home side-entry rubrics and preserved the luxury homepage structure.
- Removed Google Fonts build dependency. The app now uses CSS fallback font variables, so Vercel does not need to fetch fonts during build.
- Added Node engine: Node 20.x.
- Removed unused Solana and AI SDK dependencies from package.json to reduce Vercel install warnings and bundle weight.
- Fixed TypeScript canvas null issue in NeuralBrainVisual.
- Added VlmClean translation namespace to PL/EN/DE.

## Commands verified locally

- npm run typecheck: passed
- npm run check:i18n: passed
- npm run lint: passed

## Build note

Local `next build` in this container reached the production build step but timed out while compiling. The project has Node 20.x pinned for Vercel. Deploy on Vercel with Node 20. If Vercel still fails, send the first `Error:` / `Failed to compile` block from the log.

## Important deploy instructions

1. Do not commit `.env`, `.env.local`, `.next`, `node_modules`, `.vercel`, `.vs`, `.uploads`.
2. This ZIP intentionally excludes those folders.
3. Run locally:
   npm install
   npm run typecheck
   npm run check:i18n
   npm run lint
   npm run build
4. If npm asks to create a new package-lock.json, commit it after local install.

## Remaining before real VLM launch

- Contract code not deployed.
- Independent audit not completed.
- Legal/MiCA review not completed.
- Multisig treasury/admin not configured.
- DEX/router testing required for fee-on-transfer token.
- Public sale and purchase remain disabled.

## Remaining before real clothing sales

- Stripe env keys and webhook.
- Full seller address/Impressum.
- Shipping rates.
- Final returns/privacy policies.
- Product provider mapping and fulfillment test order.
