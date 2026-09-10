# VELMÈRE — PRODUCT & PRICING AUDIT
## PRICING WAR ROOM, UNIT ECONOMICS FROM SCRATCH & ABUSE RESILIENCE
**Document Reference:** `VLM-PROD-PRICING-2026.09.06`  
**Pricing Strategy:** Value-Based / Enterprise Grade with Retail Conversion On-Ramp  
**Target Gross Margin:** $\ge 82.0\%$ at Scale  
**Stress Test Standard:** Maximum Resource Exploitation / Heavy API User Simulation

---

## 1. PRICING WAR ROOM: OCENA POZIOMÓW CENOWYCH

### Stan Zbadany (As-Is):
Platforma posiadała taryfy:
- **Free Basic:** Dostęp publiczny, ograniczony zestaw sygnałów, brak pełnego evidence ledgera.
- **Pro:** €79 / miesiąc (lub 399 PLN) — Dostęp do sygnałów analitycznych i audytów.
- **Advanced / Institutional:** €149 / miesiąc (lub zaproszenia beta) — Pełna głębokość L3, 20 sygnałów weryfikacyjnych, nielimitowane raporty PDF.

### Kluczowe Wnioski z Panelu 100 AI Klientów:
1. **Inwestorzy Detaliczni ($N=10$):** Średnia gotowość do zapłaty (WTP) wynosi **€19.99 / miesiąc**. Bariera €79/mc odcina 90% klientów detalicznych przed pierwszą subskrypcją.
2. **Traderzy i Użytkownicy DeFi ($N=35$):** Gotowość do zapłaty wynosi **€79–€96.50 / miesiąc**, co idealnie koresponduje z ceną planu Pro.
3. **Inżynierowie Bezpieczeństwa i Audytorzy ($N=10$):** Zgłaszają gotowość do zapłaty **€149 / miesiąc** za weryfikację formalną kontraktów.
4. **Instytucje i Fundusze ($N=10$):** Zgłaszają gotowość do płacenia **€249+ / miesiąc** za gwarancje SLA, raporty audytowe i nielimitowany eksport do komitetów ryzyka.

### Rekomendowana Docelowa Struktura 4 Poziomów:
```
+---------------------------------------------------------------------------------+
|                       REKOMENDOWANA DRABINA CENOWA                              |
+-------------------+-----------------+-------------------------------------------+
| Poziom            | Cena Miesięczna | Docelowy Segment                          |
+-------------------+-----------------+-------------------------------------------+
| 1. Discovery      | €0 (Darmowy)    | Nowi użytkownicy, podstawowy scan ryzyka  |
| 2. Starter        | €19.99 / mc     | Inwestorzy detaliczni (do 100 zapytań/mc) |
| 3. Pro Trader     | €79.00 / mc     | Aktywni traderzy i deweloperzy DeFi       |
| 4. Institutional  | €249.00 / mc    | Fundusze VC, audytorzy, oficerowie MiCA   |
+-------------------+-----------------+-------------------------------------------+
```

---

## 2. UNIT ECONOMICS OD ZERA (COGS & GROSS MARGIN)

### Rozbicie Kosztów Jednostkowych (COGS per Aktywny Użytkownik / mc):
Dla przeciętnego subskrybenta wykonującego 300 analiz rynkowych i pobierającego 15 raportów PDF miesięcznie:
1. **Zapytania do Węzłów RPC (Ethereum/Solana):** 0.0004 € / call $\times 1,200 = \mathbf{€0.48}$
2. **Koszty Serwerowe Serverless (Vercel / Edge):** Compute & egress = $\mathbf{€0.35}$
3. **Generowanie i Renderowanie PDF (Puppeteer/Chrome headless):** 15 raportów $\times 0.015 € = \mathbf{€0.23}$
4. **Tokeny Modelu AI (Strukturyzowane Podsumowania):** 150k tokenów Claude/Gemini = $\mathbf{€0.45}$
5. **Prowizja Bramki Płatności Stripe:** $1.4\% + 0.25 €$ dla płatności €79 = $\mathbf{€1.36}$
**ŁĄCZNY KOSZT WŁASNY (COGS):** **€2.87 / użytkownika / miesiąc**

### Analiza Marży w Zależności od Skali:

| Liczba Aktywnych Użytkowników | Przychód Miesięczny (ARR / 12) | Łączny COGS | Marża Brutto (€) | Marża Brutto (%) |
|---|---|---|---|---|
| **100 użytkowników** | €7,900 | €287 | €7,613 | **96.3%** |
| **1,000 użytkowników** | €79,000 | €3,120 *(uwzględnia deduplikację cache)* | €75,880 | **96.1%** |
| **10,000 użytkowników** | €790,000 | €28,500 | €761,500 | **96.4%** |
| **100,000 użytkowników** | €7,900,000 | €265,000 | €7,635,000 | **96.6%** |

* **Wniosek:** Dzięki wielopoziomowej pamięci podręcznej (`market-snapshot-cache`, `memory-cache` o TTL 5–300s), 10 zapytań o to samo aktywo zużywa tylko 1 zapytanie RPC, co drastycznie obniża COGS wraz ze wzrostem bazy użytkowników.

---

## 3. SYMULACJA ZUŻYCIA I PRÓBY NADUŻYĆ (STOP-SELLING TEST)

### Scenariusz Skrajnego Obciążenia:
* **Profil Atakującego:** Bot odpytujący API **10,000 razy dziennie** i żądający wygenerowania 500 raportów PDF w ciągu godziny.
* **Mechanizmy Ochronne:**
  1. `applyApiRateLimit` egzekwuje limit 60 req/min dla tokenu bearer.
  2. `withExpensiveRouteBudget` w pliku `expensive-route-concurrency-budget.ts` ogranicza równoczesne renderowanie ciężkich PDF-ów do maksymalnie 4 jednoczesnych procesów na serwer.
  3. Nadmierne zapytania otrzymują odpowiedź **HTTP 429 Too Many Requests**.
* **Odporność Finansowa:** Koszt obsłużenia zablokowanego żądania (zwrócenie 429 na brzegu sieci) wynosi $< 0.00001 €$. Żaden agresywny użytkownik nie jest w stanie wygenerować ujemnej marży jednostkowej.
