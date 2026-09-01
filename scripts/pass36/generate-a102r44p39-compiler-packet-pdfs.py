#!/usr/bin/env python3
import argparse, json, textwrap
from pathlib import Path

def esc(text): return str(text).replace('\\','\\\\').replace('(','\\(').replace(')','\\)')
def make_pdf(lines, pages):
    objects=[]
    def add(data): objects.append(data); return len(objects)
    font=add(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
    page_ids=[]; content_ids=[]
    per=max(1,(len(lines)+pages-1)//pages)
    for page in range(pages):
        subset=lines[page*per:(page+1)*per] or ['']
        commands=['BT','/F1 9 Tf','50 790 Td','12 TL']
        for line in subset[:58]: commands.append(f'({esc(line[:120])}) Tj'); commands.append('T*')
        commands.append('ET')
        stream='\n'.join(commands).encode('latin-1','replace')
        content_ids.append(add(b'<< /Length '+str(len(stream)).encode()+b' >>\nstream\n'+stream+b'\nendstream'))
        page_ids.append(add(b''))
    pages_id=add(b'')
    catalog=add(f'<< /Type /Catalog /Pages {pages_id} 0 R >>'.encode())
    for idx,page_id in enumerate(page_ids): objects[page_id-1]=f'<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 {font} 0 R >> >> /Contents {content_ids[idx]} 0 R >>'.encode()
    objects[pages_id-1]=f'<< /Type /Pages /Kids [{" ".join(f"{i} 0 R" for i in page_ids)}] /Count {len(page_ids)} >>'.encode()
    data=bytearray(b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'); offsets=[0]
    for i,obj in enumerate(objects,1): offsets.append(len(data)); data+=f'{i} 0 obj\n'.encode()+obj+b'\nendobj\n'
    xref=len(data); data+=f'xref\n0 {len(objects)+1}\n0000000000 65535 f \n'.encode()
    for off in offsets[1:]: data+=f'{off:010d} 00000 n \n'.encode()
    data+=f'trailer\n<< /Size {len(objects)+1} /Root {catalog} 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode()
    return bytes(data)

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('packet_dir'); ap.add_argument('out_dir'); args=ap.parse_args()
    packet_dir=Path(args.packet_dir); out=Path(args.out_dir); out.mkdir(parents=True,exist_ok=True)
    rows=[]
    for packet_path in sorted(packet_dir.glob('*.json')):
        p=json.loads(packet_path.read_text())
        lines=[f"VELMERE TARGETED COMPILER AUDIT PACKET — {p['tier'].upper()}",f"Case: {p['caseRef']}",f"Availability: {p['availability']}",f"Finding confidence: {p['findingConfidence']}",f"Findings: {p['findingCount']}",f"Finding identity: {p['findingIdentitySha256']}",f"Deployment binding: {p['deploymentBindingStatus']}",f"Proxy binding: {p['proxyBindingStatus']}","",p['customerTruth']['nextSafeAction'],"","FINDINGS"]
        for f in p['findings']:
            lines += [f"{f['findingId']} | {f['severity'].upper()} | {f['title']}",f"Source: {f['sourcePath']}:{f['line']}"]
            if 'description' in f: lines.append(f"Description: {f['description']}")
            if 'safeRemediation' in f: lines.append(f"Remediation: {f['safeRemediation']}")
            if 'limitations' in f: lines.extend([f"Limitation: {x}" for x in f['limitations']])
            lines.append('')
        lines += ['MISSING PROOF']+[f"- {x}" for x in p['registers']['missingProofRegister']]
        pages={'basic':1,'pro':2,'advanced':3}[p['tier']]
        pdf_path=out/(packet_path.stem+'.pdf'); pdf_path.write_bytes(make_pdf(lines,pages))
        rows.append({'packet':packet_path.name,'pdf':pdf_path.name,'tier':p['tier'],'caseRef':p['caseRef'],'pages':pages,'byteLength':pdf_path.stat().st_size})
    (out/'R44P39_TARGETED_PDF_MANIFEST.json').write_text(json.dumps({'schemaVersion':'velmere.pass36.a102r44p39.targeted-pdf-manifest.v1','documents':len(rows),'rows':rows},sort_keys=True,indent=2)+'\n')
    print(json.dumps({'status':'PASS_R44P39_TARGETED_PDF_GENERATION','documents':len(rows),'pages':sum(r['pages'] for r in rows)},indent=2))
if __name__=='__main__': main()
