#!/usr/bin/env python3
from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import os
import re
import subprocess
import sys
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import fitz
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from pypdf import PdfReader

EXPECTED_PAGES = {"basic": 2, "pro": 4, "advanced": 8}
LOCALES = {"pl", "en", "de"}
TIERS = set(EXPECTED_PAGES)
A4_WIDTH = 595.2756
A4_HEIGHT = 841.8898
DISALLOWED_ACTIONS = {"/JavaScript", "/Launch", "/GoToR", "/SubmitForm", "/ImportData"}
DISALLOWED_CATALOG_KEYS = {"/OpenAction", "/AA", "/AcroForm"}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def portable(path: Path) -> str:
    return path.as_posix()


def resolve_object(value: Any) -> Any:
    try:
        return value.get_object()
    except Exception:
        return value


def action_type(annotation: Any) -> str | None:
    obj = resolve_object(annotation)
    if not isinstance(obj, dict):
        return None
    action = resolve_object(obj.get("/A"))
    if isinstance(action, dict):
        value = action.get("/S")
        return str(value) if value is not None else None
    return None


def inspect_fonts(page: Any) -> tuple[int, int, int]:
    resources = resolve_object(page.get("/Resources"))
    if not isinstance(resources, dict):
        return (0, 0, 0)
    font_map = resolve_object(resources.get("/Font"))
    if not isinstance(font_map, dict):
        return (0, 0, 0)
    fonts = 0
    embedded = 0
    to_unicode = 0
    for value in font_map.values():
        font = resolve_object(value)
        if not isinstance(font, dict):
            continue
        fonts += 1
        if font.get("/ToUnicode") is not None:
            to_unicode += 1
        descriptor = resolve_object(font.get("/FontDescriptor"))
        if not isinstance(descriptor, dict):
            descendants = resolve_object(font.get("/DescendantFonts"))
            if isinstance(descendants, list) and descendants:
                descendant = resolve_object(descendants[0])
                if isinstance(descendant, dict):
                    descriptor = resolve_object(descendant.get("/FontDescriptor"))
        if isinstance(descriptor, dict) and any(descriptor.get(key) is not None for key in ("/FontFile", "/FontFile2", "/FontFile3")):
            embedded += 1
    return fonts, embedded, to_unicode


@dataclass
class PdfResult:
    path: str
    locale: str
    tier: str
    byte_length: int
    sha256: str
    expected_pages: int
    pages: int
    pypdf_ok: bool
    pdfinfo_ok: bool
    pdftotext_ok: bool
    text_bytes: int
    a4_pages: int
    rotation_zero_pages: int
    annotations: int
    disallowed_actions: list[str]
    disallowed_catalog_keys: list[str]
    embedded_files_present: bool
    javascript_names_present: bool
    encrypted: bool
    fonts: int
    embedded_fonts: int
    to_unicode_fonts: int
    metadata_present: bool
    error: str | None


def parse_identity(path: Path, corpus_root: Path) -> tuple[str, str]:
    rel = path.relative_to(corpus_root)
    if len(rel.parts) < 3:
        raise ValueError(f"pdf_path_shape_invalid:{rel}")
    locale, tier = rel.parts[0], rel.parts[1]
    if locale not in LOCALES or tier not in TIERS:
        raise ValueError(f"pdf_locale_or_tier_invalid:{rel}")
    return locale, tier


def run_bounded(command: list[str], timeout: int = 30) -> subprocess.CompletedProcess[bytes]:
    return subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout, check=False)


def inspect_pdf(path: Path, corpus_root: Path) -> PdfResult:
    locale, tier = parse_identity(path, corpus_root)
    expected_pages = EXPECTED_PAGES[tier]
    base = dict(
        path=portable(path.relative_to(corpus_root)),
        locale=locale,
        tier=tier,
        byte_length=path.stat().st_size,
        sha256=sha256_file(path),
        expected_pages=expected_pages,
        pages=0,
        pypdf_ok=False,
        pdfinfo_ok=False,
        pdftotext_ok=False,
        text_bytes=0,
        a4_pages=0,
        rotation_zero_pages=0,
        annotations=0,
        disallowed_actions=[],
        disallowed_catalog_keys=[],
        embedded_files_present=False,
        javascript_names_present=False,
        encrypted=False,
        fonts=0,
        embedded_fonts=0,
        to_unicode_fonts=0,
        metadata_present=False,
        error=None,
    )
    try:
        reader = PdfReader(str(path), strict=True)
        base["encrypted"] = bool(reader.is_encrypted)
        if reader.is_encrypted:
            raise ValueError("encrypted_pdf_forbidden")
        base["pages"] = len(reader.pages)
        root = resolve_object(reader.trailer.get("/Root"))
        if isinstance(root, dict):
            base["disallowed_catalog_keys"] = sorted(key for key in DISALLOWED_CATALOG_KEYS if root.get(key) is not None)
            names = resolve_object(root.get("/Names"))
            if isinstance(names, dict):
                base["embedded_files_present"] = names.get("/EmbeddedFiles") is not None
                base["javascript_names_present"] = names.get("/JavaScript") is not None
        base["metadata_present"] = reader.metadata is not None
        for page in reader.pages:
            width = float(page.mediabox.width)
            height = float(page.mediabox.height)
            if abs(width - A4_WIDTH) <= 1.5 and abs(height - A4_HEIGHT) <= 1.5:
                base["a4_pages"] += 1
            if int(page.get("/Rotate", 0) or 0) % 360 == 0:
                base["rotation_zero_pages"] += 1
            annotations = resolve_object(page.get("/Annots"))
            if isinstance(annotations, list):
                base["annotations"] += len(annotations)
                for annotation in annotations:
                    action = action_type(annotation)
                    if action in DISALLOWED_ACTIONS:
                        base["disallowed_actions"].append(action)
            fonts, embedded, to_unicode = inspect_fonts(page)
            base["fonts"] += fonts
            base["embedded_fonts"] += embedded
            base["to_unicode_fonts"] += to_unicode
        base["pypdf_ok"] = True

        pdfinfo = run_bounded(["pdfinfo", str(path)])
        base["pdfinfo_ok"] = pdfinfo.returncode == 0 and b"Pages:" in pdfinfo.stdout
        text = run_bounded(["pdftotext", "-enc", "UTF-8", str(path), "-"])
        base["pdftotext_ok"] = text.returncode == 0
        base["text_bytes"] = len(text.stdout)
    except Exception as exc:  # noqa: BLE001
        base["error"] = f"{type(exc).__name__}:{exc}"
    return PdfResult(**base)


@dataclass
class RasterResult:
    path: str
    pages: int
    blank_pages: int
    edge_contact_pages: int
    render_errors: list[str]


def raster_inspect(path: Path, corpus_root: Path) -> RasterResult:
    blank = 0
    edge = 0
    errors: list[str] = []
    pages = 0
    try:
        document = fitz.open(path)
        pages = document.page_count
        for index in range(document.page_count):
            page = document.load_page(index)
            pix = page.get_pixmap(matrix=fitz.Matrix(1, 1), colorspace=fitz.csGRAY, alpha=False)
            array = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width)
            dark = array < 248
            dark_count = int(dark.sum())
            if dark_count < max(100, int(array.size * 0.00025)):
                blank += 1
            border = np.concatenate((dark[:2, :].ravel(), dark[-2:, :].ravel(), dark[:, :2].ravel(), dark[:, -2:].ravel()))
            if bool(border.any()):
                edge += 1
        document.close()
    except Exception as exc:  # noqa: BLE001
        errors.append(f"{type(exc).__name__}:{exc}")
    return RasterResult(portable(path.relative_to(corpus_root)), pages, blank, edge, errors)


def representative_samples(files: list[Path], corpus_root: Path) -> list[Path]:
    by_group: dict[tuple[str, str], list[Path]] = defaultdict(list)
    for path in files:
        by_group[parse_identity(path, corpus_root)].append(path)
    selected: list[Path] = []
    for locale in sorted(LOCALES):
        for tier in ("basic", "pro", "advanced"):
            rows = sorted(by_group[(locale, tier)], key=lambda p: portable(p.relative_to(corpus_root)))
            selected.append(rows[len(rows) // 2])
    return selected


def render_samples(samples: list[Path], corpus_root: Path, output_dir: Path) -> tuple[list[dict[str, Any]], Path]:
    render_dir = output_dir / "sample-renders"
    render_dir.mkdir(parents=True, exist_ok=True)
    rows: list[dict[str, Any]] = []
    images: list[tuple[str, Image.Image]] = []
    for path in samples:
        locale, tier = parse_identity(path, corpus_root)
        document = fitz.open(path)
        page = document.load_page(0)
        pix = page.get_pixmap(matrix=fitz.Matrix(200 / 72, 200 / 72), colorspace=fitz.csRGB, alpha=False)
        image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        output = render_dir / f"{locale}-{tier}-{path.stem}.png"
        image.save(output)
        images.append((f"{locale.upper()} / {tier.upper()}", image.copy()))
        rows.append({
            "pdf": portable(path.relative_to(corpus_root)),
            "render": portable(output.relative_to(output_dir)),
            "width": pix.width,
            "height": pix.height,
            "sha256": sha256_file(output),
        })
        document.close()

    thumb_width = 360
    label_height = 44
    margin = 20
    thumbs: list[tuple[str, Image.Image]] = []
    for label, image in images:
        ratio = thumb_width / image.width
        thumb = image.resize((thumb_width, int(image.height * ratio)), Image.Resampling.LANCZOS)
        thumbs.append((label, thumb))
    cell_height = max(thumb.height for _, thumb in thumbs) + label_height
    sheet = Image.new("RGB", (3 * thumb_width + 4 * margin, 3 * cell_height + 4 * margin), "white")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, (label, thumb) in enumerate(thumbs):
        row, col = divmod(index, 3)
        x = margin + col * (thumb_width + margin)
        y = margin + row * (cell_height + margin)
        draw.text((x, y), label, fill="black", font=font)
        sheet.paste(thumb, (x, y + label_height))
    contact_sheet = output_dir / "A94R2_PDF_SAMPLE_CONTACT_SHEET.png"
    sheet.save(contact_sheet)
    return rows, contact_sheet


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--materials-root", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument(
        "--ghostscript-mode",
        choices=("sample", "all"),
        default="sample",
        help="Use 'all' for release closure; 'sample' preserves the historical A94R2 45-document check.",
    )
    args = parser.parse_args()

    materials_root = Path(args.materials_root).resolve()
    corpus_root = materials_root / "EVIDENCE_HISTORY/artifacts/pass36/a83/browser-lens-pdf-corpus"
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    if not corpus_root.is_dir():
        raise SystemExit(f"corpus_missing:{corpus_root}")
    files = sorted(corpus_root.rglob("*.pdf"), key=lambda p: portable(p.relative_to(corpus_root)))

    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, args.workers)) as pool:
        pdf_results = list(pool.map(lambda p: inspect_pdf(p, corpus_root), files))
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, min(args.workers, 6))) as pool:
        raster_results = list(pool.map(lambda p: raster_inspect(p, corpus_root), files))

    samples = representative_samples(files, corpus_root)
    sample_rows, contact_sheet = render_samples(samples, corpus_root, output_dir)

    ghostscript_samples = (
        files
        if args.ghostscript_mode == "all"
        else [files[round(i * (len(files) - 1) / 44)] for i in range(45)]
    )
    ghostscript = []
    for path in ghostscript_samples:
        result = run_bounded(["gs", "-q", "-dSAFER", "-dBATCH", "-dNOPAUSE", "-sDEVICE=nullpage", str(path)], timeout=60)
        ghostscript.append({
            "path": portable(path.relative_to(corpus_root)),
            "passed": result.returncode == 0,
            "stderrSha256": sha256_bytes(result.stderr),
        })

    by_locale = Counter(row.locale for row in pdf_results)
    by_tier = Counter(row.tier for row in pdf_results)
    page_count = sum(row.pages for row in pdf_results)
    failures = []
    for row in pdf_results:
        reasons = []
        if row.error: reasons.append(row.error)
        if not row.pypdf_ok: reasons.append("pypdf_failed")
        if not row.pdfinfo_ok: reasons.append("pdfinfo_failed")
        if not row.pdftotext_ok or row.text_bytes == 0: reasons.append("pdftotext_failed_or_empty")
        if row.pages != row.expected_pages: reasons.append("page_count_mismatch")
        if row.a4_pages != row.pages: reasons.append("a4_mismatch")
        if row.rotation_zero_pages != row.pages: reasons.append("rotation_mismatch")
        if row.disallowed_actions: reasons.append("disallowed_action")
        if row.disallowed_catalog_keys: reasons.append("disallowed_catalog_key")
        if row.embedded_files_present: reasons.append("embedded_files_present")
        if row.javascript_names_present: reasons.append("javascript_names_present")
        if row.encrypted: reasons.append("encrypted")
        if row.fonts <= 0 or row.embedded_fonts <= 0 or row.to_unicode_fonts <= 0: reasons.append("font_embedding_or_unicode_missing")
        if reasons:
            failures.append({"path": row.path, "reasons": reasons})
    raster_failures = [asdict(row) for row in raster_results if row.render_errors]
    blank_pages = sum(row.blank_pages for row in raster_results)
    edge_contact_pages = sum(row.edge_contact_pages for row in raster_results)
    ghostscript_failed = [row for row in ghostscript if not row["passed"]]

    expected_path_pattern = re.compile(r"^(?:pl|en|de)/(?:basic|pro|advanced)/.+\.pdf$")
    exact_denominator = (
        len(files) == 450
        and page_count == 2100
        and by_locale == Counter({"pl": 150, "en": 150, "de": 150})
        and by_tier == Counter({"basic": 150, "pro": 150, "advanced": 150})
        and all(expected_path_pattern.match(row.path) for row in pdf_results)
    )
    passed = exact_denominator and not failures and not raster_failures and blank_pages == 0 and edge_contact_pages == 0 and not ghostscript_failed

    ordered_entries = [
        f"{row.path}\0{row.byte_length}\0{row.sha256}\0{row.pages}" for row in sorted(pdf_results, key=lambda r: r.path)
    ]
    receipt = {
        "schemaVersion": "velmere.pass36.a94r2.retained-physical-pdf-independent-qa.v1",
        "revisionId": "VELMERE_PASS36_A94R2_ROUTE_AST_ORPHAN_LOCK_PDF_AND_CROSS_SURFACE_VALUE_TRUTH_CHECKPOINT",
        "status": "PASS_LOCAL_PHYSICAL_SYNTHETIC_PDF_QA_NO_REAL_CUSTOMER_CREDIT" if passed else "FAIL_LOCAL_PHYSICAL_PDF_QA",
        "corpusRoot": "EVIDENCE_HISTORY/artifacts/pass36/a83/browser-lens-pdf-corpus",
        "documents": len(files),
        "pages": page_count,
        "byLocale": dict(sorted(by_locale.items())),
        "byTier": dict(sorted(by_tier.items())),
        "pypdfPassed": sum(row.pypdf_ok for row in pdf_results),
        "pdfinfoPassed": sum(row.pdfinfo_ok for row in pdf_results),
        "pdftotextPassed": sum(row.pdftotext_ok and row.text_bytes > 0 for row in pdf_results),
        "a4Pages": sum(row.a4_pages for row in pdf_results),
        "rotationZeroPages": sum(row.rotation_zero_pages for row in pdf_results),
        "blankPages": blank_pages,
        "edgeContactPages": edge_contact_pages,
        "ghostscriptSampleCount": len(ghostscript),
        "ghostscriptSamplePassed": sum(row["passed"] for row in ghostscript),
        "ghostscriptMode": args.ghostscript_mode,
        "ghostscriptFullCorpusRequiredForReleaseCredit": True,
        "ghostscriptFullCorpusCovered": args.ghostscript_mode == "all" and len(ghostscript) == len(files),
        "sampleRenderCount": len(sample_rows),
        "contactSheet": portable(contact_sheet.relative_to(output_dir)),
        "entryAggregateSha256": sha256_bytes("\n".join(ordered_entries).encode()),
        "failures": failures,
        "rasterFailures": raster_failures,
        "ghostscriptFailures": ghostscript_failed,
        "sampleRenders": sample_rows,
        "truthBoundary": "Independent local re-verification of the retained 450-document synthetic A83 corpus. It proves physical presence, structure, renderability and declared 2/4/8-page tier shape only. It grants no real provider, real audit, production browser, secure customer delivery, customer value, LIVE or sale credit.",
        "realCustomerPdfs": 0,
        "productionBrowserRuns": 0,
        "secureCustomerDeliveries": 0,
        "customerPurchaseWorthinessProven": False,
        "liveProven": False,
        "saleEnabled": False,
    }
    receipt_path = output_dir / "A94R2_RETAINED_PHYSICAL_PDF_QA_RECEIPT.json"
    detail_path = output_dir / "A94R2_RETAINED_PHYSICAL_PDF_QA_DETAILS.json"
    detail_path.write_text(json.dumps({
        "pdfResults": [asdict(row) for row in pdf_results],
        "rasterResults": [asdict(row) for row in raster_results],
        "ghostscript": ghostscript,
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
    receipt["detailsSha256"] = sha256_file(detail_path)
    receipt["receiptCoreSha256"] = sha256_bytes(json.dumps(receipt, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf8"))
    receipt_path.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
    print(json.dumps({
        "status": receipt["status"],
        "documents": receipt["documents"],
        "pages": receipt["pages"],
        "pypdfPassed": receipt["pypdfPassed"],
        "pdfinfoPassed": receipt["pdfinfoPassed"],
        "pdftotextPassed": receipt["pdftotextPassed"],
        "blankPages": blank_pages,
        "edgeContactPages": edge_contact_pages,
        "ghostscriptSamplePassed": receipt["ghostscriptSamplePassed"],
        "ghostscriptMode": receipt["ghostscriptMode"],
        "ghostscriptFullCorpusCovered": receipt["ghostscriptFullCorpusCovered"],
        "failures": len(failures) + len(raster_failures) + len(ghostscript_failed),
        "output": str(receipt_path),
    }, indent=2))
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
