#!/usr/bin/env python3
import argparse, hashlib, json, re
from pathlib import Path
from pypdf import PdfReader

ap=argparse.ArgumentParser(); ap.add_argument("pdf_dir"); args=ap.parse_args(); root=Path(args.pdf_dir)
manifest=json.loads((root/"R44P39_TARGETED_PDF_MANIFEST.json").read_text())
rows=[]
for row in manifest["rows"]:
    pdf=root/row["pdf"]
    raw=pdf.read_bytes()
    reader=PdfReader(str(pdf), strict=True)
    texts=[page.extract_text() or "" for page in reader.pages]
    text="\n".join(texts)
    page_rows=[]
    for index,page in enumerate(reader.pages,1):
        box=page.mediabox
        width=float(box.width); height=float(box.height)
        rotation=int(page.get("/Rotate",0) or 0)
        page_rows.append({"page":index,"width":width,"height":height,"rotation":rotation,"blank":not bool(texts[index-1].strip())})
    dangerous=[marker for marker in [b"/JavaScript",b"/JS",b"/OpenAction",b"/Launch",b"/XFA",b"/EmbeddedFile"] if marker in raw]
    expected_tier=row["tier"].upper()
    passed=(
        len(reader.pages)==row["pages"]
        and all(abs(p["width"]-595)<=1 and abs(p["height"]-842)<=1 and p["rotation"]==0 and not p["blank"] for p in page_rows)
        and "NOT_CALIBRATED" in text
        and expected_tier in text
        and row["caseRef"] in text
        and "FINDINGS" in text
        and not dangerous
        and reader.is_encrypted is False
    )
    rows.append({
        "pdf":row["pdf"],"tier":row["tier"],"caseRef":row["caseRef"],
        "pages":len(reader.pages),"expectedPages":row["pages"],
        "a4":all(abs(p["width"]-595)<=1 and abs(p["height"]-842)<=1 for p in page_rows),
        "rotationZero":all(p["rotation"]==0 for p in page_rows),
        "blankPages":sum(1 for p in page_rows if p["blank"]),
        "notCalibrated":"NOT_CALIBRATED" in text,
        "caseRefPresent":row["caseRef"] in text,
        "tierPresent":expected_tier in text,
        "dangerousMarkers":[m.decode("ascii") for m in dangerous],
        "encrypted":reader.is_encrypted,
        "sha256":hashlib.sha256(raw).hexdigest(),
        "passed":passed,
    })
failed=[r for r in rows if not r["passed"]]
print(json.dumps({
    "schemaVersion":"velmere.pass36.a102r44p39.targeted-pdf-qa.v2",
    "status":"PASS_R44P39_TARGETED_PDF_QA" if not failed else "FAIL_R44P39_TARGETED_PDF_QA",
    "documents":len(rows),"pages":sum(r["pages"] for r in rows),
    "a4Pages":sum(r["pages"] for r in rows if r["a4"]),
    "blankPages":sum(r["blankPages"] for r in rows),
    "activeContentDocuments":sum(1 for r in rows if r["dangerousMarkers"]),
    "failed":len(failed),"rows":rows,
    "truthBoundary":"Targeted compiler-packet PDFs only. This is not the full customer PDF corpus or customer delivery credit."
},indent=2))
raise SystemExit(1 if failed else 0)
