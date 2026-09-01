#!/usr/bin/env node
import { buildPass35LocalPdfQaSummary, verifyPass35LocalPdfQaSummary } from "./local-pdf-qa-summary.mjs";

try {
  buildPass35LocalPdfQaSummary(process.cwd());
  const result = verifyPass35LocalPdfQaSummary(process.cwd());
  console.log(JSON.stringify(result, null, 2));
  if (result.blockers.length) process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({
    status: "FAIL_LOCAL_PDF_QA_SUMMARY_BUILD",
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exitCode = 1;
}
