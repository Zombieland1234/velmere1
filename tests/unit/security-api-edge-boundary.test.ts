import { test } from "node:test";
import assert from "node:assert/strict";
import { hasForbiddenRequestPathCharacter } from "@/lib/security/api-edge-boundary";

test("hasForbiddenRequestPathCharacter: empty path is safe", () => {
  assert.equal(hasForbiddenRequestPathCharacter(""), false);
});

test("hasForbiddenRequestPathCharacter: normal path is safe", () => {
  assert.equal(hasForbiddenRequestPathCharacter("/en/shop"), false);
  assert.equal(hasForbiddenRequestPathCharacter("/api/checkout"), false);
});

test("hasForbiddenRequestPathCharacter: rejects NUL character", () => {
  assert.equal(hasForbiddenRequestPathCharacter("/api/\0admin"), true);
});

test("hasForbiddenRequestPathCharacter: rejects control characters", () => {
  assert.equal(hasForbiddenRequestPathCharacter("/api/test\x01"), true);
  assert.equal(hasForbiddenRequestPathCharacter("/api/test\x1f"), true);
  assert.equal(hasForbiddenRequestPathCharacter("/api/test\x7f"), true);
});

test("hasForbiddenRequestPathCharacter: rejects bidi override", () => {
  // LRE, RLE, PDF
  assert.equal(hasForbiddenRequestPathCharacter("/api/test\u202e"), true);
  assert.equal(hasForbiddenRequestPathCharacter("/api/test\u202a"), true);
  assert.equal(hasForbiddenRequestPathCharacter("/api/test\u202c"), true);
});

test("hasForbiddenRequestPathCharacter: rejects isolate overrides", () => {
  assert.equal(hasForbiddenRequestPathCharacter("/api/test\u2066"), true);
  assert.equal(hasForbiddenRequestPathCharacter("/api/test\u2069"), true);
});

test("hasForbiddenRequestPathCharacter: allows unicode letters", () => {
  // Velmère has è - should be allowed
  assert.equal(hasForbiddenRequestPathCharacter("/en/Velmère"), false);
  assert.equal(hasForbiddenRequestPathCharacter("/pl/Łódź"), false);
});

test("hasForbiddenRequestPathCharacter: allows accents in path", () => {
  assert.equal(hasForbiddenRequestPathCharacter("/en/François"), false);
});

test("hasForbiddenRequestPathCharacter: allows emoji in safe context", () => {
  // Most emoji are above U+FFFF but they are not bidi overrides
  assert.equal(hasForbiddenRequestPathCharacter("/en/🚀"), false);
});
