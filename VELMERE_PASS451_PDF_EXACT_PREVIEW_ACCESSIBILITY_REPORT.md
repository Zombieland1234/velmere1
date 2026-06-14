# VELMÈRE PASS451 — PDF Exact Preview & Accessible Modal

## Cel passa

PASS451 usuwa główną przyczynę rozjazdu między podglądem a pobranym raportem: podgląd 1:1 korzysta teraz z dokładnie tego samego binarnego pliku PDF, który użytkownik pobiera. Równolegle pozostaje opcjonalny widok czytelny, przeznaczony do szybkiego przeglądania danych Basic / Pro / Advanced.

## Zmiany produkcyjne

### Velmère Browser / Lens

- domyślny podgląd `PDF 1:1` renderuje ten sam Blob co przycisk pobierania;
- alternatywny widok czytelny porządkuje brief, market snapshot, źródła, luki i matrycę poziomów;
- animacja dużego `V` ma cztery jawne etapy, opis aktywnego kroku i rzeczywisty pasek postępu;
- odpowiedź PDF jest sprawdzana pod kątem `content-type` i minimalnego rozmiaru przed otwarciem;
- pobieranie nadal ma osobną ikonę `Download`.

### Modal i scroll

- pełny focus trap dla `Tab` / `Shift+Tab`;
- `Escape` zamyka podgląd;
- fokus po zamknięciu wraca do przycisku, który otworzył raport;
- scroll dokumentu bazowego pozostaje zablokowany;
- scroll działa wyłącznie wewnątrz PDF viewer albo widoku czytelnego;
- kliknięcie backdropu zamyka modal bez przechwytywania kliknięć z wnętrza raportu.

### PDF A4

- strona z Basic / Pro / Advanced nie skleja już pól w jeden długi akapit;
- każda warstwa ma osobny panel i krótkie wiersze `label / value / state`;
- techniczne komunikaty typu `Lineage guard` i `Regression judge` zostały zastąpione ludzkimi etykietami PL/DE/EN;
- odpowiedź ma nagłówki `nosniff`, `content-language`, checksum raportu i marker zgodności preview/download.

### Velmère Shield

- surowe wartości `unknown` i `partial` w aktywnych polach UI zostały zastąpione komunikatami `source required`, `partial source` oraz `baseline unavailable`;
- brak danych pozostaje widoczny, ale nie wygląda jak błąd generatora AI.

## Pliki

- `lib/market-integrity/pass451-pdf-exact-preview-runtime.ts`
- `lib/search/lens-report.ts`
- `components/search/VelmereIntelligenceSearchClient.tsx`
- `components/market-integrity/TokenRiskModal.tsx`
- `app/api/search/lens-report/route.ts`
- `scripts/verify-pass451-pdf-exact-preview.mjs`
- `package.json`

## Walidacja

- `npm run verify:pass451-pdf-exact-preview` ✅
- `npm run verify:pass450-tiered-human-analysis` ✅
- `npm run verify:pass449-catalog-darkmatter-guard` ✅
- `npm run verify:pass448-depth-report-pdf-realmarkets` ✅
- `npm run verify:pass447-pdf-preview-realmarkets-catalog` ✅
- `npm run check:i18n` ✅
- `npm run vercel:preflight` ✅

Pełny `next build` nie został uruchomiony w środowisku roboczym, ponieważ paczka nie zawiera `node_modules`.

## Szacowany progres

- UI / doświadczenie produktu: **78–82%**
- AI / real-data engine: **51–57%**
- odporność architektury: **33–39%**
- gotowość publicznej bety: **56–61%**

## Następny kierunek

PASS452 powinien połączyć te zmiany z testem przeglądarkowym całej ścieżki Lens oraz zrobić kolejny sweep danych Real Markets i adapterów Binance / MEXC / stocks, bez dodawania fikcyjnych wartości.
