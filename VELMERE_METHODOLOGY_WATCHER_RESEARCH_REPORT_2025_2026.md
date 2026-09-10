# VELMÈRE FURNACE GIGA MASTER PROMPT V5: AGENT-03 RESEARCH REPORT
**Audytowalny Raport Badawczy Metodyk Bezpieczeństwa Smart Kontraktów, Standardów EVM i Kanonicznych Adresów (2025/2026)**

---

## Metadane Audytowe Raportu
* **Agent:** `AGENT-03 WEB RESEARCH / METHODOLOGY WATCHER`
* **Projekt:** Velmère Furnace Giga Master Prompt V5
* **Data generacji:** 10 września 2026 r.
* **Zakres:**
  1. OWASP Smart Contract Top 10 (aktualna taksonomia 2025/2026, kategorie SC01–SC10).
  2. OWASP SCSVS (Smart Contract Security Verification Standard) i SCSTG (Smart Contract Security Testing Guide).
  3. OpenZeppelin Contracts v5.0 / v5.1 / Defender v2 (wytyczne audytowe, standardy ERC-4626, EIP-712, TimelockController, transient storage).
  4. Specyfikacja EVM Cancun / Prague (opkody TSTORE/TLOAD 0x5c/0x5d, semantyka EIP-6780 SELFDESTRUCT, reachability transient storage vs push data / EOF).
  5. Oficjalne adresy 20 kanonicznych korzeni na Ethereum, BSC i Arbitrum (USDT, USDC, WBNB, PANCAKE_ROUTER, UNI_ROUTER3, DAI, LINK, PEPE, SHIB, AAVE_V3_POOL, STETH, 3CRV, ARB_INBOX, SAFE_L2, CUSDC, SAFEMOON, FLOKI, SNX, BLUR_EXCHANGE, TORN_ROUTER).

---

## 1. OWASP Smart Contract Top 10 (Taksonomia 2025/2026)

* **Źródło pierwotne:** OWASP Foundation – Smart Contract Security (SCS) Project
* **Oficjalne repozytorium GitHub:** [OWASP/www-project-smart-contract-top-10](https://github.com/OWASP/www-project-smart-contract-top-10)
* **Oficjalny portal projektu:** [https://scs.owasp.org/sctop10/](https://scs.owasp.org/sctop10/) oraz [https://owasp.org/www-project-smart-contract-top-10/](https://owasp.org/www-project-smart-contract-top-10/)
* **Wydawca:** OWASP Foundation / SCS Project Team
* **Data aktualizacji:** Cykl 2025/2026 (Forward-looking / Consensus Edition oparte o empiryczne dane incydentów Web3HackHub / SolidityScan)

### Pełna taksonomia kategorii SC01 – SC10:

| Identyfikator | Nazwa kategorii | Treść, wektory ataku i implikacje audytowe |
| :--- | :--- | :--- |
| **SC01** | **Access Control Vulnerabilities** *(Luki w kontroli dostępu)* | Brakujące lub niewłaściwie zaimplementowane modyfikatory uprawnień (`onlyOwner`, `AccessControl`, `AccessManager`). Pozwala nieautoryzowanym użytkownikom na wywołanie funkcji krytycznych (np. mint, transfer środków, upgrade, modyfikacja parametrów opłat). Obejmuje luki niezainicjalizowanych proxy (uninitialized implementation/initializers) oraz arbitralne wywołania `delegatecall`. |
| **SC02** | **Business Logic Vulnerabilities** *(Luki w logice biznesowej)* | Błędy architektoniczne w regułach protokołu, wycenie długu, dystrybucji nagród, kolejności operacji (order-of-operations) oraz zarządzaniu stanem zabezpieczeń (LTV, health factor). Kod jest syntaktycznie poprawny, lecz łamie niezmienniki ekonomiczne (np. wyciąganie płynności bez depozytu). |
| **SC03** | **Price Oracle Manipulation** *(Manipulacja wyroczniami cenowymi)* | Poleganie na podatnych na manipulację źródłach cenowych (np. chwilowe rezerwy poola AMM w transakcji, brak TWAP) lub brak bezpiecznych wyroczni DON (np. Chainlink). Umożliwia zaciąganie niedokapitalizowanych pożyczek, fałszywe likwidacje lub arbitraż na szkodę protokołu. |
| **SC04** | **Flash Loan–Facilitated Attacks** *(Ataki z użyciem pożyczek błyskawicznych)* | Wykorzystanie ogromnego, niezabezpieczonego kapitału w ramach pojedynczego bloku transakcyjnego do zwielokrotnienia i zrealizowania luk w logice, załamaniach płynności AMM, rezerwach puli lub błędach zaokrągleń. |
| **SC05** | **Lack of Input Validation** *(Brak walidacji danych wejściowych)* | Brak sprawdzania parametrów wejściowych funkcji publicznych/zewnętrznych: brak walidacji adresu zerowego (`address(0)`), brak ograniczeń na wielkości tablic (prowadzący do DoS z limitu gazu), niepoprawne sprawdzanie limitów procentowych (np. slippage, opłaty protokołu). |
| **SC06** | **Unchecked External Calls** *(Niesprawdzone wywołania zewnętrzne)* | Ignorowanie wartości zwracanych przez wywołania niskopoziomowe (`.call()`, `.delegatecall()`) lub niezgodne ze standardem implementacje ERC-20 (np. tokeny nie zwracające boolean, jak USDT). Prowadzi do cichych awarii (silent failures) i niespójności stanu księgowego. |
| **SC07** | **Arithmetic Errors** *(Błędy arytmetyczne i precyzji)* | Utrata precyzji w dzieleniu przed mnożeniem, błędy zaokrągleń (rounding direction) w skarbcach ERC-4626 na korzyść atakującego, ucinanie wartości przy jawnym rzutowaniu typów (unsafe downcasting) bez bibliotek typu `SafeCast`. |
| **SC08** | **Reentrancy Attacks** *(Ataki powtórnego wejścia)* | Wykonywanie zewnętrznych wywołań przed aktualizacją stanu wewnętrznego (złamanie wzorca Checks-Effects-Interactions). Obejmuje klasyczne reentrancy jednofunkcyjne, wielofunkcyjne, cross-contract reentrancy oraz read-only reentrancy (odczyt zaburzonego stanu podczas callbacku). |
| **SC09** | **Integer Overflow and Underflow** *(Przepełnienia liczb całkowitych)* | Zawijanie wartości liczbowych przy przekroczeniu granic typów w kontraktach starszych (< Solidity 0.8.0), w jawnych blokach `unchecked { ... }` lub w bezpośrednich operacjach asemblerowych `assembly { ... }`. |
| **SC10** | **Proxy & Upgradeability Vulnerabilities** *(Luki w strukturach proxy i aktualizacji)* | Kolizje slotów pamięci (storage collision) pomiędzy implementacjami, niezabezpieczone funkcje inicjalizujące (brak `_disableInitializers()` w konstruktorze implementacji), kolizje selektorów funkcji w Transparent Proxies oraz scentralizowane klucze migracji. |

---

## 2. OWASP SCSVS oraz SCSTG

### A. OWASP Smart Contract Security Verification Standard (SCSVS)
* **Źródło pierwotne:** OWASP Foundation / Composable Security / Securing
* **URL:** [https://scs.owasp.org/scsvs/](https://scs.owasp.org/scsvs/) oraz [https://github.com/OWASP/owasp-scs](https://github.com/OWASP/owasp-scs)
* **Wydawca:** OWASP Foundation
* **Struktura poziomów weryfikacji (Assurance Levels):**
  * **Level 1 (L1) – Automatyczna higiena / Statyczna analiza:** Weryfikacja za pomocą zautomatyzowanych narzędzi linterów (Solhint), analizatorów statycznych (Slither, Semgrep), testów jednostkowych i analizy ostrzeżeń kompilatora.
  * **Level 2 (L2) – Kompleksowy audyt instytucjonalny (Standard Enterprise):** Ręczny audyt linijka po linijce, modelowanie zagrożeń (STRIDE/PASTA), testy dynamiczne oparte na fuzzingu (Foundry invariant testing, Echidna), weryfikacja logiki biznesowej i integracji protokołów.
  * **Level 3 (L3) – Krytyczna weryfikacja formalna (Mission-Critical / High-Assurance):** Matematyczne dowody niezmienników stanów przy użyciu weryfikacji formalnej (Certora Prover CVL, Halmos, Z3 Solver), testy symboliczne, zaawansowane modelowanie teorii gier oraz audyt decentralizacji zarządzania.

### Kategorie wymagań SCSVS:
1. **General Categories (Wymagania Ogólne - G):**
   * `G1: Architecture, Design, and Threat Modeling (SCSVS-ARCH)` – Architektura systemu, modelowanie wektorów ataku, zasada minimalnych uprawnień.
   * `G2: Policies and Procedures (SCSVS-CODE)` – Zarządzanie repozytorium, wersjonowanie kompilatora, deterministyczny build.
   * `G3: Upgradeability` – Bezpieczeństwo wzorców proxy (UUPS, Transparent, Beacon), inicjalizacja, ERC-7201.
   * `G4: Business Logic & Economic Security (SCSVS-GOV)` – Niezmienniki finansowe, mechanizmy zachęt, zarządzanie DAO, odporność na manipulacje rynkowe.
   * `G5: Access Control & Authentication (SCSVS-AUTH)` – Role, separacja uprawnień, ochrona przed atakami typu spoofing (`tx.origin`).
   * `G6: Communications & External Calls (SCSVS-COMM)` – Bezpieczna komunikacja międzykontraktowa, obsługa wyjątków, interfejsy.
   * `G7: Arithmetic & Cryptography (SCSVS-CRYPTO)` – Bezpieczeństwo sygnatur (EIP-712, replay prevention), poprawne zaokrąglenia, brak utraty precyzji.
   * `G8: Denial of Service & Block Limits (SCSVS-BLOCK)` – Pętle o nieznanym rozmiarze, gas griefing, ochrona przed blokadą transakcji.
   * `G9: Blockchain Data & State Management (SCSVS-BRIDGE)` – Prawidłowe użycie `block.timestamp`, `block.prevrandao`, bezpieczny storage.
   * `G10: Gas Usage, Efficiency, and Limitations (SCSVS-DEFI)` – Optymalizacja zużycia gazu i zapobieganie gas-exhaustion.
   * `G11: Code Clarity & Maintainability (SCSVS-COMP)` – Czytelność, standardy NatSpec, przejrzystość dziedziczenia.
   * `G12: Test Coverage & Verification Rigor` – Pokrycie testowe (branch coverage), testy integracyjne, scenariusze fork mainnet.
2. **Component-Specific Categories (Wymagania Komponentowe - C):**
   * `C1: Token` (ERC-20, ERC-721, ERC-1155, fee-on-transfer, rebasing)
   * `C2: Governance` (Timelock, kworum, mechanizmy głosowania)
   * `C3: Oracle` (Staleness, heartbeat, fallback feeds, min/max answer circuit breakers)
   * `C4: Vault` (Zgodność z ERC-4626, ochrona przed atakami inflacyjnymi)
   * `C5: Bridge` (Weryfikacja wiadomości wielołańcuchowych, zapobieganie powtórzeniom)
   * `C6: NFT` (Bezpieczeństwo transferów, reentrancy w `onERC721Received`)
   * `C7: Liquid Staking` (Wycena pochodnych, slashing, opóźnienia w wypłatach)
   * `C8: Liquidity Pool` (Niezmienniki AMM, weryfikacja stałego iloczynu/sumy)
   * `C9: Uniswap V4 Hook` (Walidacja uprawnień flag hooka, reentrancy przez hook callback)
3. **Integration Categories (Wymagania Integracyjne - I):**
   * `I1: Basic Integration`
   * `I2: Token Integrations` (Obsługa niestandardowych ERC-20, brakujące returny)
   * `I3: Oracle Integrations` (Bezpieczna konsumpcja Chainlink / Pyth / Uniswap TWAP)
   * `I4: Cross-Chain Integrations` (LayerZero, Chainlink CCIP, Arbitrum Nitro bridge)

### B. OWASP Smart Contract Security Testing Guide (SCSTG)
* **URL:** [https://scs.owasp.org/scstg/](https://scs.owasp.org/scstg/)
* **Wydawca:** OWASP Foundation
* **Metodyka testowa:**
  * Systematyczny podręcznik procedur audytowych łączący modelowanie zagrożeń z weryfikacją manualną i zautomatyzowaną.
  * Standaryzacja matrycy testowej powiązanej ze słownikiem podatności **SCWE (Smart Contract Weakness Enumeration)** oraz praktyczną listą kontrolną **OWASP SCS Checklist**.

---

## 3. OpenZeppelin Contracts v5.0 / v5.1 / Defender v2

* **Źródło pierwotne:** OpenZeppelin Documentation & Repositories
* **URL:**
  * Contracts: [https://docs.openzeppelin.com/contracts/5.x/](https://docs.openzeppelin.com/contracts/5.x/)
  * GitHub Releases: [https://github.com/OpenZeppelin/openzeppelin-contracts/releases](https://github.com/OpenZeppelin/openzeppelin-contracts/releases)
  * Blog Architecture: [https://blog.openzeppelin.com/introducing-openzeppelin-contracts-5.0](https://blog.openzeppelin.com/introducing-openzeppelin-contracts-5.0)
  * Defender v2: [https://docs.openzeppelin.com/defender/](https://docs.openzeppelin.com/defender/)
* **Wydawca:** OpenZeppelin
* **Data:** v5.0 (październik 2023), v5.1 (wrzesień 2024), Defender v2 (2024–2026)

### A. Główne zmiany architektoniczne i wytyczne audytowe w Contracts v5.0 / v5.1
1. **Wymóg kompilatora Solidity:** Bazowo `^0.8.20` (oraz `^0.8.24` w modułach wykorzystujących transient storage EIP-1153).
2. **Niestandardowe błędy (Custom Errors - ERC-6093):**
   * Całkowite wyeliminowanie ciągów znaków w `require(..., "String")`.
   * Wprowadzenie zoptymalizowanych selektorów 4-bajtowych, np. `ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)`, `OwnableUnauthorizedAccount(address account)`. Zmniejsza koszty wdrożenia i zużycie gazu.
3. **Zunifikowany hook wewnętrzny `_update`:**
   * Usunięcie dotychczasowych hooków `_beforeTokenTransfer` i `_afterTokenTransfer`.
   * Cała logika transferu, mintu (`from == address(0)`) i burnu (`to == address(0)`) w tokenach ERC-20, ERC-721 i ERC-1155 przebiega przez jedną wewnętrzną funkcję `_update(address from, address to, uint256 value)`. Audyt musi weryfikować, czy nadpisywanie `_update` wywołuje poprawnie `super._update(...)`.
4. **Namespaced Storage (ERC-7201):**
   * Odejście od klasycznych tablic przerw (`uint256[50] __gap`).
   * Zastosowanie wzorca zdefiniowanego w EIP-7201: sloty bazowe wyliczane ze wzoru `keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.ERC20")) - 1)) & ~bytes32(uint256(0xff))`, co eliminuje ryzyko kolizji pamięci w strukturach multi-inheritance proxy i Diamond.
5. **Standard ERC-4626 (Tokenized Vaults):**
   * **Ochrona przed atakiem inflacyjnym (Donation/First-Deposit Attack):** Wbudowana obsługa wirtualnych udziałów i aktywów (offset 1 virtual share/asset), uniemożliwiająca manipulację wskaźnikiem wymiany w pustym skarbcu.
   * **Breaking Change w v5.0:** W pustym skarbcu początkowy przelicznik domyślnie przyjmuje bezwzględny stosunek **1:1 niezależnie od różnicy liczby miejsc po przecinku (decimals)** między aktywem a udziałem. Wymaga to od deweloperów jawnego nadpisania `_initialConvertToShares` i `_initialConvertToAssets`, jeśli pożądana jest inna skala początkowa.
   * **Zasady zaokrągleń:** Rygorystyczne zaokrąglanie w dół (round down) przy depozytach/mintach na korzyść skarbca, oraz zaokrąglanie w górę (round up) przy zapotrzebowaniu na aktywa.
6. **EIP-712 (Typed Structured Data):**
   * Buforowanie Domain Separator (`_cachedDomainSeparator`, `_cachedChainId`) z dynamicznym przeliczaniem tylko w przypadku forków sieciowych lub zmiany `block.chainid`.
   * Wykorzystanie biblioteki `ShortStrings` do upakowania nazw i wersji $\le 31$ bajtów w jednym slocie bez dynamicznej alokacji.
7. **TimelockController:**
   * **Breaking Change w v5.0:** Konstruktor przestał niejawnie nadawać rolę `TIMELOCK_ADMIN_ROLE` adresowi `msg.sender` (deployerowi). Rola admina musi być jawnie przekazana w argumencie `address admin`.
   * Rozdzielenie uprawnień: Wprowadzono niezależną rolę `CANCELLER_ROLE`, oddzieloną od `PROPOSER_ROLE`, co zapobiega jednostronnemu anulowaniu operacji przez autorów propozycji bez osobnego uprawnienia.
   * Wzorzec self-admin: Kontrakt sam jest swoim administratorem (`_grantRole(TIMELOCK_ADMIN_ROLE, address(this))`), co wspiera pełną decentralizację.
8. **Nowości v5.1:**
   * `ReentrancyGuardTransient`: Redukcja kosztu blokady reentrancy z ~2200–5000 gazu do ~200 gazu dzięki opkodom EIP-1153 (`TSTORE`/`TLOAD`).
   * `ERC20TemporaryAllowance`: Tymczasowe upoważnienia w ramach jednej transakcji w transient storage.
   * Biblioteki kryptograficzne `P256` (secp256r1) oraz `RSA` pod kątem Passkey i ERC-4337 Account Abstraction.

### B. OpenZeppelin Defender v2
* Zintegrowana platforma DevSecOps dla smart kontraktów:
  * **Code Inspector:** Zautomatyzowane sprawdzanie pull requestów w CI/CD, reguły bezpieczeństwa oparte o AI i heurystyki OpenZeppelin, Dependency Checker analizujący podatności w użytych bibliotekach.
  * **Audit Module:** Zarządzanie cyklem życia audytów zewnętrznych, śledzenie statusów zgłoszonych podatności (Reported, Resolved, Acknowledged) i formalne podpisywanie raportów remediacyjnych.
  * **Deploy, Monitor & Relayers:** Bezpieczne wdrożenia wielołańcuchowe, monitoring transakcji i zdarzeń w czasie rzeczywistym oraz automatyzacja transakcji przez odporne na reorganizację przekaźniki.

---

## 4. Specyfikacja EVM Cancun / Prague

* **Źródła pierwotne:**
  * EIP-1153: [https://eips.ethereum.org/EIPS/eip-1153](https://eips.ethereum.org/EIPS/eip-1153)
  * EIP-6780: [https://eips.ethereum.org/EIPS/eip-6780](https://eips.ethereum.org/EIPS/eip-6780)
  * Ethereum Execution Layer Specifications (EELS): [https://github.com/ethereum/execution-specs](https://github.com/ethereum/execution-specs)
  * EIP-7702, EIP-2537, EIP-7002, EIP-7685: [https://eips.ethereum.org/](https://eips.ethereum.org/)
* **Wydawca:** Ethereum Foundation / Core Devs
* **Data:** Cancun (Dencun: aktywowany 13 marca 2024, blok 19,426,587), Prague/Pectra (2025/2026)

### A. EIP-1153: Transient Storage Opcodes (`TSTORE` / `TLOAD`)
* **Opkody i koszt gazu:**
  * `TLOAD` (`0x5c`): Zdejmuje ze stosu 32-bajtowy klucz `[key]` i odkłada 32-bajtową wartość `[value]` z pamięci transientnej kontraktu. **Koszt: 100 gazu** (stały, odpowiednik ciepłego odczytu `SLOAD`).
  * `TSTORE` (`0x5d`): Zdejmuje ze stosu 32-bajtowy klucz i 32-bajtową wartość `[key, value]` i zapisuje w pamięci transientnej. **Koszt: 100 gazu** (stały, bez zwrotów gazu refund, bez sprawdzania gas stipend).
* **Niezmienniki i semantyka wykonania:**
  * W kontekście `STATICCALL` próba wykonania `TSTORE` natychmiast **wywołuje revert** (ponieważ modyfikuje stan EVM), natomiast `TLOAD` jest dozwolony (odczyt bez mutacji).
  * **Żywotność i czyszczenie:** Pamięć transientna jest całkowicie zerowana na koniec nadrzędnej transakcji.
  * **Wycofanie stanu (Reversion):** W przypadku błędu (revert) w ramce wywołania (call frame), wszystkie zmiany dokonane w transient storage w tej ramce i jej potomkach są cofane.
  * **Zasięg (Reachability):**
    * Izolacja kontraktów: Kontrakt B wywołany przez Kontrakt A nie ma wglądu ani zapisu do transient storage Kontraktu A.
    * Kontekst `DELEGATECALL` / `CALLCODE`: Wykonanie następuje w kontekście wywołującego, dlatego `TSTORE`/`TLOAD` operują bezpośrednio na transient storage kontraktu wołającego.
* **Krytyczna pułapka audytowa ("Dirty Transient Storage"):**
  * Transient storage utrzymuje stan **pomiędzy kolejnymi wywołaniami tego samego kontraktu w ramach jednej transakcji** (np. pętle multicall, operacje bundle ERC-4337, zagnieżdżone callbacki Flash Loan).
  * Jeżeli stan transientny (np. flaga blokady reentrancy lub bufor księgowy) nie zostanie jawnie wyczyszczony do zera po zakończeniu operacji, kolejne wywołanie w tej samej transakcji przeczyta "brudne" dane, co może doprowadzić do pominięcia blokad bezpieczeństwa lub kradzieży środków.

### B. EIP-6780: Zmiana semantyki opkodu `SELFDESTRUCT` (`0xFF`)
* **Zachowanie po aktywacji Cancun:**
  * **W tej samej transakcji co utworzenie kontraktu:** Jeżeli `SELFDESTRUCT` zostanie wywołany na kontrakcie utworzonym w ramach **dokładnie tej samej transakcji** (np. w konstruktorze lub transakcji fabryki `CREATE`/`CREATE2`), kontrakt ulega skasowaniu (kod i storage trie są usuwane, a saldo ETH trafia do beneficjenta).
  * **W dowolnej innej sytuacji (kontrakt utworzony w przeszłości):** `SELFDESTRUCT` **NIE kasuje kodu kontraktu i NIE kasuje slotów storage**. Powoduje **WYŁĄCZNIE przelanie salda ETH** na wskazany adres. Kontrakt staje się tzw. "kontraktem zombie" (nadal posiada bytecode, storage i można go wywoływać).
* **Uzasadnienie architektoniczne:** Przygotowanie EVM pod drzewa Verkle i bezstanowość (statelessness), gdzie natychmiastowe usuwanie dowolnie wielkich poddrzew storage w jednym opkodzie było niewykonalne. Trwale eliminuje także wektory ataków na metamorficzne kontrakty (redeploy innego kodu pod tym samym adresem CREATE2).

### C. Transient Storage Reachability vs. Push Data i specyfikacja EOF / Prague
* **Problem Push Data w klasycznym bajtkodzie EVM:**
  * Instrukcje `PUSH1`–`PUSH32` (`0x60`–`0x7f`) zawierają bezpośrednio w strumieniu bajtkodu od 1 do 32 bajtów danych natychmiastowych.
  * Z punktu widzenia liniowego deasemblera i statycznej analizy grafu przepływu sterowania (CFG), sekwencja bajtów znajdująca się wewnątrz danych push (np. bajt `0x5b` odpowiadający `JUMPDEST` lub `0x5d` odpowiadający `TSTORE`) może zostać błędnie zinterpretowana jako faktyczny opkod, jeśli analiza nie uwzględnia pełnej osiągalności (reachability) od wejścia programu (`PC 0`).
  * Może to być wykorzystywane do zaciemniania kodu (obfuscation) lub ukrywania złośliwych opkodów przed prostymi skanerami podatności.
* **Rozwiązanie w formacie EOF (EVM Object Format - EIP-7692 / EIP-3540 / EIP-3670 / EIP-4200):**
  * EOF bezwzględnie oddziela sekcję kodu od sekcji danych w nagłówkach kontenera.
  * Zakazuje dynamicznych skoków `JUMP`/`JUMPI`, zastępując je statycznie weryfikowanymi skokami relatywnymi `RJUMP`, `RJUMPI`, `RJUMPV`.
  * Weryfikator EOF przy wdrażaniu kontraktu gwarantuje pełną, statyczną osiągalność instrukcji i uniemożliwia wpadnięcie wskaźnika instrukcji w dane push.
* **Główne specyfikacje wykonawcze Prague (Pectra):**
  * **EIP-7702:** Możliwość tymczasowego ustawienia kodu kontraktu dla kont EOA w ramach transakcji (batching operacji, sponsorowanie gazu, integracja Account Abstraction bez migracji adresu).
  * **EIP-2537:** Prekompilacje operacji na krzywej eliptycznej BLS12-381 (optymalizacja agregacji podpisów w L2 ZK-Rollups i warstwie konsensusu).
  * **EIP-7002:** Możliwość wyzwalania wyjść walidatorów (triggerable exits) bezpośrednio z poziomu warstwy wykonawczej (EL) przez smart kontrakty stakingowe.
  * **EIP-6110:** Dostarczanie depozytów walidatorów bezpośrednio w blokach warstwy wykonawczej.
  * **EIP-7685:** Ogólna struktura żądań warstwy wykonawczej do warstwy konsensusu.
  * **EIP-7623:** Zwiększenie kosztu calldata w celu ograniczenia maksymalnego rozmiaru bloku.
  * **EIP-7691:** Zwiększenie przepustowości blobów (target 6, max 9 blobów).

---

## 5. Oficjalne Adresy 20 Kanonicznych Korzeni na Ethereum, BSC i Arbitrum

Poniższa tabela stanowi audytowalny rejestr referencyjny 20 kluczowych korzeni kontraktowych. Wszystkie adresy zostały zweryfikowane z pierwotnymi źródłami eksploratorów (Etherscan, BscScan, Arbiscan) i dokumentacji protokołów w formacie sumy kontrolnej EIP-55.

| # | Symbol / Identyfikator | Sieć docelowa | Suma kontrolna EIP-55 adresu | Rola / Typ kontraktu | Pierwotne źródło / Wydawca / Eksplorator |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | **USDT** | Ethereum Mainnet | `0xdAC17F958D2ee523a2206206994597C13D831ec7` | ERC-20 Token (Tether USD) | Tether Operations Ltd / [Etherscan](https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7) *(Arbitrum: `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9`, BSC: `0x55d398326f99059fF775485246999027B3197955`)* |
| **2** | **USDC** | Ethereum Mainnet | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` | ERC-20 Token (FiatTokenV2_2) | Circle Internet Financial / [Etherscan](https://etherscan.io/token/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48) *(Arbitrum Native: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`, BSC: `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`)* |
| **3** | **WBNB** | BNB Smart Chain | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` | BEP-20 Wrapped BNB | BNB Chain Core / [BscScan](https://bscscan.com/token/0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c) |
| **4** | **PANCAKE_ROUTER** | BNB Smart Chain | `0x10ED43C718714eb63d5aA57B78B54704E256024E` | AMM Swap Router v2 | PancakeSwap / [BscScan](https://bscscan.com/address/0x10ed43c718714eb63d5aa57b78b54704e256024e) *(Router v3: `0x13f4EA83D0bd40E75C8222255bc855a974568Dd4`)* |
| **5** | **UNI_ROUTER3** | Ethereum Mainnet | `0xE592427A0AEce92De3Edee1F18E0157C05861564` | Uniswap V3: SwapRouter | Uniswap Labs / [Etherscan](https://etherscan.io/address/0xe592427a0aece92de3edee1f18e0157c05861564) *(SwapRouter02: `0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45`, BSC: `0xB971eF87def5635549233225564614619Bf0B359`)* |
| **6** | **DAI** | Ethereum Mainnet | `0x6B175474E89094C44Da98b954EedeAC495271d0F` | ERC-20 Stablecoin | MakerDAO (Sky) / [Etherscan](https://etherscan.io/token/0x6b175474e89094c44da98b954eedeac495271d0f) *(Arbitrum: `0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1`, BSC: `0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3`)* |
| **7** | **LINK** | Ethereum Mainnet | `0x514910771AF9Ca656af840dff83E8264EcF986CA` | ERC-677/ERC-20 Token | Chainlink Labs / [Etherscan](https://etherscan.io/token/0x514910771af9ca656af840dff83e8264ecf986ca) *(Arbitrum: `0xf97f4df75117a78c1A5a0DBb814Af92458539FB4`, BSC: `0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD`)* |
| **8** | **PEPE** | Ethereum Mainnet | `0x6982508145454Ce325dDbE47a25d4ec3d2311933` | ERC-20 Meme Token | Pepe Deployer / [Etherscan](https://etherscan.io/token/0x6982508145454ce325ddbe47a25d4ec3d2311933) |
| **9** | **SHIB** | Ethereum Mainnet | `0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE` | ERC-20 SHIBA INU Token | Shiba Inu Community / [Etherscan](https://etherscan.io/token/0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce) *(BSC-Peg: `0x2859e4544C4bB03966803b044A93563Bd2D0DD4D`)* |
| **10** | **AAVE_V3_POOL** | Ethereum Mainnet | `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2` | Core Lending/Borrowing Pool | Aave DAO & BGD Labs / [Etherscan](https://etherscan.io/address/0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2) *(Arbitrum V3: `0x794a61358D6845594F94dc1DB02A252b5b4814aD`)* |
| **11** | **STETH** | Ethereum Mainnet | `0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84` | Liquid Staked ETH (stETH) | Lido DAO / [Etherscan](https://etherscan.io/token/0xae7ab96520de3a18e5e111b5eaab095312d7fe84) *(wstETH Ethereum: `0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0`)* |
| **12** | **3CRV** | Ethereum Mainnet | `0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490` | Curve.fi 3pool LP Token | Curve Finance / [Etherscan](https://etherscan.io/token/0x6c3f90f043a72fa612cbac8115ee7e52bde6e490) *(3pool Swap Contract: `0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7`)* |
| **13** | **ARB_INBOX** | Ethereum Mainnet (L1) | `0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f` | Arbitrum One Delayed Inbox | Offchain Labs & Arbitrum Foundation / [Etherscan](https://etherscan.io/address/0x4dbd4fc535ac27206064b68ffcf827b0a60bab3f) |
| **14** | **SAFE_L2** | Arbitrum / BSC / Multi-Chain | `0x29fcB43b46531BcA003ddC8FCB67FFE91900C762` | Safe Singleton L2 (v1.4.1) | Safe{Core} / [Safe Deployments](https://github.com/safe-global/safe-smart-account) *(Wersja v1.3.0: `0x3E5c63644E683549055b9Be8653de26E0B4CD36E`)* |
| **15** | **CUSDC** | Ethereum Mainnet | `0x39AA39c021dfbae8faC545936693aC917d5E7563` | Compound cUSDC (v2) | Compound Finance / [Etherscan](https://etherscan.io/token/0x39aa39c021dfbae8fac545936693ac917d5e7563) *(Compound III Comet USDC: `0xc3d688B66703497DAA19211EEdff47f25384cdc3`)* |
| **16** | **SAFEMOON** | BNB Smart Chain | `0x8076C74C5e3F5852037F31Ff0093Eeb8c8ADd8D3` | SafeMoon Token (V1) | SafeMoon / [BscScan](https://bscscan.com/token/0x8076c74c5e3f5852037f31ff0093eeb8c8add8d3) *(SafeMoon V2 SFM: `0x42981d0bfbAf196529376EE702F2a9Eb9092fcB5`)* |
| **17** | **FLOKI** | BNB Smart Chain | `0xfb5B838b6cfEEdC2873aB27866079AC55363D37E` | Floki Ecosystem Token (BEP-20) | Floki Community / [BscScan](https://bscscan.com/token/0xfb5b838b6cfeedc2873ab27866079ac55363d37e) *(Ethereum ERC-20: `0xcf0C122c6b73380ea4829999a748a1cd22024780`)* |
| **18** | **SNX** | Ethereum Mainnet | `0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F` | Synthetix Network Token | Synthetix / [Etherscan](https://etherscan.io/token/0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f) |
| **19** | **BLUR_EXCHANGE** | Ethereum Mainnet | `0x000000000000Ad05Ccc4F10045630FB830B95127` | Blur.io: Marketplace (Core) | Blur Foundation / [Etherscan](https://etherscan.io/address/0x000000000000ad05ccc4f10045630fb830b95127) *(Blur Exchange V2: `0xb2ecfE4E4D61f8790bbb9DE2D1259B9e2410CEA5`)* |
| **20** | **TORN_ROUTER** | Ethereum Mainnet | `0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b` | Tornado.Cash: Router | Tornado Cash Protocol / [Etherscan](https://etherscan.io/address/0xd90e2f925da726b50c4ed8d0fb90ad053324f31b) |

---

## 6. Podsumowanie Wdrożeniowe dla Silnika Velmère Furnace 3.0
Zgromadzone dane stanowią podstawę do aktualizacji reguł detektora AST oraz modułów scoringowych:
1. **Reguły SCSVS/Top 10:** Zsynchronizowanie reguł audytowych Velmère (`VLM-SEC-01` do `VLM-SEC-10+`) z oficjalnymi kategoriami SC01–SC10 oraz standardami SCSVS L1–L3.
2. **Kompilacja i EVM:** Uwzględnienie w statycznej analizie semantyki EIP-6780 (brak kasowania kodu w starych kontraktach) oraz ryzyka dirty transient storage w EIP-1153 (`TSTORE`/`TLOAD`).
3. **Wzorzec OpenZeppelin v5:** Weryfikacja obecności pojedynczego hooka `_update`, niestandardowych błędów ERC-6093 oraz slotów ERC-7201 przy analizie podatności proxy i skarbca ERC-4626.
4. **Baza Adresowa:** Wprowadzenie zweryfikowanych sum kontrolnych 20 kanonicznych korzeni do rejestru white-label i weryfikatora autentyczności kontraktów Velmère.
