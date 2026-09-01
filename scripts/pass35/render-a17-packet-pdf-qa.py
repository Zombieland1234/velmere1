#!/usr/bin/env python3
import hashlib
import io
import json
import shutil
import tempfile
from pathlib import Path

import pypdfium2 as pdfium
from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "artifacts/pass35/PASS35_A17_PACKET_PDF_CORPUS_MANIFEST.json"
RECEIPT = ROOT / "artifacts/pass35/PASS35_A17_PACKET_PDF_RASTER_QA_RECEIPT.json"
CONTACT_ROOT = ROOT / "artifacts/pass35/a17-packet-pdf-raster-qa"


def sha256_bytes(data: bytes) -> str:
    return "sha256:" + hashlib.sha256(data).hexdigest()


def png_bytes(image: Image.Image) -> bytes:
    output = io.BytesIO()
    image.save(output, format="PNG", optimize=True)
    return output.getvalue()


def inspect_image(image: Image.Image) -> dict:
    rgb = image.convert("RGB")
    white = Image.new("RGB", rgb.size, "white")
    diff = ImageChops.difference(rgb, white)
    bbox = diff.getbbox()
    gray = rgb.convert("L")
    histogram = gray.histogram()
    nonwhite = sum(histogram[:250])
    total = rgb.size[0] * rgb.size[1]
    ratio = nonwhite / total if total else 0
    edge_margin = 8
    touches_edge = bool(
        bbox and (
            bbox[0] < edge_margin
            or bbox[1] < edge_margin
            or bbox[2] > rgb.size[0] - edge_margin
            or bbox[3] > rgb.size[1] - edge_margin
        )
    )
    return {
        "width": rgb.size[0],
        "height": rgb.size[1],
        "contentBoundingBox": list(bbox) if bbox else None,
        "nonWhitePixelRatio": round(ratio, 8),
        "blank": bbox is None or ratio < 0.0005,
        "touchesRasterEdge": touches_edge,
    }


def contact_sheet(images: list[tuple[str, Image.Image]], title: str) -> Image.Image:
    thumb_w, thumb_h = 380, 538
    columns = 4
    rows = (len(images) + columns - 1) // columns
    header = 52
    canvas = Image.new("RGB", (columns * thumb_w, header + rows * (thumb_h + 34)), "white")
    draw = ImageDraw.Draw(canvas)
    draw.text((16, 16), title, fill="black")
    for index, (label, image) in enumerate(images):
        row, column = divmod(index, columns)
        thumb = image.copy().convert("RGB")
        thumb.thumbnail((thumb_w - 16, thumb_h - 16))
        x = column * thumb_w + (thumb_w - thumb.width) // 2
        y = header + row * (thumb_h + 34) + 8
        canvas.paste(thumb, (x, y))
        draw.rectangle((column * thumb_w + 4, header + row * (thumb_h + 34) + 4, (column + 1) * thumb_w - 4, header + row * (thumb_h + 34) + thumb_h - 4), outline="black", width=1)
        draw.text((column * thumb_w + 10, header + row * (thumb_h + 34) + thumb_h + 4), label[:52], fill="black")
    return canvas


def main() -> None:
    manifest_bytes = MANIFEST.read_bytes()
    manifest = json.loads(manifest_bytes)
    CONTACT_ROOT.mkdir(parents=True, exist_ok=True)
    for old in CONTACT_ROOT.glob("*.png"):
        old.unlink()

    failures: list[str] = []
    pages: list[dict] = []
    first_pages: dict[str, list[tuple[str, Image.Image]]] = {"basic": [], "pro": [], "advanced": []}
    temp_root = Path(tempfile.mkdtemp(prefix="velmere-a17-pdf-raster-"))
    try:
        for entry in manifest.get("entries", []):
            pdf_path = ROOT / entry["path"]
            try:
                document = pdfium.PdfDocument(str(pdf_path))
            except Exception as error:
                failures.append(f"pdf_open_failed:{entry['path']}:{error}")
                continue
            if len(document) != entry["pageCount"]:
                failures.append(f"pdf_page_count:{entry['path']}:{len(document)}/{entry['pageCount']}")
            for page_index in range(len(document)):
                page = document[page_index]
                bitmap = page.render(scale=1.5)
                image = bitmap.to_pil().convert("RGB")
                inspection = inspect_image(image)
                encoded = png_bytes(image)
                png_path = temp_root / f"{entry['surfaceId']}-{entry['tier']}-page-{page_index + 1}.png"
                png_path.write_bytes(encoded)
                if inspection["blank"]:
                    failures.append(f"blank_page:{entry['path']}:{page_index + 1}")
                if inspection["touchesRasterEdge"]:
                    failures.append(f"raster_edge_touch:{entry['path']}:{page_index + 1}")
                pages.append({
                    "surfaceId": entry["surfaceId"],
                    "tier": entry["tier"],
                    "pdfPath": entry["path"],
                    "page": page_index + 1,
                    "pngSha256": sha256_bytes(encoded),
                    "pngByteLength": len(encoded),
                    **inspection,
                })
                if page_index == 0:
                    first_pages[entry["tier"]].append((entry["surfaceId"], image))
            document.close()

        contact_sheets = []
        for tier in ("basic", "pro", "advanced"):
            images = sorted(first_pages[tier], key=lambda item: item[0])
            sheet = contact_sheet(images, f"VELMERE PASS35 A17 - {tier.upper()} FIRST-PAGE CONTACT SHEET")
            encoded = png_bytes(sheet)
            output_path = CONTACT_ROOT / f"A17_{tier.upper()}_FIRST_PAGE_CONTACT_SHEET.png"
            output_path.write_bytes(encoded)
            contact_sheets.append({
                "tier": tier,
                "path": output_path.relative_to(ROOT).as_posix(),
                "sha256": sha256_bytes(encoded),
                "byteLength": len(encoded),
                "sourceFirstPages": len(images),
            })

        receipt_core = {
            "schemaVersion": "velmere.pass35.a17.packet-pdf-raster-qa-receipt.v1",
            "generatedAt": manifest.get("generatedAt"),
            "renderer": "pypdfium2",
            "scale": 1.5,
            "status": "PASS" if not failures else "FAIL",
            "manifest": {
                "path": MANIFEST.relative_to(ROOT).as_posix(),
                "sha256": sha256_bytes(manifest_bytes),
            },
            "totals": {
                "pdfCount": len(manifest.get("entries", [])),
                "pageCount": len(pages),
                "blankPages": sum(1 for page in pages if page["blank"]),
                "pagesTouchingRasterEdge": sum(1 for page in pages if page["touchesRasterEdge"]),
                "contactSheets": len(contact_sheets),
            },
            "pages": pages,
            "contactSheets": contact_sheets,
            "failures": failures,
            "boundaries": {
                "synthetic": True,
                "offline": True,
                "notLive": True,
                "notForSale": True,
            },
        }
        receipt = {**receipt_core, "receiptSha256": sha256_bytes(json.dumps(receipt_core, sort_keys=True, separators=(",", ":")).encode())}
        RECEIPT.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({
            "status": receipt["status"],
            "receiptPath": RECEIPT.relative_to(ROOT).as_posix(),
            "totals": receipt["totals"],
            "failures": failures[:20],
        }, indent=2))
        if failures:
            raise SystemExit(1)
    finally:
        shutil.rmtree(temp_root, ignore_errors=True)


if __name__ == "__main__":
    main()
