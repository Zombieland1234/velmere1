# PASS16 — plan dojścia do 2 700 source-bound outputów bez marnowania czasu

## Niezmienna granica

Wygląd strony jest zamrożony. Ta faza dotyczy danych, logiki, bezpieczeństwa, wartości tierów, treści, PDF i dowodów. Zmiany w chronionych plikach wizualnych są zabronione bez osobnego zatwierdzenia.

## Faza 1 — adaptery powierzchni, bez ciężkich buildów

Pracować całymi domenami:

1. Shield — canonical fact packet, źródła, freshness, liquidity, on-chain, risk, tier value.
2. Real Markets — identity, venue/session, provider quorum, official disclosure, license, risk.
3. Smart-contract audit — source/bytecode/compiler, finding evidence, false-positive controls, severity, reviewer authority.
4. Lens/PDF — jeden canonical payload, preview/download/account parity, page manifest, source manifest.
5. VLM Brain — claim/source binding, epistemic decision, prompt-injection controls, confidence and refusal.
6. Angel — odpowiedź w PL/EN/DE, evidence/missing proof, safe remediation, policy decision.

Po każdej całej domenie uruchomić tylko:

```bash
npm run gate:domain -- --domain product
```

Nie uruchamiać pełnego lint/test/build po każdej poprawce.

## Faza 2 — kompletność i wartość tierów

Każdy przypadek musi mieć materialnie różne wyniki:

- Basic: ograniczony, uczciwy obraz sytuacji i jawne braki;
- Pro: minimum dwie niezależne rodziny źródeł, tabela dowodów, freshness, prawa komercyjne i dodatkowa analiza;
- Advanced: wszystko z Pro, contradiction analysis, provenance receipt, głębsze confidence basis; audyt kontraktu wymaga zatwierdzonego human review.

Paid output ma być zablokowany, jeśli brakuje źródeł, freshness, licencji, entitlement lub wymaganej authority.

## Faza 3 — jeden milestone

Dopiero po zamrożeniu kodu sześciu adapterów i danych:

```bash
npm run gate:milestone -- --allow-heavy
```

Wymagane: exact Node 24.18.0, npm 11.16.0, kompletne zależności, TypeScript 0, lint 0/0 i testy RC=0.

## Faza 4 — jeden dual build

Po milestone PASS:

```bash
npm run build:webpack
npm run build:turbopack
```

Nie powtarzać niezmienionego builda. Najpierw diagnozować konkretny błąd lub timeout.

## Faza 5 — browser, WCAG i PDF

Po build RC=0 uruchomić jeden production server i macierz:

- desktop, tablet, mobile, WebKit/iPhone;
- PL/EN/DE;
- console/hydration/network errors = 0;
- keyboard/focus/axe serious+critical = 0;
- preview/download/account-copy parity;
- paid entitlement positive i negative flows.

## Faza 6 — 2 700 outputów

1. Wygenerować wszystkie wiersze z `worldclass-2700-matrix.jsonl`.
2. Każdy output związać z source SHA, corpus SHA i matrixId.
3. Ocenić scorerem PASS16.
4. Nieudane przypadki podzielić według kodu błędu.
5. Po poprawkach uruchamiać tylko failed/high-risk slices.
6. Na finalnym SHA wykonać jeden ponowny pełny przebieg 2 700.

Warunek OFFLINE world-class dla produktu: 2 700/2 700 wykonanych, każde odstępstwo jawnie sklasyfikowane, zero otwartych P0 i brak nieuprawnionego paid release.

## Faza 7 — staging i LIVE na końcu

Staging:

- Supabase/RLS multi-user;
- Stripe sandbox i webhook races;
- realni providerzy i licencje;
- KMS/WebAuthn;
- backup/restore/rollback;
- provider outage i rate limits.

LIVE:

- mała kontrolowana kohorta;
- SLO, latency, freshness;
- realne false positives/false negatives;
- reviewer i PDF delivery SLA;
- zewnętrzny pentest, AI red-team i smart-contract review.

Offline fixtures nigdy nie zwiększają procentu LIVE.
