# VELMÈRE EDITING GUIDE

Ta paczka jest taka sama jak `velmere_vlm_square_modal_hotfix_ready.zip`, ale ma dodany folder:

`EDITING_MAP/`

Tam masz mapę: który plik odpowiada za którą część strony. Dzięki temu nie musisz wysyłać mi całego projektu. Możesz wysłać jeden konkretny plik, np. tylko Square albo tylko Login.

Najważniejsze:

- Nie zmieniaj nazw produkcyjnych plików w projekcie bez aktualizacji importów.
- Next.js i React używają importów po ścieżkach, więc mechaniczne nazwanie pliku np. `strona_glowna.tsx` mogłoby zepsuć build.
- Zamiast tego dodana jest czytelna mapa i skróty.

Szybka mapa:

- Header: `components/Navbar.tsx`
- Home: `components/home/HomePageClient.tsx`
- Neural visual: `components/home/NeuralBrainVisual.tsx`
- VLM Token: `components/vlm/VlmAccessGatePage.tsx`
- VLM popup Basic/Pro: `components/vlm/VlmModeChoicePrompt.tsx`
- Square: `components/square/VelmereSquareClient.tsx`
- Login: `components/auth/AuthGate.tsx`
- Account: `components/dashboard/DashboardClient.tsx`
- Cart: `components/CartDrawer.tsx`
- Shop grid: `components/shop/ShopPageClient.tsx`
- Product page: `components/shop/ProductDetailClient.tsx`
- Angel AI: `components/angel/AngelPanel.tsx`
- Wallet: `components/wallet/WalletConnectButton.tsx` + `lib/wallet/useWalletConnect.ts`
- Global CSS: `app/globals.css`
- Page transitions: `components/PageTransition.tsx`
- Translations: `messages/en.json`, `messages/pl.json`, `messages/de.json`

Pełna mapa jest w:

`EDITING_MAP/README_SEND_ME_THIS.md`
