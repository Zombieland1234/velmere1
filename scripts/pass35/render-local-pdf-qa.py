#!/usr/bin/env python3
"""Raster-smoke the complete local PDF QA corpus and build contact sheets."""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
ARTIFACT_ROOT = ROOT / "artifacts" / "pass35" / "local-product-quality"
PDF_ROOT = ARTIFACT_ROOT / "pdf-corpus"
OUTPUT_ROOT = ARTIFACT_ROOT / "renders"
EXPECTED_PAGES = {"basic": 2, "pro": 4, "advanced": 8}
TILE_SIZE = (190, 278)
CONTACT_COLUMNS = 5


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def rasterize(pdf: Path, output_prefix: Path) -> list[Path]:
    command = [
        "pdftoppm",
        "-png",
        "-r",
        "36",
        str(pdf),
        str(output_prefix),
    ]
    result = subprocess.run(command, capture_output=True, text=True, timeout=120, check=False)
    if result.returncode != 0:
        raise RuntimeError(f"pdftoppm_failed:{pdf.name}:{result.stderr.strip()}")
    return sorted(output_prefix.parent.glob(f"{output_prefix.name}-*.png"))


def ink_box(image: Image.Image):
    rgb = image.convert("RGB")
    # The production renderer intentionally uses a warm paper background. Bind
    # blank/edge detection to the rasterized page corner instead of assuming
    # pure white, otherwise the page background itself looks like edge ink.
    background = Image.new("RGB", rgb.size, rgb.getpixel((0, 0)))
    return ImageChops.difference(rgb, background).getbbox()


def thumbnail(image: Image.Image) -> Image.Image:
    result = Image.new("RGB", TILE_SIZE, "white")
    copy = image.convert("RGB")
    copy.thumbnail((TILE_SIZE[0] - 10, TILE_SIZE[1] - 32), Image.Resampling.LANCZOS)
    x = (TILE_SIZE[0] - copy.width) // 2
    result.paste(copy, (x, 20))
    return result


def contact_sheet(tier: str, rows: list[tuple[str, Image.Image]]) -> Path:
    tile_width, tile_height = TILE_SIZE
    contact_rows = (len(rows) + CONTACT_COLUMNS - 1) // CONTACT_COLUMNS
    sheet = Image.new(
        "RGB",
        (tile_width * CONTACT_COLUMNS, tile_height * contact_rows),
        "#dce4ee",
    )
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, (label, image) in enumerate(rows):
        x = (index % CONTACT_COLUMNS) * tile_width
        y = (index // CONTACT_COLUMNS) * tile_height
        sheet.paste(thumbnail(image), (x, y))
        draw.rectangle((x, y, x + tile_width - 1, y + tile_height - 1), outline="#52657a", width=1)
        draw.text((x + 5, y + 5), label[:28], fill="#0b1726", font=font)
    target = OUTPUT_ROOT / f"{tier}-first-pages-contact-sheet.png"
    sheet.save(target, format="PNG", optimize=True)
    return target


def main() -> None:
    if shutil.which("pdftoppm") is None:
        raise SystemExit("pdftoppm_not_available")
    if OUTPUT_ROOT.exists():
        shutil.rmtree(OUTPUT_ROOT)
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)

    documents = []
    total_pages = 0
    blank_pages = 0
    edge_contact_pages = 0
    contact_sheets = []

    with tempfile.TemporaryDirectory(prefix="velmere-pass35-pdf-render-") as temporary:
        temporary_root = Path(temporary)
        for tier, expected_pages in EXPECTED_PAGES.items():
            pdfs = sorted((PDF_ROOT / tier).glob("*.pdf"))
            if len(pdfs) != 50:
                raise RuntimeError(f"pdf_count_invalid:{tier}:{len(pdfs)}")
            first_pages = []
            for index, pdf in enumerate(pdfs, start=1):
                document_dir = temporary_root / tier / f"{index:02d}"
                document_dir.mkdir(parents=True, exist_ok=True)
                pages = rasterize(pdf, document_dir / "page")
                if len(pages) != expected_pages:
                    raise RuntimeError(
                        f"render_page_count_invalid:{pdf.name}:{len(pages)}:{expected_pages}"
                    )
                page_receipts = []
                for page_number, image_path in enumerate(pages, start=1):
                    with Image.open(image_path) as image:
                        box = ink_box(image)
                        blank = box is None
                        touches_edge = False
                        if box is not None:
                            left, top, right, bottom = box
                            touches_edge = left < 4 or top < 4 or right > image.width - 4 or bottom > image.height - 4
                        blank_pages += int(blank)
                        edge_contact_pages += int(touches_edge)
                        page_receipts.append(
                            {
                                "page": page_number,
                                "width": image.width,
                                "height": image.height,
                                "blank": blank,
                                "touchesRasterEdge": touches_edge,
                                "pngSha256": sha256(image_path),
                            }
                        )
                        if page_number == 1:
                            first_pages.append((pdf.stem, image.copy()))
                total_pages += len(pages)
                documents.append(
                    {
                        "tier": tier,
                        "file": pdf.relative_to(ROOT).as_posix(),
                        "pdfSha256": sha256(pdf),
                        "pages": page_receipts,
                    }
                )
            sheet = contact_sheet(tier, first_pages)
            contact_sheets.append(
                {
                    "tier": tier,
                    "file": sheet.relative_to(ROOT).as_posix(),
                    "sha256": sha256(sheet),
                    "documentCount": len(first_pages),
                }
            )

    receipt = {
        "schemaVersion": "velmere.pass35.local-pdf-raster-qa.v1",
        "candidateId": "VELMERE_PASS35_OFFLINE_CANDIDATE_R3",
        "evaluatedAt": "2026-07-22T00:00:00.000Z",
        "status": "PASS" if blank_pages == 0 and edge_contact_pages == 0 else "FAIL",
        "environment": "LOCAL_SYNTHETIC_QA_NOT_LIVE_NOT_FOR_SALE",
        "pdfCount": len(documents),
        "renderedPageCount": total_pages,
        "expectedPageCount": 700,
        "blankPages": blank_pages,
        "pagesTouchingRasterEdge": edge_contact_pages,
        "contactSheets": contact_sheets,
        "documents": documents,
        "promotionAllowed": False,
        "externalEvidenceCredit": 0,
        "truthBoundary": (
            "Poppler raster smoke proves local PDF parseability and visible page content only. "
            "It is not browser, accessibility, provider, customer, payment, staging or LIVE evidence."
        ),
    }
    target = ARTIFACT_ROOT / "PASS35_LOCAL_PDF_RASTER_QA_RECEIPT.json"
    target.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({key: receipt[key] for key in (
        "status", "pdfCount", "renderedPageCount", "blankPages", "pagesTouchingRasterEdge"
    )}, indent=2))
    if receipt["status"] != "PASS":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
