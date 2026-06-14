# OBSZAR DZIAŁANIA PASS326 — Velmère next chat map + prompt

## Stan po PASS326
PASS326 przenosi projekt z etapu „operatorowy system widoczny publicznie” do etapu „publiczny showroom + operatorowy mózg w tle”. Główna zasada: klient widzi produkt, lookbook, A4 PDF preview i spokojne CTA; AI/operator widzi mapy, guardy, blokery i pełną telemetrię.

## Najważniejsze naprawy po uwagach użytkownika
1. **VLM Browser / Lens**
   - Nie otwieraj automatycznego popupu po wyszukaniu tokena.
   - Analiza ma zostać na stronie, pod wynikami.
   - Podgląd PDF ma wyglądać jak kartka A4 do druku.
   - Przycisk `Pobierz PDF` ma iść do `/api/search/lens-report?format=pdf&q=...`.
   - Pełny Shield jest opcjonalny, nie główny flow.

2. **Orbit 360 / Basic / Pro / Advanced**
   - Basic, Pro i Advanced mają otwierać prawie pełnoekranowy VLM Orbit 360, a nie małe okno.
   - Kliknięcie kafelka ma wysuwać panel informacji z prawej krawędzi ekranu.
   - Panel informacji ma mieć natywny scroll góra/dół, bez `preventDefault` na wheel.
   - Mobile: panel może być bottom sheet, ale musi scrollować.

3. **Shield Map**
   - Strona Shield Map ma wyglądać jak żywy system obronny / SOC cockpit, nie statyczny opis.
   - Dropdown sugestii ma być przypięty do wyszukiwarki i nie skakać przy scrollu.
   - Błąd typu `CoinGecko request failed with status 429` ma być pokazany jako spokojny local-preview/rate-limit message, nie surowy błąd.
   - Nadal nie wolno pisać buy/sell, scam/fraud bez dowodu, ani obiecywać bezpieczeństwa.

4. **Clothing / Kolekcja**
   - Kolekcja ma wyglądać jak lookbook.
   - Usuń z publicznego widoku bloki: `Velmère store preview`, `Atelier product receipt`, `Provenance concierge`, `Quiet first purchase`, `Atelier trust ribbon`, `Concierge proof whisper`.
   - Produkt card nie może pokazywać klientowi `provider: manual`, `source: missing`, `checkout zablokowany`.
   - Provider/SKU/checkout blockers zostają operator-only.

5. **Security**
   - Strona Security ma zostać rozbudowana, ale publicznie krócej: trust pillars, co jest wdrożone, co jest preview, co blokuje produkcję.
   - Pełny WAF/env/admin checklist ma zostać w admin/docs/operator handoff, nie jako ściana publiczna.

## Blokery aktualne
- `typecheck` nadal odpada przez stare braki zależności/typów: `next`, `react`, `node`, `lucide-react`, `next-intl`, `stripe`, `wagmi`, `zustand`, `tailwindcss` itd.
- Realna produkcja sklepu dalej wymaga: provider SKU mapping, checkout, tax/VAT, shipping rates, signed webhooks, order persistence, refund flow, final legal review.
- Realny production Shield wymaga: source ledger, durable storage, live holder/orderbook/contract adapters, rate-limit cache, OSINT source scoring, PDF renderer QA.
- Mobile/browser QA nadal trzeba robić manualnie na Vercel po każdym większym pass.

## Mapa obszarów pracy od następnego chatu
| Priorytet | Obszar | Co robić |
|---|---|---|
| P0 | Orbit 360 scroll QA | Testować i dopinać panel z prawej, scroll, ESC/outside close, mobile bottom sheet. |
| P0 | VLM Browser A4 PDF | Dopracować A4 design, branded signature, real download, print CSS, brak auto-popupu. |
| P0 | Shield Map SOC look | Zmienić stronę na żywy defense cockpit: mniej opisów, więcej premium live-map look. |
| P0 | Search dropdown anchoring | W każdej wyszukiwarce dropdown ma być lokalnie przy input, nie portal fixed skaczący przy scrollu. |
| P1 | Clothing lookbook | Uprościć kolekcję, duże zdjęcia, mniej tekstu, produkt + cena + rozmiary + waitlist. |
| P1 | Product detail | Jeszcze bardziej buyer-first: zdjęcie, cena, rozmiar, materiał, delivery/returns; bez provider audit. |
| P1 | Security | Public pillars + operator map w pliku/adminie. Nie publiczna ściana WAF/env. |
| P2 | Research Lab | Skrócić publicznie do research pipeline: dataset, benchmark, limits, peer review. |
| P2 | Square/Community | Jeszcze mniej launch-control, bardziej clean community board. |

## Gotowy prompt do nowego chatu
Skopiuj cały prompt niżej do nowej rozmowy razem z aktualnym ZIP-em PASS326:

```text
Pracujemy nad projektem Velmère Store / Velmère Shield / VLM Browser / AI Brain. Startuj od ZIP-a PASS326. Najpierw rozpakuj projekt, zrób error sweep i znajdź realne błędy w kodzie. Następnie kontynuuj po mapie Velmère A–M bez spłaszczania AI Brain: D01–D24 mają zostać osobnymi obszarami.

Najważniejsze zasady:
1. Publiczny klient nie ma widzieć operatorowych ścian, PASS telemetry, raw score, provider audit ani launch-control dumpów.
2. Operatorowe dane zostają w kodzie, guardach, admin/docs i mapie, ale publiczny UI ma być showroomem.
3. Każdy pass ma realnie edytować kod Next.js, dodawać guard, raport, mapę i ZIP.
4. Przed passami z MEXC/LVMH przeszukaj sieć i cytuj/uwzględnij aktualne źródła.
5. FOMO/elitarny status stosuj etycznie: premium prywatność, proof-gated status, quiet waitlist; zero countdownów, zero fake scarcity, zero wallet pressure, zero ROI, zero buy/sell advice.
6. Zawsze zaczynaj od napraw błędów widocznych w UI: scroll, dropdown, modal, z-index, mobile, public text.

Aktualne zadania po PASS326:
- VLM Browser: A4 PDF preview ma zostać na dole strony po wyszukaniu, bez auto-popupu. `Pobierz PDF` ma zwracać realny application/pdf. Dopracować design kartki A4 do druku z podpisem Velmère Cybersecurity i miejscem na przyszły podpis graficzny użytkownika.
- Orbit 360: Basic/Pro/Advanced mają otwierać prawie pełnoekranowy overlay. Kafelek ma wysuwać panel z prawej krawędzi z animacją i natywnym scrollowaniem. Bez `preventDefault` blokującego wheel. Mobile bottom sheet też ma scrollować.
- Shield Map: ma wyglądać jak żywy system obronny/SOC cockpit. Dropdown sugestii ma być przyklejony do wyszukiwarki, nie skakać przy scrollu. 429 z CoinGecko pokazać jako spokojny local-preview/rate-limit message.
- Clothing: kolekcja ma wyglądać jak lookbook. Usuń z publicznego UI bloki typu `Velmère store preview`, `Atelier product receipt`, `Provenance concierge`, `Quiet first purchase`, `Atelier trust ribbon`, `Concierge proof whisper`. Karty produktów nie mogą pokazywać provider/source/missing/checkout blocked klientowi.
- Security: rozwijaj dalej, ale publicznie krótko; pełna mapa WAF/env/admin/blockers ma być w pliku/operator handoff, nie jako długa ściana.

Wygeneruj gotowy kod Next.js, guardy, raport, mapę postępu i ZIP. W raporcie napisz krótko co działa, co jest nadal blokerem i jakie delta ID z mapy ruszone.
```
