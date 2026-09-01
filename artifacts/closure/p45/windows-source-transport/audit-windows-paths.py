#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, unicodedata
from pathlib import Path, PurePosixPath

def stable(v):
    if isinstance(v,list):return '['+','.join(stable(x) for x in v)+']'
    if isinstance(v,dict):return '{'+','.join(json.dumps(k,ensure_ascii=False)+':'+stable(v[k]) for k in sorted(v))+'}'
    return json.dumps(v,ensure_ascii=False,separators=(',',':'))
def u16(s):return len(s.encode('utf-16-le'))//2

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--identity',required=True);ap.add_argument('--output',required=True);ap.add_argument('--windows-prefix',default='D:\\a\\velmere1\\velmere1\\p45-source\\');a=ap.parse_args()
    ident=json.loads(Path(a.identity).read_text(encoding='utf-8')); paths=[r['path'] for r in ident['files']]
    reserved={'CON','PRN','AUX','NUL','CLOCK$'}|{f'COM{i}' for i in range(1,10)}|{f'LPT{i}' for i in range(1,10)}
    invalid=[];device=[];trail=[];control=[];absolute=[];traversal=[];componentTooLong=[]
    for path in paths:
      pure=PurePosixPath(path)
      if pure.is_absolute():absolute.append(path)
      if '..' in pure.parts:traversal.append(path)
      for part in pure.parts:
        if any(ch in '<>:"\\|?*' for ch in part):invalid.append(path)
        if any(ord(ch)<32 for ch in part):control.append(path)
        if part.endswith(' ') or part.endswith('.'):trail.append(path)
        if part.rstrip(' .').split('.')[0].upper() in reserved:device.append(path)
        if u16(part)>255:componentTooLong.append(path)
    collisions={}
    for label,normalizer in {
      'casefold':lambda s:s.casefold(),
      'NFC_casefold':lambda s:unicodedata.normalize('NFC',s).casefold(),
      'NFD_casefold':lambda s:unicodedata.normalize('NFD',s).casefold(),
      'NFKC_casefold':lambda s:unicodedata.normalize('NFKC',s).casefold(),
    }.items():
      seen={};rows=[]
      for path in paths:
        key=normalizer(path)
        if key in seen and seen[key]!=path:rows.append([seen[key],path])
        else:seen[key]=path
      collisions[label]=rows
    maxPath=max(paths,key=u16); maxComponent=max((part for p in paths for part in p.split('/')),key=u16)
    findings={'invalidCharacters':invalid,'reservedDeviceNames':device,'trailingDotOrSpace':trail,'controlCharacters':control,'absolutePaths':absolute,'pathTraversal':traversal,'componentOver255Utf16':componentTooLong,'normalizationCollisions':collisions}
    passes=not any([invalid,device,trail,control,absolute,traversal,componentTooLong,*collisions.values()])
    receipt={
      'schemaVersion':'velmere.p45.windows-path-compatibility.v1','status':'PASS' if passes else 'FAIL',
      'denominator':{'paths':len(paths),'components':sum(len(p.split('/')) for p in paths)},
      'findings':{k:(len(v) if k!='normalizationCollisions' else {x:len(y) for x,y in v.items()}) for k,v in findings.items()},
      'maximums':{'relativePathUtf16CodeUnits':u16(maxPath),'relativePath':maxPath,'componentUtf16CodeUnits':u16(maxComponent),'component':maxComponent,'assumedWindowsPrefix':a.windows_prefix,'absolutePathUtf16CodeUnits':u16(a.windows_prefix)+u16(maxPath)},
      'controls':{'coreLongpathsRequiredByObservedLength':u16(a.windows_prefix)+u16(maxPath)>=260,'workflowStillSetsCoreLongpathsTrue':True,'coreAutocrlfFalseRequired':True,'coreEolLfRequired':True,'gitIndexModeVerifierRequiredOnWindows':True},
      'creditBoundary':'Path and checkout compatibility only; exact Windows runtime execution remains separate.'
    }
    receipt['integritySha256']=hashlib.sha256(stable(receipt).encode()).hexdigest();out=Path(a.output);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(receipt,indent=2,ensure_ascii=False)+'\n',encoding='utf-8');print(json.dumps(receipt,indent=2,ensure_ascii=False))
    if not passes:raise SystemExit(1)
if __name__=='__main__':main()
