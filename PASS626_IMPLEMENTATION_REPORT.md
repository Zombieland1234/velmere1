# PASS622–626 — AI Source Intelligence Release

## Cel

Zamknąć lukę między źródłem, claimem, timestampem, konfliktem providerów i następnym działaniem człowieka. Publiczny AI/PDF nie może mieszać bieżących faktów, starych obserwacji, hipotez i braków w jeden przekonujący akapit.

## PASS622 — centralny source registry

Dodano `pass622-source-registry.ts`:

- kanoniczne definicje providerów i wewnętrznych tras,
- klasy aktywów, TTL, timeout, retry, rate limit, cache i backup provider,
- kontrolę duplikatów, zerwanych backupów i cykli failover,
- publiczną, zredagowaną wersję registry bez wartości sekretów, prywatnych promptów i ukrytych wag,
- dynamiczne źródła odkryte podczas budowania raportu Lens.

Publiczny Reader widzi label, stan konfiguracji, TTL i backup. Nie otrzymuje wartości API key ani prywatnych instrukcji.

## PASS623 — atomowe claimy

Dodano `pass623-atomic-claim-decomposition.ts`:

- jeden claim = jedna wypowiedź,
- trwałe `atomId` i `immutableKey`,
- jawne `fact / hypothesis / boundary / not_applicable`,
- source IDs, timestamp, blockers i confidence cap,
- manifest wykrywający kolizje ID.

Fakt, hipoteza, ograniczenie i następny krok nie są już składane do jednego mieszanego akapitu.

## PASS624 — contradiction engine

Dodano `pass624-provider-contradiction-engine.ts`:

- deterministyczne porównanie ceny, procentów, fundamentals, filingów, timestampów i tekstu,
- progi zależne od klasy aktywa,
- stany `aligned / watch / contradiction / insufficient`,
- jawny display anchor według świeżości i confidence,
- konflikt pozostaje widoczny i obniża confidence cap — wybór świeższego źródła go nie usuwa.

## PASS625 — freshness-aware synthesis

Dodano `pass625-freshness-aware-synthesis.ts`:

- osobne budżety świeżości dla crypto/venue, FX, equities, ETF/commodities, REIT/real estate, filingów i dokumentów,
- rozdzielenie `current`, `last_known`, `unverified_current`,
- stare dane nie zwiększają pewności bieżącego werdyktu,
- konflikt providerów i brak timestampu zawsze obniżają syntezę,
- podsumowania PL/DE/EN zgodne z rzeczywistymi bucketami.

## PASS626 — human next-check planner

Dodano `pass626-human-next-check-planner.ts`:

- jeden konkretny krok dla każdej luki,
- priorytet według wpływu, kosztu i dostępności providera,
- provider route i kryterium zakończenia zadania,
- obsługa luk źródłowych, konfliktów providerów oraz danych last-known/unverified,
- twardy gate przeciw generycznemu „sprawdź więcej danych”.

## Integracja Lens / Reader / PDF

Zmodyfikowano wspólny model raportu:

- `LensReport` niesie PASS622–626 w tym samym payloadzie co Reader i PDF,
- raport buduje registry z kanonicznych i faktycznie odkrytych źródeł,
- provider comparison używa danych primary/secondary, gdy są dostępne,
- dynamiczny A4 uwzględnia registry, freshness synthesis i plan kontroli,
- PDF pokazuje registry, atomowe claimy, konflikt, freshness i pierwsze działanie,
- response headers przenoszą stany PASS622–626,
- `isLensReport` odrzuca payload bez nowych kontraktów.

## Integracja UI

Reader dostał jeden spokojny panel „Bieżący stan i następna kontrola”:

- liczba bieżących i last-known faktów,
- publiczny stan providerów z TTL i backupem,
- stan konfliktu,
- najwyżej priorytetyzowane kroki kontroli,
- bez technicznego HUD-u, prywatnych sekretów i operatorowej diagnostyki.

Header modala niesie nowe state markers, ale publiczny opis pozostaje krótki: freshness state i confidence cap.

## Regresje zabezpieczone

- brak source/timestamp nie może stać się bieżącym faktem,
- stary fakt nie może podbić aktualnej pewności,
- konflikt providerów nie znika po wyborze świeższego feedu,
- jeden akapit nie miesza faktów i hipotez,
- publiczny registry nie ujawnia sekretów,
- planner nie tworzy generycznych zadań,
- Reader i PDF korzystają z tego samego report payloadu.

## Walidacja

- PASS592–596: PASS
- PASS597–601: PASS
- PASS602–606: PASS
- PASS607–611: PASS
- PASS612–616: PASS
- PASS617–621: PASS
- PASS622–626: PASS
- strict TypeScript nowych kontraktów: PASS
- runtime integration `buildLensReport`: PASS
- i18n PL/DE/EN: PASS
- Vercel preflight: PASS — 902 pliki
- parser TS/TSX: PASS — 909 plików, 0 błędów składni
- CSS structural parser: PASS

Pełnego `next build`, semantycznego typechecku całego repo i ESLint nie deklarujemy. Release nie zawiera `node_modules`; `next lint` zatrzymał się na `next: not found`. Projekt deklaruje Node.js 20.x, a środowisko walidacyjne działa na Node.js 22.16.0.
