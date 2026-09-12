#!/usr/bin/env node
import fs from "node:fs";

const file = "components/security/SecurityAuditsCleanPage.tsx";
let source = fs.readFileSync(file, "utf8");

function replaceExactlyOnce(oldText, newText, id) {
  const count = source.split(oldText).length - 1;
  if (count !== 1) throw new Error(`${id}_match_count:${count}`);
  source = source.replace(oldText, newText);
}

replaceExactlyOnce(
  '  auth?: { accountResolved?: boolean };\n  case?: {',
  '  auth?: { accountResolved?: boolean };\n  nextAction?: "basic_prescreen_queue" | "verify_account_entitlement_before_analysis";\n  case?: {',
  "intake_response_next_action",
);

replaceExactlyOnce(
  '          chainName: selectedChainId === "1" ? "Ethereum Mainnet" : selectedChainId === "42161" ? "Arbitrum One" : selectedChainId === "137" ? "Polygon POS" : "BNB Smart Chain (BSC)",',
  '          chainName: selectedChainId === "56" ? "BSC" : selectedChainId === "1" ? "Ethereum Mainnet" : selectedChainId === "42161" ? "Arbitrum One" : selectedChainId === "137" ? "Polygon POS" : "UNKNOWN",',
  "canonical_chain_name",
);

const oldSuccess = `      if (response.ok && payload.ok && payload.case?.caseRef) {
        const durable = payload.case.durable === true;
        const accountOwned = payload.auth?.accountResolved === true;
        const statusMessage = payload.case.status === "queued_basic_prescreen" ? t.basicQueued : t.paidWaiting;
        setCaseRef(payload.case.caseRef);
        setAccountOwnedCase(accountOwned);
        if (accountOwned) rememberAuditCaseRef(payload.case.caseRef, { tier: tierToRun });
        setIntakeMessage(\`${"${statusMessage}${durable ? \"\" : ` ${t.localOnly}`}${accountOwned ? \"\" : ` ${t.anonymousBasic}`}"}\`);
        setStaged(true);
        setIntakeState("success");
        window.location.assign(
          \`/${"${localeKey}"}/security/audits/report/${"${encodeURIComponent(targetAddress)}"}?address=${"${encodeURIComponent(targetAddress)}"}&tier=${"${encodeURIComponent(tierToRun)}"}&chainId=${"${encodeURIComponent(selectedChainId)}"}${"${bytecodeParam}"}\`
        );
        return;
      }`;

const newSuccess = `      if (response.ok && payload.ok && payload.case?.caseRef) {
        const durable = payload.case.durable === true;
        const accountOwned = payload.auth?.accountResolved === true;
        const statusMessage = payload.case.status === "queued_basic_prescreen" ? t.basicQueued : t.paidWaiting;
        const basicAnalysisAuthorized =
          tierToRun === "basic" &&
          payload.case.status === "queued_basic_prescreen" &&
          payload.nextAction === "basic_prescreen_queue";
        setCaseRef(payload.case.caseRef);
        setAccountOwnedCase(accountOwned);
        if (accountOwned) rememberAuditCaseRef(payload.case.caseRef, { tier: tierToRun });
        setIntakeMessage(\`${"${statusMessage}${durable ? \"\" : ` ${t.localOnly}`}${accountOwned ? \"\" : ` ${t.anonymousBasic}`}"}\`);
        setStaged(basicAnalysisAuthorized);
        if (basicAnalysisAuthorized) {
          setIntakeState("success");
          window.location.assign(
            \`/${"${localeKey}"}/security/audits/report/${"${encodeURIComponent(targetAddress)}"}?address=${"${encodeURIComponent(targetAddress)}"}&tier=${"${encodeURIComponent(tierToRun)}"}&chainId=${"${encodeURIComponent(selectedChainId)}"}${"${bytecodeParam}"}\`
          );
          return;
        }
        setIntakeState("idle");
        if (tierToRun !== "basic") setAuditPaywallModal(tierToRun);
        return;
      }`;

replaceExactlyOnce(oldSuccess, newSuccess, "paid_intake_redirect_boundary");

fs.writeFileSync(file, source);
console.log(JSON.stringify({ status: "PATCHED", file, replacements: 3 }, null, 2));
