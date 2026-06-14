# PASS725 — build notes

## Wymagane środowisko

- Node.js >=24.16.0 <25
- npm >=11.16.0 <12
- publiczny registry: https://registry.npmjs.org/

## Windows CMD

```cmd
node -v
npm -v
npm config get registry
npm ci
npm run typecheck
npm run dev
```

Produkcja:

```cmd
set NODE_OPTIONS=--max-old-space-size=6144
npm run build:webpack
```

## Uwagi

- ostrzeżenia `deprecated` pochodzą głównie z zależności przechodnich Web3;
- PASS725 nie zmienia zależności, dlatego `package-lock.json` pozostaje zgodny z PASS717;
- pełny build należy wykonywać pod Node 24.16/npm 11.16.
