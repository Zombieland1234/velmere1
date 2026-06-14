# Velmère Pass 04 — side drawer wallet overlay

## Zrobione

- `components/wallet/WalletConnectOptions.tsx`
  - Panel **Inne portfele** nie otwiera się już jako klasyczny centralny modal.
  - Panel otwiera się jako boczny drawer obok klikniętej karty/przycisku.
  - Dodałem animowany mostek/łącznik między kartą `Inne portfele` a wysuwanym panelem.
  - Panel ma bardzo wysoki `z-index` i jest renderowany przez `createPortal(document.body)`, więc nie powinien chować się pod headerem ani pod panelami strony.
  - Na mniejszych ekranach panel przechodzi w bezpieczny overlay, żeby nie wypadał poza viewport.
  - Poprawiłem layout kart walletów, żeby tekst typu `Phantom` nie łamał się pionowo i nie wyglądał jak rozwalona tabela.

- `components/vlm/VlmBuyAccessPanel.tsx`
  - Lewy panel VLM access jest teraz renderowany przez `createPortal(document.body)`.
  - Podniosłem `z-index` triggera i całego side panelu (`z-[1200+]`), żeby był nad headerem i nad wszystkimi elementami strony.
  - Panel nadal wysuwa się z lewej, ale nie powinien już być pod paskiem górnym.

## Sprawdzone

- `npm run check:i18n` — OK
- `npm run vercel:preflight` — OK
- Statyczny grep: brak `repeat: Infinity` i brak `iterationCount` w `app/`, `components/`, `lib/`.

## Uwaga

Pełny `npm run build` nie był uruchomiony w sandboxie, bo paczka nie zawiera `node_modules`. Konfiguracja Vercel zostaje pod `npm install` + `npm run build`.
