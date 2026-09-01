#!/usr/bin/env node
import { runDisposableAuditWorker } from "../../lib/security/audit-disposable-customer-lifecycle.mjs";

const [root, jobId] = process.argv.slice(2);
if (!root || !jobId) {
  console.error(JSON.stringify({ ok: false, error: "root_and_job_required" }));
  process.exit(64);
}
const result = runDisposableAuditWorker({ root, jobId });
console.log(JSON.stringify(result, null, 2));
process.exit(result.exitCode ?? (result.ok ? 0 : 1));
