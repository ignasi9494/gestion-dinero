import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Serwist uses webpack plugin, so we need webpack mode for builds
  // Add empty turbopack config to suppress warnings in dev
  turbopack: {},
};

export default withSerwist(nextConfig);
