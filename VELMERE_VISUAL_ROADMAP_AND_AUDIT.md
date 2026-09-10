# VELMÈRE — KOMPLEKSOWA ANALIZA WIZUALNA, AUDYT I PLAN WDROźENIA DO KOłCA (DESKTOP & MOBILE)
> Data utworzenia: 2026-09-04  
> Status: ANALIZA ZAKOłCZONA · GOT_WY PLAN DZIAŁAO KROK PO KROKU  
> Zasada: Żadnych zmian przed akceptacją planu — precyzyjna diagnoza problemów, plików, przyczyn i rozwiązań.

---

## SPIS TREŚCI
1. [Raporty Audytu (Browser vs PDF, Paywall & Blur UX, Flow Formularza)](#1-raporty-audytu)
2. [Wykresy i Świece w Modalu Szczegółów (Naprawa "Szlaczka")](#2-wykresy-i-swiece)
3. [Realne Ikony Krypto i Akcji (Shield, Shield Pro, Real Markets)](#3-realne-ikony-aktywow)
4. [Wyświetlanie Oceny Ryzyka w Tabelach & Interaktywny Pop-up Historii Ryzyka](#4-ocena-ryzyka-i-pop-up)
5. [Dopracowanie Kafelków: Whale Watch, Market Impact i Analiza](#5-whale-watch-market-impact-i-analiza)
6. [Poprawki Animacji, Atelier (Kule), Intelligence i Shield Map](#6-animacje-i-dodatkowe-moduły)
7. [Checklist Zadań Wdrożeniowych (Z polami wyboru [ ])](#7-checklist-wdrozeniowa)

---

## 1. RAPORTY AUYTU

### 1.1. Podgląd w Browserze vs Pobrany PDF (Problem "Tragedii w PDF")
- **Stan obecny:**
  - Podgląd raportu w przeglądarcze (`CanonicalAuditReportView.tsx`) prezentuje się jako produkt klasy premium: nowoczesna typografia, radialne złote tła, okrągły dynamiczny gauge wskaźnika ryzyka, estetyczne kafelki metryk, sekcje zablokowane z blurred-glass paywallem.
  - Wygenerowany plik PDF generowany przez `render-pro-audit-pdf.ts` sztywno formatuje jedynie czarno-bapłe linii tekstowe A4, pozbawione estetyki widualnej, kart i okrągłych wskaźników, przez co nie odzwierciedla podglądu w przegl��darcze!
- **Co trzeba zbrobiŶ���HZ��]\�H�q!��Y\��[H���YXܚYY[�Y[H��1!YH���Y�1!Y\�ޙN��H�Y�`����Z��\ܝH��^��!H�۝�Z�KY�\�[K�YX�q!HH�]\�[K��H�^�X[�H���qn��Z��\����ܙH
��`���H�Zܙ\�X�\�]XۘH�\�H��[�H�^�Z�H��Y�I�]H��ܝHޚ[�]H�^�Z�JK��HY[�Xޛ�H��Xq`��H�Y�[�HHX�[H
ݙ\��Y]��۝�X�Y[�]K�[�[����ݙ\��[��K\]ZY]K]X���\��X�KY�[��YY���[X[��]�Y]�K��H�0�ڛ�H1`�H
�Y[[�H�[�\ܝH�^�YXޙqa��HX�ޞ\�K[Y�[���HZ�`�Y��[Y[�H[��]Xڛۘ[�Y����[Z�[ZHHZ��[�[ZH�`��H�[p��H���L�X�
K��H�X�����[�H�Z�ڙH���Y[�Xޛ�H��Z�\�H�Z�������\��H8�$��Y�ޛ�H]q`��Zܙ\�[�[^�HH]Z�Y]H�X�����[�XK[H��Xޞ\ޘޛ۞[ZH[�[ZHܘp�]�[ZK��H
��Z�Hؚ�&]H�ZX[�!N����HX���X�\�]K�]Y]X�[�ۚX�[\�\ܝ���HX���X�\�]K���X]Y]\���\��Y\�\�Y�K\�[�\�\����H\�\K�]Y]ܙ\ܝ\�ܛ�]K���### 1.2. Logika Tierów: Basic, Pro, Advanced & Blur Paywall UX/Komercja
- **Stan obecny:**
  - Mamy zaimplementowany model kanoniczny, gdzye użytkownik z tierem Basic otrzymuje pełne dane Intake & Basic, a sekcje Pro i Advanced mają `data: null`.
  - W podglądzie sekcje zablokowane wyświetlają się z warstwą rozmycia (blur), zakresem alizy i przyciskem odblokowania `[Unlock PRO Audit]` / `[Unlock ADVANCED Audit]`.
- **Co trzeba dopracować komercyjnie:**
  - W podglądzie po wejściu np. z poziomu Pro lub Advanced (gdy użytkownik nie posiada jeszcze uprawnień lub testuje darmowy tier), raport bazowy Basic jest w pełni czytelny i gotowy do pobrania, natomiast moduły Pro i Advanced posiadają przycisk odblokowania/zakupu z wyrazō� informacją komercyjną (np. 'Unlock Pro Audit – Deep access control, DEX liquidity lock & flash-loan vector simulation').
  - Zapobieganie fałszywym roszczeniom w sekcji Advanced Human Review: sekcja odblokowuje sią, ale wyraźnie informuje o stanie oczek)wania na podpis recenzenta, dopóki faktyczny dowód audytora nie zostanie wprowadzony.


### 1.3. Flow Formularza Audytu na Głównej Stronie
- **Stan obecny:**
  - Użytkownik na `/security/audits` wybiera plan Basic / Pro / Advanced i wpisuje kontrakt BSC `0x...`.
  - Po wpisaniu kontraktu i wybraniu Basic pojawia się komunikat o kolejce, ale brakowało natychmiastowego, wyrazistego przycisku **Generuj raport** przenoszącego od razu do pełnego podglądu raportu kanonicznego wraz z możliwością pobrania PDF!
- **Co trzeba zbrobiŶ���H��\�[�]H��]ۙY��Y�\�H�۝�Z�HH�^��Xޙ[�]H[�H
�\�X�����Y�[��Y
H�H�H�ܛ][\��Hژ]�XH�q&H�\�^�\�H�`��H��X�\���H
���[�\�Z��\ܝ]Y]J����H�Zۚq&X�YH�[�\�Z�H��1!Y�[�ۚXޛ�H�ޘ\�YH��Xޞ]�\�[H�[�o]��f��q!H�]X�ZX\���Y��؜�[�XH�\���[�Y��Z�H�
Z��[��`��K�[Z�K��Y[[�XK�Y�JK��H�X��%�[�H��X�Y�[��Y��ܛ][\��H�Y\�Z�H���1!YH����YY�[�������[�[ZHX��X�\���[�[ZH�Z�ژ[ZHH��X�\��[ZH������[�XK��---

## 2. WEKRESY I ŚWIECE W MOLALU SZCZEGÓ�]ÓW (NAPRAWA "SZLACZKA")

### 2.1. Przyczyna "Szlaczka" w Wykresie Cenowym
-$*Pliki:**
  - `components/market-integrity/AssetDetailModal.tsx` (linie 2330–2670)
  - `components/market-integrity/ShieldRealMarketsParityClient.tsx`
  - `lib/market-integrity/kline-route-handler.ts`
- **Diagnoza problemu:**
  - W `AssetDetailModal.tsx` w komponencie canvasowym rysowana jest linia średniej kroczącej (`averageWindow = 8/12`) w kolorze `rgba(94,234,212,0.48)`, która przy braku pełnych świec lub niepoprawnych interwałow rysuje przypadkowy zygzak ("szlaczek").
  - Dodatkowo, funkcja `normalizeCandles` filtruje Świece i jeśli jest ich mniej niż 8, zwraca pustą tabelkę `[]`, przez co wykres świecowy znika, a pozostaje jedynie zniekształcona linia łącząca przypadkowe punkty z API lub sparkline.
  - Skrajne punkty cenowe (`pad = (max - min) * 0.145`) spłaszczaja Świece, a świece mają stałą minimalną szerokość `2.2px`, co przy małej liczbie świec wygląda jak nieestetyczne cienkie kreski.
-$*Rozwiązanie i co zbrobimy:**
  - Zapewnienie fallbacku do rzeczywistych świec generowanych z historii cenowej (`sparkline7d` lub danych kline z `/api/market-integrity/kline`).
  - Przebudowa renderera wykresu na canvasie:
    - Wyrazŧne, czytelne zielone i czerwone świece japońskie (zielone `#2dd4bf` / czerwone `#f43f5e`) z knotami i własćiwymi proporcjami.
    - Opcja przełączania: wykres Świecowy (Candlestick) oraz wykres liniowy (Area Chart z eleganckim gradientem w dół pod linią ceny).
    - Wyświetlanie aktualnej ceny na osi Y z dynamicznym znacznikiem (pill).
    - Oś czasu na dole (daty / godziny) z równomiernymi odstępami bez nakładania się napisów.
    - Płynny crosshair z tooltipem pokazującym datę, cenĕ Open, High, Low, Close oraz Volume.

---

## 3. REALNE IKONY AKTYWÓW (SHIELD, SHIELD PRO, REAL MARKETS)

### 3.1. Przyczyna Braku Ikon
-$*Pliki:**
  - `components/market-integrity/AssetLogo.tsx`
  - `lib/market-integrity/asset-logo-resolver.ts`
  - `public/market-logos/`
- **Diagnoza problemu:**
  - W `public/market-logos/` istnieje aż 187 wektoriowych plików SVG (m.in. `btc.svg�, `eth.svg`, `bnb.svg`, `sol.svg�, `aapl.svg�, `amzn.svg�, `tsla.svg` itp.).
  - Jedlak w `AssetLogo.tsx` logika próbuje najpierw pobierać obrazy z zewnğtrznych URL-iów z API CoinGecko lub providera (`image`), a przy błędzie CORS / rate limicie lub braku obrazka w odpowiedzi API przeskakuje do fallbacku tekstowego (`glyph`p – szara litera w kółku), zamiast najpierw_sprawdzić lokalny, sprawdzony plik SVG z `public/market-logos/`!
  - Ponadto dla akcji i indeksów (np. Apple, Microsoft, Tesla) brakuje bezpośredniego mapowania symbolu na lokalne pliki logo lub niejawodne CDN (np. SimpleIcons / CoinGecko CDN).
- **Rozwiązanie i co zbrobimy:**
  - Zmiana priorytetu w `asset-logo-resolver.ts`: **Local First** dla wszystkich znanych kryptowalut i akcji (jeś� istnieje lokalny plik `/market-logos/${symbol.toLowerCase()}.svg`, używamy go natychmiast i bez opóźnień!).
  - Rozszerzenie bazy ikon w `public/market-logos/` oraz dodanie stabilnego fallbacku z oficjalnych bibliotek ikon krypto (np. cryptologos.cc / jsDelivr cryptocurrency-icons) i akcji giełdowych, aby żadne aktywo nie wyświetlało brzydjiej pustej litery, gdy dostępne jest oficjalne logo.

---

## 4. OECENA RYZYKa W TABELACH & INTERAKTYWNY POP-UP HISTORII RY_ZYCA

### 4.1. Dlaczego w Tabeli Nie Wyskakuje Ryzyko (Mimo Działającego Silnika)
- **Pliki:**
  - `components/market-integrity/ShieldRealMarketsParityClient.tsx` (funkcja `sourceBoundRisk`)
  - `lib/market-integrity/risk-history-contract.ts` (funkcja `buildRiskHistorySnapshot`)
  - `lib/market-integrity/risk-history-current-alignment.ts`
- **Diagnoza problemu:**
  - Sprawdziśmy wywołanie API `/api/market-integrity/markets` – serwer zwraca obliczony `delivery.risk.score: 35.18` (oraz `result.score: 35.18`).
  - Jednak w `RiskHistoryControl.tsx` wywoływana jest funkcja `alignRiskHistoryCurrentObservation`, która z kolei odpala `buildRiskHistorySnapshot`.
  - W `buildRiskHistorySnapshot` w linii 340 znajduje sią kod:
    `signalCount: result.signals.length`  
    Gdy `result.signals` jest `undefined` (poniewaz API tabeli zwraca lekki rekord bez pełnej tablicy sygnałów), rzucany jest błąd:
    `TypeError: Cannot read properties of undefined (reading 'length')`!
  - W efekcie funkcja zwraca stan `blocker: "current_snapshot_build_failed"`, a `currentScore` staje się `null` i w tabeli pojawia się pustka lub myślnik `—`!
-$*Rozwiązanie i co zbrobimy:**
  - Zabezpieczenie odczytu sygnałów: `signalCount: result.signals?.length ?? 0`.
  - W `sourceBoundRisk` oraz w renderowaniu komórki tabeli: wyświetlanie obliczonego ryzyka (np. `27.3x%` lub `35.2 / 100`) w eleganckiej pigułce z odpowiednim kolorem (zielony dla niskiego ryzyka, żółty dla Ŗ�yѹ���������ݽ�䁑�����ͽ�������(((����иȸ�A�������]�������������!��ѽɧ�i�����I��孄����������Ѡ��Š�(��������镉���ɽ��訨(����A��������e��ԁ܁݅�ѿo����孄��������ܸ��������ݥ�Ʉ�ͧ�����������������������ٕȁ�ݽ�����	幻�������������������͍�������Ʌ��ȵ��ѥ�����(����\������ԁ鹅��թ��ͧ�(������9���ݕ��聹���������յ���԰��嵉����������Յ��崁��饽�������孄�(������M����ѽȁ��ɕ��耨�Š������Ѡ���������������(�������ѕ���䰁�	幹���ɕ́������䀠��鱅�镬�������ɭ��������ѽ���䤁�����ի�䰁�������孼�鵥����	��ͧd�܁��Ʌ�崁��ͥ��(������i��хݥ������ͭ�鹥��܁ͯ	���占������鵥����o���	幹�o���������Ʌ������ͥ�����䰁����������ݼ�����Ʌ��Ԥ�(������C%幹��酵孅�����M��������e������鄁��������Ո����卥ͬ�`��(---

## 5. DOPRACOWANIE KAFELKÓW": WHALE WATCH, MARKET IMMACT I ANALIZA

### 5.1. Analiza (3 Kafelki Wyboru Tieru w Modalu)
- **Plik:**
  - `components/market-integrity/analysis/AnalysisTab.tsx`
- **Stan obecny:**
  - Przy wejściu w zakładkę Analizy widoczne są 3 surowe kafelki: Basic, Pro, Advanced.
  - Wygląd�� zwyczajnie, kanciato, pozbawione luksusowego aksamitu Velmère.
  - Natomiast po kliknęciu w kafelek animacja ("pieczęć", skanowanie, morphing) działa ładnie i zębowanie go oceniłaś pozytywnie!
- **Co trzeba zbrobić:**
  - Dopracować same 3 kafelki startowe w zakładce:
    - Szklane, głębokie ciemne karty (shadow-2xl, eleganckie ramki `border-velmere-gold/20`).
    - Nowoczesna typografia, ikony tierów, estetyczne badge ("FREE" / "RECOMMENDED" / "PROFESSIONAL").
    - Wyrazźna lista korzyści w punktach dla każdego tieru.
    - Efekt hover z delikatnym złotym rozświetleniem (glow).
    - Nie ruszać mechaniz}u animacji po kliknęciu, który użytkownik ocesił pozytywnie!


### 5.2. Whale Watch & Market Impact
- **Pliki:**
  - `components/market-integrity/AssetIntelligenceTabs.tsx`
  - `components/market-integrity/AssetIntelligenceTabs.module.css`
- **Diagnoza problemu:**
  - Kafelki i tabele w zakładkach "Wpŉyw na rynek" oraz "Duzi gracze" mają surowy, zagr�czony układ, podstawową kolorystykę i wyglądają nieestetycznie ("syf").
- **Co trzeba zbrobiŶ���H�1f��Yqoq!�\��]Z�\�fH�^�X[�!N��H�Y�[�HY]�Z���[Y[�H�Y[ܞX�H
�[H�]���qoH�[��Z�ڙH�	L����qn��Z�Z�[][XښK�\��X�XښJH�\�]Xޛ�[ZHZ��[�[ZH\��'���v��V��6V�&W6��'���vV���W��g27'�VF[�G\[ǖ6�w&7���X'����w&F�V�FVҒ��Ɨ7F�7FF�6��W'L;7rv�V��'�&�6��7��FV��֒&FvRv֒���f��r��WFf��r�v�\X&F�7�2&V�G�v璒��wX��r�'��V���&�WB��7B��W7FWG�7��7��V�6��Y�Ɨ�wR6V��vVv��6ƗvR�'����V6V�6�C��CS��C#S��7��FV����G��X&V�v��V�����7;6��6�V���׬X&�F�WFfV��:�&R��6V�F֒7���R�7��&vGR�---

## 6. POPRAWKI ANIMACJI, ATELIER (KULE),p�%9Q11%9�$�M!%1�5@�5=	%1�((����ظĸ�ѕ���Ȁ�-ձ������������������م̤(����A����訨(���������m������t��ѕ���Ƚ��������(��������������̽�ѕ���Ƚ�(����������訨(����M�Ʌݑ镹����呅���m�������������ձ���Ʌ�ɕ������ݹ�m����������镹�����������占��չ�������配�������������ԁݥ������ԁ����Ʌ���镹������񕹥��AT��(������������%幹�����占���镩�l�����Չѕ�������占�������܁�mݥ��	�������ɼ��ͭ�������ͅ���Ը((����ظȸ�%�ѕ�����������M������5��(����A����訨(���������m������t���ѕ�����������������(���������m������t�͡�����������������(��������������̽��ɭ�е��ѕ�ɥ��M�����5������������й���(����������訨(����U��ݹ������ͧd����e�	䁵�����ݧ������Ʌ���܁�����љ����ɕ����ի�ͧd����ѕ���������������占���Ʌ������Ʌ�񔁹�������e���܁���ͽ�������齽��݅��ԁ����镍�����Ը((����ظ̸�A�	���I�������ݹ�o�5�������M���љ���(����]嵅�����訨(����]����ѭ���х������M�������I����5�ɭ��̰�Ց��䤁�������ͥ��������齹х���͍ɽ����酵ɿ�������������յ����ѥ��䁥����յ��Ф��Ո�������݅�������䁵�������(����A�ͭ����ݥ���������������������������ൡ��������١�聉�������崁͍ɽ��������Ʌ�����Ս����������卥ͯ�܁�����������Ʌ�����ѕ������܀��A���������ɽ����(---

## 7. CHECKLIST WDROŻENIOWA (DO ODFNACZANIA I SEQUENCJI)


- [ ] **Faza 1: Raporty Audytu (Browser vs PDF Parity & Paywall UX)**
  - [ ] 1.1. Przebudowa rendererów PDF, aby raport pobierany odzwiecriedlał 1:1 podgląd w przegl��darcze (typografia, karty, wskaźnik ryzyka, kolory, sekcje).
  - [ ] 1.2. Wdrożenie spójnego blurred paywall UX dla sekcji Pro i Advanced z przyciskem Unlock / Purchase i jasną ofertą komercyjną.
  - [ ] 1.3. Dodanie wyrazistego przycisku 'Generuj raport audytu' w formularzu intake audytu z natychmiastowym przejściem do podglądu i PDF.
  - [ ] 1.4. Walidacja bezpieczeństwa: blokada wycieku danych płatnych sekcji na poziomie serwera (Basic otrzymuje data: null dla Pro/Advanced).


- [ ] **Faza 2: Naprawa Wykresu Cenowego (Candlestick / Area)**  
  - [ ] 2.1. Usunięcie zniekształconego 'szlaczka' w AssetDetailModal.tsx.
  - [ ] 2.2. Implementacja czytelnego wykresu świecowego z realnymi knotami i korpusami Świec oraz opcji wykresu liniowego z gradientem.
  - [ ] 2.3. Prawidłowa obsługa osi Y (ceny) i osi X (czas) oraz interaktywnego crosshairu z danymi OHLCV.


- [ ] **Faza 3: Realne Ikony Krypto i Akcji**
  - [ ] 3.1. Ustawienie priorytetu 'Local-First' w asset-logo-resolver.ts dla 187 lokalnych plików wektoriowych SVG"w public/market-logos/.
  - [ ] 3.2. Dodanie niejawodnych fallbacków ikonowych dla wszystkich aktywów giełdowych i kryptowalutowych (eliminacja pustych liter).


- [ ] **Faza 4: Wyświetlanie Ryzyka w Tabelach i Interaktywny Pop-up Historii**
  - [ ] 4.1. Naprawa błędu result.signals.length w buildRiskHistorySnapshot, który blokował pokazywanie wyliczonego ryzyka.
  - [ ] 4.2. Wyświetlenie kolorowych pigułek ryzyka w tabelach Shield, Shield Pro i Real Markets.
  - [ ] 4.3. Implementacja powolnego, pŉynnego modalu po kliknęciu w ocenę ryzyka (np. 27.3%) z wykresem historii zmian (1h, 24h, 30 dni) i wskaźnikami sj�adowymi.


- [ ] **Faza 5: Redesign Kafelków Whale Watch, Market Impact i Analizy**
  - [ ] 5.1. Przeprojektowanie 3 kafelków wyboru tieru w zakładce Analizy na nowoczesny, luksusowy design (z zachowaniem obecnej animacji po kliknięciu).
  - [ ] 5.2. Nowoczesny wygląd kafelków i wykresów w Whale Watch (przepływy dużych graczy, alerty transakcji).
  - [ ] 5.3. Profesjonalny redesign modułu Market Impact (wizualizacja poślizgu cenowego i głębokości płynności).

- [ ] **Faza 6: Atelier, Intelligence, Shield Map i Pełne Testy Desktop & Mobile**
  - [ ] 6.1. Przegląd i optymalizacja animacji w Atelier (kule 3D / canvas).
  - [ ] 6.2. Poprawki wizualne i responsywność na smartfonach dla Shield Map i Intelligence.
  - [ ] 6.3. Weryfikacja całści w testach Playwright na desktopie (1440x900) i telefonie (390x844).
  - [ ] 6.4. Wygenerowanie pełnego zestawu screenshotów porównawczych PRZED i PO dla użytkownika.
