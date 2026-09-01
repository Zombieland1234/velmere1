#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

import fitz
from pypdf import PdfReader

A4_W = 595.2756
A4_H = 841.8898
EXPECTED_PAGES = {"basic": 2, "pro": 4, "advanced": 8}
FORBIDDEN_KEYS = {"/OpenAction", "/AA", "/JavaScript", "/JS", "/Launch", "/EmbeddedFiles", "/Filespec", "/XFA", "/AcroForm", "/Encrypt", "/URI"}


def deref(value):
    try:
        return value.get_object()
    except Exception:
        return value


def walk_objects(value, seen: set[int], found: set[str]) -> None:
    value = deref(value)
    identity = id(value)
    if identity in seen:
        return
    seen.add(identity)
    if isinstance(value, dict):
        for key, child in value.items():
            if str(key) in FORBIDDEN_KEYS:
                found.add(str(key))
            walk_objects(child, seen, found)
    elif isinstance(value, (list, tuple)):
        for child in value:
            walk_objects(child, seen, found)


def font_flags(reader: PdfReader) -> tuple[bool, bool]:
    embedded = False
    to_unicode = False
    for page in reader.pages:
        resources = deref(page.get("/Resources")) or {}
        fonts = deref(resources.get("/Font")) or {}
        for font_ref in fonts.values():
            font = deref(font_ref) or {}
            if font.get("/ToUnicode") is not None:
                to_unicode = True
            descriptor = deref(font.get("/FontDescriptor")) or {}
            if any(descriptor.get(key) is not None for key in ("/FontFile", "/FontFile2", "/FontFile3")):
                embedded = True
    return embedded, to_unicode


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--receipt", required=True)
    parser.add_argument("--sample-dir")
    args = parser.parse_args()
    manifest_path = Path(args.manifest)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    failures = []
    rows = []
    total_pages = 0
    for row in manifest["rows"]:
        path = Path(row["path"])
        if not path.is_absolute():
            path = (manifest_path.parent / path).resolve()
        if not path.exists():
            failures.append({"path": str(path), "code": "missing_pdf"})
            continue
        data = path.read_bytes()
        pdf_sha = hashlib.sha256(data).hexdigest()
        reader = PdfReader(str(path), strict=True)
        doc = fitz.open(str(path))
        active: set[str] = set()
        walk_objects(reader.trailer, set(), active)
        embedded, to_unicode = font_flags(reader)
        text_pages = []
        blank_pages = 0
        edge_touch_pages = 0
        a4_ok = True
        for index, page in enumerate(doc):
            rect = page.rect
            if abs(rect.width - A4_W) > 1.2 or abs(rect.height - A4_H) > 1.2:
                a4_ok = False
            text = page.get_text("text")
            text_pages.append(text)
            if len(re.sub(r"\s+", "", text)) < 80:
                blank_pages += 1
            for block in page.get_text("blocks"):
                x0, y0, x1, y1 = block[:4]
                if x0 < 12 or y0 < 12 or x1 > rect.width - 12 or y1 > rect.height - 12:
                    edge_touch_pages += 1
                    break
        all_text = "\n".join(text_pages)
        localized_labels = {
            "pl": ["Velmère Security", "Velmère Security Engine", "integralność dokumentu", "nie jest niezależną certyfikacją", "human-review"],
            "en": ["Velmère Security", "Velmère Security Engine", "document integrity", "not an independent certification", "human review"],
            "de": ["Velmère Security", "Velmère Security Engine", "Dokumentintegrität", "keine unabhängige Zertifizierung", "Human Review"],
        }
        required_labels = localized_labels[row["locale"]] + [row["reportId"], row["tier"].upper()]
        labels_ok = all(label.lower() in all_text.lower() for label in required_labels)
        boundary_ok = ("not an independent certification" in all_text.lower() or "nie jest niezależną certyfikacją" in all_text.lower() or "keine unabhängige zertifizierung" in all_text.lower()) and ("human review" in all_text.lower() or "human-review" in all_text.lower())
        page_count = len(reader.pages)
        total_pages += page_count
        ok = (
            data.startswith(b"%PDF-")
            and pdf_sha == row["pdfSha256"]
            and len(data) == row["byteLength"]
            and page_count == EXPECTED_PAGES[row["tier"]] == row["pageCount"]
            and not reader.is_encrypted
            and not active
            and embedded
            and to_unicode
            and a4_ok
            and blank_pages == 0
            and edge_touch_pages == 0
            and labels_ok
            and boundary_ok
            and row["packetSha256"][:16].lower() in all_text.lower()
        )
        result = {
            "path": row["path"], "tier": row["tier"], "locale": row["locale"], "ok": ok,
            "pages": page_count, "a4": a4_ok, "blankPages": blank_pages, "edgeTouchPages": edge_touch_pages,
            "encrypted": reader.is_encrypted, "activeKeys": sorted(active), "fontEmbedded": embedded, "toUnicode": to_unicode,
            "labelsOk": labels_ok, "boundaryOk": boundary_ok, "pdfSha256": pdf_sha, "bytes": len(data),
        }
        rows.append(result)
        if not ok:
            failures.append(result)
        doc.close()
    if args.sample_dir:
        sample_dir = Path(args.sample_dir)
        sample_dir.mkdir(parents=True, exist_ok=True)
        samples = []
        for tier in ("basic", "pro", "advanced"):
            row = next(item for item in manifest["rows"] if item["tier"] == tier)
            sample_pdf = Path(row["path"])
            if not sample_pdf.is_absolute():
                sample_pdf = (manifest_path.parent / sample_pdf).resolve()
            doc = fitz.open(str(sample_pdf))
            pix = doc[0].get_pixmap(matrix=fitz.Matrix(1.4, 1.4), alpha=False)
            out = sample_dir / f"{tier}-first-page.png"
            pix.save(out)
            samples.append({"tier": tier, "path": out.name, "sha256": hashlib.sha256(out.read_bytes()).hexdigest(), "bytes": out.stat().st_size})
            doc.close()
    else:
        samples = []
    receipt = {
        "schemaVersion": "velmere.pass36.a102r44p2.audit-pdf-corpus-verification.v1",
        "status": "PASS_A102R44P2_LOCAL_AUDIT_PDF_CORPUS_NO_REAL_CUSTOMER_CREDIT" if not failures else "FAIL_A102R44P2_AUDIT_PDF_CORPUS",
        "documentsRequired": 150,
        "documentsExecuted": len(rows),
        "documentsPassed": sum(1 for row in rows if row["ok"]),
        "pagesRequired": 700,
        "pagesExecuted": total_pages,
        "failed": len(failures),
        "byTier": {tier: {"documents": sum(1 for row in rows if row["tier"] == tier), "passed": sum(1 for row in rows if row["tier"] == tier and row["ok"]), "pages": sum(row["pages"] for row in rows if row["tier"] == tier)} for tier in EXPECTED_PAGES},
        "activeContentDocuments": sum(1 for row in rows if row["activeKeys"]),
        "blankPages": sum(row["blankPages"] for row in rows),
        "edgeTouchPages": sum(row["edgeTouchPages"] for row in rows),
        "fontEmbeddedDocuments": sum(1 for row in rows if row["fontEmbedded"]),
        "toUnicodeDocuments": sum(1 for row in rows if row["toUnicode"]),
        "realCustomerPdfCredit": 0,
        "paidReleaseCredit": False,
        "samples": samples,
        "failures": failures[:50],
        "rows": rows,
        "truthBoundary": "This verifies local deterministic customer-like PDF files and claim boundaries. It is not browser delivery, real customer comprehension, willingness-to-pay, staging, LIVE or paid-release proof.",
    }
    Path(args.receipt).write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({k: receipt[k] for k in ["status", "documentsExecuted", "documentsPassed", "pagesExecuted", "failed", "byTier", "activeContentDocuments", "blankPages", "edgeTouchPages", "fontEmbeddedDocuments", "toUnicodeDocuments", "realCustomerPdfCredit", "paidReleaseCredit"]}, indent=2, ensure_ascii=False))
    return 1 if failures or len(rows) != 150 or total_pages != 700 else 0


if __name__ == "__main__":
    raise SystemExit(main())
