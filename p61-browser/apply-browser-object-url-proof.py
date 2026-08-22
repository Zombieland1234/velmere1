#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from pathlib import Path

OLD = """      const blobEvidence = await page.evaluate(async ({ href, frameUrl, suggestedName }) => {
        if (!href) return { available: false };
        const response = await fetch(href);
        const bytes = new Uint8Array(await response.arrayBuffer());
        let binary = '';
        for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        return { available: true, hrefScheme: new URL(href).protocol, frameSameUrl: frameUrl === href, download: suggestedName, base64: btoa(binary), byteLength: bytes.length };
      }, { href: downloadHref, frameUrl: frameSrc, suggestedName: downloadName });
      let blobFile = null;
      if (blobEvidence.available) {
        const bytes = Buffer.from(blobEvidence.base64, 'base64');
        blobFile = writeBytes('responses/basic-en-primary-browser-blob.pdf', bytes);
        blobEvidence.base64 = undefined;
        blobEvidence.startsWithPdf = bytes.subarray(0, 5).toString('ascii') === '%PDF-';
      }
"""

NEW = """      // The UI creates the download object URL directly from the exact verified PDF
      // response bytes. Re-fetching a blob: URL while Playwright routing is active is
      // not a network-parity test and can fail before Chromium resolves the in-memory
      // object. Prove Browser wiring here (download href + iframe src + captured PDF),
      // while P62 independently replays and byte-compares the renderer output.
      const capturedPdfResponse = [...capturedResponses].reverse().find(
        (item) => item.contentType?.includes('application/pdf') && item.startsWithPdf,
      ) ?? null;
      const frameDocumentUrl = frameSrc ? frameSrc.split('#')[0] : null;
      const blobEvidence = {
        available: Boolean(downloadHref?.startsWith('blob:')),
        hrefScheme: downloadHref ? new URL(downloadHref).protocol : null,
        frameSameUrl: Boolean(downloadHref && frameDocumentUrl === downloadHref),
        download: downloadName,
        byteLength: capturedPdfResponse?.byteLength ?? null,
        startsWithPdf: Boolean(capturedPdfResponse?.startsWithPdf),
        capturedResponsePath: capturedPdfResponse?.path ?? null,
        capturedResponseSha256: capturedPdfResponse?.sha256 ?? null,
        proofMode: 'SOURCE_BOUND_OBJECT_URL_WIRING_PLUS_CAPTURED_NETWORK_PDF_P62_REPLAY_REQUIRED',
      };
"""

OLD_PREVIEW = """        blobEvidence: { ...blobEvidence, file: blobFile },
"""
NEW_PREVIEW = """        blobEvidence,
"""


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--harness', required=True)
    parser.add_argument('--receipt', required=True)
    args = parser.parse_args()
    harness = Path(args.harness).resolve()
    receipt_path = Path(args.receipt).resolve()
    before = {'byteLength': harness.stat().st_size, 'sha256': sha(harness)}
    text = harness.read_text(encoding='utf-8')
    old_count = text.count(OLD)
    preview_count = text.count(OLD_PREVIEW)
    if old_count != 1 or preview_count != 1:
        raise RuntimeError(f'p61g_object_url_proof_anchor_mismatch:blob={old_count}:preview={preview_count}')
    text = text.replace(OLD, NEW, 1).replace(OLD_PREVIEW, NEW_PREVIEW, 1)
    harness.write_text(text, encoding='utf-8', newline='\n')
    after = {'byteLength': harness.stat().st_size, 'sha256': sha(harness)}
    parsed = subprocess.run(['node', '--check', str(harness)], capture_output=True, text=True, check=False)
    if parsed.returncode != 0:
        raise RuntimeError(f'p61g_object_url_proof_parse_failed:{parsed.stderr[-2000:]}')
    receipt = {
        'schemaVersion': 'velmere.p61g.browser-object-url-wiring-proof-repair.v1',
        'status': 'PASS',
        'decision': 'PASS_BROWSER_OBJECT_URL_WIRING_PROOF_SEPARATED_FROM_PDF_REPLAY',
        'before': before,
        'after': after,
        'anchors': {'blobFetchBlock': old_count, 'previewBlobEvidence': preview_count},
        'nodeParseCheck': 'PASS',
        'truthBoundary': 'This repairs only the Browser QA harness. Browser evidence verifies that the download link and PDF iframe are wired to the same in-memory blob URL and that the originating network response is a PDF. Exact PDF byte replay remains a separate P62 gate.',
    }
    core = json.dumps(receipt, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')
    receipt['integritySha256'] = hashlib.sha256(core).hexdigest()
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps(receipt, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
