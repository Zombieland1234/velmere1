#!/usr/bin/env python3
from __future__ import annotations
import importlib.util
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
CASES={
 "pl":{0:"sygnałów",1:"sygnał",2:"sygnały",4:"sygnały",5:"sygnałów",12:"sygnałów",22:"sygnały"},
 "en":{0:"signals",1:"signal",2:"signals"},
 "de":{0:"Signale",1:"Signal",2:"Signale"},
}
rows=[]
for index,rel in enumerate(("scripts/pass36/generate-a102r44p4-official-tool-tier-packets.py","scripts/pass36/generate-a102r44p7-advanced-evidence-packets.py")):
 spec=importlib.util.spec_from_file_location(f"mod_{index}",ROOT/rel);mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
 for locale,cases in CASES.items():
  for n,expected in cases.items():
   actual=mod.signal_label(locale,n);rows.append({"file":rel,"locale":locale,"n":n,"expected":expected,"actual":actual,"passed":actual==expected})
 text=(ROOT/rel).read_text(encoding="utf-8")
 rows.extend([
  {"file":rel,"id":"no-tier-numeric-confidence","passed":not any(x in text for x in ("confidence':78 if tier", '"confidence": 78 if tier', "else 86 if tier", "else 91"))},
  {"file":rel,"id":"analysis-completed-state","passed":"analysis_completed" in text},
 ])
failed=[r for r in rows if not r["passed"]]
out={"schemaVersion":"velmere.pass36.a102r44p20.packet-customer-language-test.v1","status":"PASS" if not failed else "FAIL","checks":len(rows),"passed":len(rows)-len(failed),"failed":len(failed),"rows":rows}
print(json.dumps(out,indent=2,ensure_ascii=False));raise SystemExit(1 if failed else 0)
