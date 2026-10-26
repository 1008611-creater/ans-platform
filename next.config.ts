import type { NextConfig } from "next";
import { publicRendererCacheHeaders } from "./src/lib/public-asset-cache";
import path from "node:path";
import { fileURLToPath } from "node:url";
import createNextIntlPlugin from "next-intl/plugin";

// 仓库上层还有一个 package-lock.json，Next 会据此误判 workspace root 并打印警告。
// 显式钉住本目录，既消除警告，也保证 Docker 里 `.next/standalone` 的依赖追踪范围正确。
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Local acceptance builds must not overwrite the candidate serving OIDC checks.
  distDir: [".next-agri-tasks", ".next-agri-submissions", ".next-agri-reviews", ".next-agri-references", ".next-agri-demo", ".next-agri-summary", ".next-agri-p2", ".next-compute-history", ".next-compute-history-build"].includes(process.env.ANS_LOCAL_DIST_DIR ?? "")
    ? process.env.ANS_LOCAL_DIST_DIR : ".next",
  reactCompiler: true,
  // Production builds check every application source. The full test/config
  // types remain a separate required gate in scripts/verify.mjs.
  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: "tsconfig.typecheck.json",
  },
  // Configure webpack for raw imports
  webpack: (config) => {
    if (process.env.ANS_BUILD_DISABLE_CACHE === "1") config.cache = false;
    config.module.rules.push({
      resourceQuery: /raw/,
      type: 'asset/source',
    });
    return config;
  },
  // Enable standalone output for Docker（Dockerfile 依赖 .next/standalone）
  output: "standalone",
  outputFileTracingRoot: projectRoot,
  outputFileTracingIncludes: {
    "/vibe-hub/**/*": ["./src/data/vibehub/**/*"],
    "/vibe-hub": ["./src/data/vibehub/**/*"],
    "/api/vibe-hub/**/*": ["./src/data/vibehub/**/*"],
    "/api/visual-websites/publication": ["./public/mascot/3d/vendor/**/*", "./public/visual-portfolio/scene.mjs", "./public/visual-portfolio/reference/banner.glb", "./public/visual-portfolio/stickers/presets/**/*.webp", "./public/visual-portfolio/stickers/fluent/*.png"],
  },
  // Experimental features
  experimental: {
    // Release Webpack compilation memory when its worker exits.
    webpackBuildWorker: true,
    // Enable server actions
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Baseline security headers for all application responses.
  async headers() {
    return [
      ...publicRendererCacheHeaders(),
      // Public renderer assets are readable by the sandboxed, opaque-origin preview.
      ...["/visual-portfolio/:path*", "/mascot/3d/vendor/:path*"].map(source => ({source, headers: [{key: "Access-Control-Allow-Origin", value: "*"}]})),
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  // Redirects
  async redirects() {
    return [
      { source: "/favicon.ico", destination: "/favicon/favicon.ico", permanent: false },
      {
        source: "/vibe",
        destination: "/categories/vibe",
        permanent: true,
      },
      {
        source: "/sponsors",
        destination: "/categories/sponsors",
        permanent: true,
      },
      {
        source: "/embed-preview",
        destination: "/embed",
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
