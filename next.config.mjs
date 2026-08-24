import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a self-contained server (.next/standalone) for lean production/Docker
  // images. See Dockerfile — the runner stage copies .next/standalone, plus
  // .next/static and public/ alongside it.
  output: "standalone",
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
