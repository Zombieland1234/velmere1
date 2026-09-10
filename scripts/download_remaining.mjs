import fs from "node:fs";
import path from "node:path";

const targetDir = "C:\\Users\\marci\\Desktop\\Nowy folder\\public\\market-logos";

const urls = {
  pepe: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6982508145454Ce325dDbE47a25d4ec3d2311933/logo.png",
  arb: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png",
  tia: "https://raw.githubusercontent.com/cosmos/chain-registry/master/celestia/images/celestia.png",
  fdusd: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409/logo.png",
  wld: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x163f8C2467924be0ae7B5347228CABF260318753/logo.png",
  sei: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/sei/info/logo.png",
  ondo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3/logo.png",
  gala: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xd1d2Eb1B1e90B638588728b4130137D262C87cae/logo.png",
  pendle: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x808507121B80c02388fAd14726482e061B8da827/logo.png",
  render: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24/logo.png",
  rpl: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/generic.svg",
  cfx: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/generic.svg",
  tao: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/generic.svg"
};

async function run() {
  for (const [sym, url] of Object.entries(urls)) {
    try {
      const filePath = path.join(targetDir, `${sym}.svg`);
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`Failed ${sym}: ${res.status}`);
        continue;
      }
      if (url.endsWith('.svg')) {
        const svg = await res.text();
        fs.writeFileSync(filePath, svg, "utf8");
        console.log(`Saved svg ${sym}`);
      } else {
        const buf = Buffer.from(await res.arrayBuffer());
        const base64 = buf.toString("base64");
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><clipPath id="c"><circle cx="32" cy="32" r="32"/></clipPath><image href="data:image/png;base64,${base64}" width="64" height="64" clip-path="url(#c)"/></svg>`;
        fs.writeFileSync(filePath, svg, "utf8");
        console.log(`Saved png->svg ${sym}`);
      }
    } catch (err) {
      console.error(`Error saving ${sym}:`, err);
    }
  }
}

run();
