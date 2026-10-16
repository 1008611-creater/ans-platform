# ANS 算力问卷赠送额度：独立增量审查

审查日期：2026-10-16。结论：**冻结候选源码审查通过；当前 2026 单活动范围内无未关闭的 P1/P2 问题。此结论不代表实际发放、上游付费调用、浏览器全流程或生产发布通过。**

## 精确范围

- 工作树：`C:/Users/lsb/.workbuddy/apps/worktrees/ans-compute-acceptance-20261016`。
- 基线：`9ceb01645020a1d172adb958476285f192135bb1`；仅审查本批相对既有 75 文件审查的新增/变化字节，没有重新执行旧批次审查。
- 冻结清单：`docs/agent-team/compute-benefits-20261016/review-manifest.json`，42 文件。
- 冻结文件集合 SHA256：`30ad775b856293cf9d86b9c6ce5eba5e91b38652e2fc2b5fd523b02a58f07711`。
- 清单本身 SHA256：`34586d74509a305a0ddf258e984f5cdd6ff4ce1310906f984ceccc5b18cc0b74`。
- 独审已逐个重新计算全部 42 文件 SHA256，全部与冻结清单一致；本报告不包含在业务冻结集合内。

## 已核对的业务与资金边界

1. 注册问卷固定版本、严格字段和同意规则；账号锁、问卷与发放同事务、唯一账号/活动/类别约束及幂等插入保证同活动一次发放，不增加通用积分。DeepSeek 1000 美元；赛事获批 Terra 300、Astra/Sol 共用 200、Opus 100 美元。
2. 每次发放由数据库同一时刻确定 grantedAt 和 expiresAt，固定 720 小时；冲突重试、Key 轮换、问卷重提不延长有效期；到期可用余额与历史预占/结算分开。
3. 赠送金额使用 bigint 微美元；APIC 回执先反除已包含的 receiptConsumptionMultiplier 得到官方美元。没有再次乘 GPT 0.16、付费兑换系数或采购折扣。付费积分的原倍率路径保留。
4. 账号级串行预占；模型匹配、所有者、余额、数据库时钟、请求冲突与终态幂等受到检查。余额不足或到期不静默扣付费积分；显式 paid 才跳过已存在赠送池。既有个人 Key 的轮换/撤销不新建或复制赠送余额。本批明确复用每账号一个当前有效 Key，没有新增多 Key 产品承诺。
5. 礼金额度仅通过既有统一网关到 New API，不向用户暴露基础设施 Token。终态保留不可变计价快照、官方回执、应扣/实扣及平台承担差额；不以估算伪造实际用量。超出预占部分由平台承担。
6. UNCERTAIN 保留赠送预占；关闭新赠送功能后既有请求仍能按冻结快照恢复。正常释放需拒绝证据；人工核销需授权管理员、不可变 WAIVER 与审计事件，返还原赠送来源，不向付费钱包铸造积分。
7. SQL 显式拒绝缺失终态金额和审核说明；延迟守恒触发器将累计预占/已用绑定明细；延迟请求绑定拒绝不存在/不匹配的网关请求及伪造实际金额；获批发放需要匹配的授权审核事件。
8. 报名问卷绑定配置中的农客松届次，复用已发布的报名窗口，先取工作区锁，取得账号/申请锁后再次校验截止时间。审核允许在报名结束后完成，禁止跨届审核；作品审核不触发权益。拒绝申请可在原答案基础上修改重提。
9. 本人 GET、提交、管理员 GET/审核由认证身份派生账号，写入有同源与 actor 绑定、严格输入/长度限制；私密问卷不进入公开模型目录，响应无上游 Key，缓存明确 private/no-store。资金与赠送卡片的公开投影不透出内部申请、用户字段。
10. 付费预占汇总、API 历史、运行费用和 Agent 回执排除赠送预占；旧领取入口在新活动开启时返回 QUESTIONNAIRE_REQUIRED，历史积分与功能关闭时旧逻辑保持兼容。
11. Terra 尚无用户指定 McGrox free 分组凭据、无真实渠道/回执验收，未被加入可调用模型白名单；Opus 未绕过既有网关开关与协议/费用门禁。卡片明确说明准备中，不能据此宣称模型可调用。

## 初审问题闭环

| ID | 初审问题 | 最终处置 |
| --- | --- | --- |
| B-01 P2 | PostgreSQL nullable CHECK 允许终态金额/审核 note 为 NULL | 显式 IS NOT NULL + COALESCE false；合成 PG 拒绝断言覆盖 SETTLED/RELEASED 与审批 NULL |
| B-02 P2 | 赠送结算 settledPoints=0 后绕过 Opus 滚动每日上限 | 已结算赠送使用原授权上限保守计入每日安全预算；不改变付费钱包 |
| B-03 P2 | 人工核销不完成赠送预占且走付费退款 | 核销完成原赠送 RELEASED、跳过 refundQuota，记录 gift/0 积分与未知成本审计 |
| B-04 P2 | 赠送预占混入付费汇总与 Agent 回执 | paid-only SQL 明确按 JSON key 存在性排除赠送；API/运行/Agent 展示同步隔离 |
| B-05 P2 | 静态活动缺少真实农客松版次与报名时间门禁 | 申请写入绑定届次，复用受管窗口并写前复核；审核拒绝换届 |
| B-06 P2 | 被拒问卷无法通过页面修改重提 | REJECTED 显示预填表单，待审/通过只读；后端递增 revision 并保留事件 |
| B-07 范围 | 文档额外承诺多把命名/限权 Key | 按用户原需求收敛到已有单 Key 创建/轮换/撤销，REQ005/AC005 已更正 |
| B-08 兼容 | 旧公共积分领取可绕过新问卷入口 | 新活动开关开启时旧 claim 拒绝并指向新问卷；不重算历史余额 |

## 验证证据与限制

- 独审独立执行的代码阅读、差异/调用链检查、42 个冻结文件 SHA256 核对已完成。
- 独立尝试运行 compute-benefits 与 benefit-billing 定向测试时，Vite 加载配置遭遇 managed sandbox `spawn EPERM`，没有测试执行；没有将这次失败记为测试通过，也未反复申请或重跑。主控统一运行的 10 文件 135 项与类型检查结果作为实施验证回执复用，不冒称独审独立重跑。
- 后端最后公共投影及新增两项用例由主控增量确认；仅需直接关联测试/类型，不需要重复所有旧检查。可执行命令：`node node_modules/vitest/vitest.mjs run src/__tests__/lib/compute-benefits.test.ts`。
- 已读取 `docs/agent-team/compute-benefits-20261016/benefits-postgres.json` 与被检验合成 SQL。回执为 93 个迁移、8 组合成断言 PASS、cleanup=true；迁移 SHA256 与冻结清单一致。独审没有重跑数据库或访问生产。该回执证明 SQL 约束和合成状态一致性，不冒充真实用户并发、发放和上游调用验收。
- 尚未验证真实用户问卷发放、真实人工审核发放、现有个人 Key 的真实供应商调用/流式断开/迟到回执、生产资金对账与生产浏览器全流程。未购买、未对外提交、未修改生产、未执行真实模型付费调用。
- 开放活动前需按主控发布流程绑定可回滚的明确仓库提交、实际目标版本/备份、正确配置和真实冒烟证据；本报告不授权上述外部操作。

## 非阻塞观察

当前只有 2026 静态活动。若未来切换届次，管理员待审列表仍按静态 campaign 查询，旧届 PENDING 记录可能占据前 100 条且因届次不匹配不能审核。主控已明确本批按当前 2026 单活动范围交付；该观察不阻塞本批，不据此扩展未来届次归档系统。

## 冻结文件 SHA256

| 文件 | SHA256 |
| --- | --- |
| `docs/ANS模型计费与模型广场.md` | `de20fb6d39f7a824bbdb8276bd2f102842ea3d94fde5bce7cc80a8b5b5df1a8a` |
| `messages/product/en.json` | `b597b0834064dee4b106a67831cb156cf3ab3ab4fb1ce1e9bc092d63f8166900` |
| `messages/product/zh.json` | `d5f92ea54b2a6af332fe02603d23e54a21d0955b1657b26b6458ef28666c2a00` |
| `prisma/migrations/20261016180000_compute_benefits/migration.sql` | `0497219730859352c5db00befc19eaa216563cdb289464353c9b108cdca1f40b` |
| `scripts/fixtures/compute-benefits.sql` | `d27ab32f452eab9580b2adee9fea738ee9d1d4a5971eb0584aeade92ea0dd13f` |
| `scripts/verify-compute-benefits.py` | `84cb0a5963dade9fefeefd328f0f4305f5230688d4adc6ede4b6809011d1ccf3` |
| `src/__tests__/components/compute-benefits.test.tsx` | `6770d4e8b780ee44ef630f2972f513e1c1f4936868e1f01de91b0dc2c5a84714` |
| `src/__tests__/lib/benefit-billing.test.ts` | `153f0cf77a60af60ec5cac1d92a49f8c3be39f68a9210c8769388bd6daff8e49` |
| `src/__tests__/lib/benefit-paid-holds.test.ts` | `86dd978a4ebef9bc26d1f761d4c5450eec2beaac0a6a16aa3a3dec594fffd9aa` |
| `src/__tests__/lib/compute-benefits.test.ts` | `689561294639747d1105ea82d32f0b9e1576ae42d89d8dff515edcd400165580` |
| `src/__tests__/lib/gateway-benefits.test.ts` | `4b292d5e4c8855a653c6482a08151606c426d218a44e248adf0a13c18a1dcacc` |
| `src/__tests__/lib/metered-cost.test.ts` | `3610df74797975bdc4ff1d8fde10ddf2101c15c70d436a8a55ab2a60a28de0c0` |
| `src/__tests__/lib/model-billing-policy.test.ts` | `25df312390b55274c54b24fe194673225e65f37d7f6850ab6d7bf4e8ae65ac57` |
| `src/__tests__/lib/personal-api-history.test.ts` | `d22e119395f6d34b43080011118b3ed6e480f08d36dc2f9cdae548ff08a6d5ec` |
| `src/__tests__/lib/quota-history.test.ts` | `5e5df775522a65a83767a207046ea7d37423e1837ad76724580e43fc75dc7c74` |
| `src/__tests__/lib/quota-integrity.test.ts` | `74b95c551a686a8acab465eb1a59eb85e121aa17187426ec3768e04cd40dfa69` |
| `src/__tests__/lib/quota-review.test.ts` | `840ccdd68e97635b3288c4ae3f0fbd2b3465504568920ad753bea80b7ba8fb61` |
| `src/app/admin/compute-benefits/page.tsx` | `8397dfd0120d06434e738b182a4ffcb33e632b95ccb2e7ea78727bbf028ca085` |
| `src/app/api/admin/compute-benefits/[id]/review/route.ts` | `945d6f340da813b2ac4c851f9634e9c470a0dc57f83cb3cc5ed212e9d36cec6d` |
| `src/app/api/admin/compute-benefits/route.ts` | `9c01a6a5a44a720dfe7254ef53551d3e272646d2570e49bf5c0f207aeecba6f7` |
| `src/app/api/compute-benefits/applications/route.ts` | `93df2c653e0f49ddaeecb5ec06ab76c29d50dab9bbc55999a459709154f3f9c2` |
| `src/app/api/compute-benefits/questionnaire/route.ts` | `37e58a6520cd1f993d88e98d9741d10fa60665afcf2333152d035b36c9363a4d` |
| `src/app/api/compute-benefits/route.ts` | `ea09a825fae456442aa2aa52f09979604936ba44adefa9c971cff0f968b897cb` |
| `src/app/api/quota/claim/route.ts` | `4d20108d3259aa10a765daaab774eff1917d0ba9d3332760ae125c7b63422a0f` |
| `src/app/competitions/agrihackathon/page.tsx` | `9650e39e1afbe6a6f6fc2de6221308b822d5c773707d6ce00ec2b7de057f24d0` |
| `src/app/workspace/benefits/page.tsx` | `cf1f25708c4ec18b3deef28969f7e0bd4ca95e2b0908a143a0aa4c7f8d131fee` |
| `src/app/workspace/credits/page.tsx` | `7fabe198ac1d2b0d6f8b3891a026226e9830c0130fa5bf221793b6ebfacb86c7` |
| `src/components/admin/compute-benefits.tsx` | `b254c8f0dd7d3d279a4903a1a5d60abaed1181c16880dfa3d876509a0f5e3e2c` |
| `src/components/workspace/compute-benefits.tsx` | `4b0daa4abcb33e95af17ec52796a0a0044beccee0da88aec0d1a93388726acfd` |
| `src/components/workspace/credits-center.tsx` | `27a703932e603fdd4e8e965c855b5fb99dd063ef6ffee91178524fc07aad6a12` |
| `src/contracts/compute-benefits.ts` | `023a95c0db54417379a9c942334e52a32113ef23ba7c586c2c34324e476c69ad` |
| `src/server/companion/service.ts` | `40ba6baed41d44159c355fdf692124385704c683493702a9070405afce58411f` |
| `src/server/compute-benefits/http.ts` | `2417ea846e575261be462975e5ee3bac09683f5920a65f72203e3e75a1151efc` |
| `src/server/compute-benefits/service.ts` | `bdeeec530b70236b3dfe531c7d869bd6619a83046c3bc541fda5ef2b8394c8f5` |
| `src/server/integrations/benefit-billing.ts` | `b73f1ed3fe9c800d377b6649dec13e6f3da593d68dc85b8711cfe22a9747380a` |
| `src/server/integrations/codex-gateway.ts` | `1c43b8e911eb603a17e5ededa4c72f358109acc0448ad27bb241c2cfd931c6e0` |
| `src/server/integrations/metered-cost.ts` | `6b935761efb0b137e5e3e4e86afc4745c9198dc3d4273997075b857fc9685051` |
| `src/server/quota/api-history.ts` | `5ceb368045f18212410032c624da9d1e3e1a0198c8593ffad6a48d49443d6d29` |
| `src/server/quota/benefit-reservations.ts` | `7ed04b647e76043e9b7a3eaeee5f9ba4554f3fe4fae61c13bfed0dbde27a5882` |
| `src/server/quota/history.ts` | `f768580eb6a7c15461cedba9ad8170bbdbf971d934092641dc76ed79d01a83d3` |
| `src/server/quota/review.ts` | `8d975a825225b4dabb396c443a70bc0b34d2b68d63c4715cf05d613c63c33c75` |
| `docs/agent-team/compute-benefits-20261016/task-spec.md` | `dce8838b7681a9244651fabbe9113ded362977991d1864d581e2c56ad4666549` |
