# Velmère Pass 17 — performance, cart hydration, Web3 and security hardening

## What changed

- Optimized product card images for LCP: `ProductCard` now accepts `priority`, and the first two shop cards pass `priority={index < 2}`.
- Kept responsive `sizes` on product images so mobile does not receive unnecessarily large assets.
- Hardened Zustand cart persistence with `hasHydrated`, `skipHydration`, safe hydrated reads, and a max quantity clamp.
- Cart drawer now mounts only after client mount + cart hydration, preventing localStorage flicker and hydration mismatch.
- Removed direct Wagmi usage from the cart drawer; checkout reads the stored wallet UI snapshot instead of loading wallet hooks inside cart UI.
- Added an in-flight ref to product add-to-cart to stop fast double-click race conditions.
- Set Web3 provider `reconnectOnMount={false}` and disabled noisy query retries/refetching to reduce wallet reconnect loops.
- Added default Printful GET caching with `next: { revalidate: 3600 }`; POST stays `no-store`.
- Added Stripe webhook idempotency helpers and a Supabase table plan for `velmere_stripe_webhook_events` to prevent replay/double fulfilment.
- Upgraded middleware matcher to skip `/api`, `/_next`, `/_vercel`, and static file requests.
- Added mobile low-power rendering for the canvas visual so phones do not burn FPS while scrolling.
- Command palette no longer imports Wagmi directly; it dispatches `velmere:open-wallet` and lets Navbar open the wallet panel.
- Expanded `vercel-preflight` with guards for image priority, cart hydration, middleware, Printful cache, Stripe idempotency, Web3 reconnect and mobile animation safety.

## Important notes

- Token gating remains frontend-preview only while the VLM contract is not deployed. Real exclusive purchasing must be enforced server-side or in database authorization before production.
- Supabase order tables already have RLS enabled. The new webhook event table also keeps RLS enabled and should be written only server-side.
- Full `next build` was not run in this sandbox because dependencies are not installed here. Static preflight and i18n scripts were run.
