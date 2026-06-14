# Velmère God-Tier VLM / Nav / Account Repair

## Implemented

### 1. Navbar
- Added `Square` back to the desktop top bar.
- Top desktop quick navigation is now simplified to: `Collection / VLM / Square`.
- Removed the visible Motion Lab entry from the sidebar navigation so it no longer behaves like a client-facing module.
- The language control remains a globe icon and is kept separate from commerce/wallet actions.

### 2. Square modal positioning
- Added a `BrowserPortal` for Square post modal, composer and toast notifications.
- This moves the modal layer to `document.body`, outside page/layout transforms, so a clicked post opens centered in the actual viewport instead of being trapped by scroll position or page containers.
- Background scroll remains locked while modal/composer is open.
- Square floating composer button remains only on Square and sits above Angel as a persistent chip.

### 3. VLM Basic / Pro
- Basic and Pro now differ visually in the hero:
  - Basic = calm ivory editorial access layer.
  - Pro = dark protocol room.
- Basic/Pro switch moved from bottom-right to a centered fixed position under the header.
- VLM selected systems were rebuilt from block grid into a more organic/anti-gravity protocol section.
- Implemented selected Motion Lab ideas directly into VLM:
  - Order-book cart
  - Archive entitlement map
  - Wallet safety preview
  - AMU baseline
  - Möbius routing path
  - Prime lattice
  - Garment hover label
- Removed loose Size Guide preview from the VLM main systems section. Size guide belongs to product interaction only.

### 4. VLM lore and copy
- Added clearer copy around:
  - Möbius Routing Path
  - AMU visual baseline
  - Prime lattice as cryptographic metaphor
  - Bitcoin-style discipline: self-custody, named approvals, no seed phrase, no unclear approvals
- Copy remains careful: these are brand/system visuals and safety principles, not investment promises or security guarantees.

### 5. Velmère App layer
- Added `VlmAppLayerSection` as the real client-facing replacement for the loose Motion Lab idea.
- Proposed useful internal modules:
  - Drop Calendar
  - Signal Studio
  - Archive Rooms
  - Fit Advisor
  - Wallet Safety
  - Member Pass

### 6. WalletConnect / other wallets
- Added `walletconnect` to wallet types.
- Added `connectWalletConnect()` in `useWalletConnect`.
- Enabled other wallet buttons to call WalletConnect instead of being disabled.
- This uses the existing Wagmi `walletConnect` connector and requires `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`.

### 7. Login / security motion
- Replaced the old simple lock visual with an enterprise-style security lattice animation:
  - technical node network
  - fingerprint core
  - signing/action path
  - session / wallet / approval labels
- Login remains intentionally honest: Google OAuth is preview-only until server OAuth/session keys are connected.

### 8. Account dashboard
- Added a `Profile` tab.
- Expanded account panel with preview sections for:
  - profile / username / bio
  - avatar and preferences
  - address book
  - billing / invoice data
  - password change
  - email change
  - 2FA recommendation
  - GDPR data rights
  - receipt and return/shipping rules
- These are UI-prepared forms and disabled until real auth/database is connected.

## Important production note
WalletConnect requires this env var:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
```

Without it, MetaMask injected still works, but the universal WalletConnect route cannot open a real QR/mobile session.

## Still needed from owner before production
1. Company/legal seller data.
2. Shipping countries, delivery times and returns address.
3. Final terms/privacy/withdrawal/shipping copy.
4. OAuth keys for Google login.
5. Database auth/session implementation.
6. Final VLM legal position: access concept vs. deployed token.
7. If VLM goes live: chain, contract address, ABI, audit and legal review.
