# CODEX — VLM AI RISK BRAIN ONLY-ONE-FILE PASS 3

Masz pracować WYŁĄCZNIE w folderze `C:\Users\marci\Desktop\codex`.

## Najważniejsza zasada
NIE OTWIERAJ pełnego repo Velmère.
NIE edytuj projektu w `Documents`, `trae_projects`, `Downloads` ani żadnego innego katalogu.
NIE uruchamiaj `git`.
NIE rób zmian poza folderem `C:\Users\marci\Desktop\codex`.

Masz edytować dokładnie jeden plik:

`CODEX_EDIT_THIS_ONE_FILE_AI_RISK_BRAIN_risk-engine (1).ts`

Wszystkie pozostałe pliki w folderze `codex` traktuj jako referencję tylko do czytania.

## Cel
To nie jest UI, animacje, tłumaczenia ani repo deployment.
To jest tylko mózg AI liczący ryzyko tokena: `risk-engine.ts`.

Masz zrobić głęboki pass nad scoringiem i meta-modelem VLM Shield, żeby engine działał jak spokojny śledczy OSINT / on-chain risk analyst, a nie hype bot.

## Co ma robić engine
Engine ma analizować token przez warstwy:

1. Velocity / price movement
- 1h, 24h, 7d, 30d pump/dump.
- Paraboliczne wzrosty mają zwiększać ryzyko, ale nie mogą automatycznie oznaczać scam.
- Mega-cap typu BTC/ETH nie może być karany tak samo jak low-cap memecoin za zwykłą zmienność.

2. Liquidity / exit risk
- Volume / market cap.
- Liquidity USD.
- DEX liquidity.
- Orderbook depth, spread, slippage, imbalance.
- Thin liquidity + pump = mocny risk floor.
- Brak liquidity/orderbook danych = limitation + uncertainty, nie udawaj pewności.

3. Supply / float / FDV
- Circulating supply vs total/max supply.
- FDV/market cap gap.
- Low float i supply overhang mają być czerwone flagi, szczególnie po pompach.
- Jeżeli supply danych brakuje, missing data ma zwiększać uncertainty.

4. Holder concentration
- Top holders.
- Team / CEX / LP / unknown wallet labels.
- Brak holderów nie oznacza bezpieczeństwa.
- Wysoka koncentracja + słaba płynność = mocny risk floor.

5. Contract/admin risk
- Owner privileges.
- Proxy/upgradeability.
- Mint.
- Pause.
- Blacklist.
- Sell tax.
- Honeypot / transfer restrictions.
- Contract privileges muszą mieć mocny wpływ na wynik, ale język outputu ma mówić `requires review`, nie oskarżać bez dowodu.

6. Stablecoin / RWA handling
- Stablecoin nie może być oceniany jak memecoin.
- RWA/stablecoin muszą mieć osobną logikę:
  - peg/depeg,
  - reserve/issuer/redemption proof limitations,
  - volume anomaly,
  - supply anomalies,
  - missing reserve proof = limitation + confidence cap.
- Stablecoin z małym ruchem ceny nie powinien dostawać fałszywie wysokiego velocity risk.
- Stablecoin z depeg ma dostać mocny risk floor.

7. Data quality / confidence
- Confidence ma być osobnym pojęciem od risk score.
- Low confidence nie może dawać fałszywie niskiego risku.
- Missing critical data powinno:
  - dodać limitation,
  - obniżyć confidence,
  - delikatnie podnieść score/prescreen risk,
  - wymusić manual review wording.
- Nie wolno mówić, że token jest bezpieczny, kiedy brakuje supply/holder/contract/orderbook danych.

8. Meta-model
- `metaModel.summary` ma brzmieć jak operator SOC:
  - quick verdict,
  - red flags,
  - evidence status,
  - missing data,
  - next action.
- `metaModel.limitations` ma zawierać realne ograniczenia:
  - no OSINT source ledger,
  - vesting not verified,
  - contract permissions unavailable,
  - orderbook unavailable,
  - holder labels not verified,
  - reserve proof missing dla stable/RWA.
- `metaModel.finalVerdict` ma być spokojny:
  - anomaly,
  - requires review,
  - prescreen only,
  - evidence incomplete.
- Zero hype, zero buy/sell calls, zero gwarancji.

## Scenariusze, które engine musi rozróżniać
Nie musisz robić test runnera, ale logika w pliku ma być skalibrowana pod te case’y:

### A. BTC / ETH mega-cap
- Duży market cap.
- Naturalna zmienność.
- Nie karz mocno za samo volume/market ratio.
- Jeśli brak danych kontraktu/holderów, pokaż limitations, ale score nie może robić fake critical bez innych sygnałów.

### B. Stablecoin
- Cena blisko 1 USD.
- Mały price movement.
- Jeżeli reserve proof / issuer / redemption danych brakuje: confidence cap i limitations.
- Jeżeli depeg lub duży wolumen anomalii: risk floor.

### C. RWA / tokenized fund
- Niska zmienność nie oznacza automatycznego bezpieczeństwa.
- Brak issuer/redemption/reserve proof = limitation.
- Nie dawaj hype verdictu.

### D. Low-float pump
- 7d/30d parabolic gain.
- Circulating supply dużo mniejsze niż total/max.
- FDV/MC gap wysoki.
- Powinno dawać high/critical risk floor zależnie od liquidity i confidence.

### E. Contract trap
- Blacklist + mint + pause/proxy/high tax.
- To musi mocno podnosić score.
- Język: `contract controls require manual review`, nie `confirmed scam`.

### F. Thin-liquidity exit risk
- Pump + very thin liquidity/orderbook/slippage.
- Musi podnieść score i wygenerować next action: inspect depth / exit liquidity / holders.

### G. No data token
- Brak supply, holders, contract, orderbook, OSINT.
- Nie może wyjść “low risk / safe”.
- Ma być prescreen only, low confidence, limitations i manual review.

## Zakazy w kodzie
Nie wolno:
- importować bibliotek,
- używać `fetch`,
- używać `window`, `document`, browser APIs,
- używać Node APIs,
- zmieniać nazw eksportów publicznych,
- zmieniać typów referencyjnych, jeśli są w osobnym pliku,
- dodawać `any`,
- dodawać języka typu:
  - `safe investment`,
  - `guaranteed`,
  - `buy`,
  - `sell`,
  - `scam confirmed`,
  - `fraud proven`.

## Technicznie
Masz zachować zgodność z referencyjnym `risk-types`.
Jeżeli dodajesz nowy signal id, MUSI on już istnieć w referencyjnych typach. Jeżeli nie istnieje, nie dodawaj go.
Lepsze jest użycie istniejących signal id niż rozwalenie kompilacji.

## Co konkretnie poprawić w pliku
1. Przejrzyj `computeDataConfidence`.
2. Przejrzyj `buildLimitations`.
3. Przejrzyj `computeFusedRiskScore`.
4. Przejrzyj asset profiling stablecoin/RWA/standard.
5. Przejrzyj wszystkie miejsca, gdzie jest:
   - liquidity ratio,
   - fdv/market cap,
   - circulating/total/max supply,
   - holder concentration,
   - contract privilege,
   - missing data,
   - stablecoin peg.
6. Dodaj helpery tylko wtedy, gdy realnie upraszczają logikę.
7. Po zmianach przeczytaj cały plik jeszcze raz pod kątem:
   - TypeScript errors,
   - undefined variable,
   - duplicate function,
   - unreachable code,
   - signal id spoza typu,
   - wyników zbyt niskich przy braku danych.

## Format odpowiedzi końcowej
Na końcu nie pisz eseju.
Zwróć:

1. `CHANGED FILE:` i dokładną nazwę pliku.
2. Krótki changelog max 12 punktów.
3. Listę najważniejszych scenariuszy i jak logika teraz je traktuje.
4. Pełną zawartość finalnego pliku `CODEX_EDIT_THIS_ONE_FILE_AI_RISK_BRAIN_risk-engine (1).ts`.
5. Niczego nie pakuj do ZIP.
6. Nie zmieniaj nazwy pliku.
