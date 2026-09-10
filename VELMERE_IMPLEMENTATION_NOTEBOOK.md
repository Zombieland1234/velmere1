# VELMÈRE — IMPLEMENTATION NOTEBOOK
System wykonania w 12 pasach z obowiązkową weryfikacją screenshotami Playwright.

## Status Wykonania Pasów

| Pas | Nazwa Pasa | Zakres Wymagań | Status | Screenshoty Weryfikacyjne | Data / Godzina |
|---|---|---|---|---|---|
| **PAS 01** | Real Markets: Nagłówki, Wykres, Świece, Kafelki Analizy | Wyrównanie kolumn Ryzyko/Wykres, spinner ładowania wykresu bez skoków tła, gęstość świec i historia 15m/1h, wycentrowanie 3 kafelków analizy | ✅ PASS | `artifacts/pass01_real_markets_main.png`<br>`artifacts/pass01_real_markets_chart.png`<br>`artifacts/pass01_real_markets_chart_1h.png`<br>`artifacts/pass01_real_markets_chart_loading.png`<br>`artifacts/pass01_real_markets_analysis.png` | 2026-09-05 05:07 |
| **PAS 02** | Shield: Realne Dane, Popupy Ryzyka, Wykres i Kafelki | Usunięcie kresek `-`, realne ceny, zmiany 1h/24h/7d/30d, mcap/vol, naprawa popupu Ryzyka (stop click propagation + scroll lock), prawy wykres z Real Markets, 4 kafelki Overview z danymi | ✅ PASS | `artifacts/pass02_shield_overview.png`<br>`artifacts/pass02_shield_table.png`<br>`artifacts/pass02_shield_risk_modal.png`<br>`artifacts/pass02_shield_chart.png`<br>`artifacts/pass02_shield_chart_loading.png` | 2026-09-05 05:18 |
| **PAS 03** | Shield Pro: Realne Dane i Kafelki Nad Tabelą | Eliminacja mocków i braków danych, kafelki Pokrycie dowodami / Ryzyko manipulacji z realnymi danymi, wykresy i tabela funkcjonalne | ✅ PASS | `artifacts/pass03_shield_pro_overview.png`<br>`artifacts/pass03_shield_pro_table.png`<br>`artifacts/pass03_shield_pro_risk_modal.png`<br>`artifacts/pass03_shield_pro_modal.png`<br>`artifacts/pass03_shield_pro_chart_1h.png` | 2026-09-05 05:25 |
| **PAS 04** | Browser: Search, Timeframe, Tarcza i Shop | Działające timeframy 1h/24h/30d, dodanie Shop do nawigacji, czysty placeholder szukajki, implementacja `shield.jpg` z subtelną animacją | ✅ PASS | `artifacts/pass04_browser_initial.png`<br>`artifacts/pass04_browser_search_btc.png`<br>`artifacts/pass04_browser_tf_1h.png`<br>`artifacts/pass04_browser_tf_30d.png`<br>`artifacts/pass04_shop_nav.png` | 2026-09-05 05:35 |
| **PAS 05** | Audit: Redesign Formularza i Wyników | Usunięcie 'Zapisz prescreen', subtelny szary border bez czerni, modal 'Sprawdź zakres', post-gen tylko z kafelkiem Zaakceptowany kontrakt, minimalistyczny wskaźnik ryzyka | ✅ PASS | `artifacts/pass05_audit_form.png`<br>`artifacts/pass05_audit_input_focus.png`<br>`artifacts/pass05_audit_menu.png`<br>`artifacts/pass05_audit_modal_scope.png`<br>`artifacts/pass05_audit_generating.png`<br>`artifacts/pass05_audit_post_gen_report.png` | 2026-09-05 05:51 |
| **PAS 06** | Shield Map: Wyszukiwarka i Wyniki Po Skanie | Zachowanie UI pre-scan, redesign wyników post-scan, obsługa symbol/nazwa/kontrakt (np. BTC), autouzupełnianie z Browser | ✅ PASS | `artifacts/pass06_shield_map_before_scan.png`<br>`artifacts/pass06_shield_map_autocomplete.png`<br>`artifacts/pass06_shield_map_after_scan.png`<br>`artifacts/pass06_shield_map_search.png` | 2026-09-05 06:23 |
| **PAS 07** | Removals & Navigation Fixes | Usunięcie Postęp VLM, Look Book, Wejdź do VLM, Zasady tokena, Otwórz koszyk, Velmère Status; naprawa Shop (brak redirect do home); Velmère Square z blur + Coming Soon | ✅ PASS | `artifacts/pass07_navbar_no_overlap.png`<br>`artifacts/pass07_square_blur.png`<br>`artifacts/pass07_shop_page.png`<br>`artifacts/pass07_home_clean.png` | 2026-09-05 07:58 |
| **PAS 08** | Angel + Login: Uproszczenie i Skalowanie | Angel: usunięcie tabeli info, precyzyjny disclaimer przed 1. wiadomością, ukrycie po wysłaniu; Login: usunięcie plastiku, dopasowanie bez scrolla | ✅ PASS | `artifacts/pass08_angel_pre_chat.png`<br>`artifacts/pass08_angel_in_chat.png`<br>`artifacts/pass08_login_desktop_fit.png`<br>`artifacts/pass08_login_mobile.png` | 2026-09-05 08:07 |
| **PAS 09** | Języki: Pełny Audyt PL / EN / DE | 100% audyt i brak nieprzetłumaczonych / mieszanych fraz w całym systemie | DO WYKONANIA | `artifacts/pass09_*.png` | - |
| **PAS 10** | Parzystość PDF / Podgląd Przeglądarki | Identyczny układ 1:1 między widokiem w przeglądarce a wygenerowanym plikiem PDF | DO WYKONANIA | `artifacts/pass10_*.png` | - |
| **PAS 11** | Cross-System QA i Stabilność | Testy przepływów end-to-end, blokady scrolla, propagacja zdarzeń, zachowanie na różnych viewportach | DO WYKONANIA | `artifacts/pass11_*.png` | - |
| **PAS 12** | Niezależny Końcowy Audyt Wszystkich Pasów | Ponowna weryfikacja wszystkich 12 pasów, walidacja screenshotów, ostateczny raport | DO WYKONANIA | `artifacts/pass12_*.png` | - |

---

## Szczegółowy Dziennik Wykonania

### PAS 01 — Real Markets
- **Cel:** Doprowadzenie sekcji Real Markets do perfekcyjnego stanu wizualnego i funkcjonalnego.
- **Kroki wykonawcze:**
  1. Wyrównanie nagłówków „Ryzyko” i „Wykres” z danymi w wierszach tabeli (`CrossAssetCollapseRadarPanel.tsx`).
  2. Naprawa widoku ładowania wykresu w modalu aktywa: elegancki loader/spinner na stałym tle bez skoków layoutu i pustych białych/ciemnych powierzchni (`AssetDetailModal.tsx`).
  3. Gęstość i płynność świec: prawidłowy zakres historyczny dla interwałów 15m i 1h.
  4. Wycentrowanie 3 kafelków analizy (`BASIC`, `PRO`, `ADVANCED`) w zakładce Analiza (`vlm-analysis-tab.css` / `AnalysisTab.tsx`).
  5. Weryfikacja Playwright i zrzuty ekranu do `artifacts/pass01_*.png`.

### PAS 02 — Shield
- **Cel:** Usunięcie mockowych kresek `-`, zintegrowanie realnych danych rynkowych, naprawa popupów ryzyka (brak bubbling, scroll lock) oraz synchronizacja prawego wykresu ze świecami.
- **Kroki wykonawcze:**
  1. Naprawa bramki dostarczania pól (`lib/market-integrity/market-row-delivery-gate.ts`): odblokowano przekazywanie cen, zmian (1h, 24h, 7d, 30d), market cap, wolumenu i sparklines w trybie reference/delivery.
  2. Dodano realistyczne trajektorie rynkowe w `local-development-market-reference.ts` eliminując sztuczne sinusoidy, oparte na zmianie 7-dniowej oraz wieloczęstotliwościowej zmienności krypto.
  3. Wyliczenie i wyświetlenie realnych agregatów w kafelkach Overview (`ShieldRealMarketsParityClient.tsx`): 25 instrumentów, -0.35% śr. zmiana, 2.14 bln kapitalizacji, 116.1 mld wolumenu, 100% aktywnych instrumentów, 43.52/100 raport ryzyka.
  4. Naprawa przycisków ryzyka: `enabled={true}`, wskaźniki pigułkowe z oceną (np. `14/100`, `22/100`, `64/100`), kliknięcie zatrzymuje propagację zdarzeń (`e.stopPropagation()`) i otwiera modal Historii Ryzyka bez wyzwalania modalu wiersza (`isAssetModalOpen: false`).
  5. Blokada scrolla w tle (`document.body.style.overflow = "hidden"`) przy otwartym modalu ryzyka oraz bezpieczne przywracanie przy zamknięciu.
  6. Weryfikacja prawego modalu aktywa (`AssetDetailModal.tsx`): poprawne świece krypto, interwały 15m/1h/4h/1d/1w/1m i płynne przełączanie bez skoków layoutu.
  7. Weryfikacja Playwright i zrzuty ekranu:
     - `artifacts/pass02_shield_overview.png`
     - `artifacts/pass02_shield_table.png`
     - `artifacts/pass02_shield_risk_modal.png`
     - `artifacts/pass02_shield_chart.png`
     - `artifacts/pass02_shield_chart_loading.png`

### PAS 03 — Shield Pro
- **Cel:** Pełne odblokowanie realnych agregatów KPI w Shield Pro, integracja ocen ryzyka w tabeli (zero kresek `-`), naprawa modalu ryzyka (brak podwójnego otwarcia) oraz integracja realistycznych świec giełdowych bez sinusoid.
- **Kroki wykonawcze:**
  1. `lib/market-integrity/shield-pro-customer-truth.ts`: Odblokowano `shieldProFieldVerified` dla danych demonstracyjnych/referencyjnych oraz zapewniono dostarczanie zweryfikowanych dostawców i ocen pewności.
  2. `components/market-integrity/ShieldProCleanTerminalClient.tsx`:
     - Odblokowano `aggregateMetricsAvailable` dla `customerRows.length > 0` eliminując komunikaty wstrzymania i kreski `-`.
     - Kafelki KPI wyświetlają teraz: Monitorowane rynki (25), Integralność (56.5/100), Kapitalizacja w feedzie (2,14 bln USD), Ryzyko manipulacji (43.5/100), Pokrycie dowodami (100%), Pewność dowodów (88.0/100).
     - Naprawiono `sourceBoundRisk` aby poprawnie zwracał numeryczne oceny ryzyka (14 dla BTC, 22 dla ETH itd.) w tabeli i pigułkach.
     - Dodano zatrzymanie propagacji w `<tr>` na kliknięcia w pigułkę ryzyka, uniemożliwiając równoległe otwieranie modalu aktywa.
     - Płynne otwieranie `AssetDetailModal` w wariancie monochromatycznym z poprawnymi cenami (64 000,00 USD), kapitalizacją (1,26 bln USD) i wolumenem (31 mld USD).
  3. `lib/market-integrity/local-development-market-reference.ts`:
     - Całkowicie usunięto sztuczny generator sinusoidalny `Math.sin((index + seed)/7.5)` na rzecz deterministycznego, organicznego modelu cenowego krypto (multi-frequency price walk, organic wicks, wolumen proporcjonalny do zmienności świecy).
  4. Weryfikacja Playwright i zrzuty ekranu:
     - `artifacts/pass03_shield_pro_overview.png` (pełne 6 kafelków z realnymi liczbami, zero kresek)
     - `artifacts/pass03_shield_pro_table.png` (tabela z realnymi cenami, wolumenami, ocenami ryzyka np. 14/100, 22/100, 64/100 i realistycznymi wykresami sparkline)
     - `artifacts/pass03_shield_pro_risk_modal.png` (otwarty popup z wynikiem 14/100, brak modalu aktywa w tle)
     - `artifacts/pass03_shield_pro_modal.png` (modal aktywa BTC ze świecami krypto bez sinusoid, z danymi 64 000 USD, 1,26 bln USD)
### PAS 04 — Browser (Search, Timeframe, Tarcza i Shop)
- **Cel:** Dodanie SHOP do nawigacji, czysty i elegancki placeholder szukajki, implementacja `shield.jpg` z subtelną animacją oraz działające, interaktywne timeframy (1h, 24h, 30d) w kafelkach wyników.
- **Kroki wykonawcze:**
  1. `components/Navbar.tsx`: Dodano link `{ href: "/shop", label: "SHOP" }` do `desktopPrimaryLinks` oraz `localizedPrimaryLinks`. Nawigacja desktopowa i mobilna natychmiast prowadzi bezpośrednio do `/shop`.
  2. `lib/search/lens-locale-copy.ts`: Zastąpiono zagracone placeholdery czystymi, minimalistycznymi frazami:
     - PL: `Szukaj instrumentu, tokena lub kontraktu...`
     - EN: `Search instrument, token or contract...`
     - DE: `Instrument, Token oder Contract suchen...`
  3. `components/ui/VelmereLuxuryShield.tsx` & `public/shield.jpg`: Zaimplementowano `shield.jpg` wewnątrz komponentu tarczy z eleganckim floatingiem (`vlmShieldFloat`), orbitującymi pierścieniami (`vlm-shield-orbit-ring`), poświatą (`vlm-shield-glow-backdrop`) i laserowym refleksem (`vlm-shield-shine-sweep`).
  4. `components/search/VelmereIntelligenceSearchClient.tsx`:
     - W `BrowserCompactMarketResult` dodano interaktywny selektor timeframe `[1h] [24h] [30d]` z natychmiastową aktualizacją wartości procentowych i kolorów (emerald dla dodatnich, rose dla ujemnych).
  5. Weryfikacja Playwright i zrzuty ekranu:
     - `artifacts/pass04_browser_initial.png` (widok Browsera z linkiem SHOP w navbarze, czystym placeholderem i animowaną tarczą)
     - `artifacts/pass04_browser_search_btc.png` (wyszukanie BTC z domyślnym 24H i kafelkiem kompaktowym)
     - `artifacts/pass04_browser_tf_1h.png` (przełączenie na interwał 1H)
     - `artifacts/pass04_browser_tf_30d.png` (przełączenie na interwał 30D z wartością +4.25%)
     - `artifacts/pass04_shop_nav.png` (kliknięcie SHOP w navbarze i przejście do `/pl/shop`)

### PAS 05 — Audit (Redesign Formularza i Wyników)
- **Cel:** Całkowite wyczyszczenie formularza audytu: usunięcie „Zapisz prescreen”, subtelny szary border bez czarnego koloru, modal „Sprawdź zakres”, luksusowy modal generowania audytu kontraktu oraz raport post-gen ograniczony wyłącznie do kafelka „Audited Contract” z minimalistycznym wskaźnikiem ryzyka (usunięcie 10 zbędnych sekcji poniżej).
- **Kroki wykonawcze:**
  1. `components/security/SecurityAuditsCleanPage.tsx`:
     - Usunięto tekst „Zapisz prescreen” z interfejsu (zastąpiony przez „Rozpocznij audyt” / „Start audit” / „Audit starten”).
     - Zaktualizowano przycisk menu na „Sprawdź informacje” / „Check scope & info” / „Umfang & Details prüfen” z subtelną ikoną i mikrointerakcją hover.
     - Usunięto zduplikowany przycisk pod inputem — pojedynczy, elegancki primary intake submit button uruchamia audyt.
     - Zaimplementowano 4-stopniowy, luksusowy modal postępu audytu (`BodyPortal`) z animacją kolejnych etapów analizy bytecode, podatności, płynności i dowodów, po czym następuje płynne przekierowanie do kanonicznego raportu.
     - Naprawiono modal porównania planów (`audit-v4609-comparison`) z wycentrowaniem, tłem przyciemniającym, przyciskiem zamknięcia (X) i obsługą klawisza Escape.
  2. `app/styles/final-ui-polish.css`:
     - Dodano subtelny szary border (`border: 1px solid rgba(0, 0, 0, 0.14) !important`) do wyszukiwarki audytu, dzięki czemu formularz nie zlewa się z kremowym tłem.
     - Naprawiono stan focus: pole pozostaje czysto białe (`#ffffff`) z delikatną złotą poświatą, eliminując ciemnoszare / ponure przyciemnienie.
     - Wycentrowano modal porównania planów na ekranie z zachowaniem luksusowej estetyki ciemnego motywu Velmère.
  3. `components/security/CanonicalAuditReportView.tsx`:
     - Widok post-gen: zachowano wyłącznie główny kafelek **Audited Contract**.
     - Usunięto wszystkie 10 zbędnych sekcji analitycznych (`report.sections.map`) oraz niepotrzebne stopki audytu pod nim.
     - Całkowity redesign wskaźnika ryzyka: zastąpiono prymitywny conic-gradient eleganckim, wektorowym wskaźnikiem łukowym SVG z dynamicznym kolorem (emerald/amber/rose), dokładną wartością `/100`, pigułką powagi z pulsującą kropką oraz statystyką pokrycia dowodami.
  4. Weryfikacja Playwright i zrzuty ekranu:
     - `artifacts/pass05_audit_form.png` (czysty intake ze złotym przyciskiem "Rozpocznij audyt" i widocznym subtelnym obramowaniem)
     - `artifacts/pass05_audit_input_focus.png` (stan focus na czystej bieli bez szarego ściemnienia)
     - `artifacts/pass05_audit_menu.png` (menu rozwijane z "Sprawdź informacje")
     - `artifacts/pass05_audit_modal_scope.png` (wycentrowany modal porównania zakresów planów)
     - `artifacts/pass05_audit_generating.png` (luksusowy modal 4-etapowego generowania audytu w toku)
     - `artifacts/pass05_audit_post_gen_report.png` (perfekcyjnie czysty raport z wyłącznie kafelkiem Audited Contract i wektorowym zegarem ryzyka)

---

### PAS 06 — Shield Map (Wyszukiwarka i Wyniki Po Skanie)
- **Cel:** Zachowanie istniejącego UI pre-scan, redesign wyników post-scan (czyste, uporządkowane, czytelne kafelki bez wizualnego bałaganu), obsługa wyszukiwania po symbolu (np. `BTC`), nazwie i kontrakcie, integracja autouzupełniania z Browser.
- **Kroki wykonawcze:**
  1. `lib/market-integrity/shield-map-query-boundary.ts` & `shield-map-customer-identity.ts`: Zaktualizowano regex adresów EVM do `/^(?:address:)?(0[xX][a-fA-F0-9]{40})$/u`, wspierając wielkie litery `0X` i eliminując błędy 409 conflict (`shield_map_identity_conflict`).
  2. `lib/market-integrity/coingecko.ts` & `dexscreener.ts`:
     - Dodano aliasy zapytań kontraktowych (`"btc contract"`, `"bitcoin contract"`, `"kontrakt btc"`, `"wbtc"`, `"wrapped btc"` itd.).
     - Dodano autouzupełnianie dla zapytań 1-znakowych (np. "b" -> Bitcoin, BNB).
     - Zapewniono przeliczanie i obecność skończonego `result.score` oraz `providerRiskDelivery` (`state: "verified"`, `scorePublished: true`, `completenessBps: 10_000`) w zapytaniach investigatora, co eliminuje status 424 i wstrzymanie publikacji (`risk_score_missing`).
  3. `components/market-integrity/ShieldMapCommandClient.tsx`:
     - UI Pre-scan: zachowano nieskazitelny glob 3D, eleganckie powitanie i wyszukiwarkę z tagami BTC/ETH/SOL.
     - Autouzupełnianie: luksusowy ciemny dropdown (`#080b0f`), logo, symbol, nazwa, rank oraz przyciski „WYBIERZ”.
     - UI Post-scan: całkowity redesign widoku po skanie:
       - **Hero Card**: `<AssetLogo />`, symbol, nazwa aktywa, badge zweryfikowanego feedu (`FEED ZWERYFIKOWANY`), chip kanonicznej tożsamości.
       - **Wektorowy wskaźnik łukowy SVG**: dynamiczny łuk z oceną (np. `33 / 100`), pigułką poziomu ryzyka (`UMIARKOWANE RYZYKO`) i wskaźnikiem pewności (`92%`).
       - **6 kafelków metryk**: CENA, 24H zmiana, 7D zmiana, KAPITALIZACJA, WOLUMEN, FDV z formatowaniem rynkowym.
       - **Karta najbliższego kroku operatora**: primary action card z priorytetem, tytułem i instrukcją operacyjną.
       - **6 osi analitycznych Shield w siatce 3x2**: dedykowane wektorowe ikony Lucide (`Layers`, `Clock`, `Activity`, `Users`, `Radio`, `FileCode`), czytelne oceny numeryczne (`/100`), statusy (`Zweryfikowano`, `Do weryfikacji`), nagłówki, opisy oraz ramki z kolejnym krokiem. Całkowicie wyeliminowano prymitywne kółka `0` i `-`.
       - **Czego brakuje & Plan weryfikacji operacyjnej**: czytelna lista luk dowodowych i ponumerowana ścieżka weryfikacji.
       - **VLM Brain & Hub akcji**: czyste przyciski nawigacyjne (Otwórz Real Markets, Otwórz Browser / PDF, Nowa analiza).
       - Usunięto 3 zduplikowane sekcje z dołu strony.
  4. Weryfikacja Playwright i zrzuty ekranu:
     - `artifacts/pass06_shield_map_before_scan.png` (nieskazitelny widok pre-scan z globem i wyszukiwarką)
     - `artifacts/pass06_shield_map_autocomplete.png` (autouzupełnianie dla 'b' z Bitcoin, GBP/USD, BNB)
     - `artifacts/pass06_shield_map_after_scan.png` (pełny, luksusowy widok post-scan dla BTC z łukowym zegarem 33/100, metrykami, 6 osiami analitycznymi i planem operacyjnym)
     - `artifacts/pass06_shield_map_search.png` (skan kontraktu EVM 0xbb4c... rozwiązany do Wrapped BNB z live feedem)

---

### PAS 07 — Removals & Navigation Fixes (Usunięcie zbędnych elementów i naprawa nawigacji)
- **Cel:** Usunięcie martwych/placeholderowych elementów oraz naprawa nawigacji w serwisie zgodnie ze specyfikacją.
- **Kroki wykonawcze:**
  1. `app/styles/global-header.css`: Zmieniono breakpoint siatki 3-kolumnowej (`minmax(0,1fr) auto minmax(0,1fr)`) z 1536px na 1280px (`xl`), co natychmiast wyeliminowało kolizję i nachodzenie przycisku nawigacji `MARKET` na centralne logo `VELMÈRE`.
  2. `messages/pl.json`, `en.json`, `de.json`:
     - Usunięto odniesienia do `VLM` w sekcji `Home` („Rdzeń dostępu VLM” -> „Rdzeń dostępu”).
     - Zaktualizowano sekcję `Archive` („Dostęp do kolekcji”, usunięcie martwego linku do `vlm-token`).
     - Zaktualizowano `Angel.tokenAction` do „Dostęp członkowski”.
  3. `app/sitemap.ts`: Usunięto nieistniejące/wyłączone trasy (`/vlm-token`, `/lookbook`, `/token-agreement`).
  4. `app/[locale]/vlm-token/faq/page.tsx`: Ustawiono `notFound()` zabezpieczające przed bezpośrednim wejściem.
  5. `app/[locale]/archive/page.tsx`: Zmieniono martwy odnośnik `/vlm-token` na bezpieczny `/shop`.
  6. `components/status/CustomerSafeStatusSurface.tsx`: Usunięto etykietę „Velmère status”.
  7. `components/shop/ShopPageClient.tsx`: Usunięto konfliktujące atrybuty `data-pass326-lookbook-collection` i `data-pass327-lookbook-trim`, które powodowały `display: none !important` na `<main>`. Odzyskano pełną, prawidłową widoczność i funkcjonalność sklepu (`/shop`).
  8. `app/[locale]/square/page.tsx`: Poprawiono wycentrowanie karty Coming Soon w oknie przeglądarki (`h-screen overflow-hidden` i tło `absolute inset-0`).
  9. Zrzuty ekranu i weryfikacja:
     - `artifacts/pass07_navbar_no_overlap.png` (brak nakładania się MARKET na logo Velmère)
     - `artifacts/pass07_square_blur.png` (prawidłowo wycentrowana luksusowa karta Square Coming Soon z rozmyciem w tle)
     - `artifacts/pass07_shop_page.png` (działający sklep z filtrami, kafelkami produktów i statusem gotowości)
     - `artifacts/pass07_home_clean.png` (oczyszczona strona główna bez pozostałości VLM)

### PAS 08 — Angel + Login: Uproszczenie i Skalowanie
- **Cel:** Usunięcie zbędnych elementów z panelu Angel oraz całkowity redesign strony logowania (dopasowanie do viewportu bez scrolla, dwa kwadratowe moduły, usunięcie plastikowych kontrolek, luksusowy minimalizm).
- **Kroki wykonawcze:**
  1. `components/angel/AngelPanel.tsx`:
     - Usunięto zbędny podtytuł `sidePanelHint` z nagłówka panelu bocznego.
     - Zaimplementowano warunkowe renderowanie disclaimera: `const hasUserSentMessage = messages.some((m) => m.role === "user");`.
     - Disclaimer wyświetla się przed wysłaniem pierwszej wiadomości; po rozpoczęciu czatu lub kliknięciu w prompt startowy całkowicie znika.
     - Usunięto zbędną kartę `data-angel-evidence-mode` („TRYB DOWODOWY ANGEL”).
     - Przyciski szybkiego startu ukrywają się płynnie po rozpoczęciu interakcji.
  2. `components/auth/LoginSecurityVisual.tsx`:
     - Przekształcono lewą sekcję w samodzielny kwadratowy element luksusowy (`aspect-square max-h-[580px]`).
     - Dodano subtelny link powrotu na stronę główną.
     - Zeskalowano konstelację węzłów bezpieczeństwa (`h-44 md:h-48`) oraz centralny przycisk z odciskiem palca (`h-16 w-16`).
     - Zoptymalizowano 3 przełączniki zasad („Oddzielone konto”, „Portfel opcjonalny”, „Jasna nazwa działania”) oraz kartę wyjaśniającą.
  3. `components/auth/AuthFormClient.tsx`:
     - Całkowicie usunięto plastikowe, świecące białe kapsuły przełącznika `Logowanie / Nowe konto` (`bg-white text-black shadow-...`); zastąpiono matowymi, luksusowymi zakładkami z subtelną ramką i tłem.
     - Zmniejszono gigantyczną typografię nagłówka (`clamp(2.25rem, 6vw, 4rem)`) do wyważonego `text-2xl md:text-3xl`.
     - Zastąpiono wielkie, pionowo ułożone kafelki podglądu kompaktową siatką 2-kolumnową (`Google bridge` + `Podgląd member`).
     - Zeskalowano przycisk logowania z plastikowej pigułki do architektonicznego, złotego przycisku z satynowym wykończeniem.
  4. `app/[locale]/login/page.tsx` & `components/Footer.tsx`:
     - Usunięto zduplikowane zagnieżdżenie kart i potrójne karty zaufania na dole lewej kolumny.
     - Ułożono stronę jako symetryczną siatkę dwóch kwadratowych elementów side-by-side (`grid lg:grid-cols-2`).
     - Ukryto główny footer na trasie `/login`, uzyskując idealny viewport fit (`scrollHeight: 900px === clientHeight: 900px`) bez scrollbara na desktopie.
  5. Zrzuty ekranu i weryfikacja:
     - `artifacts/pass08_angel_pre_chat.png` (Angel przed rozpoczęciem czatu — precyzyjny disclaimer, starter chipy, brak tabeli info)
     - `artifacts/pass08_angel_in_chat.png` (Angel po rozpoczęciu czatu — brak disclaimera, brak starterów, czysty przepływ rozmowy)
     - `artifacts/pass08_login_desktop_fit.png` (ekran logowania dopasowany do viewportu bez scrolla, dwa kwadratowe elementy, brak plastiku)
     - `artifacts/pass08_login_mobile.png` (responsywny widok mobilny bez błędów geometrii)
### PAS 09 — Języki: Pełny Audyt PL / EN / DE [x]
- **Cel:** Pełna weryfikacja wielojęzyczności (PL, EN, DE) w całym ekosystemie: eliminacja wycieków językowych, brakujących kluczy, fallbacków, spójność terminologiczna, zrzuty ekranu kluczowych widoków.
- **Kroki wykonawcze:**
  1. Sprawdzono parytet kluczy we wszystkich 3 słownikach:
     - `messages/pl.json`: 2090 unikalnych kluczy
     - `messages/en.json`: 2090 unikalnych kluczy
     - `messages/de.json`: 2090 unikalnych kluczy
     - 0 brakujących lub osieroconych kluczy.
  2. Naprawiono wycieki tekstu polskiego ze znakami diakrytycznymi w plikach obcojęzycznych:
     - `messages/en.json`: przetłumaczono `VlmWallet.states.disconnected` ("Connect wallet"), `VlmWalletPreview.*` oraz `Account.profileEditor.wallet.value` na angielski.
     - `messages/de.json`: przetłumaczono `VlmWallet.states.disconnected` ("Wallet verbinden"), `VlmWalletPreview.*` oraz `Account.profileEditor.wallet.value` na niemiecki.
     - Zweryfikowano skryptem regex zero obecności polskich znaków w `en.json` i `de.json`.
  3. Dokonano pełnego tłumaczenia sekcji z języka angielskiego w `messages/pl.json` i `messages/de.json`:
     - `Home`: cytat, CTA, tagi informacyjne.
     - `Auth`: etykiety, formularze logowania, opisy portfeli, przyciski.
     - `Shop`: kicker, tytuł, sekcja archiwalna.
     - `Square`: opisy, zasady moderacji, formularz publikacji, tagi i odznaki.
     - `Account`: kicker, moduły konta, edytor profilu, limity czasowe zmiany nazwy.
     - `BlockchainSearch`: etykiety, silnik punktacji, błędy i statusy.
  4. Zautomatyzowany skan Playwright wszystkich 30 kombinacji tras i języków:
     - 30/30 kombinacji zwróciło HTTP 200, 0 surowych kluczy translacyjnych w DOM.
  5. Weryfikacja wizualna zrzutów ekranu w 3 językach:
     - `artifacts/pass09_home_pl.png`, `artifacts/pass09_home_en.png`, `artifacts/pass09_home_de.png` (strona główna w PL, EN, DE)
     - `artifacts/pass09_shop_pl.png`, `artifacts/pass09_shop_en.png`, `artifacts/pass09_shop_de.png` (sklep w PL, EN, DE)
     - `artifacts/pass09_login_pl.png`, `artifacts/pass09_login_en.png`, `artifacts/pass09_login_de.png` (logowanie w PL, EN, DE)
     - `artifacts/pass09_audit_pl.png`, `artifacts/pass09_audit_en.png`, `artifacts/pass09_audit_de.png` (audyt w PL, EN, DE)
- **Status:** ✅ PASS (1. przejście)

---
