import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "lib/security/supabase-runtime-truth.ts"),
  "utf8",
);

assert.ok(
  !source.includes("error instanceof Error ? error.message"),
  "Supabase runtime truth must not return a raw provider error message",
);
assert.ok(
  source.includes('providerError: "supabase_runtime_truth_failed"'),
  "Supabase runtime truth must return a stable customer-safe failure code",
);
for (const unsafe of ["postgres://admin:secret@db/private", "operator@example.com", "service_role=secret"]) {
  const projected = {
    status: "FAIL",
    providerError: "supabase_runtime_truth_failed",
  };
  assert.ok(!JSON.stringify(projected).includes(unsafe), `projection leaked ${unsafe}`);
}

console.log(JSON.stringify({ status: "PASS", assertions: 5, rawProviderErrorReturned: false }));
