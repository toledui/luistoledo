import type { NextConfig } from "next";

function uploadsPattern(value: string) {
  const url = new URL(value);
  url.pathname = "/uploads/**";
  url.search = "";
  return url;
}

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  images: {
    remotePatterns: [uploadsPattern(apiUrl), uploadsPattern(appUrl)],
    qualities: [75, 85, 90, 100],
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
