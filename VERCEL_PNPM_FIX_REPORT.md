# Velmère Vercel pnpm install fix

This pass changes Vercel deployment away from npm install to pnpm through Corepack because Vercel npm was failing before Next dependencies were installed with: `npm error Exit handler never called!`.

Key files changed:
- `vercel.json` now uses `corepack enable && corepack prepare pnpm@9.15.9 --activate && pnpm install --no-frozen-lockfile`.
- `package.json` now sets `packageManager` to `pnpm@9.15.9`.

After copying this project into the GitHub repo root, check that `package.json` is directly in the repository root and Vercel Root Directory is empty.
