import glob,os,subprocess,concurrent.futures
from pathlib import Path
root=Path(__file__).resolve().parent.parent
pdfs=glob.glob(str(root/'evaluation/pdfs/*.pdf'))
def one(p):
 out=root/'evaluation/pdf-renders'/Path(p).stem
 out.mkdir(parents=True,exist_ok=True)
 if len(list(out.glob('*.png')))>=4:return Path(p).name,'skip'
 r=subprocess.run(['python','/home/oai/skills/pdfs/scripts/render_pdf.py',p,'--out_dir',str(out),'--dpi','72'],capture_output=True,text=True,timeout=120)
 return Path(p).name,r.returncode
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
 for x in ex.map(one,pdfs): print(x,flush=True)
(root/'evaluation/logs/pdf-render.done').write_text('done\n')
