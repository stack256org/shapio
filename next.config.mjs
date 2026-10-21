import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // No `output: "standalone"` on purpose: the single Docker image runs
  // `next start` from a full install, and also needs tsx, db/migrations and the
  // worker source on disk (see Dockerfile).
  // The dev tools badge renders inside the embed iframe too (portal.localhost
  // shares this same dev server) and sits on top of the widget's floating
  // panel content — disable it rather than trying to style around it.
  devIndicators: false,
  turbopack: {
    root: resolve(__dirname),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
