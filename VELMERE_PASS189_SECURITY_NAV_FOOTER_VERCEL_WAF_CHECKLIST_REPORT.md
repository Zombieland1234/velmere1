# Velmère PASS189 — Security Page Nav/Footer Integration + Vercel Env Checklist + WAF Rules Draft

## Scope
This pass connects the public security narrative to the actual site and turns the remaining security blockers into operator checklists:
- Security link in desktop nav and mobile menu.
- Security link and trust microcopy in footer.
- Security operations checklist panel added to `/security`.
- Public `/api/security/operations-checklist`.
- Vercel env checklist docs.
- Vercel WAF rule draft docs.
- Runtime QA checklist docs.
- PASS189 Vercel/static sweep guard.

## Implemented
- `lib/security/security-operations-checklist.ts`
- `components/security/SecurityOperationsChecklistPanel.tsx`
- `/api/security/operations-checklist`
- `/security` now includes operator checklist panel
- `Navbar` includes Security link
- `Footer` includes Security link and safe trust microcopy
- `docs/security/VERCEL_ENV_SECURITY_CHECKLIST.md`
- `docs/security/VERCEL_WAF_RULES_DRAFT.md`
- `docs/security/SECURITY_RUNTIME_QA_CHECKLIST.md`

## Boundary
Checklist/WAF rules are operator guidance. They still need to be applied manually in Vercel and verified after deploy.
