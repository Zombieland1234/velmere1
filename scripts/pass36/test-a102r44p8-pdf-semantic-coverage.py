#!/usr/bin/env python3
import importlib.util, json, pathlib
MOD=pathlib.Path(__file__).with_name('render-a102r44p8-accuracy-customer-truth-pdf-corpus.py')
spec=importlib.util.spec_from_file_location('renderer',MOD);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def row(tool,valid=True):return {'sourceId':tool+'-01','family':{'solc':'compiler_metadata','slither':'static_analysis','semgrep':'pattern_analysis','forge':'build_reproduction'}[tool],'receiptSha256':'a'*64 if valid else 'bad','terminalStatus':'EXECUTED_SUCCESS'}
base={'officialToolReceiptRefs':[row(x) for x in ('solc','slither','semgrep','forge')]}
cases=[]
def test(name,p,expected):
 lines=m.tool_status_lines(p,'en');actual=next(x for x in lines if x.startswith('OFFICIAL_TOOL_EXECUTIONS:')).split(': ',1)[1];ok=actual==expected;cases.append({'id':name,'passed':ok,'actual':actual,'expected':expected})
test('full-4-of-4',base,'4/4');test('missing-one',{'officialToolReceiptRefs':base['officialToolReceiptRefs'][:-1]},'3/4');test('none',{'officialToolReceiptRefs':[]},'0/4');test('duplicate-does-not-overcount',{'officialToolReceiptRefs':base['officialToolReceiptRefs']+[row('solc')]},'4/4');bad=list(base['officialToolReceiptRefs']);bad[0]=row('solc',False);test('invalid-hash-not-counted',{'officialToolReceiptRefs':bad},'3/4')
out={'schemaVersion':'velmere.pass36.a102r44p8.pdf-semantic-coverage-test.v1','checks':len(cases),'passed':sum(x['passed'] for x in cases),'failed':sum(not x['passed'] for x in cases),'rows':cases};print(json.dumps(out,indent=2));raise SystemExit(1 if out['failed'] else 0)
