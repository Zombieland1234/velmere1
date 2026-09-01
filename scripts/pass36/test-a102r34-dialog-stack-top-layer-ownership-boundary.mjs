#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  DIALOG_FOCUS_RETURN_OBSERVER_TIMEOUT_MS,
  activeDialogFocusSessionCount,
  beginDialogFocusSession,
  canRestoreDialogFocus,
  captureDialogFocusReturnEpoch,
  createDialogFocusSessionToken,
  endDialogFocusSession,
  isDialogFocusReturnEpochCurrent,
  isTopDialogFocusSession,
  resetDialogFocusReturnPolicyForTests,
} from "../../lib/ui/dialog-focus-return-policy.ts";

let checks = 0;
const ok = (value, id) => { checks += 1; assert.ok(value, id); };
const makeRoot = (...owned) => ({ contains: (target) => owned.includes(target) });

resetDialogFocusReturnPolicyForTests();
ok(DIALOG_FOCUS_RETURN_OBSERVER_TIMEOUT_MS === 1200, "observer_timeout_retained");
ok(activeDialogFocusSessionCount() === 0, "initial_stack_empty");

const lower = createDialogFocusSessionToken();
const upper = createDialogFocusSessionToken();
const lowerTarget = { parentNode: null };
const upperTarget = { parentNode: null };
const outsideTarget = { parentNode: null };
const lowerRoot = makeRoot(lowerTarget);
const upperRoot = makeRoot(upperTarget);

beginDialogFocusSession(lower, lowerRoot);
ok(isTopDialogFocusSession(lower), "single_dialog_is_top");
beginDialogFocusSession(upper, upperRoot);
ok(activeDialogFocusSessionCount() === 2, "nested_stack_two");
ok(!isTopDialogFocusSession(lower), "lower_dialog_not_top");
ok(isTopDialogFocusSession(upper), "upper_dialog_is_top");

beginDialogFocusSession(lower, lowerRoot);
ok(activeDialogFocusSessionCount() === 2, "rebegin_does_not_duplicate");
ok(isTopDialogFocusSession(lower), "rebegin_moves_dialog_to_top");
beginDialogFocusSession(upper, upperRoot);
ok(isTopDialogFocusSession(upper), "upper_restored_to_top");

endDialogFocusSession(upper);
const nestedReturnEpoch = captureDialogFocusReturnEpoch();
ok(isDialogFocusReturnEpochCurrent(nestedReturnEpoch), "nested_return_epoch_current");
ok(isTopDialogFocusSession(lower), "lower_becomes_top_after_upper_close");
ok(canRestoreDialogFocus(nestedReturnEpoch, lowerTarget), "nested_return_inside_lower_allowed");
ok(!canRestoreDialogFocus(nestedReturnEpoch, outsideTarget), "nested_return_outside_lower_blocked");

const staleEpoch = nestedReturnEpoch;
beginDialogFocusSession(upper, upperRoot);
ok(!isDialogFocusReturnEpochCurrent(staleEpoch), "new_dialog_invalidates_old_epoch");
ok(!canRestoreDialogFocus(staleEpoch, lowerTarget), "stale_nested_restore_rejected");
endDialogFocusSession(upper);
endDialogFocusSession(lower);
const finalEpoch = captureDialogFocusReturnEpoch();
ok(activeDialogFocusSessionCount() === 0, "stack_empty_after_close");
ok(canRestoreDialogFocus(finalEpoch, outsideTarget), "final_close_may_restore_external_opener");
const unchanged = endDialogFocusSession(lower);
ok(unchanged === finalEpoch, "duplicate_end_does_not_mutate_epoch");

const hook = fs.readFileSync("components/ui/useDialogFocusBoundary.ts", "utf8");
ok(hook.includes("beginDialogFocusSession(sessionTokenRef.current, root)"), "root_registered_with_stack");
ok(hook.includes("if (!isTopDialogFocusSession(sessionTokenRef.current)) return;"), "top_layer_guard_present");
ok((hook.match(/isTopDialogFocusSession\(sessionTokenRef\.current\)/g) ?? []).length >= 3, "focus_escape_pointer_all_top_guarded");
ok(hook.includes("canRestoreDialogFocus(returnEpoch, target)"), "nested_target_restore_guarded");
ok(hook.includes("isDialogFocusReturnEpochCurrent(returnEpoch)"), "return_epoch_guard_retained");
ok(!hook.includes("canRestoreDialogFocus(returnEpoch))"), "legacy_zero_active_only_guard_removed");

console.log(JSON.stringify({
  status: "PASS_A102R34_DIALOG_STACK_TOP_LAYER_OWNERSHIP_NO_PROMOTION",
  checksPassed: checks,
  checksFailed: 0,
  escapeHandledByTopOnly: true,
  tabTrapHandledByTopOnly: true,
  outsidePointerHandledByTopOnly: true,
  nestedReturnToUnderlyingDialogAllowed: true,
  staleReturnAfterNewDialogBlocked: true,
}, null, 2));
