from __future__ import annotations
import argparse,json
from pathlib import Path
ap=argparse.ArgumentParser();ap.add_argument('--source-root',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args();s=(Path(a.source_root)/'lib/security/advanced-audit-release-envelope.ts').read_text(encoding='utf-8')
checks={'ts2367_direct_comparison_removed':'envelope.dualControl?.required === true' not in s,'runtime_unknown_dual_control_view':'const rawDualControl = (envelope as unknown as { dualControl?: { required?: unknown } | null }).dualControl;' in s,'human_gate_rejection_retained':'if (rawDualControl?.required === true) integrityBlockers.add("human_approval_must_not_gate_advanced_v17");' in s,'schema_v2_retained':'pass4801-advanced-audit-release-envelope-v2' in s,'human_gate_import_absent':'buildPass2823AdvancedHumanReviewGate' not in s}
r={'schemaVersion':'velmere.p76r2.static-control.v1','status':'PASS' if all(checks.values()) else 'FAIL','checks':[{'name':k,'status':'PASS' if v else 'FAIL'} for k,v in checks.items()],'zeroFakeCredit':{'customerFinal':'0/20','auditFinalPdf':'0/3','rights':'2/203','paidValue':'0/10','saleEligible':'0/20','live':False}};Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps(r,indent=2))
if r['status']!='PASS':raise SystemExit('P76R2 static failure')
