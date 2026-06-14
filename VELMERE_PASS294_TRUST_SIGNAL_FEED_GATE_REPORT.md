# Velmère PASS294 — Trust Signal Feed Gate

## Cel

PASS294 wzmacnia PASS293: jedna wyszukiwarka/router działa dalej, ale teraz wyniki pokazują jawny powód rankingu, source quorum, market-depth context, social context, operator boundary i anti-FOMO lane.

## Inspiracje po researchu

- MEXC: order book / depth ma być blisko decyzji, bo pokazuje płynność i warstwę realizacji zleceń.
- Meta / Instagram / Facebook: ranking sygnałów ma sens tylko wtedy, gdy użytkownik rozumie, dlaczego coś widzi.
- X: feed/recommendation layer musi być traktowany jako routing kontekstu, nie presja na natychmiastowe działanie.

## Zmienione pliki

- `lib/market-integrity/trust-signal-feed-gate.ts`
- `components/search/VelmereIntelligenceSearchClient.tsx`
- `components/market-integrity/MarketIntegrityClient.tsx`
- `components/market-integrity/ShieldMapClient.tsx`
- `app/globals.css`
- `scripts/verify-pass294-trust-signal-feed-gate-safety.mjs`
- `package.json`
- `VELMERE_MASTER_BUILD_MAP_PASS294.md`
- `docs/progress/PROJECT_PROGRESS_LEDGER.md`

## Realny product delta

| ID | Obszar | Previous | Current | Change |
|---|---|---:|---:|---:|
| E02 | Lens search UX | 96 | 98 | +2 |
| C02 | Shield search dropdown | 97 | 98 | +1 |
| C03 | Global token lookup | 66 | 68 | +2 |
| D16 | Source confidence lanes | 89 | 91 | +2 |
| D17 | Missing-data semantics | 90 | 92 | +2 |
| J03 | Responsive layout | 84 | 86 | +2 |
| A05 | Preflight guard system | 100 | 100 | +0 |

**PASS294 total:** +11 pkt.

## Walidacja

```bash
npm run verify:pass294-trust-signal-feed-gate
npm run verify:pass293-social-exchange-command-router-gate
npm run check:i18n
npm run vercel:preflight
```

Status: PASS dla guardów i preflight. Pełny typecheck nadal wymaga `node_modules` / typów Next/React/Node.

## Granica bezpieczeństwa

PASS294 nie dodaje buy/sell, countdown, fake scarcity ani obietnic zysku. Ranking jest transparentny i dowodowy: missing data zwiększa ostrożność, a social context nie obniża wymagań source quorum.
