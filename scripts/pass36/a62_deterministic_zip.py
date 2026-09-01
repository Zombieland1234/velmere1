#!/usr/bin/env python3
import os, pathlib, stat, sys, zipfile

def main():
    if len(sys.argv) != 3:
        raise SystemExit("usage: a62_deterministic_zip.py <root> <output>")
    root = pathlib.Path(sys.argv[1]).resolve(); output = pathlib.Path(sys.argv[2]).resolve()
    files=[]
    for base, dirs, names in os.walk(root):
        dirs.sort(); names.sort()
        for name in names:
            p=pathlib.Path(base)/name
            if p.is_symlink(): raise SystemExit(f"symlink_forbidden:{p}")
            if not p.is_file(): raise SystemExit(f"special_file_forbidden:{p}")
            files.append(p)
    output.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(output,"w",compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for p in sorted(files,key=lambda x:x.relative_to(root).as_posix()):
            rel=p.relative_to(root).as_posix(); info=zipfile.ZipInfo(rel,(1980,1,1,0,0,0)); info.compress_type=zipfile.ZIP_DEFLATED
            mode=stat.S_IMODE(p.stat().st_mode); info.external_attr=((stat.S_IFREG|mode)&0xffff)<<16
            z.writestr(info,p.read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
if __name__=="__main__": main()
