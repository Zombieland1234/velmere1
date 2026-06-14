# PASS413 · Terminal Stability Runtime

Zakres: bugfix + stability pass po PASS412, bez ponownego włączania ciężkiego Orbit 360 w modalu Real Markets.

## Zrobione
- Velmère Browser: sugestie Lens są renderowane inline pod prawdziwym inputem, nie przez body portal z wymuszonym topem CSS; limit max 3.
- Velmère Shield: search ma wspólny PASS413 close bus i marker max-3, bez live fetch na każdą literę.
- Real Markets / Real Stocks: dodany PASS413 provider-ready universe (+24 instrumenty) i zabezpieczenie przed renderem object-shaped metrics `{ price, change }`.
- Real Markets modal: Orbit 360 nadal pauzowany; Basic / Pro / Advanced nie spawnują neural layer, żeby nie wracał kernel panic.
- PDF/Lens: PASS413 dopina regułę jednego stable payloadu dla preview/download i dodaje prostą security/research boundary copy.
- CSS: PASS413 nadpisuje stare top-layer sugestie Browser, które uciekały na górę strony.

## Walidacja
- npm run verify:pass413-terminal-stability-runtime ✅
- npm run verify:pass412-terminal-bugfix-runtime ✅
- npm run check:i18n ✅
- npm run vercel:preflight ✅
- npm run typecheck ❌ niemiarodajne w paczce eksportowej bez pełnych typów/paczek Next/React/Node itd.

## Następny krok
Dopiero po potwierdzeniu, że search i modal już nie crashują, można wracać do Orbit Brain jako osobnego, izolowanego komponentu z error boundary i lazy mount.
