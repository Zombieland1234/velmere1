# PASS487 Build Notes

Wymagane środowisko: Node.js 20.x, npm zgodny z package-lock.

```bash
npm ci
npm run typecheck
npm run build
```

Dodatkowe gate'y:

```bash
npm run verify:pass480-484-chart-identity-terminal-vlm-depth
npm run verify:pass485-486-evidence-brain-pdf-forge
npm run verify:pass487-shield-decision-field
npm run check:i18n
npm run vercel:preflight
```
