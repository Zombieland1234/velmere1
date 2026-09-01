# Velmère PASS35 A42 — odzyskiwanie środowiska developerskiego na Windows

A42 odpowiada na rzeczywisty błąd uruchomieniowy, w którym ten sam wyjątek `JSON.parse` powodował HTTP 500 jednocześnie na niezależnych stronach, trasach API, manifeście i ikonach. Taki wzorzec jest traktowany jako awaria wspólnego stanu uruchomieniowego, nie jako osiem niezależnych błędów komponentów.

## Czysty start

Rozpakuj finalny ZIP A42 do nowego, pustego folderu. Następnie uruchom:

```cmd
node -v
npm -v
npm ci
npm run diagnose:dev:a42
npm run dev
```

Na Windows `npm run dev` wybiera **Webpack** jako ostrożny domyślny bundler developerski. Turbopack pozostaje dostępny do jawnego porównania:

```cmd
npm run dev:turbopack
```

A42 nie używa odziedziczonych prywatnych zmiennych `NEXT_PRIVATE_*` / `__NEXT_PRIVATE_*`. Przy zmianie rewizji, niedopasowaniu fingerprintu, niedomkniętej poprzedniej sesji albo niepoprawnym JSON-ie w wygenerowanym `.next` usuwa wyłącznie bezpośredni katalog `.next` projektu. Pliki produktu nie są naprawiane ani przepisywane w runtime.

## Test po komunikacie `Ready`

W drugim terminalu, w tym samym folderze:

```cmd
npm run smoke:runtime:a42
```

Smoke sprawdza Home, Browser, Shield, Shield Pro, Shield Map, Intelligence, Atelier, Security/Audits, manifest, ikony, sesję auth i feed rynkowy. Każda odpowiedź ma limit 256 KiB. Kontrolowany `401`, `403`, `424`, `429` lub `503` może być prawidłowym stanem fail-closed danej trasy. Globalne `500`, niepoprawny JSON i sygnatura obserwowanego wyjątku kończą test błędem.

## Polecenia odzyskiwania

```cmd
npm run dev:clean:a42
npm run dev:webpack
npm run dev:turbopack
npm run diagnose:dev:a42
npm run repair:dev:a42
npm run test:pass35:a42:runner-integration
```

Można też uruchomić `VELMERE_START_A42.cmd`, który sprawdza identyfikator pasa, uruchamia diagnostykę i wykonuje czysty start. Test `runner-integration` używa izolowanego fałszywego procesu Next; nie wymaga przeglądarki i nie modyfikuje plików produktu.

Nie uruchamiaj `npm audit fix --force`. To polecenie może przepisać graf zależności i nie jest naprawą wspólnego błędu parsera środowiska developerskiego.

## Granica dowodu

A42 udowadnia statyczną spójność źródła, bezpieczną politykę cache, diagnostykę JSON, zachowanie A41 i lokalny kontrakt smoke. Dopiero wykonany na dokładnym Node 24.18.0/npm 11.16.0 test HTTP w działającej przeglądarce może potwierdzić, że problem nie powtarza się na konkretnej maszynie.
