# PASS-011: AI Brain / Learning Claims Truth Audit & Reality Realignment

## PASS ID
`PASS-011`

## CEL
Realizacja audytu prawdy (truth audit) i dostosowania rzeczywistości (reality realignment) w zakresie twierdzeń dotyczących sztucznej inteligencji, silnika VLM Brain oraz asystenta Angel. Wdrożenie brakującego potoku zbierania opinii użytkowników (*feedback pipeline*), weryfikacja mechanizmów pamięci trwałej (*durable memory*), uziemionego wyszukiwania (*RAG*), kalibracji (*calibration manifest*) oraz eliminacja i zablokowanie wszelkich nieprawdziwych roszczeń marketingowych o "autonomicznym uczeniu wag", "samodzielnym trenowaniu modeli" lub "ciągłych aktualizacjach wag w czasie rzeczywistym".

## ZAKRES
- Potok opinii użytkowników (Feedback Pipeline): `lib/ai/angel-feedback-pipeline.ts`
- Endpoint API Feedbacku: `app/api/angel/feedback/route.ts`
- Moduły kalibracji i jądra AI: `lib/ai/vlm-brain-calibration.ts`, `lib/ai/vlm-brain-kernel.ts`, `lib/ai/vlm-brain.ts`
- Pamięć trwała i ciągłość sesji: `lib/ai/angel-durable-memory.ts`, `app/api/angel/memory/route.ts`
- Kontrakt promptu i zapora twierdzeń: `lib/ai/angel-prompt-contract.ts`, `lib/ai/claim-proof-firewall.ts`
- Modele LLM i rejestr providera: `lib/ai/vlm-provider-registry.ts`, `lib/ai/vlm-provider-fallback-policy.ts`
- Nowy zestaw testowy: `tests/security/a102-ai-brain-learning-claims-truth.test.ts`
- Istniejące zestawy bezpieczeństwa:
  - `tests/security/a102-p36-ai-final-output-revalidation.test.mjs`
  - `scripts/pass36/verify-a88-brain-angel-risk-eval.ts`
  - `scripts/current-execution/test-angel-durable-memory-delete-fail-closed.mts`
  - `tests/security/v4-angel-grounding-before-provider-boundary.test.ts`
  - `tests/security/a102-angel-primary-route-safety-boundary.test.ts`

## OCZEKIWANE ZACHOWANIE
1. **Prawda o architekturze AI (No Fake Learning Claims)**: Angel i VLM Brain operują w trybie uziemionego wnioskowania kontekstowego (RAG) z deterministyczną weryfikacją dowodów i pamięcią sesyjną. System otwarcie i jednoznacznie odrzuca twierdzenia o autonomicznym uczeniu się wag modelu lub samoczynnym treningu.
2. **Blokada nieuprawnionych roszczeń (Claim Proof Firewall)**: Zapora `claim-proof-firewall.ts` aktywnie blokuje zwroty takie jak `autonomous model learning` i `continual weight updates`.
3. **Działający potok feedbacku (Feedback Pipeline)**: Dostępny pod `/api/angel/feedback` dla metod `POST` (zapis oceny, kategorii, ustrukturyzowanego komentarza z inspekcją bezpieczeństwa) i `GET` (zagregowane statystyki ocen i oświadczenie o prawdzie architektonicznej).
4. **Odporność komentarzy na ataki**: Wszelkie próby prompt injection w komentarzach feedbacku są natychmiast odrzucane z kodem HTTP 400.
5. **Obsługa aktualnych modeli Gemini**: Aktualizacja przestarzałych referencji modelowych na aktywne modele (`gemini-3.6-flash`, fallbacki `gemini-3.7-flash`, `gemini-3.8-flash`) z poprawnym timeoutem `25000ms`.

## AKTUALNY PROBLEM
Wcześniej w systemie brakowało dedykowanego endpointu feedbacku dla interakcji asystenta, a domyślna konfiguracja modeli LLM wskazywała na wycofany przez Google model `gemini-2.5-flash` / `gemini-2.0-flash` (zwracający błąd 404), co wymuszało fallback. Ponadto brakowało formalnego testu weryfikującego granice twierdzeń o uczeniu maszynowym.

## ZMIANY WYKONANE
1. **Zaimplementowano Potok Feedbacku**:
   - Utworzono moduł `lib/ai/angel-feedback-pipeline.ts` z walidacją ocen, kategorii, buforem pierścieniowym w pamięci oraz opcjonalnym zapisem do bazy Supabase.
   - Utworzono endpoint `app/api/angel/feedback/route.ts` obsługujący `POST` (zapis z kontrolą rozmiaru, inspekcją prompt injection i rate limitingiem) oraz `GET` (odczyt zagregowanych metryk).
2. **Usunięto luki w konfiguracji modeli LLM**:
   - Zaktualizowano domyślny model w `lib/ai/vlm-provider-registry.ts` na `gemini-3.6-flash`.
   - Zaktualizowano listę kandydatów fallback w `lib/ai/vlm-provider-fallback-policy.ts` o modele `gemini-3.6-flash`, `gemini-3.7-flash`, `gemini-3.8-flash`.
   - Skonfigurowano `VELMERE_GEMINI_MODEL=gemini-3.6-flash` oraz `VELMERE_GEMINI_TIMEOUT_MS=25000` w `.env.local`.
3. **Wzmocniono zaporę twierdzeń o AI**:
   - W `lib/ai/claim-proof-firewall.ts` dodano blokadę fraz `autonomous model learning` oraz `continual weight updates`.
   - W `lib/ai/angel-prompt-contract.ts` włączono jawną instrukcję systemową nakazującą informowanie o działaniu w trybie RAG i deterministycznym uziemieniu dowodowym oraz zabraniającą twierdzeń o samouczeniu wag.
4. **Stworzono i uruchomiono testy**:
   - Utworzono zestaw testowy `tests/security/a102-ai-brain-learning-claims-truth.test.ts` (29/29 asercji na zielono).
   - Zweryfikowano działanie testów pamięci trwałej (`test-angel-durable-memory-delete-fail-closed.mts`).
   - Zweryfikowano zachowanie jądra VLM Brain i ewaluacji A88 (5760 mutacji, 0 ucieczek).
   - Czystość kompilatora TypeScript: 0 błędów.

## TESTY
- `node node_modules/tsx/dist/cli.mjs tests/security/a102-ai-brain-learning-claims-truth.test.ts` -> PASS (29/29 asercji)
- `node node_modules/tsx/dist/cli.mjs scripts/current-execution/test-angel-durable-memory-delete-fail-closed.mts` -> PASS (53 asercje, DELETE fail-closed)
- `node tests/security/a102-p36-ai-final-output-revalidation.test.mjs` -> PASS (55/55 asercji)
- `node node_modules/tsx/dist/cli.mjs scripts/pass36/verify-a88-brain-angel-risk-eval.ts` -> PASS (20/20 asercji, 5760 mutacji)
- `node scripts/pass36/execute-pass6-angel-adversarial-ai.mjs` -> PASS (5/5 live probes, offline A88 passed)
- `node node_modules/typescript/bin/tsc --noEmit --project tsconfig.json` -> 0 errors

## RUNTIME EVIDENCE
```text
Live API Verification (port 3000):
1. POST /api/angel/feedback (valid payload):
   Status: 200 OK
   Body: { ok: true, feedbackId: "6396328998d6e7891b7b58b2", marker: "pass2235-angel-feedback-pipeline-evidence-quality-v1" }
2. POST /api/angel/feedback (malicious prompt injection attempt in comment):
   Status: 400 Bad Request
   Body: { ok: false, error: "comment_rejected_by_security_policy", marker: "pass2235-angel-feedback-pipeline-evidence-quality-v1" }
3. GET /api/angel/feedback?locale=en:
   Status: 200 OK
   Body: { ok: true, metrics: { totalCount: 1, positiveCount: 1, learningTruthStatement: "Angel and VLM Brain operate via grounded retrieval-augmented context (RAG) with deterministic evidence verification..." } }
4. POST /api/angel (live LLM transport with Gemini 3.6 Flash):
   Status: 200 OK | providerMode: gemini_live | model: gemini-3.6-flash
```

## BROWSER EVIDENCE
- Potwierdzono działanie interfejsu asystenta Angel z uziemieniem kontekstowym i poprawną atrybucją dowodową (brak obietnic samouczenia się modelu).
- Dostępność API feedbacku umożliwia zbieranie reakcji użytkowników bez ujawniania danych wrażliwych.

## PROVIDER EVIDENCE
- Zidentyfikowano i naprawiono przestarzałą referencję modelu `gemini-2.5-flash` na aktywny model produkcyjny `gemini-3.6-flash` z autoryzowanym kluczem Google Gemini.
- Zapytania do providera są chronione budżetem czasowym (25 000 ms) oraz zaporą brokered egress.

## CUSTOMER VALUE
Klient otrzymuje bezwzględną przejrzystość techniczną: platforma nie manipuluje zaufaniem inwestora fałszywym marketingiem o "samouczącym się AI", lecz udostępnia niezawodną, uziemioną w faktach analizę opartą na zweryfikowanym RAG i transparentnym mechanizmie feedbacku.

## IMPLEMENTED
✓

## VERIFIED
✓

## BLOCKERS
Brak.

## RESIDUAL RISKS
Brak.

## NEXT PASS
`PASS-012` (Risk Engine Determinism, Bounds & Traceability)
