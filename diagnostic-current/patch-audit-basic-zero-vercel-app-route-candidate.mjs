import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const writes = new Map();

writes.set('lib/security/audit-basic-customer-bridge-client.ts', `import 'server-only';

export type AuditBasicBridgeResult<T = unknown> = Readonly<{
  status: number;
  ok: boolean;
  data: T | null;
  raw: unknown;
}>;

function requiredServerCapability(): string {
  const value = process.env.VELMERE_AUDIT_SERVER_CAPABILITY?.trim() ?? '';
  if (!/^[a-f0-9]{96}$/.test(value)) {
    throw new Error('AUDIT_SERVER_CAPABILITY_REQUIRED');
  }
  return value;
}

function bridgeUrl(): string {
  const explicit = process.env.VELMERE_AUDIT_CUSTOMER_BRIDGE_URL?.trim() ?? '';
  if (explicit) return explicit;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  if (!base.startsWith('https://')) {
    throw new Error('AUDIT_CUSTOMER_BRIDGE_URL_REQUIRED');
  }
  const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
  return normalized + '/functions/v1/r7-audit-basic-customer-bridge';
}

function bearer(value: string | null): string {
  const match = (value ?? '').trim().match(/^Bearer\s+([A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})$/i);
  if (!match) throw new Error('CUSTOMER_WRITE_AUTH_REQUIRED');
  return 'Bearer ' + match[1];
}

export async function callAuditBasicCustomerBridge<T = unknown>(
  authorization: string | null,
  body: Readonly<Record<string, unknown>>,
): Promise<AuditBasicBridgeResult<T>> {
  const response = await fetch(bridgeUrl(), {
    method: 'POST',
    headers: {
      authorization: bearer(authorization),
      'content-type': 'application/json',
      accept: 'application/json',
      'x-velmere-audit-server-capability': requiredServerCapability(),
    },
    body: JSON.stringify({
      schemaVersion: 'velmere.r7.audit-basic-customer-bridge-request.v1',
      ...body,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });
  const raw: unknown = await response.json().catch(() => null);
  const record = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : null;
  return {
    status: response.status,
    ok: response.ok && record?.ok === true,
    data: response.ok && record?.ok === true ? (record as T) : null,
    raw,
  };
}
`);

writes.set('app/api/audit/basic/case/route.ts', `import { NextRequest, NextResponse } from 'next/server';
import { callAuditBasicCustomerBridge } from '@/lib/security/audit-basic-customer-bridge-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(status: number, body: unknown) {
  return NextResponse.json(body, {
    status,
    headers: { 'cache-control': 'no-store, max-age=0', pragma: 'no-cache' },
  });
}

export async function POST(request: NextRequest) {
  const length = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(length) && length > 65_536) return json(413, { ok: false, error: 'request_too_large' });
  let caseInput: unknown;
  try { caseInput = await request.json(); } catch { return json(400, { ok: false, error: 'invalid_json' }); }
  if (!caseInput || typeof caseInput !== 'object' || Array.isArray(caseInput)) return json(400, { ok: false, error: 'case_input_invalid' });
  try {
    const result = await callAuditBasicCustomerBridge(request.headers.get('authorization'), { action: 'create_case', caseInput: caseInput as Record<string, unknown> });
    return json(result.status, result.raw ?? { ok: false, error: 'bridge_invalid_response' });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'audit_case_route_failed';
    const status = code === 'CUSTOMER_WRITE_AUTH_REQUIRED' ? 401 : code === 'AUDIT_SERVER_CAPABILITY_REQUIRED' ? 503 : 502;
    return json(status, { ok: false, error: code });
  }
}

export async function GET(request: NextRequest) {
  const caseRef = request.nextUrl.searchParams.get('caseRef')?.trim() ?? '';
  if (!/^[A-Za-z0-9][A-Za-z0-9:._-]{7,159}$/.test(caseRef)) return json(400, { ok: false, error: 'case_ref_invalid' });
  try {
    const result = await callAuditBasicCustomerBridge(request.headers.get('authorization'), { action: 'get_case', caseRef });
    return json(result.status, result.raw ?? { ok: false, error: 'bridge_invalid_response' });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'audit_case_route_failed';
    const status = code === 'CUSTOMER_WRITE_AUTH_REQUIRED' ? 401 : code === 'AUDIT_SERVER_CAPABILITY_REQUIRED' ? 503 : 502;
    return json(status, { ok: false, error: code });
  }
}
`);

writes.set('app/api/audit/basic/report/route.ts', `import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { callAuditBasicCustomerBridge } from '@/lib/security/audit-basic-customer-bridge-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status, headers: { 'cache-control': 'no-store, max-age=0', pragma: 'no-cache' } });
}
function caseRefOf(request: NextRequest) { return request.nextUrl.searchParams.get('caseRef')?.trim() ?? ''; }
function validCaseRef(value: string) { return /^[A-Za-z0-9][A-Za-z0-9:._-]{7,159}$/.test(value); }

export async function GET(request: NextRequest) {
  const caseRef = caseRefOf(request);
  if (!validCaseRef(caseRef)) return json(400, { ok: false, error: 'case_ref_invalid' });
  try {
    const result = await callAuditBasicCustomerBridge<Record<string, unknown>>(request.headers.get('authorization'), { action: 'get_pdf', caseRef });
    if (!result.ok || !result.data) return json(result.status, result.raw ?? { ok: false, error: 'bridge_invalid_response' });
    const body = result.data as Record<string, unknown>;
    const pdfBase64 = typeof body.pdfBase64 === 'string' ? body.pdfBase64 : '';
    const pdfDigest = typeof body.pdfDigest === 'string' ? body.pdfDigest : '';
    const recordDigest = typeof body.recordDigest === 'string' ? body.recordDigest : '';
    const reportId = typeof body.reportId === 'string' ? body.reportId : 'velmere-audit-basic-report';
    let bytes: Buffer;
    try { bytes = Buffer.from(pdfBase64, 'base64'); } catch { return json(502, { ok: false, error: 'pdf_decode_failed' }); }
    const observed = 'sha256:' + createHash('sha256').update(bytes).digest('hex');
    if (bytes.length < 1000 || observed !== pdfDigest || Number(body.pdfByteLength) !== bytes.length || !/^sha256:[a-f0-9]{64}$/.test(recordDigest)) {
      return json(502, { ok: false, error: 'pdf_integrity_failed' });
    }
    const safeName = reportId.replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 120) || 'velmere-audit-basic-report';
    const responseBytes = Uint8Array.from(bytes);
    return new NextResponse(responseBytes, {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-length': String(bytes.length),
        'content-disposition': 'attachment; filename="' + safeName + '.pdf"',
        'cache-control': 'private, no-store, max-age=0',
        pragma: 'no-cache',
        etag: '"' + pdfDigest.slice(7) + '"',
        'x-velmere-pdf-digest': pdfDigest,
        'x-velmere-record-digest': recordDigest,
      },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'audit_report_route_failed';
    const status = code === 'CUSTOMER_WRITE_AUTH_REQUIRED' ? 401 : code === 'AUDIT_SERVER_CAPABILITY_REQUIRED' ? 503 : 502;
    return json(status, { ok: false, error: code });
  }
}

export async function DELETE(request: NextRequest) {
  const caseRef = caseRefOf(request);
  if (!validCaseRef(caseRef)) return json(400, { ok: false, error: 'case_ref_invalid' });
  try {
    const result = await callAuditBasicCustomerBridge(request.headers.get('authorization'), { action: 'backup_erase', caseRef });
    return json(result.status, result.raw ?? { ok: false, error: 'bridge_invalid_response' });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'audit_report_erase_failed';
    const status = code === 'CUSTOMER_WRITE_AUTH_REQUIRED' ? 401 : code === 'AUDIT_SERVER_CAPABILITY_REQUIRED' ? 503 : 502;
    return json(status, { ok: false, error: code });
  }
}
`);

writes.set('app/api/audit/basic/report/restore/route.ts', `import { NextRequest, NextResponse } from 'next/server';
import { callAuditBasicCustomerBridge } from '@/lib/security/audit-basic-customer-bridge-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const caseRef = request.nextUrl.searchParams.get('caseRef')?.trim() ?? '';
  if (!/^[A-Za-z0-9][A-Za-z0-9:._-]{7,159}$/.test(caseRef)) return NextResponse.json({ ok: false, error: 'case_ref_invalid' }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 }); }
  const backupId = body && typeof body === 'object' && !Array.isArray(body) && typeof (body as Record<string, unknown>).backupId === 'string' ? String((body as Record<string, unknown>).backupId) : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(backupId)) return NextResponse.json({ ok: false, error: 'backup_id_invalid' }, { status: 400 });
  try {
    const result = await callAuditBasicCustomerBridge(request.headers.get('authorization'), { action: 'restore', caseRef, backupId });
    return NextResponse.json(result.raw ?? { ok: false, error: 'bridge_invalid_response' }, { status: result.status, headers: { 'cache-control': 'no-store, max-age=0', pragma: 'no-cache' } });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'audit_report_restore_failed';
    const status = code === 'CUSTOMER_WRITE_AUTH_REQUIRED' ? 401 : code === 'AUDIT_SERVER_CAPABILITY_REQUIRED' ? 503 : 502;
    return NextResponse.json({ ok: false, error: code }, { status });
  }
}
`);

const changed = [];
for (const [relative, content] of writes) {
  const target = path.join(root, relative);
  if (fs.existsSync(target)) throw new Error('candidate_route_already_exists:' + relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf8');
  changed.push({ path: relative, sha256: crypto.createHash('sha256').update(content).digest('hex'), bytes: Buffer.byteLength(content) });
}
console.log(JSON.stringify({ schemaVersion: 'velmere.r7.audit-basic-zero-vercel-app-route-candidate.v4', status: 'PASS_PATCH_APPLIED', changed, customerFinalCredit: false }, null, 2));