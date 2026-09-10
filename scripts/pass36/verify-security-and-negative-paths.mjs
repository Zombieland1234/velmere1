import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost:3000';

async function testEndpoint(name, url, options, validator) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, options);
    const durationMs = Date.now() - t0;
    const bodyText = await res.text().catch(() => '');
    let bodyJson = null;
    try { bodyJson = JSON.parse(bodyText); } catch {}
    
    const passed = validator(res.status, bodyJson, bodyText);
    return {
      name,
      url,
      method: options.method || 'GET',
      status: res.status,
      durationMs,
      passed,
      evidenceSnippet: bodyText.slice(0, 160)
    };
  } catch (err) {
    return {
      name,
      url,
      method: options.method || 'GET',
      status: 0,
      durationMs: Date.now() - t0,
      passed: false,
      error: err.message
    };
  }
}

async function main() {
  console.log('Running Security & Negative Paths Matrix...');
  
  const probes = [
    {
      name: 'IDOR_UNAUTHENTICATED_ARTIFACT_LOOKUP',
      url: BASE + '/api/account/customer-artifact?caseRef=AUD-FORGED-9999-IDOR',
      options: { method: 'GET' },
      validator: (status, json) => status === 401 && json && json.ok === false && json.error === 'account_session_required'
    },
    {
      name: 'IDOR_CROSS_TENANT_CASE_LOOKUP',
      url: BASE + '/api/account/customer-artifact?caseRef=AUD-0000-FORGED-SEC',
      options: { method: 'GET' },
      validator: (status, json) => status === 401 && json && json.ok === false
    },
    {
      name: 'PATH_TRAVERSAL_ARBITRARY_FILE_READ',
      url: BASE + '/api/account/customer-artifact?caseRef=../../../../etc/passwd',
      options: { method: 'GET' },
      validator: (status, json) => (status === 401 || status === 403 || status === 400) && json && json.ok === false
    },
    {
      name: 'SSRF_INTRANET_METADATA_PROBE',
      url: BASE + '/api/audit/basic/case',
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'http://169.254.169.254/latest/meta-data/', chainId: 56 })
      },
      validator: (status) => status === 502 || status === 400 || status === 403
    },
    {
      name: 'OVERSIZE_REQUEST_PAYLOAD_BODY',
      url: BASE + '/api/contact/message',
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'X'.repeat(120000) })
      },
      validator: (status) => status === 503 || status === 413 || status === 400
    },
    {
      name: 'ORIGIN_FORGERY_UNTRUSTED_DOMAIN',
      url: BASE + '/api/shield/analysis/composite',
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://attacker-malicious-domain.com' },
        body: JSON.stringify({ symbol: 'BTC' })
      },
      validator: (status) => status === 403 || status === 400 || status === 401
    },
    {
      name: 'MARKET_INTEGRITY_FAIL_CLOSED_WITHHELD',
      url: BASE + '/api/market-integrity/markets',
      options: { method: 'GET' },
      validator: (status, json) => status === 503 && json && json.mode === 'withheld'
    }
  ];

  const results = [];
  for (const p of probes) {
    const res = await testEndpoint(p.name, p.url, p.options, p.validator);
    console.log('[' + (res.passed ? 'PASS' : 'FAIL') + '] ' + res.name + ': HTTP ' + res.status + ' (' + res.durationMs + 'ms)');
    results.push(res);
  }

  const allPassed = results.every(r => r.passed);
  const receipt = {
    schemaVersion: 'velmere.security.negative-paths.receipt.v1',
    executedAt: new Date().toISOString(),
    totalProbes: results.length,
    passedProbes: results.filter(r => r.passed).length,
    failedProbes: results.filter(r => !r.passed).length,
    status: allPassed ? 'PASS' : 'FAIL',
    probes: results
  };

  const receiptPath = path.resolve('artifacts/security/SECURITY_RED_TEAM_RECEIPT.json');
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), 'utf8');
  console.log('Saved security receipt to:', receiptPath);

  if (!allPassed) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
