#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const workflow = `.github/workflows/velmere-runtime-proof.yml`;
const body = `name: Velmere Runtime Proof\n\non:\n  workflow_dispatch:\n    inputs:\n      hosted_url:\n        description: Hosted Velmere URL for smoke checks\n        required: false\n        type: string\n\njobs:\n  runtime-proof:\n    runs-on: ubuntu-latest\n    timeout-minutes: 45\n    env:\n      VELMERE_HOSTED_BASE_URL: \${{ inputs.hosted_url }}\n      NEXT_PUBLIC_SUPABASE_URL: \${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}\n      NEXT_PUBLIC_SUPABASE_ANON_KEY: \${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}\n      SUPABASE_SERVICE_ROLE_KEY: \${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n      STRIPE_SECRET_KEY: \${{ secrets.STRIPE_SECRET_KEY }}\n      STRIPE_WEBHOOK_SECRET: \${{ secrets.STRIPE_WEBHOOK_SECRET }}\n      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: \${{ secrets.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY }}\n      VELMERE_ADMIN_SESSION_SECRET: \${{ secrets.VELMERE_ADMIN_SESSION_SECRET }}\n      VELMERE_ADMIN_OWNER_EMAILS: \${{ secrets.VELMERE_ADMIN_OWNER_EMAILS }}\n      PRINTFUL_API_TOKEN: \${{ secrets.PRINTFUL_API_TOKEN }}\n      PRINTFUL_STORE_ID: \${{ secrets.PRINTFUL_STORE_ID }}\n      TAPSTITCH_API_KEY: \${{ secrets.TAPSTITCH_API_KEY }}\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 24.18.0\n          cache: npm\n      - name: Pin npm\n        run: npm i -g npm@11.16.0\n      - name: Owner runtime proof execute\n        run: npm run owner:runtime-proof:execute\n      - name: Validate runtime receipts\n        run: npm run runtime:receipt:attach && npm run runtime:receipt:validate && npm run promotion:receipt:merge\n      - name: Bundle runtime artifacts\n        if: always()\n        run: npm run owner:runtime-artifact-bundle\n      - name: Upload proof artifacts\n        if: always()\n        uses: actions/upload-artifact@v4\n        with:\n          name: velmere-runtime-proof-artifacts\n          path: |\n            reports/**\n            receipts/runtime/**\n            docs/runtime/**\n`; 
fs.mkdirSync(path.dirname(workflow), { recursive: true });
fs.writeFileSync(workflow, body);
const report = {
  pass: 'PASS2154',
  name: 'CI/Vercel runtime proof wiring',
  status: 'GITHUB_RUNTIME_PROOF_WORKFLOW_READY',
  workflow,
  requiredRuntime: 'Node 24.18.0 + npm 11.16.0',
  requiredSecrets: ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY','VELMERE_ADMIN_SESSION_SECRET','VELMERE_ADMIN_OWNER_EMAILS','PRINTFUL_API_TOKEN','PRINTFUL_STORE_ID','TAPSTITCH_API_KEY'],
  promotionFlow: ['owner:runtime-proof:execute','runtime:receipt:attach','runtime:receipt:validate','promotion:receipt:merge'],
  generatedAt: new Date().toISOString(),
};
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/PASS2154_CI_VERCEL_RUNTIME_PROOF_WIRING.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ status: report.status, workflow }, null, 2));
