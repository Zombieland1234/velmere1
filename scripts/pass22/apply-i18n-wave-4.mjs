#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  en: path.join(root, 'messages/en.json'),
  pl: path.join(root, 'messages/pl.json'),
  de: path.join(root, 'messages/de.json')
};
const data = Object.fromEntries(Object.entries(files).map(([k,p]) => [k, JSON.parse(fs.readFileSync(p,'utf8'))]));

const translations = {
  StoreLaunchRoadmap: {
    pl: {
      kicker:'Plan uruchomienia', title:'Sklep, platforma i VLM', body:'Uczciwa kolejność uruchomienia sprzedaży odzieży i aktywacji VLM.',
      'phases.store.kicker':'Sklep','phases.store.title':'Uruchomienie odzieży','phases.store.items.0':'Synchronizacja API Printful oraz import CSV/linków Tapstitch','phases.store.items.1':'Wersje robocze produktów z cenami w EUR i stawkami wysyłki','phases.store.items.2':'Finalny checkout Stripe, podatki/VAT, adres sprzedawcy i polityki','phases.store.items.3':'Test zamówienia i mapowanie realizacji',
      'phases.platform.kicker':'Platforma','phases.platform.title':'Platforma klienta','phases.platform.items.0':'Logowanie/konto z zamówieniami i zapisanymi produktami','phases.platform.items.1':'Bramki gotowości koszyka i checkoutu','phases.platform.items.2':'Panel administratora dla produktów, zamówień i statusu VLM','phases.platform.items.3':'Konsjerż AI Angel i newsletter',
      'phases.vlm.kicker':'VLM','phases.vlm.title':'Aktywacja tokena','phases.vlm.items.0':'ERC-20 na testnecie Base/Sepolia, stała podaż 1 mld i opłaty zdefiniowane w rejestrze','phases.vlm.items.1':'Slither/Mythril, przegląd własny i skarbiec multisig','phases.vlm.items.2':'Adres kontraktu, trasa/pula Registry i przegląd prawny','phases.vlm.items.3':'Aktywacja mainnetu dopiero po ukończeniu bezpieczeństwa i rejestru'
    },
    de: {
      kicker:'Launch-Roadmap', title:'Shop, Plattform und VLM', body:'Transparente Reihenfolge für den Bekleidungsverkauf und die VLM-Aktivierung.',
      'phases.store.kicker':'Shop','phases.store.title':'Bekleidungslaunch','phases.store.items.0':'Printful-API-Synchronisierung und Tapstitch-CSV/Link-Import','phases.store.items.1':'Produktentwürfe mit EUR-Preisen und Versandtarifen','phases.store.items.2':'Finaler Stripe-Checkout, Steuern/USt., Verkäuferadresse und Richtlinien','phases.store.items.3':'Bestelltest und Fulfilment-Zuordnung',
      'phases.platform.kicker':'Plattform','phases.platform.title':'Kundenplattform','phases.platform.items.0':'Login/Konto mit Bestellungen und gespeicherten Artikeln','phases.platform.items.1':'Bereitschaftsprüfungen für Warenkorb und Checkout','phases.platform.items.2':'Admin-Panel für Produkte, Bestellungen und VLM-Status','phases.platform.items.3':'AI-Angel-Concierge und Newsletter',
      'phases.vlm.kicker':'VLM','phases.vlm.title':'Token-Aktivierung','phases.vlm.items.0':'ERC-20 im Base/Sepolia-Testnet, feste Menge von 1 Mrd. und registry-definierte Gebühren','phases.vlm.items.1':'Slither/Mythril, Eigenprüfung und Multisig-Treasury','phases.vlm.items.2':'Vertragsadresse, Registry-Route/Pool und rechtliche Prüfung','phases.vlm.items.3':'Mainnet-Aktivierung erst nach Abschluss von Sicherheit und Registry'
    }
  },
  BlockchainSearch: {
    pl: {
      kicker:'Terminal eksploratora',title:'Wyszukiwanie blockchain',body:'Wyszukuj publiczne adresy EVM lub hashe transakcji bez zakładania, że kontrakt VLM już istnieje.',notice:'Kontrakt VLM nie został jeszcze wdrożony. Wyszukiwanie otwiera wyłącznie publiczne eksploratory.',chainLabel:'Sieć',placeholder:'Wklej adres EVM lub hash transakcji',submit:'Wyszukaj w eksploratorze',helper:'Użyj publicznego adresu portfela albo hasha transakcji.',baseExplorer:'Otwórz eksplorator Base',streamTitle:'Strumień szesnastkowy',engineTitle:'Silnik oceny dostępu',score:'Ocena dostępu: {value}','chains.evm':'EVM','chains.solana':'Solana — planowana','chains.sui':'Sui — planowane','chains.base':'Base','chains.ethereum':'Ethereum','errors.empty':'Najpierw wklej adres lub hash transakcji.','errors.invalid':'Użyj prawidłowego adresu EVM albo hasha transakcji.','errors.planned':'Ta trasa eksploratora jest przygotowana dla przyszłej obsługi sieci.','valid.address':'Prawidłowy format adresu EVM.','valid.tx':'Prawidłowy format hasha transakcji EVM.'
    },
    de: {
      kicker:'Explorer-Terminal',title:'Blockchain-Suche',body:'Suche nach öffentlichen EVM-Adressen oder Transaktions-Hashes, ohne einen bestehenden VLM-Vertrag vorauszusetzen.',notice:'Der VLM-Vertrag ist noch nicht bereitgestellt. Die Suche öffnet nur öffentliche Explorer.',chainLabel:'Netzwerk',placeholder:'EVM-Adresse oder Transaktions-Hash einfügen',submit:'Im Explorer suchen',helper:'Verwende eine öffentliche Wallet-Adresse oder einen Transaktions-Hash.',baseExplorer:'Base Explorer öffnen',streamTitle:'Hex-Stream',engineTitle:'Zugriffsbewertungs-Engine',score:'Zugriffswert: {value}','chains.evm':'EVM','chains.solana':'Solana geplant','chains.sui':'Sui geplant','chains.base':'Base','chains.ethereum':'Ethereum','errors.empty':'Füge zuerst eine Adresse oder einen Transaktions-Hash ein.','errors.invalid':'Verwende eine gültige EVM-Adresse oder einen Transaktions-Hash.','errors.planned':'Diese Explorer-Route ist für spätere Netzwerkunterstützung vorbereitet.','valid.address':'Gültiges EVM-Adressformat.','valid.tx':'Gültiges EVM-Transaktions-Hash-Format.'
    }
  },
  VlmWalletFlow: {
    pl: {
      kicker:'Przepływ portfela',title:'Trasa non-custodial przed dostępem.',body:'Konfiguracja odbywa się w zaufanym oprogramowaniu portfela. Velmère odczytuje tylko publiczny adres po zgodzie użytkownika.','steps.install.title':'Zainstaluj portfel','steps.install.body':'Użyj zaufanego portfela non-custodial, takiego jak MetaMask.','steps.create.title':'Utwórz portfel','steps.create.body':'Utwórz portfel wewnątrz aplikacji portfela, nigdy na tej stronie.','steps.store.title':'Zabezpiecz odzyskiwanie','steps.store.body':'Przechowuj frazę seed offline. Velmère nigdy o nią nie prosi.','steps.network.title':'Dodaj sieć','steps.network.body':'Dodaj obsługiwaną sieć EVM po wdrożeniu.','steps.verify.title':'Zweryfikuj kontrakt','steps.verify.body':'Porównaj oficjalny adres z eksploratorem bloków.','steps.connect.title':'Połącz podgląd','steps.connect.body':'Połącz się z Velmère wyłącznie, aby udostępnić publiczny adres.','steps.read.title':'Odczyt dostępu','steps.read.body':'Przyszły silnik dostępu odczytuje uprawnienia; nie przechowuje środków.'
    },
    de: {
      kicker:'Wallet-Ablauf',title:'Non-Custodial-Route vor dem Zugriff.',body:'Die Einrichtung erfolgt in vertrauenswürdiger Wallet-Software. Velmère liest nach Zustimmung nur die öffentliche Adresse.','steps.install.title':'Wallet installieren','steps.install.body':'Verwende eine vertrauenswürdige Non-Custodial-Wallet wie MetaMask.','steps.create.title':'Wallet erstellen','steps.create.body':'Erstelle die Wallet in der Wallet-App, niemals auf dieser Website.','steps.store.title':'Wiederherstellung sichern','steps.store.body':'Bewahre die Seed-Phrase offline auf. Velmère fragt niemals danach.','steps.network.title':'Netzwerk hinzufügen','steps.network.body':'Füge das unterstützte EVM-Netzwerk nach der Bereitstellung hinzu.','steps.verify.title':'Vertrag prüfen','steps.verify.body':'Vergleiche die offizielle Adresse mit dem Block-Explorer.','steps.connect.title':'Vorschau verbinden','steps.connect.body':'Verbinde dich nur mit Velmère, um eine öffentliche Adresse zu teilen.','steps.read.title':'Zugriff auslesen','steps.read.body':'Die zukünftige Zugriffs-Engine liest Berechtigungen; sie verwahrt keine Gelder.'
    }
  },
  VlmProductionChecklist: {
    pl: {kicker:'Wymagania produkcyjne',title:'Sklep, platforma i VLM',body:'Co musi zostać ukończone przed sprzedażą odzieży i aktywacją tokena.','phases.store.kicker':'Sklep','phases.store.title':'Uruchomienie odzieży','phases.store.items.0':'Pipeline produktów Printful / Tapstitch','phases.store.items.1':'Checkout Stripe i ceny w EUR','phases.store.items.2':'Wysyłka, podatki/VAT i polityki prawne','phases.platform.kicker':'Platforma','phases.platform.title':'Platforma klienta','phases.platform.items.0':'Logowanie / konto','phases.platform.items.1':'Konsjerż AI Angel','phases.platform.items.2':'Panel administracyjny produktów i zamówień','phases.vlm.kicker':'VLM','phases.vlm.title':'Aktywacja tokena','phases.vlm.items.0':'Wdrożenie kontraktu i walidacja testnetu','phases.vlm.items.1':'Przegląd bezpieczeństwa i audyt','phases.vlm.items.2':'Registry, trasa Registry i płynność'},
    de: {kicker:'Produktionsanforderungen',title:'Shop, Plattform und VLM',body:'Was vor Bekleidungsverkauf und Token-Aktivierung abgeschlossen sein muss.','phases.store.kicker':'Shop','phases.store.title':'Bekleidungslaunch','phases.store.items.0':'Printful-/Tapstitch-Produktpipeline','phases.store.items.1':'Stripe-Checkout und EUR-Preise','phases.store.items.2':'Versand, Steuern/USt. und rechtliche Richtlinien','phases.platform.kicker':'Plattform','phases.platform.title':'Kundenplattform','phases.platform.items.0':'Login / Konto','phases.platform.items.1':'AI-Angel-Concierge','phases.platform.items.2':'Admin für Produkte und Bestellungen','phases.vlm.kicker':'VLM','phases.vlm.title':'Token-Aktivierung','phases.vlm.items.0':'Vertragsbereitstellung und Testnet-Validierung','phases.vlm.items.1':'Sicherheitsprüfung und Audit','phases.vlm.items.2':'Registry, Registry-Route und Liquidität'}
  },
  SecurityReadinessConsole: {
    pl: {kicker:'Konsola',title:'Konsola gotowości bezpieczeństwa',inputLabel:'Sprawdź publiczny adres',placeholder:'0x...',resultLabel:'Wynik gotowości',result:'zablokowane przez rejestr',disclaimer:'To podgląd gotowości, a nie audyt bezpieczeństwa.','addressStates.empty':'Wprowadź publiczny adres EVM. Nie podawaj frazy seed ani klucza prywatnego.','addressStates.invalid':'Nieprawidłowy format publicznego adresu EVM.','addressStates.valid':'Format publicznego adresu jest prawidłowy. Kontrola dostępu pozostaje zablokowana do wdrożenia kontraktu.','checks.openzeppelin':'Planowany ERC-20 OpenZeppelin','checks.fixedSupply':'Planowana stała podaż','checks.mintDisabled':'Mint wyłączony po wdrożeniu','checks.buyTaxCap':'Planowany twardy limit opłaty wejścia','checks.sellTaxCap':'Planowany twardy limit opłaty wyjścia','checks.noBlacklist':'Planowany brak blacklisty','checks.noHoneypot':'Planowany brak honeypota','checks.multisig':'Wymagany multisig','checks.testnet':'Wymagany testnet','checks.staticAnalysis':'Planowane Slither/Mythril','checks.audit':'Wymagany niezależny audyt'},
    de: {kicker:'Konsole',title:'Konsole für Sicherheitsbereitschaft',inputLabel:'Öffentliche Adresse prüfen',placeholder:'0x...',resultLabel:'Bereitschaftsergebnis',result:'durch Registry gesperrt',disclaimer:'Dies ist eine Bereitschaftsvorschau, kein Sicherheitsaudit.','addressStates.empty':'Gib eine öffentliche EVM-Adresse ein. Keine Seed-Phrase oder privaten Schlüssel eingeben.','addressStates.invalid':'Ungültiges Format der öffentlichen EVM-Adresse.','addressStates.valid':'Das öffentliche Adressformat ist gültig. Die Zugriffsprüfung bleibt bis zur Vertragsbereitstellung gesperrt.','checks.openzeppelin':'OpenZeppelin ERC-20 geplant','checks.fixedSupply':'Feste Menge geplant','checks.mintDisabled':'Minting nach Bereitstellung deaktiviert','checks.buyTaxCap':'Harte Obergrenze der Einstiegsgebühr geplant','checks.sellTaxCap':'Harte Obergrenze der Ausstiegsgebühr geplant','checks.noBlacklist':'Keine Blacklist geplant','checks.noHoneypot':'Kein Honeypot geplant','checks.multisig':'Multisig erforderlich','checks.testnet':'Testnet erforderlich','checks.staticAnalysis':'Slither/Mythril geplant','checks.audit':'Unabhängiges Audit erforderlich'}
  },
  WalletGenesis: {
    pl: {kicker:'Geneza portfela',title:'Symulacja non-custodial',body:'Symulacja pokazuje logikę non-custodial: klucz prywatny pozostaje w portfelu użytkownika. Velmère może odczytać publiczny adres i sprawdzić dostęp, ale nie przechowuje kluczy.',securityNote:'Prawdziwy portfel jest tworzony przez zaufane oprogramowanie, takie jak MetaMask. Ta animacja nie tworzy portfela.',amuNote:'Impuls AMU przedstawia wizualną warstwę symulacji. Prawdziwy klucz prywatny pozostaje w portfelu użytkownika i nigdy nie jest tworzony przez stronę.','steps.entropy.label':'Chmura entropii','steps.entropy.value':'oprogramowanie portfela','steps.amu.label':'Impuls nośny AMU','steps.amu.value':'warstwa wizualna','steps.privateKey.label':'Klucz prywatny','steps.privateKey.value':'NIGDY NIEWYŚWIETLANY','steps.publicAddress.label':'Adres publiczny','steps.publicAddress.value':'adres publiczny','steps.accessPreview.label':'Kontrola VLM','steps.accessPreview.value':'TYLKO PODGLĄD DOSTĘPU',activeStep:'aktywny krok',prev:'Poprzedni',next:'Dalej'},
    de: {kicker:'Wallet-Genesis',title:'Non-Custodial-Simulation',body:'Die Simulation zeigt die Non-Custodial-Logik: Der private Schlüssel bleibt in der Wallet des Nutzers. Velmère kann die öffentliche Adresse lesen und den Zugriff prüfen, speichert aber keine Schlüssel.',securityNote:'Die echte Wallet-Erstellung erfolgt über vertrauenswürdige Software wie MetaMask. Diese Animation erstellt keine Wallet.',amuNote:'Der AMU-Impuls steht für die visuelle Simulationsebene. Der echte private Schlüssel verbleibt in der Nutzer-Wallet und wird niemals von der Website erzeugt.','steps.entropy.label':'Entropie-Wolke','steps.entropy.value':'Wallet-Software','steps.amu.label':'AMU-Trägerimpuls','steps.amu.value':'visuelle Ebene','steps.privateKey.label':'Privater Schlüssel','steps.privateKey.value':'NIE ANGEZEIGT','steps.publicAddress.label':'Öffentliche Adresse','steps.publicAddress.value':'öffentliche Adresse','steps.accessPreview.label':'VLM-Prüfung','steps.accessPreview.value':'NUR ZUGRIFFSVORSCHAU',activeStep:'aktiver Schritt',prev:'Zurück',next:'Weiter'}
  },
  Wallet: {
    pl: {walletPreview:'Podgląd portfela',walletPrivacy:'Velmère odczytuje wyłącznie publiczny adres portfela. Klucze prywatne i frazy seed pozostają w aplikacji portfela.',metamask:'MetaMask',phantom:'Phantom',connect:'Połącz',connecting:'Łączenie…',connected:'Połączono',notDetected:'Nie wykryto portfela',rejected:'Połączenie odrzucone',disconnect:'Rozłącz',copyAddress:'Kopiuj adres',copied:'Skopiowano',publicAddress:'Adres publiczny',manualCheck:'Sprawdzenie publicznego adresu',invalidAddress:'Nieprawidłowy format adresu',validAddress:'Prawidłowy format publicznego adresu',registryRequired:'Do kontroli dostępu wymagany jest rejestr',neverSeed:'Nigdy nie podawaj frazy seed ani klucza prywatnego. Velmère nigdy o nie nie poprosi.',previewOnly:'Połączono w trybie podglądu. Handel i aktywacja dostępu wymagają oficjalnego rejestru kontraktu.'},
    de: {walletPreview:'Wallet-Vorschau',walletPrivacy:'Velmère liest nur die öffentliche Wallet-Adresse. Private Schlüssel und Seed-Phrasen bleiben in der Wallet-App.',metamask:'MetaMask',phantom:'Phantom',connect:'Verbinden',connecting:'Verbindung wird hergestellt…',connected:'Verbunden',notDetected:'Wallet nicht erkannt',rejected:'Verbindung abgelehnt',disconnect:'Trennen',copyAddress:'Adresse kopieren',copied:'Kopiert',publicAddress:'Öffentliche Adresse',manualCheck:'Prüfung der öffentlichen Adresse',invalidAddress:'Ungültiges Adressformat',validAddress:'Gültiges öffentliches Adressformat',registryRequired:'Registry für Zugriffsprüfung erforderlich',neverSeed:'Gib niemals eine Seed-Phrase oder einen privaten Schlüssel ein. Velmère wird nie danach fragen.',previewOnly:'Für die Vorschau verbunden. Handel und Zugriffsaktivierung erfordern die offizielle Vertrags-Registry.'}
  }
};

function setPath(obj, dotted, value) {
  const parts = dotted.split('.');
  let cur = obj;
  for (let i=0;i<parts.length-1;i++) {
    const key = /^\d+$/.test(parts[i]) ? Number(parts[i]) : parts[i];
    cur = cur[key];
    if (cur == null) throw new Error(`Missing path ${dotted}`);
  }
  const last = /^\d+$/.test(parts.at(-1)) ? Number(parts.at(-1)) : parts.at(-1);
  cur[last] = value;
}
let changed=0;
for (const [namespace, locales] of Object.entries(translations)) {
  for (const locale of ['pl','de']) {
    for (const [subpath,value] of Object.entries(locales[locale])) {
      setPath(data[locale][namespace], subpath, value);
      changed++;
    }
  }
}
for (const locale of ['pl','en','de']) fs.writeFileSync(files[locale], `${JSON.stringify(data[locale], null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ok:true,namespaces:Object.keys(translations).length,valuesChanged:changed},null,2));
