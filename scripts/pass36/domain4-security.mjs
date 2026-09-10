const API = 'http://localhost:3000/api';
async function test(name, reqObj, expectedStatus, expectedContent) {
  try {
    const res = await fetch(reqObj.url, reqObj);
    const text = await res.text();
    const pass = res.status === expectedStatus && (!expectedContent || text.includes(expectedContent));
    console.log('[' + (pass ? 'PASS' : 'FAIL') + '] ' + name + ' (Status: ' + res.status + ') ' + text.slice(0, 100).replace(/\n/g, ' '));
  } catch (e) {
    console.log('[ERROR] ' + name + ': ' + e.message);
  }
}
async function run() {
  console.log('DOMAIN 4: INDEPENDENT SECURITY TESTS');
  await test('Admin Access (No Auth)', { url: API + '/admin/products/publish', method: 'POST', headers: {'content-type': 'application/json'}, body: '{}' }, 503);
  await test('IDOR (Customer Artifact)', { url: API + '/account/customer-artifact?caseRef=AUD-FORGED-1234', method: 'GET' }, 401, 'account_session_required');
  await test('SSRF (Basic Case)', { url: API + '/audit/basic/case', method: 'POST', headers: {'content-type': 'application/json'}, body: '{\
contractAddress\:\http://169.254.169.254/\}' }, 400);
  await test('CORS (Market Analyzer)', { url: API + '/market-integrity/analyze', method: 'POST', headers: {'origin': 'https://evil.com'} }, 403);
}
run();
