# Velmère — WAAPI / Wallet / Signal / UI / legal-safe repair

## Co zostało naprawione

1. **Błąd animacji `startWaapiAnimation` / Framer Motion WAAPI**
   - Usunięto ryzykowne animacje SVG oparte o `pathLength`, animowane `cx/cy` i podobne keyframes, które najczęściej wywołują stack trace z `startWaapiAnimation`.
   - Zastąpiono je stabilnymi animacjami CSS: `velmere-dash-flow`, `velmere-pulse-dot`, `velmere-signal-ring`, `velmere-signal-node`.
   - Dodano obsługę `prefers-reduced-motion`, żeby animacje nie rozwalały przeglądarki i były bardziej dostępne.
   - Statyczny check po zmianach: brak `pathLength`, brak `animate` na `cx/cy` w `app/` i `components/`.

2. **Build error z Tailwind `border-white/12` w `@apply`**
   - W `app/globals.css` usunięto nieistniejące klasy z `@apply`, m.in. `border-white/12`, `border-white/8`, `ring-.../35`.
   - Zmieniono je na wartości wspierane przez Tailwind (`/10`, `/40`).

3. **VLM Basic / Pro — za duże napisy i nachodzenie elementów**
   - Zmniejszono rozmiary hero i kart w trybie Pro.
   - Poprawiono layout `VlmBasicProShowcase`, żeby tytuły nie nachodziły na panel po prawej.
   - Przełącznik Basic/Pro podniesiono nad dolny pasek / taskbar.

4. **Silnik sygnału VLM Pro**
   - Zamiast losowych kropek dodano semantyczny panel sygnału:
     - `EVM route`
     - `Wallet state`
     - `AMU signal`
     - `Contract: not deployed`
     - `Audit: required`
     - `Moderation: manual queue`
   - Przycisk „Otwórz wykres sygnału” pokazuje teraz sensowny status readiness, nie dekoracyjny obrazek.
   - Zachowano bezpieczny przekaz: to jest readiness/preview, nie dowód działania kontraktu.

5. **Wallet modal / connect wallet**
   - Przebudowano `WalletConnectOptions` na bardziej profesjonalny picker portfeli.
   - Dodano główne ścieżki: MetaMask i Phantom.
   - Dodano sekcję Other Wallets: WalletConnect, Browser Wallet, Coinbase Wallet, Rabby, Trust Wallet, Rainbow, Ledger Live.
   - Dodano statusy i jasne copy: read-only, no custody, zero seed phrase/private key.
   - WalletConnect nadal wymaga `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`.

6. **Square — plus i toast logowania**
   - Floating plus przeniesiony na prawą krawędź, środek ekranu.
   - Komunikat „login required before publishing to Square” jest teraz top-center, a nie przyklejony do prawej strony.
   - Toast ma osobny fixed wrapper bez konfliktu z transformami Framer Motion.

7. **Mail / prywatna notka**
   - Lewy przycisk Mail ustawiono wyżej, żeby nie nachodził na VLM.
   - Dodano notkę pod formularzem:
     - tylko konkretne i ważne sprawy,
     - zamówienia, prawo, security reports, pliki współpracy,
     - sprawy, których Angel nie rozwiąże w interfejsie,
     - nigdy seed phrase / private keys / recovery data.

8. **Twitter / X**
   - Zamiast tekstowego `X Twitter` i generycznego external-link dodano ikonę ptaszka Twittera jako inline SVG.

9. **Light theme**
   - Jasny motyw nie jest już czysto biały.
   - Zmieniono bazę na muted ivory / warm grey, żeby pasowało do luksusowego brandu i nie wyglądało jak niedopracowany tryb dzienny.

10. **Legal / cyber-safe framing**
   - VLM dalej jest opisany jako access/utility concept, nie inwestycja.
   - Brak obietnicy ceny, zysku, listingu, płynności, sprzedaży publicznej lub działającego kontraktu.
   - Raport Bajak może być używany jako ostrożny „numerical audit / visual identity layer”, nie jako dowód RH ani gwarancja cyberbezpieczeństwa.
   - Ontological Determinism z mocnymi claims traktować wyłącznie jako lore / koncept wizualny, nie tekst prawny ani naukową gwarancję.

## Zmienione pliki — główne

- `app/globals.css`
- `package.json`
- `components/wallet/WalletConnectOptions.tsx`
- `components/contact/FloatingMailWidget.tsx`
- `components/vlm/VlmBuyAccessPanel.tsx`
- `components/vlm/VlmModeSwitch.tsx`
- `components/square/VelmereSquareClient.tsx`
- `components/vlm/VlmBasicProShowcase.tsx`
- `components/vlm/VlmBasicPolkadotLanding.tsx`
- `components/vlm/VlmAccessGatePage.tsx`
- `components/vlm/PrimeFieldSimulation.tsx`
- `components/vlm/VlmAccessVisual.tsx`
- `components/vlm/VlmProVisual.tsx`
- `components/vlm/VlmAccessHeroVisual.tsx`
- `components/vlm/VlmSelectedSystems.tsx`
- `components/auth/LoginSecurityVisual.tsx`
- `components/lab/VelmereMotionLabClient.tsx`

## Sprawdzenia wykonane w sandboxie

- `npm run check:i18n` — OK, 3 locale files.
- Static grep — brak `pathLength`, brak animowania `cx/cy` w `app/` i `components/`.
- Usunięto krytyczny `@apply border-white/12`, który wcześniej wywalał Tailwind build.

## Czego nie mogłem uczciwie potwierdzić w sandboxie

- Nie uruchomiłem pełnego `next build`, bo w tym środowisku nie ma `node_modules`, a instalacja zależności potrafi przekroczyć limit czasu.
- `smoke:routes` wymaga działającego `localhost:3000`, więc bez uruchomionego `npm run dev` zwraca `fetch failed`.

## Po rozpakowaniu lokalnie

```bash
npm install
npm run check:i18n
npm run dev
# po sprawdzeniu UI:
npm run build
```

Jeżeli po `npm install` pojawi się konflikt Framer Motion, zostaw `framer-motion` na `^12.0.0`; celem jest zejście z bardzo starego `11.2.6` i usunięcie ryzykownych WAAPI/SVG keyframes.
