# PASS632–636 — Security Runtime Release

## Cel

Zamienić rozproszone zabezpieczenia Velmère w jeden produkcyjny runtime obejmujący Browser/PDF, Shield Analyze, Security Export, trwałe logi oraz granicę portfela. Awaria, limit, brak źródła lub próba eksportu sekretu nie mogą zostać ukryte za ładnym komunikatem ani wynikiem wyglądającym jak live.

## PASS632 — production rate-limit adapter

Dodano `lib/security/pass632-production-rate-limit-adapter.ts` i przebudowano durable limiter:

- boundary key składa się z zahashowanych wymiarów route/provider/user/client,
- surowy adres IP i identyfikator użytkownika nie trafiają do trwałego klucza,
- okno jest stałe i ma własny identyfikator czasu zamiast przesuwnego TTL,
- `Retry-After` i `x-ratelimit-*` wynikają z jednego kontraktu,
- awaria Upstash uruchamia cooldown z deterministycznym jitterem,
- po cooldownie tylko jeden recovery probe może sprawdzić provider,
- pozostali klienci nie tworzą thundering herd,
- tryb pamięciowy/degraded jest jawny w meta i nagłówkach.

Integracja obejmuje `api-abuse-shield`, Shield Analyze oraz Lens PDF export.

## PASS633 — audit event schema

Dodano `lib/security/pass633-audit-event-schema.ts`:

- wersjonowany łańcuch `request → provider → claim → decision → export`,
- wspólny trace ID i receipt ID,
- źródła, timestampy, source state, confidence cap i outcome,
- prywatny prompt nie jest przechowywany; zachowywany jest wyłącznie lekki digest schematu,
- publiczny receipt nie zawiera actor fingerprint, surowego promptu ani sekretów,
- pamięciowy ledger działa jako kontrolowany fallback,
- durable append do Upstash ma timeout i cooldown zamiast nieskończonej pętli.

Shield Analyze zapisuje provider/decision trace. Lens PDF zapisuje rzeczywiste źródła i atomowe claimy użyte w eksporcie. Security Export dołącza publiczny snapshot audytu.

## PASS634 — consent and wallet boundary

Dodano `lib/security/pass634-wallet-consent-boundary.ts` i podpięto kontrakt do `WalletConnectOptions`:

- read-only connect jest jawnie oddzielony od podpisu i transakcji,
- UI pokazuje: brak podpisu, brak transakcji, brak approval,
- każda akcja podpisu ma chain, action, contract/value/spender i expiry/nonce, jeśli dotyczy,
- seed phrase i private key są zawsze niedozwolone,
- unlimited approval bez jawnego limitu jest blokowany,
- typed data wymaga domeny, nonce i deadline,
- publiczny copy jest dostępny w PL/DE/EN.

## PASS635 — centralized export redaction

Dodano `lib/security/pass635-export-redaction-policy.ts`:

- jedna polityka dla PDF, Reader, logs, receipts i security export,
- sekrety, hasła, prywatne klucze, mnemonic/seed, API keys, authorization, cookies, raw prompts, hidden weights, surowe IP i tokeny są usuwane,
- email, wallet, actor/user/session IDs i client fingerprints są maskowane,
- każda redakcja ma deterministyczny receipt,
- leak detector działa przed serializacją i po wygenerowaniu PDF,
- polityka rozróżnia faktyczny sekret od bezpiecznego tekstu edukacyjnego,
- 64-znakowy checksum raportu nie jest fałszywie klasyfikowany jako private key bez odpowiedniego kontekstu.

Integracja obejmuje:

- `app/api/security/export/route.ts`,
- `app/api/search/lens-report/route.ts`,
- `lib/security/security-event-append-adapter.ts`.

Eksport jest blokowany, jeśli po redakcji nadal istnieje klasa wycieku. Trwałe logi przechodzą tę samą politykę przed wysłaniem do storage.

## PASS636 — provider failure drills

Dodano `lib/security/pass636-provider-failure-drills.ts` z siedmioma deterministycznymi scenariuszami:

1. offline,
2. timeout,
3. rate limit / 429,
4. malformed JSON,
5. bad timestamp,
6. partial payload,
7. storage failure.

Każdy scenariusz określa:

- dozwolony source state,
- confidence cap,
- retry policy,
- komunikat dla użytkownika,
- recovery path,
- zakaz potwierdzania aktualnego faktu.

Shield Analyze mapuje wyjątek na konkretny drill i nie zwraca sztucznego `live`. Security Export dołącza macierz drillów do audytowalnego pakietu.

## Integracja tras

### Shield Analyze

- prywatne boundary dimensions i provider-aware limiter,
- limiter headers także dla udanych odpowiedzi,
- jawny `degraded_live` tylko wtedy, gdy wynik ma realne źródła, ale warstwa trwałego limitera jest zdegradowana,
- timeout/429/offline/malformed payload zwracają source state, confidence cap i recovery path,
- audit receipt jest generowany zarówno dla sukcesu, jak i failure path.

### Lens PDF

- limit rozmiaru requestu,
- osobny fixed-window limiter eksportu,
- redakcja całego `LensReport` przed generowaniem,
- byte-level leak scan wygenerowanego PDF,
- audit export z providerami, źródłami i atomowymi claimami realnie użytymi w raporcie,
- odpowiedź zawiera redaction receipt, audit trace i limiter headers.

### Security Export

- centralna redakcja przed JSON/PDF serialization,
- blokada eksportu przy pozostałym wycieku,
- publiczny audit snapshot,
- provider failure drill matrix,
- redaction/audit receipts w payloadzie i nagłówkach,
- zachowana kompatybilność historycznych preflight markerów bez cofania polityki v2.

## Regresje zabezpieczone

- fixed-window key zmienia się dopiero po granicy okna,
- surowy IP/user ID nie występuje w durable boundary,
- `Retry-After` jest spójny z resetem,
- jitter/backoff jest deterministyczny i ograniczony,
- publiczny audit nie zawiera prywatnego promptu,
- wallet read-only nie wymaga podpisu, transakcji ani approval,
- unlimited approval jest blokowany,
- bezpieczny komunikat o seed phrase przechodzi,
- prawdziwy secret/API key/private key jest usuwany lub blokowany,
- zintegrowany realny `LensReport` przechodzi redaction gate bez fałszywego alarmu,
- każdy z siedmiu failure drills obniża source state i confidence,
- żadna awaria nie może potwierdzić bieżącego faktu.

## Walidacja

- PASS592–596: PASS
- PASS597–601: PASS
- PASS602–606: PASS
- PASS607–611: PASS
- PASS612–616: PASS
- PASS617–621: PASS
- PASS622–626: PASS
- PASS627–631: PASS
- PASS632–636: PASS
- strict TypeScript nowych kontraktów: PASS
- zintegrowany runtime `buildLensReport` + redaction: PASS
- i18n PL/DE/EN: PASS
- Vercel preflight: PASS — 915 plików
- parser TS/TSX: PASS — 922 pliki, 0 błędów składni
- CSS structural parser: PASS — 1 plik, 0 błędów

Pełnego `next build`, pełnego semantic typechecku i ESLint nie deklarujemy. Paczka nie zawiera `node_modules`; `next lint` zakończył się `next: not found`, a pełny `tsc --noEmit` nie może rozwiązać całego grafu React/Next/Zustand/Node/Tailwind/Playwright bez instalacji. Produkcyjny proof jest następnym pakietem PASS637–641 w czystym Node.js 20.x.
