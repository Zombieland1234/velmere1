#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { analyzeA20DependencyCase, runA20Benchmark, verifyA20Benchmark, verifyA20Policy, verifyA20Report } from "../../lib/security/pass35-a20-case-bound-dependency-runtime.mjs";
const policy=JSON.parse(readFileSync("config/pass35/a20-case-bound-dependency-policy.json","utf8")); let assertions=0; const check=(v,m)=>{assert.ok(v,m);assertions++;};
check(verifyA20Policy(policy),"policy invalid");
const benchmark=runA20Benchmark(policy); check(verifyA20Benchmark(benchmark,policy),"benchmark invalid"); check(benchmark.denominators.cases===200,"case denominator"); check(benchmark.denominators.mutations===2400,"mutation denominator"); check(benchmark.frozen.recall===1&&benchmark.frozen.precision===1&&benchmark.frozen.specificity===1,"frozen metrics"); check(benchmark.mutation.killRate===1,"mutation rate");
const report=analyzeA20DependencyCase({schemaVersion:"velmere.pass35.a20-case-bound-dependency-input.v1",inputClass:"SYNTHETIC_OFFLINE",caseRef:"AUD-A20-SMOKE-001",rootFiles:["contracts/Main.sol"],sourceFiles:[{path:"contracts/Main.sol",content:"// SPDX-License-Identifier: MIT\npragma solidity ^0.8.24; import \"./Dep.sol\"; contract Main {}"},{path:"contracts/Dep.sol",content:"// SPDX-License-Identifier: MIT\npragma solidity ^0.8.24; contract Dep {}"}],expectedSourceDigests:{},advisories:[]},policy);
check(verifyA20Report(report),"report integrity"); check(report.graph.nodes===2&&report.graph.resolved===1&&report.findings.length===0,"smoke report"); check(report.paidGateEligible===false&&report.legalConclusionAllowed===false,"truth boundary");
const tampered=structuredClone(report);tampered.graph.nodes=99;check(!verifyA20Report(tampered),"tamper accepted");
console.log(JSON.stringify({status:"PASS_A20_CASE_BOUND_DEPENDENCY",assertions,denominators:benchmark.denominators,frozen:benchmark.frozen,mutation:benchmark.mutation},null,2));
