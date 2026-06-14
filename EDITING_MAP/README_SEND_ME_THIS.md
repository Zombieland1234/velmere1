# Velmère — Editing Map

This project is now organized as a normal Next.js App Router app. Do **not** rename production files like `Navbar.tsx`, `page.tsx`, or component names unless you also update every import. Instead, use this map to know exactly which single file, or small group of files, to send when you want one section edited.

## Fast rule

If you want to edit only one visual section, send the **CORE FILE** listed below first. In most cases that is enough.

If text/translations also need edits, send:

- `messages/en.json`
- `messages/pl.json`
- `messages/de.json`

If wallet/API/backend behavior needs edits, send the listed helper files too.

---

## 01 — Global Header / Menu / Language / Wallet top bar

CORE FILE:

- `components/Navbar.tsx`

Related if needed:

- `components/ui/AudioToggleButton.tsx`
- `components/wallet/WalletConnectButton.tsx`
- `components/wallet/WalletStatusChip.tsx`
- `store/useWalletUiStore.ts`
- `store/useModeStore.ts`
- `messages/en.json`, `messages/pl.json`, `messages/de.json`

Use this when you say: header, top menu, logo, Basic/Pro position, language pills, Connect Wallet, Account button, cart icon.

---

## 02 — Home page / main landing / neural visual / hero copy

CORE FILE:

- `components/home/HomePageClient.tsx`

Related if needed:

- `app/[locale]/page.tsx`
- `components/home/NeuralBrainVisual.tsx`
- `components/home/NeuralAtelier3D.tsx`
- `components/home/HomeSideRubrics.tsx`
- `components/home/LuxuryProductCarousel.tsx`
- `components/layout/LuxurySection.tsx`
- `messages/en.json`, `messages/pl.json`, `messages/de.json`

Use this when you say: main page, first screen, hero text, neural brain, CTA, under-brain card, homepage layout.

---

## 03 — VLM Token page / Basic-Pro / Pro terminal / VLM modal

CORE FILE:

- `components/vlm/VlmAccessGatePage.tsx`

Most important related files:

- `components/vlm/VlmModeChoicePrompt.tsx`
- `components/vlm/VlmModeSwitch.tsx`
- `components/vlm/VlmModeTransitionOverlay.tsx`
- `components/vlm/VlmProTerminal.tsx`
- `components/vlm/VlmAccessHeroVisual.tsx`
- `components/vlm/VlmUtilityGrid.tsx`
- `lib/vlm/vlm-mode.tsx`
- `store/useModeStore.ts`

Other VLM modules:

- `components/vlm/VlmContractRegistryPanel.tsx`
- `components/vlm/VlmCybersecuritySection.tsx`
- `components/vlm/VlmTokenomicsVisual.tsx`
- `components/vlm/VlmWalletPreviewPanel.tsx`
- `components/vlm/VlmTradePreview.tsx`
- `components/vlm/PrimeFieldSimulation.tsx`
- `components/vlm/BajakProtocolLab.tsx`
- `components/vlm/AmuCoreSection.tsx`

Use this when you say: VLM Token, Basic/Pro popup, Pro animation, VLM terminal, AMU, Möbius, prime lattice, cyber modules, token visual.

---

## 04 — Velmère Square / posts / comments / popup / plus button

CORE FILE:

- `components/square/VelmereSquareClient.tsx`

Related if needed:

- `app/[locale]/square/page.tsx`
- `components/community/CommentThread.tsx`
- `lib/hooks/useSquarePosts.ts`
- `lib/db/mock-square.ts`
- `lib/db/square-service.ts`
- `lib/square/types.ts`
- `app/api/square/posts/route.ts`
- `app/api/square/comments/route.ts`
- `messages/en.json`, `messages/pl.json`, `messages/de.json`

Use this when you say: Square, feed, post modal, comment modal, plus button, login required alert, guest mode, add post, comments.

---

## 05 — Account / Login / Register / Profile / Dashboard

LOGIN CORE FILE:

- `components/auth/AuthGate.tsx`

ACCOUNT CORE FILE:

- `components/dashboard/DashboardClient.tsx`

Related if needed:

- `app/[locale]/login/page.tsx`
- `app/[locale]/account/page.tsx`
- `app/[locale]/dashboard/page.tsx`
- `components/auth/AuthFormClient.tsx`
- `components/account/ProfileAccountClient.tsx`
- `lib/hooks/useProfile.ts`
- `lib/db/profile-service.ts`
- `app/api/profile/route.ts`
- `messages/en.json`, `messages/pl.json`, `messages/de.json`

Use this when you say: login page, Google login, MetaMask/Phantom buttons on login, account screen, profile/avatar, security, dashboard.

---

## 06 — Cart drawer / checkout / Stripe / order book style

CORE FILE:

- `components/CartDrawer.tsx`

Related if needed:

- `components/CartProvider.tsx`
- `store/useCartStore.ts`
- `lib/orders/order-store.ts`
- `app/[locale]/cart/page.tsx`
- `app/[locale]/checkout/success/page.tsx`
- `app/[locale]/checkout/cancel/page.tsx`
- `app/api/checkout/route.ts`
- `app/api/stripe/webhook/route.ts`
- `lib/stripe/client.ts`
- `lib/stripe/server.ts`
- `messages/en.json`, `messages/pl.json`, `messages/de.json`

Use this when you say: cart, drawer, empty cart, checkout button, Stripe, VAT/net/gross, order book, reservation timer.

---

## 07 — Product listing / Men / Women / Shop / Archive / New Drop grid

SHOP CORE FILE:

- `components/shop/ShopPageClient.tsx`

ARCHIVE CORE FILE:

- `app/[locale]/archive/page.tsx`

Related if needed:

- `app/[locale]/shop/page.tsx`
- `components/product/ProductCard.tsx`
- `components/ProductCard.tsx`
- `lib/products/catalog.ts`
- `lib/products/catalog.generated.ts`
- `lib/products/types.ts`
- `messages/en.json`, `messages/pl.json`, `messages/de.json`

Use this when you say: men collection, women collection, shop grid, 4x5 grid, products, archive, new drop, filters, product cards.

---

## 08 — Product detail page / PDP / size guide / material specs

CORE FILE:

- `components/shop/ProductDetailClient.tsx`

Related if needed:

- `app/[locale]/shop/[id]/page.tsx`
- `components/SizeGuideTeaser.tsx`
- `lib/products/catalog.ts`
- `lib/products/types.ts`
- `messages/en.json`, `messages/pl.json`, `messages/de.json`

Use this when you say: product page, PDP, material table, add to cart button, size, fit guide, product photos, price.

---

## 09 — Angel AI / Gemini / floating bubble

CORE FILE:

- `components/angel/AngelPanel.tsx`

Related if needed:

- `components/angel/AngelTeaser.tsx`
- `app/api/angel/route.ts`
- `lib/ai/gemini.ts`
- `messages/en.json`, `messages/pl.json`, `messages/de.json`

Use this when you say: Angel, AI bubble, Gemini prompt, moderator, concierge, AI chat.

---

## 10 — Web3 / Wallets / MetaMask / Phantom / Wagmi

CORE FILES:

- `components/wallet/WalletConnectButton.tsx`
- `lib/wallet/useWalletConnect.ts`

Related if needed:

- `components/wallet/Web3Provider.tsx`
- `components/wallet/WalletStatusChip.tsx`
- `lib/wallet/mobile-deeplinks.ts`
- `lib/wallet/types.ts`
- `lib/web3/wagmi-config.ts`
- `lib/web3/contracts.ts`
- `lib/web3/token-gating.ts`
- `lib/web3/wallet-state.ts`
- `store/useWalletUiStore.ts`

Use this when you say: MetaMask mobile, Phantom mobile, WalletConnect, disconnect, wrong network, balance, address, wallet modal.

---

## 11 — Global motion / page transitions / loading / CSS / mobile polish

CORE FILES:

- `components/PageTransition.tsx`
- `app/globals.css`

Related if needed:

- `lib/motion.ts`
- `lib/motion/useAnimationActive.ts`
- `app/[locale]/loading.tsx`
- `app/[locale]/layout.tsx`
- `components/ui/LiveClock.tsx`
- `components/ui/GlobalTerminalTicker.tsx`
- `components/ui/LuxuryActionModal.tsx`

Use this when you say: page transition, fade animation, mobile responsiveness, scrollbars, dark background, typography, global UI.

---

## 12 — Footer / legal / SEO / metadata

FOOTER CORE FILE:

- `components/Footer.tsx`

SEO CORE FILES:

- `lib/seo/metadata.ts`
- `app/[locale]/layout.tsx`
- `app/[locale]/opengraph-image.tsx`
- `app/sitemap.ts`
- `app/robots.ts`

Legal pages:

- `app/[locale]/legal/privacy/page.tsx`
- `app/[locale]/legal/terms/page.tsx`
- `app/[locale]/legal/shipping/page.tsx`
- `components/legal/LegalDraftPage.tsx`

Use this when you say: footer, terms, privacy, shipping, SEO, OpenGraph, share card, sitemap.

---

## How to ask for one-file edits

Example messages:

- “Edytujemy tylko Square — wysyłam `components/square/VelmereSquareClient.tsx`.”
- “Edytujemy tylko login — wysyłam `components/auth/AuthGate.tsx`.”
- “Edytujemy tylko VLM popup — wysyłam `components/vlm/VlmModeChoicePrompt.tsx`.”
- “Edytujemy tylko koszyk — wysyłam `components/CartDrawer.tsx`.”

If a change touches text in all languages, include `messages/en.json`, `messages/pl.json`, `messages/de.json` too.
