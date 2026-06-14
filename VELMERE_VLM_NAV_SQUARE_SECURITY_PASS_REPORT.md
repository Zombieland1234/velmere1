# Velmère — VLM navigation / Square toast / security pass

## Wdrożone zmiany

### 1. Przełącznik Basic / Pro
- Przeniesiony z górnego środka strony do prawego dolnego rogu.
- Leży nad przyciskiem Angel, tylko na stronie VLM.
- Zachowuje boot overlay przy przejściu Basic ⇄ Pro.

### 2. Square toast i plus Square
- Toast błędu logowania ma teraz stałą pozycję: górny środek viewportu.
- Naprawiono transform animacji toastu, żeby Framer Motion nie kasował `translateX(-50%)`.
- Plus Square zostaje jako floating chip nad Angelem, ale bez mocnego złotego tła/glow.

### 3. Menu w headerze
- Zwiększony hit-area i z-index przycisku Menu.
- Logo i elementy headera mają rozdzielone warstwy, żeby Menu nie było klikalne tylko w małym fragmencie.

### 4. Login security animation
- Zamiast statycznej/tandetnej kłódki jest interaktywny security lattice.
- Kliknięcie fingerprintu przełącza opisy:
  - Session boundary
  - Read-only wallet
  - Named approval
- Copy tłumaczy realne zasady bezpieczeństwa: konto oddzielone od portfela, brak seed phrase, brak custody, jawne approvale.

### 5. VLM Selected Systems
- Basic jest teraz spokojniejszy, bez ciężkiego terminalowego chaosu.
- Pro dostał modułowy panel sterowania zamiast przypadkowej siatki.
- Moduły są klikalne i pokazują opis koncepcji:
  - Möbius Routing Path
  - Prime Lattice
  - AMU Baseline 3162.27
  - Wallet Safety Preview
  - Archive Entitlement Map
  - Order-book Cart
  - Garment Hover Label
- Animacje Möbiusa, prime lattice i AMU zostały zachowane w Pro i powiązane z opisem.

### 6. Przejście Basic / Pro
- Dodałem fade/lift wrapper dla treści VLM, żeby przy zmianie trybu nie było twardego mrugnięcia sekcji.

## Dalsze rekomendacje
1. Dokończyć realny WalletConnect Project ID w `.env.local` i Vercel.
2. Ustalić finalne teksty prawne dla VLM: brak oferty inwestycyjnej, brak obietnicy zysku, brak custody.
3. Wybrać, które moduły VLM Pro mają zostać widoczne publicznie, a które powinny być tylko w member panelu.
4. Dodać finalny content do Velmère App: daty dropów, statusy archiwum, realne zasady member pass.
