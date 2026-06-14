# VELMERE PASS 143 — Admin Server Auth Contract + Publish Permission Gate + Secret Redaction Policy

## Base
Built on PASS 142.

## Why this pass
You asked to take more tasks at once. PASS143 combines three ops/admin blockers instead of doing one tiny pass:
1. server auth contract,
2. publish permission gate,
3. secret redaction policy plus static secret scan.

## Implemented

### 1. Admin server auth contract
Added:
- `lib/launch/admin-server-auth-contract.ts`
- `components/launch/AdminServerAuthContractPanel.tsx`

Tracks:
- server auth provider,
- admin role contract,
- session expiry and reauth,
- mutation permission,
- server kill switch.

### 2. Publish permission gate
Added:
- `lib/launch/publish-permission-gate.ts`
- `components/launch/PublishPermissionGatePanel.tsx`

Tracks:
- draft-only import,
- provider truth required,
- shipping/returns required,
- active publish permission,
- audit before publish.

### 3. Secret redaction policy
Added:
- `lib/launch/secret-redaction-policy.ts`
- `components/launch/SecretRedactionPolicyPanel.tsx`

Tracks:
- browser-visible secret scan,
- raw provider response redaction,
- log redaction,
- private prompt redaction.

### 4. Admin import route update
Updated:
- `app/[locale]/admin/import-products/page.tsx`

Both locked and unlocked states show:
- AdminRouteGatePanel,
- AdminServerAuthContractPanel,
- PublishPermissionGatePanel,
- SecretRedactionPolicyPanel.

### 5. Guards
Added:
- `scripts/verify-admin-auth-publish-secret-safety.mjs`
- `scripts/verify-secret-redaction-static-safety.mjs`

Updated:
- `package.json`
- `scripts/vercel-preflight.mjs`
- older admin route/environment/provider guards.

New commands:
- `npm run verify:admin-auth-publish-secret`
- `npm run verify:secret-redaction-static`

## Validation
Passed:
- `node scripts/verify-admin-auth-publish-secret-safety.mjs` → exit 0
- `node scripts/verify-secret-redaction-static-safety.mjs` → exit 0
- `node scripts/verify-admin-environment-gate-safety.mjs` → exit 0
- `node scripts/verify-admin-route-gate-safety.mjs` → exit 0
- `node scripts/verify-order-event-ledger-safety.mjs` → exit 0
- `node scripts/verify-payment-order-readiness-safety.mjs` → exit 0
- `node scripts/verify-shipping-returns-truth-safety.mjs` → exit 0
- `node scripts/verify-product-provider-snapshot-safety.mjs` → exit 0
- `node scripts/verify-provider-truth-admin-gate-safety.mjs` → exit 0
- `node scripts/verify-commerce-launch-control-safety.mjs` → exit 0
- `node scripts/verify-square-vlm-launch-control-safety.mjs` → exit 0
- `node scripts/verify-site-page-audit-safety.mjs` → exit 0
- `node scripts/verify-vercel-static-safety.mjs` → exit 0
- `node scripts/verify-operator-copy-progress-safety.mjs` → exit 0
- `node scripts/verify-orbit-layout-cleanup-safety.mjs` → exit 0
- `node scripts/verify-evidence-export-manifest-safety.mjs` → exit 0
- `node scripts/verify-evidence-report-safety.mjs` → exit 0
- `node scripts/verify-vlm-motion-governor-safety.mjs` → exit 0
- `node scripts/verify-vlm-brain-performance.mjs` → exit 0
- `node scripts/verify-shield-runtime-ui-safety.mjs` → exit 0
- `node scripts/check-i18n.mjs` → exit 0
- `node scripts/vercel-preflight.mjs` → exit 0
- `node scripts/verify-market-integrity-no-truncation.mjs` → exit 0
- `node scripts/verify-shield-design-safety.mjs` → exit 0
- `node scripts/verify-risk-engine-safety.mjs` → exit 0
- `node scripts/verify-locale-surface.mjs` → exit 0
- `node scripts/verify-ai-brain-import-contract.mjs` → exit 0
- `node scripts/verify-commerce-launch-safety.mjs` → exit 0
- `node scripts/verify-product-truth-safety.mjs` → exit 0
- `node scripts/verify-ai-risk-brain-scenarios.mjs` → exit 0
- `node scripts/verify-operator-casefile-safety.mjs` → exit 0

Static checks:
- raw `<img>` in TSX: 0
- direct runtime MapIterator spreads: 0
- root CODEX artifacts: 0
- deployable CODEX source artifacts: 0
- old bad terms: 0

## Progress after PASS 143

| Area | Previous | After PASS 143 | Change |
|---|---:|---:|---:|
| UI shell / layout | 73–75% | 74–76% | +1% |
| Shield terminal | 66–68% | 66–68% | 0% |
| VLM AI risk brain | 49–52% | 49–52% | 0% |
| VLM visual brain / motion | 59–62% | 59–62% | 0% |
| Data / API spine | 48–50% | 49–51% | +1% |
| Legal / launch safety | 79–81% | 80–82% | +1% |
| Mobile polish | 45–48% | 45–48% | 0% |
| Full translations | 60–62% | 61–63% | +1% |
| Clothing commerce readiness | 70–72% | 70–72% | 0% |
| Checkout / fulfillment readiness | 50–52% | 50–52% | 0% |
| Payment / order state | 28–31% | 28–31% | 0% |
| Order event ledger | 20–25% | 20–25% | 0% |
| Admin route gate | 38–42% | 49–52% | +10% |
| Admin server auth contract | 0% | 15–20% | new module |
| Publish permission gate | 0% | 28–34% | new module |
| Secret redaction policy | 0% | 32–36% | new module |
| Admin import readiness | 55–58% | 64–67% | +9% |
| Provider truth readiness | 43–47% | 43–47% | 0% |
| Shipping / returns truth | 40–45% | 40–45% | 0% |
| Square/community readiness | 48–50% | 48–50% | 0% |
| VLM access layer | 57–59% | 57–59% | 0% |
| Vercel/static build safety | 82–84% | 83–85% | +1% |
| Whole brand/site launch readiness | 77–79% | 78–80% | +1% |

## Biggest blockers
- choose and implement real auth provider,
- server-side role/session route boundary,
- server kill switch,
- persistent import/publish audit,
- hard publish checklist enforcement,
- raw provider response mapper,
- log redaction wrapper,
- real Vercel `npm run build` confirmation.
