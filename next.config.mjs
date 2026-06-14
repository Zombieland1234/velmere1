import createNextIntlPlugin from "next-intl/plugin";
import { buildSecurityHeaders } from "./lib/security/http-security.mjs";

const withNextIntl = createNextIntlPlugin("./i18n.ts");
const isDev = process.env.NODE_ENV !== "production";

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {},
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "coin-images.coingecko.com" },
      { protocol: "https", hostname: "assets.coingecko.com" },
      { protocol: "https", hostname: "dd.dexscreener.com" },
      { protocol: "https", hostname: "s2.coinmarketcap.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "tokens.1inch.io" },
    ],
    qualities: [75, 85, 90, 100],
    unoptimized: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: buildSecurityHeaders({ isDev }) }];
  },
};

export default withNextIntl(nextConfig);
