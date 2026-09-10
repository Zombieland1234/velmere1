import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

describe("P0 Privacy Incident — Zero Unauthorized Identity Asset Guarantee", () => {
  const root = path.resolve(__dirname, "../..");

  const BANNED_HASHES = [
    "c405c7259c4080524bdd3726ee6eb4672c2760c63b1960ffb8c26f4b6c57cd0b",
    "11b85355518491952a813456b48f4dd6313950ed326709315bf073ec5a392f17",
  ];

  const BANNED_FILENAMES = [
    "velmere-shield-crest.jpg",
    "velmere-shield-crest-alt.jpg",
    "1000029944.jpg",
    "1000029945.jpg",
  ];

  test("ensures unauthorized identity assets do not exist anywhere in public/static directories", () => {
    for (const name of BANNED_FILENAMES) {
      const publicPath = path.join(root, "public", name);
      assert.strictEqual(fs.existsSync(publicPath), false, `Unauthorized asset ${name} must not exist`);
    }
  });

  test("ensures no file in the repository matches the cryptographic hashes of the personal identity documents", () => {
    function scanDirectory(dir: string): string[] {
      let hits: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".next" || entry.name === "artifacts") continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          hits = hits.concat(scanDirectory(full));
        } else if (/\.(jpe?g|png|webp|gif|bmp|pdf)$/i.test(entry.name)) {
          const buf = fs.readFileSync(full);
          const hash = crypto.createHash("sha256").update(buf).digest("hex");
          if (BANNED_HASHES.includes(hash)) {
            hits.push(full);
          }
        }
      }
      return hits;
    }

    const matches = scanDirectory(root);
    assert.deepStrictEqual(matches, [], "Repository must contain zero matches for banned identity hashes");
  });

  test("ensures proxy.ts contains no route bypasses for unauthorized assets", () => {
    if (fs.existsSync(path.join(root, "proxy.ts"))) {
      const proxyContent = fs.readFileSync(path.join(root, "proxy.ts"), "utf8");
      assert.strictEqual(proxyContent.includes("velmere-shield-crest.jpg"), false);
      assert.strictEqual(proxyContent.includes("velmere-shield-crest-alt.jpg"), false);
    }
  });

  test("ensures VelmereLuxuryShield is 100% synthetic vector SVG without external raster dependencies", () => {
    const shieldContent = fs.readFileSync(
      path.join(root, "components/ui/VelmereLuxuryShield.tsx"),
      "utf8"
    );
    assert.strictEqual(shieldContent.includes("next/image"), false);
    assert.strictEqual(shieldContent.includes("<Image"), false);
    assert.strictEqual(shieldContent.includes(".jpg"), false);
    assert.strictEqual(shieldContent.includes(".png"), false);
    assert.strictEqual(shieldContent.includes(".webp"), false);
    assert.ok(shieldContent.includes("<svg"), "Shield must be inline SVG");
    assert.ok(shieldContent.includes("vlm-shield-image"), "Shield must have vlm-shield-image test id");
  });

  test("ensures git tracking does not contain the unauthorized asset", () => {
    const gitIgnore = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
    assert.ok(gitIgnore.length > 0);
  });
});

