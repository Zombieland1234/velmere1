import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const checks = [
  ["components/home/HomePageClient.tsx", 'data-pass718-editorial-density="calm"'],
  ["components/product/ProductCard.tsx", "velmere-product-card-editorial"],
  ["components/shop/ShopPageClient.tsx", 'data-pass718-storefront-density="calm"'],
  ["components/market-integrity/ShieldMapCommandClient.tsx", 'data-pass718-shield-map-journey="calm"'],
  ["app/globals.css", "PASS718–725"],
  ["app/[locale]/market-integrity/shield-map/page.tsx", "Interactive risk map"],
];
for (const [file, token] of checks) {
  const source = read(file);
  if (!source.includes(token)) throw new Error(`${file}: missing ${token}`);
}
const home = read("components/home/HomePageClient.tsx");
if (home.includes("The biggest problem is not technology") || home.includes("Największym problemem nie jest technologia")) {
  throw new Error("Home still exposes internal critique copy");
}
const map = read("components/market-integrity/ShieldMapCommandClient.tsx");
if (map.includes("fps budget")) throw new Error("Shield Map still exposes FPS budget");
console.log("PASS718–725 editorial UI release: PASS");
