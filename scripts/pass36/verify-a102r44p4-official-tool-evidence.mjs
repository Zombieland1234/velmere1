#!/usr/bin/env node
import fs from "node:fs";
import {verifyR44P4OfficialToolEvidence} from "../../lib/security/official-tool-evidence-verifier.mjs";
const policy=JSON.parse(fs.readFileSync("config/pass36/a102r44p4-official-toolchain-platform-policy.json","utf8"));
const index=JSON.parse(fs.readFileSync("evaluation/pass36/a102r44p4-official-tool-execution-index.json","utf8"));
const corpus=JSON.parse(fs.readFileSync("evaluation/pass36/a102r44p4-official-tool-corpus-index.json","utf8"));
const result=verifyR44P4OfficialToolEvidence(policy,index,corpus);
console.log(JSON.stringify(result,null,2));if(result.failed)process.exit(1);
