# Velmère – Polkadot Basic / Pro Modal / Mail Pass

## Wdrożone poprawki

### 1. VLM Basic wrócił do stylu Polkadot
- Przywrócony komponent `VlmBasicPolkadotLanding`.
- Basic ma teraz spokojny, centralny, produktowy landing zamiast technicznych modułów.
- W Basicu usunięto ciężkie animacje Pro: `VlmSelectedSystems` nie renderuje się dla `mode=basic`.
- Zostaje rolka `Powered by Web3`, CTA do kolekcji i dwa social buttony: Instagram oraz X/Twitter.

### 2. VLM Pro przebudowany na klikalne moduły z popupem
- `VlmSelectedSystems` został przepisany.
- Usunięte z Pro: `Prime Lattice` i `Garment Hover Label`.
- Zostawione i rozbudowane:
  - Möbius Routing Path,
  - AMU Baseline 3162.27,
  - Wallet Safety Preview,
  - Archive Entitlement Map,
  - Order-book Cart,
  - Bitcoin Discipline / Security.
- Każdy moduł po kliknięciu otwiera modal z:
  - mini animacją,
  - opisem,
  - faktami / zasadami,
  - statusem read-only.

### 3. Navbar
- Grupa `Kolekcja / VLM / Square` została przesunięta do strefy między Menu a logo Velmère.
- Header ma teraz `relative`, dzięki czemu pozycjonowanie nav jest stabilniejsze.

### 4. Login security visual
- Przepisana animacja bezpieczeństwa.
- Opis aktywnej warstwy nie zasłania już centralnej animacji.
- Trzy karty `session / wallet / approval` przełączają opis pod spodem.

### 5. Square toast
- Toast błędu logowania ma teraz stabilne `left: 50%` + stały transform w stylu, a Framer Motion animuje tylko opacity/y.
- To ma zapobiegać losowemu przesuwaniu komunikatu.

### 6. Light / dark experiment
- Dodano `ThemeToneToggle` obok akcji w headerze.
- Przełącznik zapisuje stan w `localStorage` jako `velmere-tone`.
- Dodano podstawowe style `html.velmere-light` w `globals.css`.

### 7. Anonimowy mail / kontakt z krawędzi strony
- Dodano komponent `FloatingMailWidget` przypięty do lewej krawędzi ekranu.
- Formularz ma: imię/handle, e-mail opcjonalny, tytuł, wiadomość, załącznik.
- Dodano route: `app/api/contact/message/route.ts`.
- Bez `RESEND_API_KEY` API przyjmuje wiadomość jako fallback preview.
- Z `RESEND_API_KEY` próbuje wysłać przez Resend na `CONTACT_TO_EMAIL`.

## Nowe / zmienione pliki
- `components/vlm/VlmBasicPolkadotLanding.tsx`
- `components/vlm/VlmAccessGatePage.tsx`
- `components/vlm/VlmSelectedSystems.tsx`
- `components/auth/LoginSecurityVisual.tsx`
- `components/Navbar.tsx`
- `components/ui/ThemeToneToggle.tsx`
- `components/contact/FloatingMailWidget.tsx`
- `app/api/contact/message/route.ts`
- `app/[locale]/layout.tsx`
- `app/globals.css`
- `.env.example`

## ENV do maila
```env
CONTACT_TO_EMAIL=velmere141@gmail.com
CONTACT_FROM_EMAIL="Velmere <onboarding@resend.dev>"
RESEND_API_KEY=re_...
```

## Sprawdzone
- `node scripts/check-i18n.mjs` przechodzi.
- Syntaktycznie sprawdzone wybrane nowe TSX/route przez globalny TypeScript; brak błędów składniowych, brak pełnego builda przez brak `node_modules` w sandboxie.

## Po Twojej stronie
```cmd
cd /d C:\Users\marci\velmere-store
npm install
npm run check:i18n
npm run build
git add .
git commit -m "Apply Polkadot Basic Pro modal and mail pass"
git push origin main
```
