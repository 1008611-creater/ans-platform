/**
 * 清理 Next.js 自动生成的类型目录。
 *
 * `next typegen` / `next build` 会把路由类型写进 `.next/types` 和
 * `.next/dev/types`，但删除某个路由后旧文件不会被自动移除，残留的
 * `route.ts` 会引用已删除的源码，导致 `npm run typecheck` 报出
 * 「Cannot find module .../route.js」这类假错误。
 *
 * 这里在类型检查前先删掉这两个目录，再让 `next typegen` 重新生成，
 * 保证类型检查结果只反映当前源码。
 */
import { rmSync } from "node:fs";
import path from "node:path";

const targets = [".next/types", ".next/dev/types"].map((relative) =>
  path.join(process.cwd(), relative),
);

for (const target of targets) {
  rmSync(target, { recursive: true, force: true });
}

console.log(`[clean-next-types] removed ${targets.length} generated type directories`);
