import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import createNextIntlPlugin from "next-intl/plugin";
import createMDX from "@next/mdx";

// 仓库上层还有一个 package-lock.json，Next 会据此误判 workspace root 并打印警告。
// 显式钉住本目录，既消除警告，也保证 Docker 里 `.next/standalone` 的依赖追踪范围正确。
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const withMDX = createMDX({
  extension: /\.mdx?$/,
});

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  reactCompiler: true,
  // Configure webpack for raw imports
  webpack: (config) => {
    config.module.rules.push({
      resourceQuery: /raw/,
      type: 'asset/source',
    });
    return config;
  },
  // Enable standalone output for Docker（Dockerfile 依赖 .next/standalone）
  output: "standalone",
  outputFileTracingRoot: projectRoot,
  // Experimental features
  experimental: {
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
      // 原先把 /book-pdf/* 重定向到上游 GitHub raw（为省 Vercel 带宽）。
      // ANS 自托管：public/book-pdf/ 已随镜像一起打包，直接本地提供，
      // 不再依赖上游仓库（上游仓库若改名/删文件，下载会直接 404）。
    ];
  },
};

export default withMDX(withNextIntl(nextConfig));
