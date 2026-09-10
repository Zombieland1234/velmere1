import { describe, it } from "node:test";
import assert from "node:assert/strict";

export { describe, it };

export function expect(actual: any, customMsg?: string) {
  return {
    toBe(expected: any) {
      assert.equal(actual, expected, customMsg);
    },
    toEqual(expected: any) {
      assert.deepEqual(actual, expected, customMsg);
    },
    toBeDefined() {
      assert.notEqual(actual, undefined, customMsg || "Expected value to be defined");
    },
    toBeTruthy() {
      assert.ok(actual, customMsg || "Expected truthy value");
    },
    toBeFalsy() {
      assert.ok(!actual, customMsg || "Expected falsy value");
    },
    toBeGreaterThanOrEqual(expected: number) {
      assert.ok(actual >= expected, customMsg || `Expected ${actual} >= ${expected}`);
    },
    toBeLessThanOrEqual(expected: number) {
      assert.ok(actual <= expected, customMsg || `Expected ${actual} <= ${expected}`);
    },
    toMatch(pattern: RegExp) {
      assert.match(String(actual), pattern, customMsg);
    },
    toContain(item: any) {
      if (Array.isArray(actual) || typeof actual === "string") {
        assert.ok(actual.includes(item), customMsg || `Expected to contain ${item}`);
      } else {
        assert.ok(item in actual, customMsg);
      }
    },
    toHaveLength(len: number) {
      assert.equal(actual?.length, len, customMsg || `Expected length ${len}, got ${actual?.length}`);
    },
  };
}
