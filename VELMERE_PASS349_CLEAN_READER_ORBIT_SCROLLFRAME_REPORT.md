# PASS349 — Clean Real Markets Reader + Orbit Scroll-Frame

Naprawiono publiczny wygląd Real Markets i kolejny raz wzmocniono Orbit drawer.

## Zmiany
- Real Markets: source lanes, next adapter step, exchange metrics i second-source flow są teraz w kontrolowanych rozwinięciach `<details>`.
- Provider contract jest collapsed, żeby góra strony nie wyglądała jak operator/debug panel.
- Karty real stocks/FX/ETF/commodities zostają jak Shield: logo, rola, review pressure, mini trend, human copy.
- Exchange Stability: metryki są w `Adapter checks`, bez powtarzania notki w każdej karcie.
- Orbit 360: dodany `shield-vlm-detail-scroll-frame-pass349` jako wewnętrzny scroll sandbox.
- Public drawer trim ukrywa ciężkie operatorowe dumpy z kafelków.
- Dodany guard `verify:pass349-clean-reader-orbit-scrollframe`.

## Testy
- `check:i18n` ✅
- `verify:pass348-real-market-pro-orbit-native` ✅
- `verify:pass349-clean-reader-orbit-scrollframe` ✅

## Nadal P0
- Real browser QA dla scrolla.
- Provider data/cache.
- PDF renderer visual regression.
- Full typecheck po zainstalowaniu zależności.
