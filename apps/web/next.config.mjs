import path from "node:path";
import { fileURLToPath } from "node:url";

/** App package root (where this app's pnpm-lock.yaml lives). */
const appRoot = path.dirname(fileURLToPath(import.meta.url));

const e2eApiProxyTarget = process.env.E2E_API_PROXY_TARGET?.replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: appRoot,
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async rewrites() {
    if (!e2eApiProxyTarget) {
      return [];
    }

    return [
      {
        source: "/backend/:path*",
        destination: `${e2eApiProxyTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;