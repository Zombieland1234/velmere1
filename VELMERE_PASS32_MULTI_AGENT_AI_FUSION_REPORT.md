# Velmère Pass 32 — Multi-Agent AI Fusion Layer

## Cel
Pass 32 rozbudowuje Velmère Shield z prostego scoringu anomalii w stronę architektury multi-agentowej: osobne agenty analizują różne warstwy ryzyka, a meta-model łączy ich wnioski w jeden wynik.

## Dodane elementy

### 1. Nowe typy danych
Zaktualizowano `lib/market-integrity/risk-types.ts`:

- `RiskAgentId`
- `RiskAgentAssessment`
- `RiskMetaModel`
- `agentAssessments` w `TokenRiskResult`
- `metaModel` w `TokenRiskResult`

### 2. Multi-agent scoring v2
Zaktualizowano `lib/market-integrity/risk-engine.ts`:

- Agent Velocity / Pump
- Agent Liquidity / Volume
- Agent Order Book / Microstructure
- Agent Holders / Supply
- Agent Smart Contract
- Agent Data Quality

Każdy agent zwraca:

- score 0–100,
- confidence,
- verdict,
- liczbę dowodów,
- reasoning,
- next action.

### 3. Meta-model
Dodano `buildMetaModel()`, który tworzy:

- finalny verdict,
- dominant agent,
- conflict level,
- data fusion score,
- required review,
- escalation,
- limitations.

### 4. UI w popupie tokena
Zaktualizowano `components/market-integrity/TokenRiskModal.tsx`:

- panel Multi-agent fusion,
- werdykt meta-modelu,
- konflikt sygnałów,
- matryca agentów Shield,
- paski score dla każdego agenta,
- confidence/evidence count.

### 5. Tłumaczenia
Zaktualizowano:

- `messages/pl.json`
- `messages/en.json`
- `messages/de.json`

## Ważne ograniczenie
To nadal jest transparentny agentowy scoring, nie produkcyjny model GNN/mempool/social-NLP. Architektura jest przygotowana pod te moduły, ale pełna warstwa AI wymaga bazy historii, cache, schedulerów, danych on-chain, social feeds i osobnych modeli anomalii.

## Testy

- `node scripts/check-i18n.mjs` ✅
- `node scripts/vercel-preflight.mjs` ✅
- zip integrity ✅
