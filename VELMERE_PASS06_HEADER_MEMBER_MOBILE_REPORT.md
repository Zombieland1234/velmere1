# Velmère Pass 06 — Header Clickability + Member State + Mobile Safety

## Naprawione

1. **Klikalność logo VELMÈRE w headerze**
   - Logo dostało wyższy `z-index` i focus ring.
   - Desktopowy pasek linków po lewej ma teraz `pointer-events-none`, a same linki `pointer-events-auto`, więc pusta warstwa nawigacji nie blokuje kliknięcia w logo.
   - Dodatkowo skrócono obszar desktopowej nawigacji, żeby nie nachodziła na środek headera.

2. **Stan konta w headerze**
   - Navbar czyta lokalną sesję Velmère przez `useVelmereAuth()`.
   - Gdy użytkownik nie jest zalogowany, przycisk prowadzi do `/login` i pokazuje `Logowanie`.
   - Gdy użytkownik jest zalogowany, przycisk prowadzi do `/account` i pokazuje `Prywatna konsola membera` na szerokim ekranie albo krótkie `Konsola` na mniejszym desktopie.

3. **Member chip po prawej stronie**
   - Po zalogowaniu pojawia się elegancki chip użytkownika obok koszyka.
   - Pokazuje nazwę profilu oraz adres portfela w nawiasie, np. `(0x1234…abcd)`.
   - Jeśli konto jest aktywne, ale portfel nie jest podpięty, pokazuje bezpieczny stan `portfel niepodłączony`.

4. **Telefon / mobile**
   - Mail ukrywa się na najmniejszych ekranach, żeby header się nie rozjeżdżał.
   - Długie teksty konta i chip membera nie wciskają się w mały ekran.
   - Na mobile zostaje szybki dostęp: menu, logo, konto/konsola i koszyk.

## Sprawdzone

- `npm run check:i18n` — OK
- `npm run vercel:preflight` — OK
- grep pod stare build-killery: brak `repeat: Infinity`, `iterationCount`, `border-white/12`, `text-white/58`

## Uwaga

Pełny `next build` wymaga `node_modules`. W sandboxie nie instalowałem zależności, ale paczka jest przygotowana pod Vercel przez `npm install` + `npm run build`.
