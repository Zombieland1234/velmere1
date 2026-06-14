# PASS384 — Production Fidelity Spine

## Cel
PASS384 kontynuuje clean launch po PASS383: zamiast dokładania kolejnych publicznych ścian debugowych, wzmacnia jeden kontrakt produktu dla Real Markets, Shield, Velmère Browser PDF, Security i Research Lab.

## Zrobione
- Dodano `lib/market-integrity/pass384-production-fidelity-spine.ts`.
- Real Markets dostał kolejny katalog provider-ready: giełdy tradycyjne, banki, data/rating spółki, EU/Asia stocki, FX, ETF, commodities i real-estate proxy.
- Real Markets UI łączy PASS384: logo → Shield-grade candles → Basic / Pro / Advanced → VLM AI Brain → PDF mirror.
- VLM AI Brain dostał production readout 10 / 14 / 20 pól i nowy flow: Identity seal → Provider lock → Candle forge → Neural flow → Security bridge → Prime Lab → Readout → PDF mirror.
- Browser Lens PDF dostał stronę 17: `PASS384 PRODUCTION FIDELITY SPINE`.
- HTML preview dostał sekcję `pass384-production-fidelity`, aby preview/download trzymały ten sam resolved report object.
- Security page dostała prostą publiczną sekcję PASS384: private key boundary, provider truth, entropy quality, redacted proof.
- Research Lab dostał prostą narrację PASS384: banki → kryptografia → ECC/BTC → real RNG → liczby pierwsze → Bajak Protocol jako audyt.
- Real Markets API `/api/market-integrity/real-markets/catalog` uwzględnia PASS384 i zwraca nowy kontrakt/provider checklist.

## Ważne granice
- Nie udajemy live price bez providera, timestampu, OHLCV, cache age i fallback flag.
- Nie publikujemy instrukcji tworzenia portfeli, seed phrase, raw private keys ani operatorowych progów.
- Bajak Protocol jest opisany jako numerical audit / finite reconstruction / falsification / replication path, nie formalny proof RH bez niezależnej recenzji.

## Walidacja
- `npm run verify:pass384-production-fidelity-spine` ✅
- `npm run verify:pass383-clean-launch-brain` ✅
- `npm run check:i18n` ✅
- `npm run vercel:preflight` ✅ — scanned 685 files

## Typecheck
Pełny `typecheck` nie został oznaczony jako zielony, bo projekt dziedziczy wcześniejsze braki środowiska/zależności Next/React/Node. PASS384 nie dodaje nowego typu błędu do tego znanego stanu.
