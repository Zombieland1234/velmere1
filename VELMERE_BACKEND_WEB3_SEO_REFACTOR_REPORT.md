# Velmère Backend / Web3 / SEO Refactor Report

## Implemented

### Database and persistence preparation
- Added `lib/db/supabase.ts` with a server-side Supabase abstraction that returns `null` when keys are not configured.
- Added `lib/db/square-service.ts` and `lib/db/profile-service.ts` service layers.
- Added `lib/db/schema.sql` for Supabase/Postgres tables:
  - `velmere_square_posts`
  - `velmere_square_comments`
  - `velmere_profiles`
- Added production API routes:
  - `app/api/square/posts/route.ts` — GET/POST
  - `app/api/square/comments/route.ts` — POST
  - `app/api/profile/route.ts` — GET/PATCH
- Added graceful mock fallback through `lib/db/mock-square.ts` when Supabase env keys are missing.
- Updated Square and Profile clients to fetch through SWR hooks instead of relying only on static local state.

### SEO / Open Graph
- Added `lib/seo/metadata.ts` for canonical URLs, hreflang alternates, OpenGraph and Twitter cards.
- Added route-specific metadata for Home, Shop, Product Detail, Square, Account and VLM Token routes.
- Added `app/[locale]/opengraph-image.tsx` using Next ImageResponse.
- Updated sitemap/robots to use canonical site URL helper and product routes.

### Web3 provider architecture
- Added `lib/web3/wagmi-config.ts` with wagmi + viem EVM read-ready provider config.
- Added `components/wallet/Web3Provider.tsx` with WagmiProvider + TanStack Query provider.
- Wrapped the localized application tree with Web3Provider.
- Reworked `lib/wallet/useWalletConnect.ts` to use actual wagmi account/connect/disconnect/balance/chain state.
- Updated `VlmWalletPreviewPanel` to read actual connected address, chain and native balance state instead of raw local mocks.

### Image optimization / UI safety
- Replaced the remaining raw `<img>` in the admin importer with Next `<Image />`.
- Added local wallet SVG assets under `public/wallets/`.
- Preserved existing Framer Motion and Tailwind UI structure while adding backend-driven state.
- Added mobile-safe fixed product CTA and luxury toast for add-to-cart.
- Replaced `min-h-screen`/`h-screen` patterns with `100dvh` equivalents across app/components.

## Dependencies added
- `@supabase/supabase-js`
- `@tanstack/react-query`
- `swr`
- `viem`
- `wagmi`

## Environment variables added
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Validation performed in this sandbox
- `node scripts/check-i18n.mjs` passed.
- Full install/build could not be completed inside the sandbox because registry access for npm/corepack timed out/failed. The project is prepared for normal install/build in a networked environment with:
  - `npm install`
  - `npm run typecheck`
  - `npm run build`
