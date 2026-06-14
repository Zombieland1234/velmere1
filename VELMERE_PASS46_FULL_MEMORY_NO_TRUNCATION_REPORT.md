# Velmère Shield — Pass 46

## Cel passu
Ten pass jest korektą tego, co było ustalane w poprzednich oknach: nie ucinamy plików, nie robimy pustych placeholderów, poprawiamy mózg ryzyka, holderów, raporty JSON i kontrolę jakości projektu.

## Najważniejsze zmiany

### 1. Holder Intelligence v1
Dodany nowy silnik:
- `lib/market-integrity/holder-intelligence.ts`

Silnik buduje:
- holder risk score,
- data completeness,
- holder flow nodes,
- holder flow edges,
- concentration lane,
- float/unlock lane,
- exit-liquidity lane,
- turnover-pressure lane,
- missing-data list,
- next actions.

Nie udaje pełnej pewności, jeśli nie ma prawdziwego źródła holderów. Braki danych są pokazywane jako uncertainty, nie jako bezpieczeństwo.

### 2. Holder Intelligence API
Dodany endpoint:
- `/api/market-integrity/holders?query=BTC`
- `/api/market-integrity/holders?query=SOL`
- `/api/market-integrity/holders?query=OM`

Plik:
- `app/api/market-integrity/holders/route.ts`

### 3. Evidence report rozszerzony
Endpoint:
- `/api/market-integrity/report?query=...`

zawiera teraz również:
- `holderIntelligence`

Obok istniejących:
- `riskBrain`,
- `attackSurface`,
- `rules`,
- `investigationPlan`,
- `history`.

### 4. Risk Brain v1.1
Plik:
- `lib/market-integrity/risk-brain.ts`

Dodałem cross-layer synergy checks:
- pump without exit depth,
- holder pressure vs liquidity,
- order book vs price motion,
- data uncertainty.

To zaczyna zachowywać się bardziej jak meta-model ryzyka, a nie tylko suma punktów.

### 5. Token modal — holder flow map
Plik:
- `components/market-integrity/TokenRiskModal.tsx`

Panel holderów dostał:
- holder flow map,
- node risk,
- confidence per node,
- edge pressure,
- data completeness,
- lane scoring,
- link do `/api/market-integrity/holders`.

Zamiast pustego / biednego holder bloku jest teraz panel, który pokazuje co system wie, czego nie wie i co trzeba podpiąć dalej.

### 6. No-truncation guard
Dodany skrypt:
- `scripts/verify-market-integrity-no-truncation.mjs`

Dodany script w `package.json`:
- `npm run verify:shield`

Sprawdza:
- czy kluczowe pliki istnieją,
- czy nie ma placeholderów ucięcia,
- czy pliki nie są podejrzanie krótkie,
- czy TS/TSX przechodzi smoke transpile.

## Sprawdzone
- `npm run check:i18n` ✅
- `npm run vercel:preflight` ✅
- `npm run verify:shield` ✅
- zip test ✅

## Uczciwie
Pełny `next build` nadal wymaga lokalnego `node_modules`, więc w sandboxie sprawdzam statycznie i składniowo. Ten pass dodatkowo pilnuje, żeby nie było uciętych plików.
