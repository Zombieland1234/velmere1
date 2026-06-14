# Velmère PASS617–621 — Real Markets Exactness & Provider Lineage Release

## Cel wydania

PASS617–621 domyka publiczne rozdzielenie Real Markets od krypto i porządkuje jeden spójny przepływ: katalog → dokładne wyszukiwanie → tabela/karty → provider lineage → wykres → modal. Instrument nie może już pojawić się w Real Markets tylko dlatego, że provider zwrócił podobny symbol, a cena, timestamp, backup, freshness i confidence cap są przenoszone jako jeden kontrakt dowodowy.

## PASS617 — Non-crypto taxonomy lock

- Dodany kanoniczny zestaw publicznych kategorii Real Markets bez `crypto`, `exchange_token`, `crypto_reference`, tokenów i stablecoinów.
- Filtr działa na danych lokalnych, wynikach providera i API wyszukiwania.
- Giełdy jako `exchange health`/spółki pozostają dostępne; ich natywne tokeny są kierowane do Velmère Shield.
- Publiczne zakładki Real Markets są generowane z jednego kontraktu kategorii.

## PASS618 — Full-width adaptive table/cards

- Desktop od 1024 px używa pełnej dziewięciokolumnowej tabeli bez poziomego scrolla.
- Szerokości kolumn są adaptacyjne i mają osobny profil 1024–1099 px oraz rozszerzony profil 1440+.
- Tablet/mobile korzysta z kart; 720–1023 px ma dwie kolumny, węższe ekrany jedną.
- Karty mają `content-visibility`, stabilną minimalną wysokość, touch target 44 px i brak ruchu przy `prefers-reduced-motion`.
- ResizeObserver zasila deterministyczny kontrakt powierzchni i budżet widocznych rekordów.

## PASS619 — Provider health lineage

- Każdy instrument niesie provider, backup, stan `live/partial/stale/fallback/offline`, provider timestamp, coverage i confidence cap.
- Quote i candles są oceniane osobno przez wspólny kontrakt PASS612, a końcowy stan bierze słabszą warstwę.
- Route-time lub brak timestampu nie może podnieść danych do `live`.
- Lineage jest widoczny w tabeli, kartach mobilnych, modalu i stopce wykresu.
- Brak ceny lub historii nie znika; przechodzi do jawnego `offline/fallback` z ograniczeniem pewności.

## PASS620 — Cross-asset chart parity

- Stocks, indices, FX, ETF, commodities, REIT i exchange lanes używają jednego kontraktu wykresu.
- Interaktywny candlestick, pan, zoom, crosshair i evidence rail odblokowują się dopiero przy minimum dwóch source-bound candles.
- Pojedyncza cena bez historii daje line/evidence state, a brak źródła — czytelny evidence placeholder.
- Market cap i volume mają semantykę zależną od klasy aktywa: native, proxy, level, not applicable lub source required.
- Confidence cap wykresu jest pobierany z tego samego provider lineage co publiczna tabela.

## PASS621 — Market search exactness

- Exact ticker, provider symbol lub pełna nazwa mają najwyższy priorytet.
- Auto-open działa wyłącznie dla jednego dokładnego trafienia.
- Prefix, częściowa nazwa i podobny ticker pozostają na liście do jawnego wyboru użytkownika.
- API zwraca receipt: `autoOpen`, `exactSymbol`, `requiresExplicitSelection`, `ambiguousExactCount`.
- Wyszukiwanie nie może zwrócić krypto do publicznego Real Markets nawet wtedy, gdy provider ma je w globalnym katalogu.
- Keyboard Enter respektuje exact-only gate; kliknięcie pozostaje świadomym wyborem konkretnego instrumentu.

## Zmienione powierzchnie

### Nowe
- `lib/market-integrity/pass617-real-markets-noncrypto-taxonomy.ts`
- `lib/market-integrity/pass618-real-markets-adaptive-surface.ts`
- `lib/market-integrity/pass619-real-markets-provider-lineage.ts`
- `lib/market-integrity/pass620-cross-asset-chart-parity.ts`
- `lib/market-integrity/pass621-market-search-exactness.ts`
- `scripts/verify-pass617-621-real-markets-release.mjs`
- `tsconfig.pass621.json`

### Zmienione
- `components/market-integrity/CrossAssetCollapseRadarPanel.tsx`
- `components/market-integrity/RealMarketSearch.tsx`
- `app/api/market-integrity/real-markets/search/route.ts`
- `app/globals.css`
- `package.json`

## Walidacja

- PASS592–596 verifier: PASS
- PASS597–601 verifier: PASS
- PASS602–606 verifier: PASS
- PASS607–611 verifier: PASS
- PASS612–616 verifier: PASS
- PASS617–621 verifier: PASS
- Strict TypeScript kontraktów PASS617–621: PASS
- i18n PL/DE/EN: PASS
- Vercel preflight: PASS — 897 plików
- Parser całego repo: 904 pliki TS/TSX, 0 błędów składni
- Parser PostCSS: PASS
- Runtime fixtures: crypto filter, 390/1280 adaptive layout, provider-live lineage, chart parity, exact/prefix search: PASS

## Uczciwa granica walidacji

Pełny `next build`, pełny semantyczny typecheck React/Next i ESLint nie są deklarowane. Paczka źródłowa nie zawiera `node_modules`; środowisko działa na Node.js 22.16.0, podczas gdy projekt deklaruje Node.js 20.x. Czysta instalacja zależności z poprzedniego odcinka została przerwana przez środowisko sygnałem SIGTERM. Nowe czyste kontrakty przeszły ścisły `tsc`, wszystkie pliki przeszły parser, a regresje poprzednich powierzchni pozostały zielone.
