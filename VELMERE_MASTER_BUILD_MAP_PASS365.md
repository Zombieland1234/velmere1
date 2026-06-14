# VELMERE MASTER BUILD MAP · PASS365

Scope: build blocker fix + Shield search local-first + Real Markets chart/logo deepening.

## Fixed blockers
- ShieldMapClient TSX compile blocker at search portal data attribute.
- Shield search input lag from live API calls during typing.
- Real Markets logo empty badge failure when remote logo surface fails.
- Real Markets chart missing timeframe controls and looking weaker than Shield modal.
- Modal side grid no longer carries long explanatory text.

## Implemented
- PASS365 local-first Shield search: Browser/Real Markets style suggestions, scan resolves live only on submit.
- PASS365 Real Markets timeframe controls: 1H, 4H, 1D, 1W.
- PASS365 chart generator adapts candle count, interval and volatility per timeframe.
- PASS365 preflight-safe remote logo surface using favicon background, not raw img.
- PASS365 expanded stock set with additional major names and prices.
- PASS365 guard: verify:pass365-build-search-real-markets.

## Next focus
- Replace deterministic preview candles with provider-backed candles when API keys exist.
- Add more curated company/exchange domains and class badges.
- Move Real Markets modal even closer to Shield TokenRiskModal visual language.
- Continue Shield search parity: keyboard navigation, exact result open and fallback UX.
