# Velmère Pass 08 — Header login/member dropdown repair

## Scope
This pass fixes the desktop header spacing and the logged-in account state.

## Changes
- Header desktop padding now keeps the left group near the left edge with about 2cm breathing room instead of pushing the navigation toward the logo.
- The account icon no longer uses “Private member console” as its main label; logged-out state is **Login/Logowanie**, logged-in state is only **Account/Konto**.
- The member chip appears only for an active local member session.
- Email login now stores a local session profile based on the email local-part, so the chip can show the person who logged in instead of the generic “Velmère Member”.
- The member chip is clickable and opens a dropdown with:
  - Private member console
  - Disconnect wallet / no wallet connected
  - Log out
- Logging out clears the local Velmère session and wallet UI snapshot.
- Disconnect wallet clears only the wallet UI snapshot.
- Mobile remains simplified: menu, logo, account icon, cart; heavy member chip stays desktop-only.

## Checks run
- `npm run check:i18n` — OK
- `npm run vercel:preflight` — OK
- grep checks for old animation/build killers — OK

## Notes
Full `next build` was not run in the sandbox because dependencies are not installed here. The package remains configured for Vercel with `npm install` + `npm run build` and Node 20.x.
