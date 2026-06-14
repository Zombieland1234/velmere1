# Velmère – VLM / Square / Login / Motion final repair pass

## Naprawione

### Square modal
- Zmieniono `PageTransition` na fade-only bez `transform`, bo transform na rodzicu potrafi zepsuć pozycjonowanie `fixed` modala.
- Wzmocniono scroll-lock przy otwartym poście lub composerze.
- Post modal ma zostać w centrum aktualnego viewportu, zamyka się przez X lub klik w tło.
- Plus Square jest dostępny tylko na Square i został ustawiony jak chip nad Angelem.

### Home
- Karta neural brain wróciła do poprzedniego rozmiaru.
- Powiększony został sam środek / wizual mózgu, a nie cała karta.
- Pod karuzelą dodano duży edytorialowy feature switcher: zdjęcie + opis + przełączanie slajdów.

### VLM Basic / Pro
- Basic i Pro mają różny hero copy.
- Przełącznik Basic/Pro przeniesiony jako floating chip nad Angelem tylko na stronie VLM.
- Dodano wybrane moduły z Motion Lab do strony VLM:
  - Order-book cart
  - Archive entitlement map
  - Wallet safety preview
  - AMU baseline
  - Möbius path
  - Prime lattice
  - Garment hover label
  - Size guide drawer

### Login / Account
- Uproszczono login copy.
- Dodano animowany security visual zamiast przeładowanego tekstu po lewej.
- Dopięto podstawowe tłumaczenia loginu EN/PL/DE.
- Angel panel zamyka się teraz również po kliknięciu poza panelem, nie tylko X.

### Motion Lab / Apps
- WLMR/VMR/WMR usunięte z copy — zostaje VLM.
- Apps concept zostaje jako laboratorium użytecznych modułów: Drop Calendar, Signal Studio, Archive Rooms, Fit Advisor, Wallet Safety, Member Pass.

## Sprawdzone
- `node scripts/check-i18n.mjs` przechodzi.

## Nie sprawdzone w sandboxie
- Pełny `npm run build`, bo sandbox nie ma `node_modules`. Odpal lokalnie przed pushem.

## Uwaga bezpieczeństwa / Web3
- VLM pozostaje opisany jako access/utility concept i read-only preview, dopóki nie ma kontraktu, audytu i review prawnego.
