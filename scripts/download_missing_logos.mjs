import fs from "node:fs";
import path from "node:path";

const targetDir = "C:\\Users\\marci\\Desktop\\Nowy folder\\public\\market-logos";

const list = [
  ["sui", "https://coin-images.coingecko.com/coins/images/26375/large/sui-ocean-square.png"],
  ["near", "https://coin-images.coingecko.com/coins/images/10365/large/near.jpg"],
  ["apt", "https://coin-images.coingecko.com/coins/images/26455/large/Aptos-Network-Profile-Picture_%281%29.png"],
  ["hbar", "https://coin-images.coingecko.com/coins/images/3688/large/hbar.png"],
  ["ton", "https://coin-images.coingecko.com/coins/images/17980/large/Gram_Circular_Badge.png"],
  ["shib", "https://coin-images.coingecko.com/coins/images/11939/large/shiba.png"],
  ["pepe", "https://coin-images.coingecko.com/coins/images/29850/large/pepe-token.png"],
  ["tao", "https://coin-images.coingecko.com/coins/images/28452/large/bittensor_logo.png"],
  ["arb", "https://coin-images.coingecko.com/coins/images/16547/large/arbitrum_logo.png"],
  ["tia", "https://coin-images.coingecko.com/coins/images/31967/large/tia.png"],
  ["inj", "https://coin-images.coingecko.com/coins/images/12882/large/Secondary_Symbol.png"],
  ["op", "https://coin-images.coingecko.com/coins/images/25244/large/Optimism.png"],
  ["pol", "https://coin-images.coingecko.com/coins/images/4713/large/polygon.png"],
  ["fdusd", "https://coin-images.coingecko.com/coins/images/31079/large/first_digital_usd.png"],
  ["imx", "https://coin-images.coingecko.com/coins/images/17233/large/imx.png"],
  ["bonk", "https://coin-images.coingecko.com/coins/images/28600/large/bonk.jpg"],
  ["ldo", "https://coin-images.coingecko.com/coins/images/13573/large/Lido_DAO.png"],
  ["wld", "https://coin-images.coingecko.com/coins/images/31062/large/worldcoin.png"],
  ["sei", "https://coin-images.coingecko.com/coins/images/28205/large/Sei_Logo_-_Transparent_Back.png"],
  ["ondo", "https://coin-images.coingecko.com/coins/images/26580/large/ondo.png"],
  ["gala", "https://coin-images.coingecko.com/coins/images/12493/large/GALA-COINGECKO_IMAGE.png"],
  ["floki", "https://coin-images.coingecko.com/coins/images/16746/large/FLOKI.png"],
  ["flow", "https://coin-images.coingecko.com/coins/images/13446/large/5f6294c0c7a8cda55cb1c936_Flow_Wordmark.png"],
  ["ar", "https://coin-images.coingecko.com/coins/images/4343/large/oRt6SiEN_400x400.jpg"],
  ["pyth", "https://coin-images.coingecko.com/coins/images/31924/large/pyth.png"],
  ["ens", "https://coin-images.coingecko.com/coins/images/19785/large/acatxTm8_400x400.jpg"],
  ["iota", "https://coin-images.coingecko.com/coins/images/692/large/IOTA_Swirl.png"],
  ["axs", "https://coin-images.coingecko.com/coins/images/13029/large/axie_infinity_logo.png"],
  ["rune", "https://coin-images.coingecko.com/coins/images/6595/large/thorchain.png"],
  ["pendle", "https://coin-images.coingecko.com/coins/images/15069/large/pendle_logo.png"],
  ["cake", "https://coin-images.coingecko.com/coins/images/12632/large/pancakeswap-cake-logo_%281%29.png"],
  ["xec", "https://coin-images.coingecko.com/coins/images/16646/large/Logo_final-22.png"],
  ["kava", "https://coin-images.coingecko.com/coins/images/9761/large/kava.png"],
  ["cfx", "https://coin-images.coingecko.com/coins/images/13079/large/3.png"],
  ["rpl", "https://coin-images.coingecko.com/coins/images/2090/large/rocket_pool_%28rpl%29.png"],
  ["blur", "https://coin-images.coingecko.com/coins/images/28453/large/blur.png"]
];

async function run() {
  for (const [sym, url] of list) {
    try {
      const filePath = path.join(targetDir, `${sym}.svg`);
      if (fs.existsSync(filePath)) {
        console.log(`Already exists: ${sym}`);
        continue;
      }
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) {
        console.error(`Failed to fetch ${sym}: ${res.status}`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const base64 = buf.toString("base64");
      const mime = url.includes(".jpg") || url.includes(".jpeg") ? "image/jpeg" : "image/png";
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><clipPath id="c"><circle cx="32" cy="32" r="32"/></clipPath><image href="data:${mime};base64,${base64}" width="64" height="64" clip-path="url(#c)"/></svg>`;
      fs.writeFileSync(filePath, svg, "utf8");
      console.log(`Saved ${sym}.svg`);
    } catch (err) {
      console.error(`Error saving ${sym}:`, err);
    }
  }
}

run().catch(console.error);
