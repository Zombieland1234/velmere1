# -*- coding: utf-8 -*-
import json, os, sys

receipt_path = "artifacts/customer-campaign/100-ai-customers-execution-receipt.json"
assert os.path.exists(receipt_path), "Receipt not found"

with open(receipt_path, "r", encoding="utf-8") as f:
    data = json.load(f)

scoreboard = data.get("scoreboard", {})
assert scoreboard.get("totalCustomers") == 100
assert scoreboard.get("passed") == 100
assert scoreboard.get("failed") == 0

customers = data.get("customers", [])
assert len(customers) == 100

required_fields = [
    "customer_id", "persona", "role", "experience_level", "goal", "input",
    "product", "tier", "language", "expected_outcome", "actual_outcome",
    "scores", "upgrade_reason", "refund_risk", "unsafe_inference_risk",
    "critical_failure", "notes", "status"
]

for c in customers:
    for rf in required_fields:
        assert rf in c
    assert c["scores"]["final_score"] >= 8.5
    assert c["status"] == "PASS"

print(json.dumps({
    "schemaVersion": "velmere.customer-campaign.100-ai-customers-test.v1",
    "status": "PASS",
    "totalCustomersVerified": len(customers),
    "allRequiredFieldsPresent": True,
    "uniqueProductsCovered": scoreboard.get("uniqueProductsCovered"),
    "languages": scoreboard.get("languages"),
    "tiers": scoreboard.get("tiers"),
    "averageScore": scoreboard.get("averageScore")
}, indent=2))
