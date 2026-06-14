# Velmère Critical Fix Pass 01

Implemented the first focused repair pass based on the latest screenshots and audit files.

## Fixed now
- Header collision: VLM Basic/Pro mode switch moved left next to Menu on VLM route, no longer overlapping Men/Women navigation.
- Header center: VELMÈRE + Men/Women remains centered as one optical group.
- Login flow: email/password, Google-prepared and wallet-prepared buttons now activate the local session and route to Account, so the user is not stuck on the login page.
- Account dashboard: added richer overview modules and client relation block to reduce empty/unfinished look.
- Square comments: fixed black sticky comment container; uses grey panel background and safe-area padding.
- Square detail drawer: constrained to a better right floating drawer with internal scroll and bottom clearance.
- Wallet side panel TypeScript: fixed `window.ethereum.request` typing for production build.
- Mobile/tactile CSS: added touch-action, safe input font-size, off-black body, scrollbar gutter and anti-tap-highlight polish.

## Still recommended for Pass 02
- Full product card / PDP conversion polish.
- Real Google OAuth requires provider credentials/Supabase/NextAuth config; current flow remains local-session fallback.
- VLM Pro can receive another layer of interactive modules after this stability pass.
