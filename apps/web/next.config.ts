import type { NextConfig } from "next";

const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:4000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  transpilePackages: ["@workspace/contracts", "@workspace/domain", "@workspace/http", "@workspace/ui"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/api/:path*`
      }
    ];
  }
};

export default nextConfig;
