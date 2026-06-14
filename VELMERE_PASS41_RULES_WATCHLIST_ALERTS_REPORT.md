# Velmère Pass 41 — Rules Engine + Watchlist + Risk Rising Guardrails

## Cel
Pass 41 dodaje drugą, deterministyczną warstwę bezpieczeństwa nad multi-agent AI. Agenci dalej oceniają tokeny, ale rules engine sprawdza konkretne guardraile: szybki wzrost ryzyka, krytyczny klaster, pump + luka płynności, volume/market-cap stress, data blindspot, kontrola kontraktu i watchlist movement.

## Nowe pliki
- `lib/market-integrity/rule-engine.ts`
- `app/api/market-integrity/rules/route.ts`
- `VELMERE_PASS41_RULES_WATCHLIST_ALERTS_REPORT.md`

## Zmienione pliki
- `components/market-integrity/MarketIntegrityClient.tsx`
- `app/api/market-integrity/sentinel/route.ts`
- `app/api/market-integrity/cron/route.ts`
- `app/api/market-integrity/report/route.ts`
- `app/[locale]/market-integrity/about/page.tsx`
- `messages/en.json`
- `messages/pl.json`
- `messages/de.json`
- `.env.example`

## Endpointy
### `/api/market-integrity/rules?pages=1&perPage=120&watchlist=BTC,SOL,OM`
Zwraca:
- `rules.summary`
- `rules.hits[]`
- `rowsScanned`
- `memory`

### `/api/market-integrity/sentinel?...`
Teraz zwraca też `rules`, żeby UI nie musiał robić drugiego sweepu i nie zabijał delty ryzyka kolejnym zapisem pamięci.

### `/api/market-integrity/cron?...`
Cron zapisuje teraz nie tylko risk ledger, ale też Sentinel alerts oraz rules snapshot.

### `/api/market-integrity/report?query=...`
Evidence report zawiera teraz `rules`, czyli deterministic guardrails dla pojedynczego aktywa.

## UI
Dodano:
- lokalną Watchlistę Shielda zapisywaną w `localStorage`,
- szybkie skanowanie kliknięciem symbolu,
- dodawanie aktualnego query do watchlisty,
- reset watchlisty,
- zakładka `Watchlist` korzysta już z lokalnej listy użytkownika, a nie ze statycznego hardcode,
- panel `Rules engine` z licznikami: hits / critical / rising / watch,
- top rule hits jako karty z next step.

## Bezpieczeństwo i uczciwość produktu
Rules engine nie oskarża projektów. To warstwa priorytetyzacji review: wskazuje, co człowiek powinien sprawdzić dalej. To ważne prawnie i produktowo, bo Shield pozostaje systemem wczesnego ostrzegania, nie narzędziem wydającym wyroki.

## Aktualny procent budowy
- UI / UX Shielda: około 80–84%
- Wykresy i terminal tokena: około 75–80%
- Silnik ryzyka / multi-agent / rules: około 70–74%
- Ledger + cron + alert inbox: około 62–68% przy memory fallback, więcej po Supabase
- Produkcja / SOC / alerty użytkownika / e2e: około 40–45%
- Poziom pełnego Chainalysis/Palantir: nadal około 12–18%, ale architektura zaczyna iść w profesjonalny case-management + evidence pipeline.

## Następny krok — Pass 42
Najbardziej logiczne: notification center + saved watchlists + alert thresholds + Supabase-backed user preferences. Potem dopiero: on-chain graph clustering, social NLP, mempool simulation i dokładniejszy audit kontraktów.

## Testy wykonane
- `node scripts/check-i18n.mjs` ✅
- `node scripts/vercel-preflight.mjs` ✅
- TS/TSX syntax smoke przez TypeScript transpileModule ✅

## Ograniczenia testów
`npm run typecheck` i `next build` nie były możliwe w sandboxie bez `node_modules`. `scripts/smoke-routes.mjs` wymaga działającego `localhost:3000`, więc bez uruchomionego `next dev` zwraca fetch failed.
