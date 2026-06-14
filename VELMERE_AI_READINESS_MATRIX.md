# VELMERE AI READINESS MATRIX

Aktualizacja: 2026-06-10 · stan po PASS783

| Element | Stan kodu | Weryfikacja | Pozostały blocker |
|---|---:|---|---|
| Deterministic risk engine | 100% | evale + TypeScript | źródła live zależne od providerów |
| Centralny `VlmBrainOutput` v3 | 100% | verifier PASS772–776 | migracje przyszłych modułów muszą zachować kontrakt |
| Gemini provider registry | 100% kodowo | oficjalne `@google/genai`, retry/cache/circuit breaker | prawdziwy `GEMINI_API_KEY` i test live |
| Structured output | 100% kodowo | JSON schema + walidacja | live response z Gemini |
| Canonical fact packet | 100% | verifier + evale | jakość zależy od dostępnych adapterów danych |
| Function calling | 100% kodowo | bezpieczny tool registry, limit 3 kroków | test live modelu |
| Bounded agent | 100% | plan → narzędzia → synteza → walidacja | test live modelu |
| Source arbitration | 100% kodowo | freshness, quality, diversity, conflicts | realne wieloźródłowe dane dla wszystkich klas aktywów |
| Claim firewall | 100% kodowo | evale blokują liczby i source IDs spoza fact packet | rozszerzanie zestawu regresji wraz z nowymi adapterami |
| Prompt injection defense | 100% kodowo | evale wejść wrogich | ciągłe testy bezpieczeństwa |
| Memory | 100% kodowo | TTL, limity, clear, brak sekretów | produkcyjny trwały storage po decyzji prywatności |
| Unified Angel | 100% kodowo | sklep, analiza i admin używają wspólnego providera | uprawnienia produkcyjnego auth |
| Shield integration | 95% | wspólny output i tier depth | live provider smoke test |
| Real Markets integration | 92% | wspólny kontrakt instrumentu i VLM | więcej adapterów live dla equities/FX/REIT |
| Shield Map integration | 94% | evidence graph z outputu | live provider conflicts/provenance |
| Lens integration | 95% | canonical server report | live Gemini i dane źródłowe |
| PDF integration | 94% | jeden obiekt preview/download | zewnętrzna kontrola PDF/A/PDF-UA i live snapshot |
| Basic / Pro / Advanced | 100% kodowo | evale potwierdzają różną głębokość | test live Gemini |
| PL / EN / DE | 100% fallback | evale językowe | test live Gemini dla wszystkich locale |
| Cache / dedupe | 100% kodowo | verifier | produkcyjny cache współdzielony między instancjami |
| Observability | 100% kodowo | trace, latency, attempts, cache, fallback, usage | eksport do produkcyjnego systemu logów |
| Cost governor | 100% kodowo | limit prompt/output i koszt szacowany | realny billing/usage z konta Gemini |
| Evals | 100% zestawu bazowego | BTC/ETH/tokeny/akcje/FX/towary/fallback/injection/locale | cykliczne uruchamianie CI |
| Live Vercel test | 0% w tym środowisku | niewykonany | Vercel access + sekrety + domena |

## Uczciwa gotowość

- Implementacja kodowa VLM Brain: **około 96%**.
- Integracja techniczna bez zewnętrznych sekretów: **około 94%**.
- Potwierdzenie testami lokalnymi: **około 88%**.
- Potwierdzenie live: **niezaliczone**, dopóki Gemini i deployment nie zostaną sprawdzone na prawdziwym środowisku.
