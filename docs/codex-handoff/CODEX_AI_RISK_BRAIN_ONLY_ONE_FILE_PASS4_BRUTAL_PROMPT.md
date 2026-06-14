# CODEX — VLM AI RISK BRAIN PASS 4 — BRUTAL ONE-FILE WORK MODE

Masz pracować WYŁĄCZNIE w:

`C:\Users\marci\Desktop\codex`

Masz edytować WYŁĄCZNIE:

`CODEX_EDIT_THIS_ONE_FILE_AI_RISK_BRAIN_risk-engine (1).ts`

## Twarde zakazy

NIE otwieraj pełnego repo Velmère.
NIE przechodź do Documents / trae_projects / Downloads / GitHub repo.
NIE używaj `git`.
NIE edytuj UI, animacji, CSS, tłumaczeń, Vercela ani package.json.
NIE kończ pracy po 5–12 minutach, jeśli plik ma jeszcze oczywiste słabe punkty.
NIE pisz “plik jest za długi, nie wklejam całości”.
NIE zwracaj fragmentów.
NIE zwracaj diffów.
NIE pakuj ZIP.
NIE zmieniaj nazwy pliku.

Na końcu masz zwrócić PEŁNĄ finalną zawartość całego pliku.

## Cel

Masz wycisnąć z jednego pliku risk-engine maksymalnie dobry mózg AI do VLM Shield.

To ma działać jak:
- on-chain investigator,
- OSINT analyst,
- SOC operator,
- calm risk analyst,
- anti-hype bot.

To NIE ma działać jak:
- hype bot,
- doradca inwestycyjny,
- scam caller bez dowodu,
- random score generator.

## Najważniejsze: confidence ≠ safety

Jeśli brakuje danych, engine NIE może dawać niskiego ryzyka tylko dlatego, że nic nie widzi.

Brak danych ma:
1. obniżać confidence,
2. dodawać limitations,
3. wymuszać manual review,
4. lekko podnosić prescreen risk,
5. blokować mocny clean verdict.

## Scenariusze obowiązkowe

Przeczytaj cały plik i skalibruj logikę pod te scenariusze:

### 1. BTC / ETH mega-cap
Nie dawaj fake critical za zwykłą zmienność.
Duży market cap + normalny volume nie oznacza exit scam.
Brak contract/holder danych może być limitation, ale nie automatyczny critical.

### 2. Stablecoin near peg
Stablecoin blisko 1 USD nie powinien dostać pump/dump risk.
Ale brak reserve proof / issuer / redemption status ma obniżać confidence i pojawić się w limitations.

### 3. Stablecoin depeg
Depeg ma mieć mocny floor risk.
Dodaj next action: verify reserve, redemption status, liquidity, exchange depth.

### 4. RWA / tokenized fund
Niska zmienność nie znaczy bezpieczeństwo.
Brak issuer proof / redemption proof / reserve proof to limitation.
Nie używaj ROI/yield language.

### 5. Low-float parabolic pump
Pump + low float + FDV/MC gap + weak liquidity = high/critical.
Supply overhang musi być silny.
Nie wolno tego traktować jak normalnego momentum.

### 6. Contract trap
Mint + pause + blacklist + high sell tax + proxy/owner control = mocny risk floor.
Język: `contract controls require manual review`, NIE `confirmed scam`.

### 7. Thin-liquidity exit risk
Pump + mała płynność / duży slippage / słaby orderbook = exit risk.
Next action: inspect depth, holders, liquidity zones.

### 8. No-data token
Brak supply, holders, contract, orderbook, OSINT.
Nie może wyjść “low risk / clean”.
Ma być low confidence, prescreen only, missing data, manual review.

### 9. KOL / social hype
Jeśli dane social/KOL są missing, limitation.
Jeśli są sygnały paid shill / undisclosed allocation / coordinated hype, score rośnie.
Nie oskarżaj bez dowodu.

### 10. Unlock / vesting
Brak vestingu to red flag/limitation.
Znane cliffy, unlocki team/investor/advisor/OTC/whale podnoszą risk, szczególnie przy pompach.

## Co przejrzeć w kodzie

Przejrzyj i popraw:
- asset profiling: standard/stablecoin/rwa/meme/unknown,
- `computeDataConfidence`,
- missing data handling,
- `buildLimitations`,
- `computeFusedRiskScore`,
- supply/fdv/float logic,
- liquidity/orderbook/slippage logic,
- holder concentration logic,
- contract privilege logic,
- stablecoin peg/depeg logic,
- metaModel summary/verdict/limitations,
- agentAssessments,
- scoreBreakdown,
- no-data fallback.

## Zakazy techniczne

Nie dodawaj:
- `fetch`,
- `window`,
- `document`,
- `localStorage`,
- Node APIs,
- bibliotek,
- `as any`,
- nowych publicznych exportów bez potrzeby.

Nie zmieniaj:
- publicznych nazw exportów,
- kontraktu wyniku,
- typów z referencyjnego pliku, jeżeli są poza tym jednym plikiem.

Jeśli dodajesz signal id, najpierw sprawdź, czy istnieje w referencyjnym `RiskSignalId`.
Jeśli nie istnieje, użyj istniejącego signal id.

## Język outputu engine

Dozwolone:
- anomaly,
- requires review,
- prescreen only,
- evidence incomplete,
- missing data,
- manual review,
- confidence limited,
- source ledger missing.

Zakazane:
- safe investment,
- guaranteed,
- buy,
- sell,
- moon,
- scam confirmed,
- fraud proven,
- risk-free.

## Minimalny standard końcowy

Zanim skończysz, sam sprawdź cały plik pod:
- undefined variable,
- duplicate helper,
- unreachable code,
- missing import,
- signal id spoza typu,
- `result.limitations`,
- `as any`,
- przypadkowe browser/Node API,
- za niski score przy no-data token,
- fake critical dla BTC/ETH.

## Format odpowiedzi końcowej

Odpowiedz dokładnie:

1. `CHANGED FILE: CODEX_EDIT_THIS_ONE_FILE_AI_RISK_BRAIN_risk-engine (1).ts`
2. `WHAT CHANGED:` max 12 punktów.
3. `SCENARIO CALIBRATION:` opisz krótko 10 scenariuszy.
4. `FINAL FILE:` i pełna zawartość całego pliku.

Nie pomijaj finalnego pliku.
Nie mów, że jest za długi.
Jeśli odpowiedź jest długa, kontynuuj w kolejnej wiadomości, ale nie skracaj pliku.
