'use strict';

function parseBoundedInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function createDeploymentLifecycle(options = {}) {
  const now = typeof options.now === 'function' ? options.now : Date.now;
  const setTimer = typeof options.setTimer === 'function' ? options.setTimer : setTimeout;
  const clearTimer = typeof options.clearTimer === 'function' ? options.clearTimer : clearTimeout;
  const drainTimeoutMs = parseBoundedInteger(options.drainTimeoutMs, 15_000, 250, 120_000);
  let state = 'starting';
  let inFlight = 0;
  let drainStartedAt = null;
  let drainDeadlineAt = null;
  let drainTimer = null;
  let drainResolve = null;
  let drainPromise = null;

  const settleDrain = (reason) => {
    if (!drainResolve) return;
    if (drainTimer) clearTimer(drainTimer);
    drainTimer = null;
    const resolve = drainResolve;
    drainResolve = null;
    state = 'stopping';
    resolve({ reason, inFlight, drainStartedAt, drainDeadlineAt });
  };

  const maybeSettle = () => {
    if (state === 'draining' && inFlight === 0) settleDrain('in_flight_complete');
  };

  return {
    markReady() {
      if (state !== 'starting') return false;
      state = 'ready';
      return true;
    },
    beginRequest() {
      if (state !== 'ready') return null;
      inFlight += 1;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        inFlight = Math.max(0, inFlight - 1);
        maybeSettle();
      };
    },
    beginDrain() {
      if (drainPromise) return drainPromise;
      if (state === 'stopping' || state === 'stopped') {
        return Promise.resolve({ reason: 'already_stopping', inFlight, drainStartedAt, drainDeadlineAt });
      }
      state = 'draining';
      drainStartedAt = now();
      drainDeadlineAt = drainStartedAt + drainTimeoutMs;
      drainPromise = new Promise((resolve) => {
        drainResolve = resolve;
        drainTimer = setTimer(() => settleDrain('deadline_reached'), drainTimeoutMs);
        if (drainTimer && typeof drainTimer.unref === 'function') drainTimer.unref();
        maybeSettle();
      });
      return drainPromise;
    },
    markStopped() {
      if (drainTimer) clearTimer(drainTimer);
      drainTimer = null;
      state = 'stopped';
    },
    isReady(runtimeReady) {
      return state === 'ready' && runtimeReady === true;
    },
    acceptsTraffic() {
      return state === 'ready';
    },
    snapshot(runtimeReady) {
      return {
        state,
        ready: state === 'ready' && runtimeReady === true,
        acceptingTraffic: state === 'ready',
        inFlight,
        drainStartedAt: drainStartedAt ? new Date(drainStartedAt).toISOString() : null,
        drainDeadlineAt: drainDeadlineAt ? new Date(drainDeadlineAt).toISOString() : null,
        drainTimeoutMs,
      };
    },
  };
}

module.exports = { createDeploymentLifecycle, parseBoundedInteger };
