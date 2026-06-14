# PASS459 — Keyed Provider Truth + PDF/Shield AI Parity

## Cel
PASS459 domyka brak z PASS458: właściwy provider dla stocków, ETF/REIT, FX i części surowców nie jest już tylko planem tekstowym. Wybrany pojedynczy instrument może zostać nawodniony kluczowym źródłem Alpha Vantage, a tabela zbiorcza nie zużywa limitu providera. Ten sam kontrakt źródłowy trafia do Real Markets, Shield AI oraz czterostronicowego PDF Lens.

## Najważniejsze wdrożenia

### 1. Keyed Alpha Vantage Provider
Dodano `lib/market-integrity/pass459-alpha-vantage-provider.ts`.

Obsługiwane ścieżki:
- akcje, ETF, REIT i notowane spółki giełdowe: `GLOBAL_QUOTE` + `OVERVIEW`,
- FX: `CURRENCY_EXCHANGE_RATE`,
- złoto i srebro: `GOLD_SILVER_SPOT`,
- WTI, Brent i gaz ziemny: osobne serie surowcowe,
- indeksy: jawny status `unsupported`, dopóki nie zostanie podłączony provider breadth/constituents.

Provider zwraca:
- stan źródła,
- cenę i zmianę,
- market cap oraz wolumen, jeśli endpoint je dostarcza,
- timestamp, exchange i currency,
- listę użytych funkcji,
- krótkie dowody providera,
- konkretny powód braku danych.

### 2. Ochrona limitu API
Tabela batchowa nie uruchamia Alpha Vantage dla 18 instrumentów naraz.

- zwykła tabela: compatibility feed,
- kliknięcie jednego instrumentu: `detail=1`,
- keyed provider uruchamia się tylko dla pojedynczego detail requestu,
- klucz pozostaje wyłącznie po stronie serwera.

### 3. Provider Truth Router 458 → 459
`pass458-provider-truth-router.ts` został rozszerzony o:
- `providerStatus`,
- `primaryProviderConfigured`,
- `providerFunctions`,
- `providerEvidence`,
- nowe typy: `alpha_vantage_market`, `alpha_vantage_fx`, `alpha_vantage_commodity`,
- source-bound merge kluczowego snapshotu z kompatybilnymi świecami.

Compatibility chart nie jest już przedstawiany jako główny provider. Jest jawnie oznaczony jako fallback wykresu.

### 4. Real Markets UI
Modal Real Markets pokazuje teraz:
- PASS459 Keyed Provider Truth,
- stan klucza i providera,
- użyte funkcje endpointu,
- dowody: exchange, timestamp, market cap, filing cadence, bid/ask lub boundary kontraktu,
- provider plan, gdy główne źródło nie odpowie.

### 5. Shield AI Provider Truth
`buildShieldChatResponse` zwraca teraz:
- `sourceContract`,
- `providerPlan`,
- `providerFacts`.

Bot nie opiera odpowiedzi tylko na ogólnym `dataQuality`. Pokazuje faktyczne źródła, wygenerowany timestamp, dług dowodowy oraz brakujący następny adapter. UI ma nowy panel `data-pass459-shield-provider-truth`.

### 6. PDF Provider Truth
Dodano `lib/market-integrity/pass459-provider-truth-pdf-runtime.ts`.

Raport Lens dostał `pass459` z:
- source contract,
- truth state,
- ceną, market cap/proxy, wolumenem i timestampem wraz ze źródłem,
- planem uzupełnienia danych,
- granicą dozwolonego wniosku.

Druga strona PDF zawiera ten sam kontrakt źródłowy co preview i Shield AI. Preview i download nadal korzystają z jednego raportu.

### 7. Tłumaczenia
Nowa powierzchnia Shield AI ma etykiety PL/DE/EN. Treść provider truth PDF jest generowana według locale raportu.

## Konfiguracja produkcyjna
Na Vercel/local env należy dodać:

```text
ALPHA_VANTAGE_API_KEY=<sekretny klucz serwerowy>
```

Klucz nie jest zwracany do klienta ani zapisywany w PDF.

## Walidacja
Przeszło:
- `npm run check:i18n`
- PASS453–PASS459 regression gates
- `npm run vercel:preflight`
- pełny parser syntax sweep: 770 TS/TSX
- statyczna kontrola braku ekspozycji API key

## Nie uruchomiono
Pełny `next build` nie został uruchomiony, ponieważ paczka robocza nie zawiera `node_modules`. Ostatnia bramka lokalna pozostaje: `npm install` / istniejące zależności → `npm run build`.
