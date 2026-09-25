import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// app 层数据边界的历史存量台账
// ---------------------------------------------------------------------------
// 这份清单是 src/app 下「仍然直接触达数据库」的历史文件，由
// scripts/check-boundaries.mjs --write-app-baseline 生成，清单只能变小。
// 这里读同一份文件，保证 ESLint 与 verify 门禁不会各说各话。
const configDir = path.dirname(fileURLToPath(import.meta.url));
const appBaselinePath = path.join(configDir, "scripts", "boundaries-app-baseline.json");

/** 把台账里的相对路径转成 ESLint 的 files 通配符（转义 [id] 这类动态段）。 */
function appBaselineGlobs() {
  try {
    const parsed = JSON.parse(fs.readFileSync(appBaselinePath, "utf8"));
    if (!Array.isArray(parsed?.files)) return [];
    return parsed.files.map((rel) => `src/${rel.replace(/[[\]{}()!+@*?]/g, (char) => `\\${char}`)}`);
  } catch (error) {
    // 读不到台账时返回空数组：宁可让 ESLint 只保留「新增越界即报错」这半条防线，
    // 也不要静默放行整个 src/app。
    console.warn(`[eslint] 无法读取 app 数据边界台账（${appBaselinePath}）：${error.message}`);
    return [];
  }
}

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    ".next-vault/**",
    // Archived skill bundles are data shipped for discovery, not application
    // source; linting their generated examples produces thousands of noise
    // errors and masks real ANS diagnostics.
    "ai-video-skills-source/**",
    "plugins/claude/**",
    "next-env.d.ts",
    // Compiled outputs
    "packages/*/dist/**",
    // Packages with their own ESLint config
    "packages/raycast-extension/**",
    // Scripts - may use CommonJS
    "scripts/**",
    // Prisma scripts
    "prisma/**",
  ]),
  // Downgrade strict rules to warnings for gradual adoption
  {
    rules: {
      // React hooks compiler rules - many false positives in complex state patterns
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      // JSX entity escaping - affects many existing components
      "react/no-unescaped-entities": "warn",
      // Function type - affects test mocks
      "@typescript-eslint/no-unsafe-function-type": "warn",
      // Display name - affects anonymous components
      "react/display-name": "warn",
      // HTML links - sometimes needed for external/special navigation
      "@next/next/no-html-link-for-pages": "warn",
      // Children as props - used in some component patterns
      "react/no-children-prop": "warn",
    },
  },
  // ---------------------------------------------------------------------------
  // 分层边界（import boundary）
  // ---------------------------------------------------------------------------
  // 这些规则与 scripts/check-boundaries.mjs 是同一套约束的两道防线：
  //   - ESLint 在编辑器里即时提示「直接的」越界 import；
  //   - check-boundaries.mjs 在 npm run verify 里做「传递闭包」检查
  //     （能发现 A → B → @/lib/db 这种间接越界，ESLint 看不到）。
  // 两侧都必要：只有脚本则编辑器无提示，只有 ESLint 则间接越界会漏。
  //
  // src/app 的数据边界分两步：
  //   1) 对整个 src/app 打开 no-restricted-imports，禁止直接 import @/lib/db；
  //   2) 紧随其后的一个 block 把台账内的历史文件关掉，允许渐进迁移。
  // 于是「新增越界」在编辑器里就会红，而历史存量不会被一次性引爆。
  // 台账由 scripts/check-boundaries.mjs --write-app-baseline 生成，只能变小；
  // 传递闭包（A → B → @/lib/db）仍由 verify 里的脚本负责。
  {
    files: ["src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: ["@/lib/db", "@/lib/db/*"],
            message: "app 层不得直接访问数据库。请在 @/server 下新增服务函数，由页面/路由调用。",
          },
        ],
      }],
    },
  },
  {
    // 历史存量：这些文件已在 scripts/boundaries-app-baseline.json 里登记，
    // 允许暂时直接访问 @/lib/db；改干净后重跑 --write-app-baseline 即可收紧。
    files: appBaselineGlobs(),
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: ["@/lib/db", "@/lib/db/*"],
            message: "组件层不得直接访问数据库。请通过 @/server 下的服务取数，类型走 @/contracts。",
          },
          {
            group: ["@/lib/auth", "@/lib/auth/*"],
            message: "组件层不得直接读取会话。请在服务端组件里调用 @/lib/auth，或改走 @/server 服务。",
          },
          {
            group: ["@/lib/run-service", "@/lib/run-service/*", "@/lib/template-service", "@/lib/template-service/*"],
            message: "组件层不得直接调用写库服务。请改走 @/server 下的服务。",
          },
          {
            group: ["@/lib/audit", "@/lib/audit/*", "@/lib/registration", "@/lib/registration/*", "@/lib/password-reset", "@/lib/password-reset/*", "@/lib/invite-admin", "@/lib/invite-admin/*"],
            message: "组件层不得直接引用服务端专属模块。请改走 @/server 下的服务。",
          },
          {
            group: ["@/lib/community", "@/lib/community/*", "@/lib/webhook", "@/lib/webhook/*"],
            message: "该模块会拉起数据库依赖，组件层只应引用 @/contracts 中的类型定义。",
          },
          {
            group: ["@prisma/client", "@prisma/client/*"],
            message: "组件层不得引用 Prisma。需要 JSON 值类型请用 @/contracts/webhook 的 JsonValue。",
          },
        ],
      }],
    },
  },
  {
    files: ["src/contracts/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: ["@/server/*", "@/lib/*", "@/domain/*", "@prisma/*"],
            message: "contracts 层必须保持纯净：只允许 zod 与同层相对导入。",
          },
        ],
      }],
    },
  },
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: ["@/server/*", "@/lib/*", "@/components/*", "@/app/*", "@prisma/*"],
            message: "domain 层只允许 @/contracts 与同层相对导入。",
          },
        ],
      }],
    },
  },
  {
    files: ["src/server/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: ["@/components/*", "@/app/*"],
            message: "server 层不得反向依赖 UI（components / app）。",
          },
        ],
      }],
    },
  },
]);

export default eslintConfig;
