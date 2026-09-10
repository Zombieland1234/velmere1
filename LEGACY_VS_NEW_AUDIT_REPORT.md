# VELMÈRE AUDIT ENGINE: LEGACY VS NEW INSTITUTIONAL AUDIT ARCHITECTURE
**Data Wdrożenia:** 2026-09-09  
**Wersja Silnika:** Velmère Furnace v3.0.0-Institutional  
**Status Zgodności Dowodowej:** Zero Fabrication / Full Merkle Reproducibility (Directive v3)

---

## 1. WPROWADZENIE I GENEZA REFORMY AUDYTOWEJ

Dotychczasowe wersje raportów bezpieczeństwa w branży Web3 oraz rynków tradycyjnych (w tym starsze wersje testowe platformy) cierpiały na systemowy problem **„fabrykacji autorytetu” (Authority by Assertion)**. W raportach pojawiały się marketingowe hasła oparte o niespełnione przesłanki techniczne:
- Deklaracje o „RFC 3161 TSA Timestamp”, mimo że dokument nie zawierał binarnego tokena Time Stamp Response (TSR) z kryptograficznym łańcuchem zaufania X.509 CA.
- Statyczne, arbitralne wartości mikrostrukturalne (np. uniwersalne „41.2% obrotu w Dark Poolach” czy „2.8 bps poślizg Kyle'a”) przypisywane każdemu aktywu, niezależnie od tego, czy był to płynny kontrakt na złoto COMEX, czy token memiczny.
- Fałszywe zapewnienia formalne („Wszystkie niezmienniki stanu udowodnione”), podczas gdy solwery SMT (Z3/CVC5) nie były w ogóle wywoływane w pipeline, a model nie potrafił dowieść niezmienników w przestrzeni nieliniowej arytmetyki.
- Fikcyjne oznaczenia „Multisig 3-of-5 z Timelock 48h” doklejane do kontraktów, w których kodzie nie wykonano zapytania on-chain do slotów zarządczych ani nie zweryfikowano parametrów implementacji.

Zgodnie z **Dyrektywą Wykonawczą v3**, wdrożono bezwzględną zasadę:
> **NO EVIDENCE = NO CLAIM**  
> **NO TEST = NO PASS**  
> **NO SOLVER = NO FORMALLY PROVEN**  
> **NO TSA TOKEN = NO RFC 3161**  
> **NO HUMAN REVIEW = NO HUMAN REVIEWED**  
> **NO SOURCE = NO SOURCE VERIFIED**  
> **NO OBSERVED MARKET DATA = NO OBSERVED MARKET RESULT**

---

## 2. TABELA PORÓWNAWCZA: CLAIM | OLD | NEW | EVIDENCE | CHANGE | REASON
*(Zgodnie ze ścisłą specyfikacją Sekcji 57 zadanie.txt)*

| Claim | Old | New | Evidence | Change | Reason |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **proxy** | "Transparent / EIP-1967 Upgradeable" | `PROXY: NOT_DETECTED` (lub `DETECTED` ze slotami `0x3608...`, Admin, Beacon) | `EV-PROXY-*` z odczytem pamięci bytecode/storage | Zamiana bezwarunkowego stwierdzenia na wynik rzeczywistej detekcji | Kontrakty niemające slotów EIP-1967 ani delegacji nie mogą być nazywane upgradeable. |
| **multisig** | "Multisig 3-of-5 aktywny" | `MULTISIG: UNKNOWN [RPC UNQUERIED]` (lub autentyczny próg i sygnatariusze on-chain) | `EV-ACCESS-*` z weryfikacji sygnatariuszy RPC | Wycofanie fikcyjnego progu 3-of-5 | Brak aktywnego zapytania RPC o sygnatariuszy węzła uniemożliwia potwierdzenie progu. |
| **timelock** | "Timelock 48h skonfigurowany" | `TIMELOCK: DELAY UNOBSERVED [NO ON-CHAIN GETMINDELAY EXECUTED]` | `EV-ACCESS-*` z parametrem `minDelay` | Wycofanie sztywnej wartości 48h | Czas opóźnienia musi wynikać z odpytania metody kontraktu, a nie domysłu szablonu. |
| **formal** | "Wszystkie niezmienniki stanu udowodnione" (100% PASS) | `VLM-FORMAL-01..03`: `PROVEN`, `UNKNOWN`, `TIMEOUT`, `NOT_RUN` | `EV-FORMAL-*` zawierający artefakt SMT2 i log Z3/CVC5 | Wycofanie globalnego claimu na rzecz statusów per-inwariant | Jeśli solwer nie zbiegł lub zwrócił timeout/unknown, claim "Wszystkie udowodnione" jest oszustwem. |
| **RFC3161** | "Dokument podpisany deterministycznie zgodnie z RFC 3161" | `SHA-256 INTEGRITY SEAL [LOCAL DETERMINISTIC]` | `EV-CRYPTO-*` z korzeniem Merkle i skrótem SHA-256 | Eliminacja hasła RFC 3161 przy braku zewnętrznego TSA | Standard RFC 3161 wymaga binarnego TimeStampToken z urzędowego Authority X.509 CA. |
| **PCAOB** | "Certyfikowana przez PCAOB" | `AUDITOR: [Firma] [SEC 10-K REFERENCE]` (lub `NOT_APPLICABLE` dla krypto) | `EV-REG-*` z numerem CIK i linkiem do bazy SEC EDGAR | Wycofanie badge'a jako statusu samej platformy Velmère | PCAOB nadzoruje biegłych rewidentów sprawozdań finansowych, a nie audyty kodu smart kontraktów. |
| **Dark Pool** | "41.2% dziennego obrotu w Dark Pool" | `ATS SHARE: X.X%` (dla akcji US) lub `NOT OBSERVED [INSUFFICIENT DATA]` (towary/FX) | `EV-MKT-ATS-*` z wolumenu FINRA ATS Transparency | Likwidacja uniwersalnej stałej 41.2% | Złoto COMEX czy ropa WTI nie mają obrotu na giełdach ATS w rozumieniu SEC Regulation ATS. |
| **VWAP** | "VWAP obliczony w czasie rzeczywistym" | `VWAP: CALCULATED [1H ROLLING]` (lub `ESTIMATED HEURISTIC [UNOBSERVED]`) | `EV-MKT-VWAP-*` z szeregiem transakcyjnym i wolumenem | Jawne oznaczenie okna czasowego i metody | Pojęcie VWAP bez podania horyzontu (np. 1h, sesja) i próby jest bezużyteczne analitycznie. |
| **L3** | "Bezpośrednie połączenie L3/SIP aktywne" | `L1/L2 AGGREGATED FEED [DERIVED]` (chyba że podłączono pcap ITCH/OUCH) | `EV-MKT-FEED-*` z klasą endpointu i opóźnieniem | Usunięcie fałszywych deklaracji o sub-milisekundowym L3 | Dostęp do surowych orderbooków L3 ITCH/OUCH wymaga dedykowanej infrastruktury kolokacyjnej. |
| **commit** | Fikcyjny lub brakujący commit hash | `COMMIT: a1b2c3d` (lub `COMMIT: NOT PROVIDED`) | `EV-SRC-*` z referencją do repozytorium git i brancha | Wprowadzenie uczciwego fallbacku `NOT PROVIDED` | Zabroniono fabrykowania fałszywych 40-znakowych hashy commitów, jeśli użytkownik badał plik płaski. |
| **source** | "Source Code Verified" (bez weryfikacji) | `SOURCE: VERIFIED` vs `SOURCE: UNVERIFIED` vs `SOURCE MISMATCH` | `EV-SRC-*` ze skrótami `sourceHash` i `bytecodeHash` | Trzy stanowa weryfikacja zgodności kodu z bytecode | Jeśli kod nie kompiluje się do bytecode wdrożonego on-chain, audyt ma status `SOURCE MISMATCH`. |
| **line numbers** | Wymyślone / losowe linie w podatnościach | Rzeczywiste numery linii `[L12-L28]` z wycinkiem kodu ze skanera AST | `EV-AST-*` z nodem AST i zakresem linii w pliku | Pełne odzwierciedlenie w fizycznym pliku źródłowym | Klient musi mieć możliwość bezpośredniego kliknięcia i otwarcia badanego fragmentu kodu. |

---

## 3. ANALIZA PORÓWNAWCZA WZGLĘDEM LIDERA RYNKU (CERTİK, OPENZEPPELIN, TRAIL OF BITS)

### 3.1. Przewagi Nowego Silnika Velmère nad Tradycyjnymi Audytorami:
1. **Merkle Proof Każdego Dowodu:** Żaden z wiodących audytorów (CertiK, OpenZeppelin) nie dołącza deterministycznego drzewa skrótów Merkle Tree do wygenerowanego PDF-a, pozwalając na weryfikację każdego wycinka AST offline.
2. **Koniec z Cichymi Złożeniami:** Tradycyjne firmy w sekcji „Formal Verification” często ukrywają fakt, że solwer nie zbiegł (timeout) i oznaczają wynik jako zaliczony. Velmère Furnace v3 bezwzględnie zwraca `UNKNOWN`, unieważniając claim o pełnym dowodzie.
3. **Proweniencja Rynkowa i Regulacyjna:** Połączenie analizy kodu smart kontraktów z mikrostrukturą giełdową (Krzywa Lorenza, CIK SEC EDGAR, feed SIP) stanowi unikalne rozwiązanie w skali światowej.

---

## 4. PODSUMOWANIE RE-GENERACJI 150 RAPORTÓW PDF

Wszystkie 150 dokumentów znajdujących się w katalogu `dowodypdf/` zostało usuniętych i wygenerowanych od zera przez nowy pipeline:
- **50 Smart Kontraktów** (EVM / L1 / L2): Każdy kontrakt posiada wygenerowane dowody AST, analizę slotów proxy, uczciwe statusy kontroli dostępu oraz drzewo Merkle Root.
- **50 Aktywów Krypto Shield:** Zlikwidowano sztywne wartości, wprowadzono dynamiczny model koncentracji wielorybów i estymację poślizgu Kyle'a.
- **50 Rynków Tradycyjnych (Real Markets):** Akcje posiadają rzeczywiste powiązania CIK SEC EDGAR, a towary i pary walutowe posiadają status `NOT_OBSERVED_INSUFFICIENT_DATA` w polach dotyczących obrotu ATS, eliminując fałszywe deklaracje.
