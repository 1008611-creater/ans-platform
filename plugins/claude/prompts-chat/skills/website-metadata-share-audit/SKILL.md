---
name: website-metadata-share-audit
description: name: website-metadata-share-audit
---

---
name: website-metadata-share-audit
description: 对网站公开页面发布、链接分享预览、SEO 元数据、canonical、robots/noindex、Open Graph、Twitter Card、图标、manifest 或 JSON-LD 做证据驱动的只读验收。仅在准备发布或分享真实页面、排查搜索收录/分享卡片、审查公开与私有页面索引边界时使用；不要为普通前端开发、纯视觉修改或尚无发布意图的页面自动触发。
---

# 网站元数据与分享验收

把本 Skill 作为项目网站主 Skill 的窄辅助能力。默认只读；项目 `AGENTS.md`、设计规范、路由契约和 Harness 权限门始终优先。

## 输入门

先确认：

1. 项目根目录、框架和现有元数据实现方式。
2. 目标页面是公开、私有、重复、预览还是暂存页面。
3. 目标是源码审查还是已获授权的真实 URL 运行时验收。
4. 真实公开 URL、预期 canonical 和分享身份；缺失时标记为待验证，不得猜测。

没有真实 URL 时仍可审查源码，但最高只能报告结构事实或待验证风险。localhost、本地预览、源码配置和构建产物都不能证明公开分享卡片正确。

## 审查顺序

1. 读取项目规则和现有元数据入口，只读取目标页面及其继承链。
2. 确认是否存在相互竞争或重复的 title、description、canonical、robots 等实现。
3. 对照页面意图检查：
   - 公开且可分享：title、description、canonical、Open Graph、分享图和必要的 Twitter Card；
   - 私有、账户、账本、后台、预览或暂存：访问控制与 `noindex` 意图是否一致；
   - 多语言、分页或动态路由：alternate/canonical 是否指向实际存在的页面。
4. 检查 canonical、`og:url`、绝对图片 URL、`html lang`、favicon/manifest 等是否与真实站点身份一致。
5. 仅在页面真实内容支持时检查 JSON-LD；不得虚构公司、评分、评论、价格、库存或人物信息。
6. 如有真实 URL 且已授权只读访问，回读最终 HTML/head、重定向与 robots；分享平台缓存或抓取器结果必须单独标明来源和时间。

遵循项目既有框架模式，例如 Next.js Metadata API；不得为了元数据审查迁移框架、SEO 库或组件系统。

## 证据与结论

每轮最多保留 3 个最高价值发现。每个发现必须包含：

- 页面与文件行号或真实 URL 回读位置；
- 已确认事实；
- 风险影响；
- 本地现有主 Skill 是否已覆盖；
- 最小修复建议；
- 证据等级：`structural`（源码）、`integrated`（构建或真实运行时回读）、`real_delivery`（公开环境且用户确认）。

无法证明时写“待运行时验证”；没有支持性证据时写“未发现支持性问题”。不要把个人审美、搜索排名预测或分享平台缓存猜测写成事实。

## 权限边界

本 Skill 不授权：

- 修改生产源码、元数据、文案、图片或设计规范；
- 运行部署、发布、登录、Provider、数据库迁移或外部发送；
- 访问认证文件、Token、Cookie、私钥或 `.env`；
- 把私有页面改成公开页面，或仅因规则清单而添加 JSON-LD；
- 绕过 Harness、项目验收门或 `post-coding-review`。

用户明确要求修复时，先交回项目网站主 Skill，由其在允许路径和权限内实施；本 Skill 继续作为验收辅助，不自行宣布上线或真实交付。

## 输出格式

按以下顺序简洁返回：

1. 结论与最高证据等级；
2. 最多 3 个证据化发现；
3. 已确认事实与待运行时验证；
4. 当前未执行的受保护动作；
5. 一个最小下一步。
