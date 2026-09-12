#!/usr/bin/env node
import fs from "node:fs";

for (const file of [
  "components/market-integrity/AnalysisCardsSection.tsx",
  "components/security/SecurityAuditsCleanPage.tsx",
]) {
  let src = fs.readFileSync(file, "utf8");
  src = src.split("catch {}").join("catch { /* best-effort UI cleanup/polling failure is intentionally non-authoritative */ }");
  fs.writeFileSync(file, src);
}

{
  const file = "components/security/SecurityAuditsCleanPage.tsx";
  let src = fs.readFileSync(file, "utf8");
  const declaration = `  const runAuditExecution = async (tierToRun: TierId) => {`;
  if (!src.includes(declaration)) throw new Error("paid_authz_run_audit_declaration_anchor_missing");
  src = src.replace(declaration, `  async function runAuditExecution(tierToRun: TierId) {`);
  const tail = `    } finally {\n      setIsGenerating(false);\n    }\n  };\n\n  return (`;
  if (!src.includes(tail)) throw new Error("paid_authz_run_audit_tail_anchor_missing");
  src = src.replace(tail, `    } finally {\n      setIsGenerating(false);\n    }\n  }\n\n  return (`);
  fs.writeFileSync(file, src);
}

console.log(JSON.stringify({ status: "PASS", change: "paid-authz-lint-explicit" }, null, 2));
