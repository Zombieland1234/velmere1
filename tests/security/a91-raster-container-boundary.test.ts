import assert from "node:assert/strict";
import {
  detectSafeRasterImageSignature,
  validateProxiedRasterImage,
} from "../../lib/security/file-content-signatures.js";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
assert.equal(detectSafeRasterImageSignature(png)?.kind, "png");
assert.equal(validateProxiedRasterImage(png, "image/png")?.kind, "png");
assert.equal(validateProxiedRasterImage(png, "image/jpeg"), null);
assert.equal(validateProxiedRasterImage(png.subarray(0, png.length - 8), "image/png"), null);
assert.equal(
  validateProxiedRasterImage(Buffer.concat([png, Buffer.from("<html>polyglot</html>")]), "image/png"),
  null,
);

const crcTampered = Buffer.from(png);
crcTampered[29] ^= 0x01;
assert.equal(validateProxiedRasterImage(crcTampered, "image/png"), null);

const gif = Buffer.from("GIF89a\u0001\u0000\u0001\u0000", "binary");
assert.equal(detectSafeRasterImageSignature(gif)?.kind, "gif");
assert.equal(validateProxiedRasterImage(gif, "image/gif"), null);

console.log("A91 raster container behavior: PASS (7 cases)");
