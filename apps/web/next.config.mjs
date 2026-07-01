import path from "node:path";
import { fileURLToPath } from "node:url";

/** App package root (where this app's pnpm-lock.yaml lives). */
const appRoot = path.dirname(fileURLToPath(import.meta.url));

const apiProxyTarget =
  process.env.API_PROXY_TARGET?.replace(/\/$/, "") ||
  process.env.E2E_API_PROXY_TARGET?.replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Must match turbopack.root (Next.js warns when they differ).
  outputFileTracingRoot: appRoot,
  turbopack: {
    root: appRoot,
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async rewrites() {
    if (!apiProxyTarget) {
      return [];
    }

    return [
      {
        source: "/backend/:path*",
        destination: `${apiProxyTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;