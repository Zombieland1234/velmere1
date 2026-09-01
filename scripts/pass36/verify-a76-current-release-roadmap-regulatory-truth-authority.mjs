#!/usr/bin/env node
import fs from "node:fs";
const A76="VELMERE_PASS36_A76R0_CURRENT_REVISION_ROADMAP_AND_REGULATORY_PERIMETER_TRUTH_AUTHORITY";
const CURRENT="VELMERE_PASS36_A83R0_BROWSER_LENS_PDF_REAL_PACKET_MATRIX_AND_SECURE_DELIVERY_PARITY";
const read=(p)=>JSON.parse(fs.readFileSync(p,"utf8"));
const receipt=read("config/pass36/a76-current-release-roadmap-regulatory-truth-authority-test-receipt.json");
const state=read("config/pass36/a76-current-state.json");
const program=read("config/pass36/a76-world-class-completion-program.json");
const authority=read("config/pass36/current-release-authority.json");
const checks=[];const add=(id,pass,detail=null)=>checks.push({id,pass:Boolean(pass),detail});
add("a76:receipt",receipt.revisionId===A76&&receipt.counts?.failed===0&&receipt.counts?.passed===receipt.counts?.total,receipt.counts);
add("a76:state",state.revisionId===A76&&state.liveProven===false&&state.saleEnabled===false,state.revisionId);
add("a76:program",program.revisionId===A76&&program.programRange?.plannedPassCount===35,program.revisionId);
add("a76:superseded-by-current",authority.authorityRevisionId===CURRENT&&authority.currentSource?.revisionId===CURRENT,{current:authority.authorityRevisionId,parent:authority.parentRevisionId});
add("a76:no-current-authority-claim",authority.currentSource?.revisionId!==A76,authority.currentSource?.revisionId);
const failed=checks.filter((r)=>!r.pass);
console.log(JSON.stringify({schemaVersion:"velmere.pass36.a76.historical-supersession-verification.v1",revisionId:A76,status:failed.length?"FAIL":"PASS_HISTORICAL_SUPERSEDED",checks:checks.length,passed:checks.length-failed.length,failed:failed.length,failures:failed},null,2));
if(failed.length)process.exit(1);
