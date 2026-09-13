#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const severities=['info','low','moderate','high','critical'];

export function evaluateNpmAudit({audit,exitCode,dependencyReviewOutcome='unknown'}){
  const issues=[];
  if(!audit || typeof audit!=='object' || Array.isArray(audit)) issues.push('audit_json_not_object');
  if(audit?.error) issues.push(`npm_audit_error:${String(audit.error?.code??audit.error?.summary??'present')}`);
  if(audit?.auditReportVersion!==2) issues.push(`unsupported_audit_report_version:${String(audit?.auditReportVersion??'missing')}`);

  const counts=audit?.metadata?.vulnerabilities;
  if(!counts || typeof counts!=='object' || Array.isArray(counts)){
    issues.push('missing_metadata_vulnerabilities');
  }else{
    for(const severity of severities){
      if(!Number.isInteger(counts[severity]) || counts[severity]<0) issues.push(`invalid_vulnerability_count:${severity}`);
    }
    if(!Number.isInteger(counts.total) || counts.total<0) issues.push('invalid_vulnerability_count:total');
    if(issues.every((issue)=>!issue.startsWith('invalid_vulnerability_count:'))){
      const sum=severities.reduce((acc,severity)=>acc+counts[severity],0);
      if(sum!==counts.total) issues.push(`vulnerability_total_mismatch:${sum}:${counts.total}`);
    }
  }

  if(!Number.isInteger(exitCode) || exitCode<0 || exitCode>255) issues.push('invalid_npm_audit_exit_code');
  if(counts && Number.isInteger(counts.high) && counts.high>0) issues.push(`high_vulnerabilities:${counts.high}`);
  if(counts && Number.isInteger(counts.critical) && counts.critical>0) issues.push(`critical_vulnerabilities:${counts.critical}`);

  // npm audit returns non-zero when findings meet its configured threshold. We
  // intentionally do not equate a non-zero exit to a network error: the JSON
  // structure above remains authoritative. But an unexplained non-zero exit
  // with zero reported vulnerabilities is fail-closed.
  if(exitCode!==0 && counts && Number.isInteger(counts.total) && counts.total===0){
    issues.push(`npm_audit_nonzero_without_reported_vulnerabilities:${exitCode}`);
  }

  const high=Number.isInteger(counts?.high)?counts.high:null;
  const critical=Number.isInteger(counts?.critical)?counts.critical:null;
  const result={
    schemaVersion:'velmere.pass4992.npm-audit-verification.v1',
    generatedAt:new Date().toISOString(),
    ok:issues.length===0,
    dependencyReviewOutcome,
    dependencyDiffEvidence:dependencyReviewOutcome==='success'?'AVAILABLE':'UNAVAILABLE_FALLBACK_FULL_LOCKFILE',
    auditReportVersion:audit?.auditReportVersion??null,
    npmAuditExitCode:exitCode,
    counts:counts??null,
    policy:{failOn:['high','critical'],networkOrProtocolError:'FAIL',missingOrMalformedMetadata:'FAIL'},
    high,
    critical,
    issues,
    truthBoundary:dependencyReviewOutcome==='success'
      ? 'PASS proves the GitHub dependency diff action completed and the full current npm lockfile audit contains zero High/Critical findings. It does not prove absence of vulnerabilities outside npm advisories or future disclosures.'
      : 'PASS uses a fail-closed full-current-lockfile npm audit because GitHub Dependency Review was unavailable/failed. It proves zero High/Critical npm advisory findings in the audited lockfile at execution time, but does NOT claim dependency-diff or OpenSSF-scorecard evidence.'
  };
  return result;
}

function arg(name){
  const i=process.argv.indexOf(name);
  return i>=0?process.argv[i+1]:null;
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){
  const auditPath=arg('--audit');
  const exitCodePath=arg('--exit-code-file');
  const outputPath=arg('--output');
  const dependencyReviewOutcome=arg('--dependency-review-outcome')??'unknown';
  if(!auditPath||!exitCodePath){
    console.error('usage: verify-npm-audit.mjs --audit <json> --exit-code-file <file> [--dependency-review-outcome success|failure] [--output <json>]');
    process.exit(2);
  }
  let audit;
  try{ audit=JSON.parse(fs.readFileSync(auditPath,'utf8')); }
  catch(error){
    console.error(JSON.stringify({ok:false,issues:[`audit_json_unreadable:${error instanceof Error?error.message:String(error)}`]},null,2));
    process.exit(1);
  }
  const rawExit=fs.readFileSync(exitCodePath,'utf8').trim();
  const exitCode=/^\d+$/.test(rawExit)?Number(rawExit):Number.NaN;
  const result=evaluateNpmAudit({audit,exitCode,dependencyReviewOutcome});
  if(outputPath){
    fs.mkdirSync(path.dirname(outputPath),{recursive:true});
    fs.writeFileSync(outputPath,`${JSON.stringify(result,null,2)}\n`,'utf8');
  }
  console.log(JSON.stringify(result,null,2));
  if(!result.ok)process.exit(1);
}
