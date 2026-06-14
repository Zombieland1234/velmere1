# PASS470 — Browser Runtime QA, Keyboard Flow and Receipt History

## Cel
PASS470 kontynuuje obszar Browser/PDF/Shield/Orbit po PASS469. Priorytetem nie była kosmetyka, tylko odporność runtime: puste payloady, keyboard-only QA, historia receiptów PDF, zachowanie modala, brak kolizji natywnych konstruktorów JavaScript oraz dalsze pilnowanie PDF A4.

## Wdrożone zmiany

### 1. Runtime guard dla wyników Browsera
- Dodano `lib/market-integrity/pass470-browser-runtime-qa.ts`.
- Nowa funkcja `buildPass470RuntimeGuard` normalizuje puste albo częściowe wyniki.
- Brakujące `sources`, `chips`, `missingData`, `sourceConfidence`, `symbol` lub `resultId` nie powinny wywracać UI.
- Wynik z zerową liczbą źródeł dostaje jawne `source_required`, a nie surowe `unknown`.

### 2. Keyboard-only QA
- Dodano `auditPass470KeyboardFlow`.
- Browser deklaruje i weryfikuje kolejność: search combobox → Basic/Pro/Advanced → reader/PDF toggle → download → close.
- Przyciski poziomu PDF wymagają aktywacji Enter oraz Space.
- Close preview ma Escape-boundary.
- Toolbar preview ma marker `data-pass470-keyboard-toolbar`.

### 3. Historia receiptów PDF
- PASS469 tworzył receipt pojedynczego pobrania; PASS470 dodaje redacted history.
- `buildPass470ReceiptHistory` sortuje wpisy od najnowszego, trzyma checksum i nie ujawnia surowego payloadu raportu.
- UI pokazuje lokalną historię PDF w podglądzie: symbol, depth i source confidence.
- Receipt history jest wyświetlana tylko jako lokalne potwierdzenie rozpoczęcia pobierania, nie jako dowód zapisania pliku przez system operacyjny.

### 4. UI Browser / PDF
- `components/search/VelmereIntelligenceSearchClient.tsx` używa runtime guardów dla każdego wyniku.
- Preview ma dodatkowe markery keyboard-trap i A4 reader-safe.
- PDF toolbar zachowuje responsywność z PASS469 i ma dodatkowe atrybuty QA.
- Tłumaczenia PL/DE/EN zostały rozszerzone o keyboard QA oraz historię PDF.

### 5. Ochrona przed kolizjami runtime
- Verifier PASS470 wykrywa importy ikon z `lucide-react`, które mogłyby nadpisać natywne konstruktory JavaScript typu `Map`, `Set`, `URL`, `Date`, `Promise`, `Symbol`.
- To chroni przed regresją błędu `Map is not a constructor`.

## Zmienione / dodane pliki
- `lib/market-integrity/pass470-browser-runtime-qa.ts`
- `scripts/verify-pass470-browser-runtime-qa.mjs`
- `components/search/VelmereIntelligenceSearchClient.tsx`
- `package.json`

## Walidacja wykonana
- `npm run verify:pass453-unified-intelligence-handoff`
- `npm run verify:pass454-evidence-dense-human-analysis`
- `npm run verify:pass455-human-decision-pdf-forge`
- `npm run verify:pass456-asset-aware-pdf-realmarkets`
- `npm run verify:pass457-shield-ai-progressive-disclosure`
- `npm run verify:pass458-provider-truth-router`
- `npm run verify:pass459-keyed-provider-pdf-ai`
- `npm run verify:pass460-provider-consensus-cache`
- `npm run verify:pass461-live-venue-health-orbit`
- `npm run verify:pass462-cross-venue-fundamentals`
- `npm run verify:pass463-canonical-pair-coverage`
- `npm run verify:pass464-fundamental-quality`
- `npm run verify:pass465-sec-xbrl-pdf-hotfix`
- `npm run verify:pass466-browser-market-pdf-waterfall`
- `npm run verify:pass467-result-priority-runtime`
- `npm run verify:pass468-browser-shield-orbit-handoff`
- `npm run verify:pass469-pdf-a4-download-receipt`
- `npm run verify:pass470-browser-runtime-qa`
- `npm run check:i18n`
- `npm run vercel:preflight`
- pełny syntax sweep: 778 TS/TSX parsed

## Nieuruchomione bramki
- Pełny `next build` nie został uruchomiony, ponieważ paczka nie zawiera lokalnego `node_modules`.
- Test Chromium/Playwright pozostaje do odpalenia w środowisku z przeglądarką.
- Live provider tests wymagają prawdziwych sekretów i działającego DNS/API.

## Następny pass
PASS471: pełny Playwright/Chromium scenario, historia receiptów jako osobny drawer, scroll/focus visual QA, oraz crash sweep Real Markets / Shield / Orbit na niepełnych provider payloadach.
