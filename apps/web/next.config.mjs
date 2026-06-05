import path from "node:path";
import { fileURLToPath } from "node:url";

/** App package root (where this app's pnpm-lock.yaml lives). */
const appRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: appRoot,
  },
};

export default nextConfig;