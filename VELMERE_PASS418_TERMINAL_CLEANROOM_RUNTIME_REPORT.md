# PASS418 — Terminal Cleanroom Runtime

## Cel
Stabilizacja Velmère Shield, Velmère Browser/Lens i Real Markets bez ponownego montowania ciężkiego Orbit 360 w modalu. Najpierw terminal ma być czysty: search bez laga, chart bez przeskoku, output bez React object crash, PDF preview/download 1:1.

## Zmiany
- Browser/Lens: sugestie zostają inline pod prawdziwym inputem, max 3, bez floating portalu.
- Browser/Lens: `useDeferredValue(query)` odcina ranking sugestii od każdej natychmiastowej klatki wpisywania.
- Shield: sugestie max 3, deferred local ranking i close bus przed modalem / chartem / route handoff.
- Real Markets: chart-first modal, Basic / Pro / Advanced jako stabilne 10 / 14 / 20 pól, bez Orbit 360 w modalu.
- Real Markets: kolejny provider-ready universe + realne visual patches dla ETF, FX, commodities, REIT, cyber/software/commerce stocks.
- React safety: `pass418SafeText` rozbija obiekty typu `{ price, change }` na tekst przed JSX.
- PDF parity: PASS418 sekcja HTML i strona PDF korzystają z tego samego resolved payloadu, locale i field order.

## Guardrail
Orbit 360 zostaje zaparkowany za lazy crash boundary. Wraca dopiero jako osobny izolowany komponent po zamknięciu kernel paniców.

## Public copy
Security / Research zostają proste: warstwy zabezpieczeń, redakcja szczegółów, audyt, replikacja, falsyfikacja. Bez udawania live danych i bez niezweryfikowanych deklaracji.
