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
  resetDialogFocusReturnPolicyForTests,
} from "../../lib/ui/dialog-focus-return-policy.ts";

let checks = 0;
const ok = (value, id) => { checks += 1; assert.ok(value, id); };
resetDialogFocusReturnPolicyForTests();
ok(DIALOG_FOCUS_RETURN_OBSERVER_TIMEOUT_MS === 1200, "bounded_observer_timeout");
ok(activeDialogFocusSessionCount() === 0, "initial_zero");
const first = createDialogFocusSessionToken();
const second = createDialogFocusSessionToken();
ok(first !== second, "unique_tokens");
beginDialogFocusSession(first);
ok(activeDialogFocusSessionCount() === 1, "first_active");
endDialogFocusSession(first);
const oldReturnEpoch = captureDialogFocusReturnEpoch();
ok(canRestoreDialogFocus(oldReturnEpoch), "closed_dialog_can_restore_before_reopen");
beginDialogFocusSession(second);
ok(activeDialogFocusSessionCount() === 1, "second_active");
ok(!canRestoreDialogFocus(oldReturnEpoch), "old_restore_invalidated_by_new_dialog");
endDialogFocusSession(second);
const secondReturnEpoch = captureDialogFocusReturnEpoch();
ok(canRestoreDialogFocus(secondReturnEpoch), "last_dialog_can_restore");
beginDialogFocusSession(first);
beginDialogFocusSession(second);
ok(activeDialogFocusSessionCount() === 2, "nested_two");
endDialogFocusSession(first);
const nestedOldEpoch = captureDialogFocusReturnEpoch();
ok(!canRestoreDialogFocus(nestedOldEpoch), "nested_close_cannot_escape_remaining_dialog");
endDialogFocusSession(second);
ok(activeDialogFocusSessionCount() === 0, "nested_cleanup_zero");
ok(!canRestoreDialogFocus(nestedOldEpoch), "stale_nested_epoch_rejected");
const hook = fs.readFileSync("components/ui/useDialogFocusBoundary.ts", "utf8");
ok(hook.includes("cancelPendingReturnFocus();"), "pending_cleanup_called");
ok(hook.includes("window.cancelAnimationFrame(returnFrameRef.current)"), "raf_cancelled");
ok(hook.includes("window.clearTimeout(returnTimeoutRef.current)"), "timeout_cancelled");
ok(hook.includes("returnObserverRef.current?.disconnect()"), "observer_cancelled");
ok(hook.includes("beginDialogFocusSession(sessionTokenRef.current") && hook.includes("endDialogFocusSession(sessionTokenRef.current)"), "session_begins");
ok(hook.includes("endDialogFocusSession(sessionTokenRef.current)"), "session_ends");
ok(hook.includes("isDialogFocusReturnEpochCurrent(returnEpoch)") && hook.includes("canRestoreDialogFocus(returnEpoch, target)"), "restore_guarded");
ok(!hook.includes("window.setTimeout(() => observer.disconnect(), 1200)"), "legacy_untracked_timeout_removed");
ok(hook.includes("DIALOG_FOCUS_RETURN_OBSERVER_TIMEOUT_MS"), "shared_timeout_policy");
ok(hook.includes("returnObserverRef.current = observer"), "observer_tracked");
ok(hook.includes("returnFrameRef.current = window.requestAnimationFrame"), "frame_tracked");
ok(hook.includes("returnTimeoutRef.current = window.setTimeout"), "timeout_tracked");
console.log(JSON.stringify({status:"PASS_A102R33_DIALOG_FOCUS_RETURN_RACE_BOUNDARY_NO_PROMOTION",checksPassed:checks,checksFailed:0,staleRestoreAfterReopen:false,nestedDialogFocusEscape:false,orphanObserverAfterReopen:false},null,2));
