# Velmère PASS607–611 — PDF Source Parity Release

## Cel wydania

PASS607–611 przenosi reguły audytowalnego VLM Brain do Velmère Browser, Reader i pobieranego PDF. Mocny claim nie może już pozostać oznaczony jako potwierdzony bez połączonego źródła, jawnego czasu obserwacji, stanu świeżości oraz źródłowego limitu pewności. Reader i eksport korzystają z jednego manifestu treści, a brakujące źródła są przedstawiane jako konkretne zadania kontrolne zamiast pustych lub generycznych sekcji.

## PASS607 — Claim-source completeness gate

- Dodany wspólny manifest źródeł i claimów z trwałymi identyfikatorami `S*` i `C*`.
- Status claimu jest wyliczany jako `confirmed`, `bounded`, `blocked` albo `not_applicable`.
- Brak źródła, brak timestampu, stary snapshot lub `source_required` automatycznie obniża status claimu.
- Freshness nie korzysta z czasu wygenerowania raportu jako zastępczego dowodu. Czas request-time jest akceptowany wyłącznie, gdy provider jawnie oznacza dane jako live/current i istnieje rzeczywisty `marketSnapshot.observedAt`.
- Końcowy confidence cap jest ograniczony przez najsłabszy powiązany claim/źródło.

## PASS608 — Missing-source appendix

- Braki danych zostały przekształcone w deduplikowany aneks działań.
- Każdy wpis zawiera przyczynę, wpływ `medium/high`, karę pewności, powiązane claimy oraz jeden konkretny następny krok.
- Limit wpisów zależy od poziomu Basic/Pro/Advanced, dzięki czemu dokument nie przepełnia A4.
- Copy jest dostępne w PL, DE i EN.

## PASS609 — Dynamic A4 density balancing

- Dodany lokalizacyjny estymator długości dla PL/DE/EN.
- Dokument składa się z czterech formalnych stron: decyzja, dowody, analiza i granice.
- Całe bloki są przenoszone między stronami zamiast ściskania lub nakładania treści.
- `widowOrphanMinimum` wynosi 2, a stan składu rozróżnia `placed`, `moved`, `compacted` i `blocked`.
- Reader i CSS respektują `break-inside: avoid`, ograniczenia tabel/kart oraz bezpieczne marginesy telefonu.

## PASS610 — Reader/download parity manifest

- Reader i PDF współdzielą locale, depth, page count, page IDs, kolejność sekcji, source IDs, claim IDs i appendix IDs.
- Manifest jest podpisany stabilnym kluczem `VLM-RD-*`.
- Endpoint PDF ponownie wylicza manifest i zwraca `409 reader_download_manifest_mismatch`, gdy payload został zmieniony lub rozjechany.
- PDF blob pozostaje kanonicznym wyglądem dokumentu, a Reader jest semantycznym reflow tej samej treści.
- Header publiczny został uproszczony do informacji ważnych dla człowieka: zakres, strony, stan claimów i liczba luk.

## PASS611 — PDF accessibility phase 2

- Reader otrzymał logiczny outline nagłówków, opisowe przejścia claim → źródło → timestamp i alternatywny opis wykresu.
- PDF zawiera `/MarkInfo`, `/StructTreeRoot`, strukturę `Document → Sect`, `StructParents`, ParentTree oraz marked content z MCID.
- Linki między claimami i źródłami zachowują opis celu.
- Dokument jawnie nie deklaruje zgodności PDF/UA (`pdfUaClaim: false` i `x-velmere-pdfua-claim: false`), ponieważ pełna walidacja PDF/UA wymaga dedykowanego narzędzia zgodności i szerszego tagowania elementów.

## Zmienione powierzchnie

- `lib/market-integrity/pass607-claim-source-completeness-gate.ts`
- `lib/market-integrity/pass608-missing-source-appendix.ts`
- `lib/market-integrity/pass609-dynamic-a4-density-balancing.ts`
- `lib/market-integrity/pass610-reader-download-parity-manifest.ts`
- `lib/market-integrity/pass611-pdf-accessibility-phase-2.ts`
- `lib/search/lens-report.ts`
- `app/api/search/lens-report/route.ts`
- `components/search/VelmereIntelligenceSearchClient.tsx`
- `app/globals.css`
- `scripts/verify-pass607-611-pdf-source-parity-release.mjs`
- `tsconfig.pass611.json`
- `package.json`

## Walidacja

- PASS592–596 verifier: PASS
- PASS597–601 verifier: PASS
- PASS602–606 verifier: PASS
- PASS607–611 verifier: PASS
- Strict TypeScript nowych modułów PASS607–611: PASS
- i18n PL/DE/EN: PASS
- Vercel preflight: PASS — 887 plików
- Parser całego projektu: 894 pliki TS/TSX, 0 błędów składni
- Integralność paczki i SHA-256: wykonywane przy kapsule release

## Uczciwa granica walidacji

Pełny `next build` oraz ESLint nie są deklarowane jako wykonane. Paczka źródłowa nie zawiera `node_modules`, polecenie `next lint` zatrzymało się na braku binarki `next`, a projekt wymaga Node.js 20.x przy środowisku roboczym Node.js 22.16.0. Starsze szerokie targety typecheck również zatrzymują się na brakujących typach React/Next/Node/Zod, nie na błędach składni PASS607–611. Pięć nowych czystych kontraktów przeszło ścisły `tsc`.
