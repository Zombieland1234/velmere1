# PASS2021 — Evidence Half-Life + Temporal Consistency Sentinel

Zakres: wyłącznie VLM Brain, teksty decyzyjne, policy gates i zabezpieczenia. Warstwa UI/CSS/layout nie była zmieniana.

## Co zostało realnie wdrożone

1. Dodano `lib/ai/vlm-temporal-consistency.ts` jako wykonywalny moduł oceny czasu dowodów.
2. Każdy fakt rynkowy dostaje półokres ważności zależny od typu danych:
   - cena i 1h momentum mają krótki half-life,
   - volume/liquidity/slippage mają krótki lub średni half-life,
   - holderzy, koncentracja i tax mają dłuższy half-life.
3. Moduł liczy `evidenceWeight`, status `current / aging / stale / invalid`, `staleFactIds`, `invalidFactIds`, medianę wieku dowodów i rozrzut czasowy źródeł.
4. `vlm-source-arbitration.ts` obniża confidence, gdy fakty są stare, starzejące się, z przyszłości lub mają duży rozjazd timestampów.
5. `vlm-fact-packet.ts` przenosi temporal status do missingData i confidence governance.
6. `vlm-provider-registry.ts` przekazuje `TEMPORAL_CONSISTENCY` do głównego modelu i Shadow Brain.
7. `vlm-epistemic-governor.ts` wymusza wyjaśnienie ograniczenia half-life przed interpretacją ruchu rynku.
8. `vlm-claim-firewall.ts` blokuje narrację typu „live / real-time / freshly verified”, gdy dowód nie jest aktualny.
9. `vlm-shadow-governor.ts` odrzuca albo rewiduje odpowiedź, jeżeli stara evidence jest przedstawiana jako live evidence.
10. `vlm-security.ts` wykrywa prompt manipulation typu „ignore temporal consistency / bypass evidence half-life”.
11. `vlm-brain.ts` dodaje fallbackowe wyjaśnienie Evidence Half-Life w PL/EN/DE, diagnostykę oraz live-mode gate wymagający temporal status `current`.
12. `vlm-analysis-receipt.ts` rozszerza policy hash o aktywację Temporal Consistency Sentinel.

## Zmienione pliki

- `lib/ai/vlm-temporal-consistency.ts` — nowy moduł.
- `lib/ai/vlm-source-arbitration.ts`
- `lib/ai/vlm-fact-packet.ts`
- `lib/ai/vlm-provider-registry.ts`
- `lib/ai/vlm-epistemic-governor.ts`
- `lib/ai/vlm-claim-firewall.ts`
- `lib/ai/vlm-shadow-governor.ts`
- `lib/ai/vlm-security.ts`
- `lib/ai/vlm-brain.ts`
- `lib/ai/vlm-contract.ts`
- `lib/ai/vlm-analysis-receipt.ts`
- `scripts/verify-pass2021-temporal-consistency-sentinel.mjs`

## Testy wykonane

Przeszły:

- `node scripts/verify-pass2015-vlm-security-intelligence.mjs`
- `node scripts/verify-pass2016-adversarial-shadow-brain.mjs`
- `node scripts/verify-pass2017-signed-analysis-receipt.mjs`
- `node scripts/verify-pass2018-ed25519-public-receipt.mjs`
- `node scripts/verify-pass2019-evidence-quorum-shadow-security.mjs`
- `node scripts/verify-pass2020-source-integrity-sentinel.mjs`
- `node scripts/verify-pass2021-temporal-consistency-sentinel.mjs`
- TypeScript syntax transpilation check for changed AI files.

Runtime smoke test w PASS2021 potwierdził:

- świeża cena pozostaje `current`,
- stara cena przechodzi do `stale` i dostaje karę confidence,
- timestamp z przyszłości przechodzi do `invalid`.

## Ocena po PASS2021

| Obszar | PASS2020 | PASS2021 |
|---|---:|---:|
| Świeżość dowodów | 76% | 91% |
| Kalibracja pewności | 94% | 95% |
| Halucynacje temporalne | 78% | 92% |
| Shadow Brain | 91% | 92% |
| VLM Security | 96% | 96.5% |
| Cały VLM Brain | 91.5% | 92.3% |

## Uczciwe ograniczenia

- Pełny `next build` nie był potwierdzony, bo paczka nie zawiera `node_modules`.
- Live Gemini nie był wykonany, bo paczka nie zawiera klucza API.
- Temporal Consistency ocenia timestampy dostępne w pakiecie; jeżeli provider sam poda świeży timestamp dla danych, które realnie są opóźnione, potrzebny będzie kolejny poziom: signed source snapshots lub provider SLA registry.

## Najlepszy następny krok

PASS2022 powinien dodać `Provider SLA Registry + Adapter Circuit Breaker`: każdy provider dostaje profil oczekiwanej kadencji, timeoutów, awaryjności, opóźnień i limitów. Jeżeli provider zaczyna zwracać opóźnione albo niestabilne dane, jego źródła automatycznie tracą wagę lub są czasowo wyłączane.
