#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const translations=JSON.parse(fs.readFileSync(path.join(root,"config/pass23/i18n-final-translations.json"),"utf8"));
const checklist=JSON.parse(fs.readFileSync(path.join(root,"config/pass23/native-language-review-checklist.json"),"utf8"));
const overflow=JSON.parse(fs.readFileSync(path.join(root,"config/pass23/browser-overflow-matrix.json"),"utf8"));
const i18n=JSON.parse(fs.readFileSync(path.join(root,".velmere/pass23-diagnostics/i18n-release-readiness.json"),"utf8"));
const errors=[];
if(translations.translations?.length!==300)errors.push("translation_count");
if(i18n.summary?.identicalNonNeutral!==0)errors.push("identical_non_neutral_not_zero");
if(i18n.summary?.criticalEnglishLeakCandidates!==0)errors.push("critical_english_leaks");
if(checklist.status!=="PENDING_NATIVE_REVIEW")errors.push("native_review_must_remain_pending");
for(const locale of ["pl","de"]){const row=checklist.locales?.[locale];if(row?.status!=="PENDING"||row?.receiptSha256!==null)errors.push(`${locale}_native_review_false_pass`);}
if(checklist.translatedValues!==300)errors.push("checklist_translation_count");
if(overflow.plannedCases!==300||overflow.cases?.length!==300)errors.push("overflow_case_count");
if(overflow.executedCases!==0||overflow.passedCases!==0)errors.push("overflow_false_execution");
const unique=new Set((overflow.cases??[]).map(x=>x.caseId));if(unique.size!==300)errors.push("overflow_duplicate_cases");
const report={schemaVersion:"velmere.pass23.native-review-overflow-preparation.v1",generatedAt:"2026-07-20T18:00:00.000Z",ok:errors.length===0,translations:translations.translations.length,identicalNonNeutral:i18n.summary.identicalNonNeutral,nativeReviewStatus:checklist.status,overflowPlanned:overflow.plannedCases,overflowExecuted:overflow.executedCases,errors,truthBoundary:"Static translation completion and planned browser cases are not native-language or browser proof."};
const out=path.join(root,".velmere/pass23-diagnostics/native-review-overflow-preparation.json");fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify(report,null,2));if(!report.ok)process.exit(1);
