import assert from "node:assert/strict";
import { normalizeCustomerProductImageUrl } from "../../lib/products/product-image-boundary.js";

assert.equal(
  normalizeCustomerProductImageUrl("/products/velmere-preview/1.webp"),
  "/products/velmere-preview/1.webp",
);
assert.equal(normalizeCustomerProductImageUrl("/images/lookbook/item-01.jpg"), "/images/lookbook/item-01.jpg");
for (const unsafe of [
  "data:image/svg+xml,<svg onload=alert(1)>",
  "javascript:alert(1)",
  "https://tracking.example/product.png",
  "//tracking.example/product.png",
  "/products/../private.png",
  "/products/%2e%2e/private.png",
  "/products/item.svg",
  "/products/item.png?token=secret",
  "/products/item.png#fragment",
  "/products\\item.png",
]) {
  assert.equal(normalizeCustomerProductImageUrl(unsafe), null, unsafe);
}

console.log("A91 customer product image URL behavior: PASS (12 cases)");
