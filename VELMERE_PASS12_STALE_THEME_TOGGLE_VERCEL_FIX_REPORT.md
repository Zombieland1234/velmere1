# Velmère Pass 12 — stale ThemeToneToggle Vercel fix

## Vercel error fixed

Vercel failed during `npm run vercel:preflight` on a stale file that still existed in the GitHub repo:

- `components/ui/ThemeToneToggle.tsx`
- bad Tailwind opacity class: `text-white/62`

That file was not present in the generated pass 11 zip because the light theme toggle had been removed earlier. If the zip was extracted over an existing repository, old files can remain on disk. This pass includes a replacement file, so the stale file gets overwritten instead of surviving in the repo.

## Change made

Created/overwrote:

- `components/ui/ThemeToneToggle.tsx`

with a safe no-op component:

- keeps old imports from breaking,
- renders nothing,
- does not toggle the removed light theme,
- contains no Tailwind opacity classes,
- cannot fail the current preflight.

## Verification

- `node scripts/check-i18n.mjs` passes.
- `node scripts/vercel-preflight.mjs` passes.
- Static scan confirms no `text-white/62` in the package.
- Zip integrity test passes.

## Important deployment note

When applying this package to an existing repository, old files that are not in a zip may remain unless overwritten or deleted. This pass explicitly overwrites the stale ThemeToneToggle file to avoid that problem.
