# VELMERE PASS408 — Terminal Source Proof Orbit

## Cel
PASS408 domyka kolejny etap po PASS407: jeden payload i jeden runtime close bus dla Browser, Shield, Shield Map i Real Markets. Priorytetem jest ograniczenie losowego copy w PDF, dopięcie zgodności preview/download oraz dalsze zbliżenie Real Markets do zachowania Shield.

## Najważniejsze wdrożenia
- Dodano `lib/market-integrity/pass408-terminal-source-proof-orbit.ts`.
- Dodano `PASS408_RUNTIME_CLOSE_EVENT` jako wspólny event zamykania search/dropdownów przed modalem, PDF forge, preview, download, scroll i tab switch.
- Real Markets dostał kolejny provider-ready universe: Oracle, SAP, ServiceNow, Atlassian, Okta, Zscaler, Palo Alto, Fortinet, Broadcom, Qualcomm, LVMH, Hermès, Richemont, Prosus, Alibaba HK, Tencent HK, FX CEE, metale, ropa i REIT/ETF.
- Dodano deterministic visual patches i pseudo-price lanes dla nowych instrumentów.
- Orbit 360 Brain dostał PASS408 source-proof readout: VLM coin, blue neural shell, 192 source packets, timeline i output 10/14/20 pól zależny od Basic/Pro/Advanced.
- Browser/Lens PDF dostał stronę 34 `PASS408 TERMINAL SOURCE PROOF ORBIT`.
- Preview HTML dostał sekcję `data-pass408-preview-download-parity`.
- Real Markets catalog API dostał PASS408 rows i PASS408 contract.

## Walidacja
- `npm run verify:pass408-terminal-source-proof-orbit` ✅
- `npm run verify:pass407-terminal-exact-payload-orbit` ✅
- `npm run check:i18n` ✅
- `npm run vercel:preflight` ✅

## Granica produktu
PASS408 nie udaje pełnego live market feed bez providerów. UI jest provider-ready: pokazuje miejsce na freshness, reconnect, fallback flag, second-source drift, candles i source proof, ale live confidence ma wzrosnąć dopiero po podpięciu realnych adapterów OHLCV/orderbook.
