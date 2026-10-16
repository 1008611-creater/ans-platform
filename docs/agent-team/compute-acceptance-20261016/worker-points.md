# 积分验收修复实施回执（2026-10-16）

基线 `9ceb01645020a1d172adb958476285f192135bb1`；实现范围 REQ-002/REQ-005、AC-002/AC-005。仅本地工作树修改，未提交、推送、创建 PR、发布、迁移、读取密钥、付费调用或生产写入。限定十个源码/测试文件已冻结；独立审查应绑定下列文件摘要。无 schema、依赖或认证流程变更。

## 实现

- POINTS-001：三个 HTTP 旧 AI 入口沿用 `blockUnmeteredConsumerAI`，先保留各自 session/API key 鉴权，再在解析业务正文、读取功能配置、调用 provider/embedding 之前拒绝统一积分安装。返回 HTTP 503、`POINTS_INTEGRATION_REQUIRED` 和 `private, no-store`；未启用统一积分的安装保留旧行为。
- MCP `improve_prompt` 保留协议解析和工具鉴权，在动态 import/provider helper 之前返回 `isError=true` 的结构化同名错误。正常项目工作流工具不受影响。
- POINTS-002：增加只读 `visual-reservations.ts`，从真实 `visual_model_jobs` 与 `visual_four_view_jobs` 原始 `costPoints` 汇总，而非当前价。两个表独立绑定 owner；只计 QUEUED/RUNNING/NEEDS_REVIEW、正数、未退款，四视图另须 charged=true。未扣款 UPLOADING、退款和终态不算资金预占；NEEDS_REVIEW 不能因无回执自动当免费。查询不碰 run/API/compute 表，不产生重复汇总。
- 积分页 `pendingCount` 明确定义为正数仍持有的资金预占记录数：computeTask/api 增加 authorizedPoints>0，market 增加 amount>0。免费 TTS 留在独立 `voiceUsage`，不标为资金被占。余额原值不变；只读 RepeatableRead/maxWait=10000/timeout=30000 保持。

## 验证

- `node node_modules/vitest/vitest.mjs run src/__tests__/api/legacy-points-entrypoints.test.ts src/__tests__/api/legacy-consumer-ai-boundary.test.ts src/__tests__/api/mcp-handler.test.ts src/__tests__/lib/quota-history.test.ts src/__tests__/lib/visual-reservations.test.ts`：5 个文件、51 项全部通过。
- 上述十个 TS 文件定向 ESLint：通过，无输出；已跟踪限定文件 git diff --check：通过。
- 回归覆盖三 HTTP 禁用前不读正文/配置/provider、未登录、原 API key 边界、非统一兼容；实际 MCP 协议的登录/统一禁止/旧模式成功；账单视觉汇总和零额度排除；SQL 参数化、双 owner、状态/charged/refunded、原始价格与无私密 job 引用。
- 初次测试有一个 `it.each` 空数组用例展开错误，已修正测试数据形状，最终五文件重跑全部通过。
- 尚未跑真实 PostgreSQL 夹具、线上请求、全局类型检查或构建；不把 SQL 形状回归冒充数据库执行验收。主代理统一运行类型检查/构建，独审由未参与实现的代理承担。

## 冻结摘要

文件摘要集合 SHA256：`f7d4871053a2e125663e5d7dfad8508cd39c99219d825ed84bf73d5b11d62092`（按下列 path→SHA256 对象排序、无空白 JSON 编码）。

```json
{
  "src/app/api/improve-prompt/route.ts": "1a9e6b873b0392598bc3f9ef5042839c6d0f30dadcd1c89a1637cb8d9b57596a",
  "src/app/api/prompts/translate/route.ts": "c2ab4461c3fd39ccfe9abf84ac42ea731d49dba0a4e056fa9dfae8ec2798f4bf",
  "src/app/api/generate/sql/route.ts": "a1887254f3b1bdf8ee19b81e86340004c3dd70f7bd4036032812f2ca81a940c9",
  "src/app/api/mcp/route.ts": "7ccead458472db18b8f36b4fb6012d3926e07b6fbad5b4b05fb1807b4067e61e",
  "src/server/quota/history.ts": "b9b5ca91e7bb3303ceb5bc2bb0ac78f638e60459eadb03309734db426fa7513d",
  "src/server/quota/visual-reservations.ts": "82c37bd193622ce524dcd84313fd38b113a7a22bb7382c3c310f86d8805ff704",
  "src/__tests__/api/legacy-points-entrypoints.test.ts": "cd3220e8d766f018876dd63ff4be05e29bd09b6e59b7b1836476a623851c0c57",
  "src/__tests__/api/mcp-handler.test.ts": "94d262d167a2cff3956c5718a4a4b245484acf37e5e90129a0d0b1a7132c8008",
  "src/__tests__/lib/quota-history.test.ts": "c180beb248262787ec94f23882d6e4ba562273a948caf22f22b294d91c10c456",
  "src/__tests__/lib/visual-reservations.test.ts": "b168fc7a131d6d90eabc464f71af5c5b0d8a2ef01334e26ea013e9729033824f"
}
```

