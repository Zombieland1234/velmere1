# Provider-rights evidence intake

PASS22 prepares a fail-closed evidence format. It does not claim any external license.

A reviewed record must bind the provider ID, document SHA-256, document kind, effective/expiry dates, jurisdiction, reviewer hash, decision and exact rights. Raw contracts/terms are intentionally not embedded in the clean source ZIP. The external evidence vault must retain the document whose SHA-256 is referenced.

`APPROVED` is not sufficient by itself: expired evidence, an unknown provider, a missing document hash, a non-legal review where legal approval is required, or rights wider than the reviewed record all remain blocked.
