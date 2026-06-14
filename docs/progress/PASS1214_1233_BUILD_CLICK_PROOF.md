# PASS1214–1233 — Build Truth + Click Proof Harness

Date: 2026-06-11
Base: PASS1213 final 100 audit ZIP
Mode: endgame runtime proof, not decorative expansion.

## What changed

- Added a dedicated Playwright spec for the true endgame click path: header language, wallet, account, cart, mobile menu arbitration, Shield row modal and Real Markets row modal.
- Added stable `data-testid` selectors for Shield desktop/mobile asset rows so browser QA no longer depends on fragile table text.
- Made the desktop Shield market rows keyboard-openable with `Enter`/`Space`, closing an accessibility gap where the row behaved like a button only for mouse users.
- Added `data-velmere-overlay-trigger="header-menu"` to the menu button so overlay arbitration can be tested consistently.
- Hardened `DropdownRoot` Escape focus restore: it now focuses the anchor only when the anchor is visible/usable, avoiding hidden-anchor focus drift.

## Proof status

| Gate | Status | Notes |
|---|---|---|
| `npm ci` Node 24/npm 11 dry-run | PASS | Existing Vercel dry-run still passes. |
| Full `npm ci` Node 24/npm 11 | STARTS, TIMEOUT IN SANDBOX | It begins real package installation and creates partial `node_modules`, but the sandbox kills it before completion. Not counted as green. |
| `check:i18n` | PASS | Locale files still valid. |
| `vercel:preflight` | PASS | 949 files scanned. |
| `smoke:routes:static` | PASS | 75 localized routes + 3 root surfaces. |
| New click proof verifier | PASS | Static contract confirms the Playwright proof harness and selectors exist. |
| Real browser Playwright run | PREPARED, NOT PROVEN HERE | Requires full install + running Next app without timeout. |

## Updated completion call

| Area | Previous | Now | Reason |
|---|---:|---:|---|
| Overall platform | 93.8% | 94.2% | Build/click proof harness added, one real accessibility gap fixed. |
| UI/UX visual shell | 95.8% | 96.0% | Header/menu/cart contracts are easier to verify. |
| Header / wallet / language / cart | 96.5% | 97.0% | Desktop/mobile arbitration now has a dedicated e2e proof path. |
| Overlay / modal system | 95.0% | 95.4% | Escape focus restore hardened for hidden anchors. |
| Velmère Shield | 92.0% | 92.6% | Rows now have stable test selectors and keyboard activation. |
| Real Markets | 91.0% | 91.3% | Modal parity is now covered by new e2e test. |
| Build/deploy readiness | 91.0% | 91.2% | Real install still times out, but dry-run + static gates remain clean. |
| Runtime click proof | 55.0% | 64.0% | Full Playwright spec exists; not counted as final until executed. |

## How to prove on the user machine / Vercel-like machine

```bash
nvm use 24.16.0
npm i -g npm@11.16.0
npm ci
npm run typecheck
npm run lint
npm run build
npm run test:e2e:pass1214-1233
```

If those pass, the next endgame lane should move from build/click proof into Lens/PDF content parity and Shield Map evidence graph cleanup.

<!-- PASS1214-1233 marker: build click proof harness active. -->
