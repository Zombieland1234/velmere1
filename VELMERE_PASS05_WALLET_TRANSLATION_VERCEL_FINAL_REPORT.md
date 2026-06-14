# Velmère Pass 05 — wallet label / i18n / Vercel hardening

## What changed

- Fixed the remaining wallet-card layout issue where `Phantom` could wrap into two lines (`Phanto` / `m`) in narrow modal widths.
- Wallet labels now use `whitespace-nowrap`, controlled truncation, and the readiness badge sits on its own lower row so it cannot steal label width.
- The `Other wallets` side drawer from Pass 04 is preserved.
- The left VLM access drawer overlay behavior from Pass 04 is preserved.
- Wallet microcopy was localized in the wallet component instead of leaving hard-coded English strings:
  - wallet routes / ścieżki portfeli / Wallet-Routen
  - Solana/EVM preview
  - injected EVM
  - browser wallet
  - close wallet panel
- German wallet status copy was corrected from `Preview` to `Vorschau`.
- Normalized non-standard Tailwind opacity classes such as `border-white/12`, `text-white/58`, etc. to bracket-safe syntax like `border-white/[0.12]`, `text-white/[0.58]` across app/components/lib. This prevents Vercel/Tailwind build failures caused by unsupported opacity tokens.

## Checks run

- `npm run check:i18n` — passed.
- `npm run vercel:preflight` — passed.
- Parsed `messages/en.json`, `messages/pl.json`, and `messages/de.json` — passed.
- Compared nested locale keys across EN/PL/DE — no missing or extra keys.
- Static scan for unbracketed color opacity classes in `app`, `components`, and `lib` — no remaining matches.

## Note

The sandbox could not complete `npm install --ignore-scripts` before timeout, so a full `next build` still needs to be run locally or on Vercel after installing dependencies. The Vercel configuration remains prepared for `npm install` + `npm run build`.
