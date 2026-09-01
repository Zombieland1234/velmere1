#!/usr/bin/env node
import {
  VLM_FIELD_DEFINITIONS,
  buildVlmFieldSourceClassCounts,
} from "../../lib/commerce/vlm-field-level-readiness.ts";
import {
  buildVlmCommercialReadinessMatrix,
} from "../../lib/commerce/vlm-commercial-readiness.ts";
import {
  buildCurrentR44P21CommercialEvidence,
} from "../../lib/commerce/vlm-current-commercial-evidence.ts";

const families=["audit","pdf","browser","shield","shield-map","real-markets","market-impact","whale-watch","angel","risk"];
const evidenceByFamily=Object.fromEntries(families.map((family)=>[family,buildCurrentR44P21CommercialEvidence(family)]));
const rows=buildVlmCommercialReadinessMatrix({locale:"en",evidenceByFamily});
const result={
  schemaVersion:"velmere.pass36.a102r44p21.field-level-commercial-readiness-matrix.v1",
  revisionId:"VELMERE_PASS36_A102R44P21_ACTION_REQUIRED_FIELD_LEVEL_DATA_PROVENANCE_MODULAR_SALE_READINESS_AND_LEGAL_ALTERNATIVE_ROUTING_NO_LIVE_CREDIT",
  globalDecision:"NO_GO",
  basicAlwaysFree:true,
  proAdvancedTargetPaidAfterEvidence:true,
  providerRestrictionDoesNotZeroOwnedFields:true,
  families:families.length,
  tiers:3,
  fieldDefinitions:VLM_FIELD_DEFINITIONS.length,
  sourceClassCounts:buildVlmFieldSourceClassCounts(),
  readyForFreeReleaseReview:rows.filter((row)=>row.readyForFreeReleaseReview).length,
  readyForControlledBetaReview:rows.filter((row)=>row.readyForControlledBetaReview).length,
  readyForPaidSaleReview:rows.filter((row)=>row.readyForPaidSaleReview).length,
  rows,
  truthBoundary:"Field-level readiness preserves Velmère-owned, direct-chain, derived, user-supplied and regulator value while blocking only unavailable required fields. It does not grant provider rights, exact Windows, customer outcomes, staging, LIVE or sale credit.",
};
console.log(JSON.stringify(result,null,2));
