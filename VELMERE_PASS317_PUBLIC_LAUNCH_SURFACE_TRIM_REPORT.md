# PASS317 — Public Launch Surface Trim

## Cel
Publiczne strony mają prowadzić klienta po jednej prostej ścieżce: produkt, status, następny krok. Operatorowe launch-control, blockery, storage, provider, WAF, PDF i order-ledger zostają w adminie/guardach.

## Zmiany
- Home: usunięty publiczny Launch Reality Ledger i FullSurfaceReadinessIndex.
- Cart: usunięte publiczne panele CommerceLaunchControl, PaymentOrderReadinessPanel i OrderEventLedgerPanel; dodany krótki customer-safe status.
- Checkout: usunięta publiczna ściana provider/payment/storage/readiness paneli; dodany clean locked checkout + powrót do sklepu/waitlist.
- VLM/Legal/Security: operatorowe checklists i readiness panels ukryte poza publicznym scroll path.
- Nowy gate: `PASS317_PUBLIC_LAUNCH_SURFACE_GATE`.

## Research anchor
- MEXC WebSocket: krótkie live windows i reconnect/expiry.
- MEXC PoR: snapshot/rezerwy jako kontekst, nie obietnica bezpieczeństwa.
- Aura/LVMH DPP: klient widzi krótką traceability/authenticity warstwę, nie techniczny audit dump.

## Guard
`npm run verify:pass317-public-launch-surface-gate`
