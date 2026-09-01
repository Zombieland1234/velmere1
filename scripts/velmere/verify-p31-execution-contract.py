from pathlib import Path
import json,sys
root=Path(__file__).resolve().parents[2]
base=root/"artifacts/closure/p31"
m=json.loads((base/"execution-profile-manifest.json").read_text())
c=json.loads((base/"same-input-tier-campaign-plan.json").read_text())
r=json.loads((base/"release-target-control.json").read_text())
checks={
 "profiles_33":m["profileCount"]==33,
 "definitions_frozen_33":m["definitionFrozenCount"]==33,
 "holdout_plans_33":m["holdoutPlanDefinedCount"]==33,
 "campaign_groups_11":len(c["productGroups"])==11,
 "campaign_not_falsely_run":c["state"]=="PLANNED_NOT_RUN",
 "go_internal_target_present":"GO_INTERNAL" in r["targets"],
 "external_open_not_required_internal":all("GO_INTERNAL" not in x["requiredFor"] for x in r["receipts"] if x["class"] in {"EXTERNAL","WORLD_CLASS"}),
}
print(json.dumps(checks,sort_keys=True))
sys.exit(0 if all(checks.values()) else 1)
