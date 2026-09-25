# ANS 发布清单

- [ ] 生产数据库备份并完成恢复抽查
- [x] Prisma migration 预演通过（演练库 deploy 成功且 `migrate diff` 无漂移）
- [x] `npm run verify` 通过（10 步：typecheck → 测试类型 → lint → 文档检查 → 77 个测试文件 /
      1195 个用例 → 依赖扫描 → build → 浏览器冒烟 → 可访问性审计 → 性能预算）
- [x] 依赖安全扫描通过（`npm run audit:security`：生产依赖与开发依赖均 0 漏洞）
- [x] 浏览器自动冒烟通过（`npm run smoke`，11 项页面检查：公开页面 + 登录 + 收藏 + 运行记录 + 账户设置）
- [x] 可访问性审计通过（`npm run a11y`，11 个页面 `critical` / `serious` 违规为 0）
- [x] 性能预算达标（`npm run perf`，读取 p95 ≤ 500ms、写入 p95 ≤ 800ms、LCP ≤ 2500ms）
- [ ] 生产环境变量完整且无明文凭证进入日志
- [ ] `/api/health` 正常
- [ ] 注册（Turnstile）、搜索、创建、审核与工作流真实运行在发布窗口人工验证
- [ ] 错误路径和额度不足路径通过
- [ ] 新镜像摘要已记录
- [ ] 旧镜像可回滚
- [ ] 发布后观察错误率、运行成功率和复用率

## 前置说明

- 迁移预演证据见 [验收标准](./acceptance.md)。
- 冒烟需要专用库（库名含 `smoke`/`test`/`verify` 等关键字）与可用浏览器；
  缺少前置条件时 `npm run smoke` 会跳过，发布窗口请用 `SMOKE_MODE=require` 强制执行。
- 发布前必须确认 `MODEL_CREDENTIAL_SECRET` 已配置，否则用户自带 Key 无法保存。
- 若配置 `WORKFLOW_REVIEW_*`（或回退 `TEMPLATE_REVIEW_*`），工作流提交会自动跑 AI 初审；
  未配置时降级为纯人工把关，降级原因会写入初审结论。
- 依赖漏洞已清零，升级记录见 [验收标准](./acceptance.md) 的「依赖安全扫描」；
  发布窗口请用 `AUDIT_MODE=require` 执行 `npm run verify`，禁止静默跳过扫描。
- 发布窗口建议同时设 `SMOKE_MODE=require`、`A11Y_MODE=require`、`PERF_MODE=require`，
  让冒烟、可访问性与性能预算在缺少前置条件时报错而不是静默跳过。
- 性能预算是本机单进程 `next start` 上的回归基线，不等于生产 SLA；生产实测需另做压测。
