import path from "node:path";
import { fileURLToPath } from "node:url";

/** App package root (where this app's pnpm-lock.yaml lives). */
const appRoot = path.dirname(fileURLToPath(import.meta.url));

const isVercel = process.env.VERCEL === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone is for Docker (Dockerfile.prod). Vercel uses its own output layout.
  ...(!isVercel ? { output: "standalone" } : {}),
  // Dev-only: avoids multi-lockfile warning when a repo-root lockfile exists.
  ...(process.env.NODE_ENV === "development"
    ? { turbopack: { root: appRoot } }
    : {}),
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // /backend/* is proxied by app/backend/[...path]/route.ts (injects auth).
  // Do not add next.config rewrites here — they bypass the route handler and
  // redirect cross-origin, which strips Authorization on trailing-slash paths.
};

export default nextConfig;