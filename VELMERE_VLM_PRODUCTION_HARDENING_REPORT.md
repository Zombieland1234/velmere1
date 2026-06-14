# Velmère / VLM production hardening report

## Scope
This pass implements the VLM naming correction and applies the uploaded VLM deep-audit direction to the current Velmère build: mode routing, wallet-safety UX, Square API hardening, profile mutation safety, token legal routing, footer/legal honesty, and modal behavior.

## Changed files
- `.env.example`
- `app/[locale]/token-agreement/page.tsx` (uses existing component; fixed by adding locale namespace)
- `app/[locale]/vlm-token/page.tsx`
- `app/api/profile/route.ts`
- `app/api/square/comments/route.ts`
- `app/api/square/posts/route.ts`
- `components/Navbar.tsx`
- `components/Footer.tsx`
- `components/auth/AuthFormClient.tsx`
- `components/auth/AuthGate.tsx`
- `components/mobile/MobileModePill.tsx`
- `components/square/VelmereSquareClient.tsx`
- `components/ui/CommandPalette.tsx`
- `components/vlm/VlmAccessGatePage.tsx`
- `components/vlm/VlmBuyAccessPanel.tsx`
- `components/vlm/VlmModeChoicePrompt.tsx`
- `components/vlm/VlmModeSwitch.tsx`
- `components/vlm/WalletSafetyExplainer.tsx` (new)
- `lib/api/request-guards.ts` (new)
- `lib/db/order-service.ts`
- `lib/db/profile-service.ts`
- `lib/db/schema.sql`
- `lib/hooks/useProfile.ts`
- `lib/hooks/useSquarePosts.ts`
- `messages/en.json`
- `messages/pl.json`
- `messages/de.json`

## Done
- [DONE] WMR naming treated as VLM. Codebase scan found no public WMR strings after the pass.
- [DONE] Removed hardcoded `#vlm-mode` anchors from mode controls and command palette.
- [DONE] Basic/Pro links now route to `/vlm-token` or `/vlm-token?mode=pro` and trigger top-scroll.
- [DONE] VLM onboarding prompt now receives the actual URL mode instead of hardcoded Basic.
- [DONE] VLM token page wrapped in Suspense so `useSearchParams` usage is safer for App Router builds.
- [DONE] Rebuilt VLM buy/access panel as a controlled modal drawer with body scroll lock, internal scroll, safe-area padding, Escape close, backdrop close, focus trap, and focus return.
- [DONE] Added wallet-safety explainer that separates connect wallet, sign message, approve token, and send transaction.
- [DONE] Added missing `Legal.token` namespace in EN/PL/DE so `/token-agreement` and cart token links stop failing.
- [DONE] Square post/comment API routes now validate payloads with Zod, require a write session, derive author identity server-side, and rate limit writes.
- [DONE] Profile PATCH now validates with Zod, requires a write session, and no longer mutates a shared `default-profile` row.
- [DONE] Supabase profile schema now expects user/session keyed rows, not a shared default profile.
- [DONE] Stripe fallback order logging now redacts customer email and does not dump full customer address/name/phone to logs.
- [DONE] Footer no longer exposes TODO/draft-template copy publicly.
- [DONE] Visible TODO strings removed from locale JSON files; unresolved legal data is worded as launch-control status instead of developer placeholders.
- [DONE] Navbar account/wallet copy now respects locale for account/connect/wallet labels.
- [DONE] Auth UI now labels Google as preview/not live instead of pretending OAuth is production-ready.
- [DONE] Square modal locks background scroll more strongly and closes with Escape.

## Partial / blocked
- [PARTIAL] Real production authentication is not implemented. The current write guard uses a preview header bridge and optional server secret. Final launch should replace it with Supabase Auth/Auth.js sessions.
- [PARTIAL] Legal pages are cleaner and no longer expose TODO fields, but a real full seller address, VAT/registration status, return address and final legal review are still business inputs that must be supplied.
- [PARTIAL] Real VLM token gating is not live because contract address, ABI, chain, audit status and policy classification are not final.
- [PARTIAL] True API abuse protection should use durable rate limiting such as Redis/Upstash/Vercel KV. The included rate limiter is in-memory and suitable for preview/server instance protection only.
- [BLOCKED] MiCA/DSA/tax/KYC/geofencing decisions require legal counsel and final business model decisions.

## Tests run in this environment
- [DONE] `node scripts/check-i18n.mjs` — passed.
- [DONE] JSON parsing for `messages/en.json`, `messages/pl.json`, `messages/de.json` — passed.
- [BLOCKED] `npm run build` — not executed here because dependency installation timed out in the sandbox. Run locally/Vercel after copying.

## Manual QA checklist
- `/en/vlm-token` opens at top, prompt highlights Basic.
- `/en/vlm-token?mode=pro` opens at top, prompt highlights Pro.
- Switching Basic/Pro never lands in the middle of the page.
- VLM side access panel: Escape closes, backdrop closes, body does not scroll behind it, Tab stays inside panel.
- `/en/token-agreement`, `/pl/token-agreement`, `/de/token-agreement` render without missing translation errors.
- Square guest can read posts; guest cannot write and receives login-required message.
- Logged preview session can create local Square signal; API receives `x-velmere-preview-session`.
- Profile update fails without session and succeeds with preview/server session.
- Cart/checkout webhook logs do not expose full personal data when Supabase is missing.
- Check mobile widths 360px / 390px and desktop 1024px / 1440px.
