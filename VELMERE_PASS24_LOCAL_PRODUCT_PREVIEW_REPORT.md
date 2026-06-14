# Velmère Pass 24 — Local Product Preview

Zmiany:

- Dodano folder `public/products/velmere-preview/`.
- Dodano obrazy `1.webp`, `2.webp`, `3.webp`, `4.webp` jako lokalne zdjęcia produktów.
- Zaktualizowano `lib/products/catalog.generated.ts` z 4 osobnymi produktami preview:
  1. Frost Zip Hoodie → `/products/velmere-preview/1.webp`
  2. Contrast Varsity Jacket → `/products/velmere-preview/2.webp`
  3. Black Track Pants → `/products/velmere-preview/3.webp`
  4. Ivory Collar Tee → `/products/velmere-preview/4.webp`
- Produkty są w trybie `coming_soon`, bez aktywnego checkoutu.
- Sekcja główna `LuxuryProductCarousel` już używa `getProducts().slice(0, 4)`, więc po dodaniu czwartego produktu wyświetli 4 karty.
- Dla płaskich zdjęć produktowych zmieniono rendering z `object-cover` na `object-contain`, żeby nie ucinało ubrań.
- Zachowano `priority` tylko dla pierwszego produktu above-the-fold.

Sprawdzone:

- `node scripts/check-i18n.mjs` — OK
- `node scripts/vercel-preflight.mjs` — OK
- zip test — OK

Uwagi:

- Pełnego `next build` nie wykonano, bo paczka nie zawiera `node_modules`.
- Lokalnie po rozpakowaniu odpal `npm run dev` i sprawdź `/pl` oraz obrazy pod `/products/velmere-preview/1.webp` itd.
