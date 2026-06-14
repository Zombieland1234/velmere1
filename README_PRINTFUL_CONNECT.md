# Velmère — Printful Manual/API Store Setup

## Co to jest

Ten patch dodaje:

- automatyczne wykrywanie `PRINTFUL_STORE_ID`, jeśli zostawisz je puste,
- skrypt do znalezienia Store ID,
- skrypt do testu Printful API,
- gotowy szablon `.env.local.printful-ready`.

Printful Store ID bierze się z endpointu `GET /v2/stores`. Ten endpoint zwraca sklepy dostępne dla tokena; jeśli token jest store-level, zwróci jeden sklep, a jeśli account-level, kilka sklepów.

## Jak wkleić pliki

Rozpakuj ZIP w głównym folderze projektu Velmere tak, żeby pliki trafiły do:

```txt
lib/printful/client.ts
scripts/printful-find-store-id.mjs
scripts/printful-smoke-test.mjs
.env.local.printful-ready
README_PRINTFUL_CONNECT.md
```

## Jak skonfigurować

1. Skopiuj `.env.local.printful-ready` jako `.env.local`.
2. Otwórz `.env.local`.
3. Wklej swój Printful Private token w:

```env
PRINTFUL_API_TOKEN=...
```

4. Zostaw na razie:

```env
PRINTFUL_STORE_ID=
PRINTFUL_STORE_NAME=Marcin's Store
```

5. Uruchom:

```bash
node scripts/printful-find-store-id.mjs
```

6. Skrypt wypisze np.:

```txt
ID: 123456 | NAME: Marcin's Store | TYPE: native
```

7. Wklej ID do `.env.local`:

```env
PRINTFUL_STORE_ID=123456
```

8. Restart dev servera:

```bash
CTRL + C
npm run dev
```

9. Wejdź:

```txt
http://localhost:3000/pl/admin/import-products
```

Admin token z pliku to:

```txt
velmere_admin_local_2026
```

## Test API

Możesz sprawdzić Printful bez strony:

```bash
node scripts/printful-smoke-test.mjs
```

Jeżeli widzisz `store products v1 200`, połączenie działa.

## Typowe błędy

- `401 Unauthorized` — zły token albo token wygasł.
- `403 Forbidden` — token nie ma scope do produktów/sklepu.
- `No products` — w Printful nie masz jeszcze produktów opublikowanych do Manual/API store.
- `missing PRINTFUL_STORE_ID` — nie problem krytyczny, ale najlepiej wkleić ID po znalezieniu.
