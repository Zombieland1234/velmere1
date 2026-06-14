# VELMERE MASTER BUILD MAP - PASS360

## PASS360 - Browser modal PDF forge, compact results, live confidence cleanup

### Naprawione realnie w kodzie
- VLM Browser/Lens: po kliknięciu „Otwórz podgląd PDF” nie generuje już kartki A4 na samym dole strony. Forge otwiera fixed centered modal z animacją V i etapami: source stitch → market context → A4 preview → Velmère signature.
- VLM Browser/Lens: podgląd A4 po forge otwiera się na środku ekranu w scrollowanym modal boxie. Kliknięcie poza panelem albo „Zamknij” wraca do listy.
- VLM Browser/Lens: przycisk „Pobierz PDF” jest w toolbarze modala, więc user nie musi zjeżdżać na dół strony.
- VLM Browser/Lens: multi-result search, np. jedna litera `l`, jest bardziej compact. Repetitive „Velmère Cybersecurity PDF preview” pod każdym tokenem nie zalewa już strony.
- CoinGecko live lane: query length 1 zwraca max 6 wyników zamiast długiej ściany.
- CoinGecko live lane: `sourceConfidence` nie jest już stałym 58% dla każdego live tokena. Wynik liczony jest z klasy aktywa, market cap, price/change/volume/image availability, z fixed baseline dla BTC/ETH/SOL/BNB/USDT/USDC/LINK/LTC.
- CoinGecko live copy: usunięte techniczne „live market row” z public summary; zastąpione spokojnym, ludzkim opisem co Lens rozpoznał i czego jeszcze brakuje.
- Lens downloadable PDF route: jeżeli token istnieje w CoinGecko top list, `/api/search/lens-report?format=pdf&q=...` próbuje zsynchronizować PDF z tym samym live resultem co Browser zamiast wpadać w lokalny fallback.
- Modal UX: body scroll lock na czas forge/preview, timer cleanup przy zamknięciu i unmount, żeby poprzedni timer nie otworzył starego PDF po kliknięciu innego tokena.

### Testy
- npm run verify:pass360-browser-pdf-modal-confidence - PASS
- npm run verify:pass359-browser-init-search-pdf-trim - PASS
- npm run check:i18n - PASS
- npm run vercel:preflight - PASS

### Nieoznaczone jako zrobione
- Pełny Next build/typecheck nadal nieodpalony, bo paczka eksportowa nie ma `node_modules`.
- PDF download ma lepsze dane z CoinGecko, ale pełny „AI bot” nadal wymaga realnych adapterów venue depth / second source / holder/context, inaczej raport ma uczciwie pokazywać missing evidence.

### Kolejne ID
- PASS361: rozbić Browser result card na clean single-card i multi-card modes bez ściany tekstu.
- PASS362: PDF V3: silniejsze asset-specific copy, mniej globalnego ogólnika, osobne profile stablecoin / exchange token / oracle / memecoin / stock / commodity.
- PASS363: wspólny search modal component dla Browser, Shield i Shield Map.
- PASS364: Real Markets card mode + logo resolver dla stock/commodity/exchange.
- PASS365: Orbit drawer content diet + scroll QA.
