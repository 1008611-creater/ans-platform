# ANS Platform（ans.cauai.fun）

> The Autonomic Nervous System for AI — 让 AI 永不停转

ANS 组织官网 + AI 原生社区平台。代码从 [prompts.chat](https://github.com/f/awesome-chatgpt-prompts) 复用而来，
在保留其提示词库能力的基础上，改造为面向中国农业大学学生团队与开放社区的社区平台。

## 站点定位

- **服务对象**：中国农业大学学生团队 + 开放社区，纯公益、无商业利益挂钩
- **语言**：只做中文（英文原版内容需汉化）
- **规模预期**：几十人起步，目标几百到上千人
- **氛围**：不做强竞争，成员以昵称匿名参与

## 与 prompts.cauai.fun 的关系

| 项 | prompts.cauai.fun（旧站） | ans.cauai.fun（本仓库） |
|---|---|---|
| 代码仓库 | 本地目录，无独立远端 | `1008611-creater/ans-platform` |
| 容器 | `prompts-chat-app`（3000） | `ans-platform-app`（3001） |
| 镜像 | `ghcr.io/f/prompts.chat:latest` | `ans-platform:latest` |
| 数据库 | `prompts_chat` | 共享同一个库（账号体系打通） |

> ⚠️ **镜像名必须保持独立**。若本仓库构建时打出 `ghcr.io/f/prompts.chat:latest`，
> 会覆盖旧站镜像，旧站下次重启就会跑到新代码上。

## 核心功能规划

| 期 | 内容 | 状态 |
|---|---|---|
| P0 | 账号地基：人机验证 + 校园邮箱白名单 + 邀请码准入 + 等级经验 | 数据模型已建，待开发 |
| P1 | 模板集群：领域分类页 + 模板卡片墙 + 站群入口 | 骨架已上线 |
| P2 | 使用 + 工作台 + 算力记账 | 骨架已上线 |
| P3 | 团队 + 比赛 + 算力包 | 骨架已上线 |
| P4 | Multica（ANS-Flow）+ OmniRoute（ANS-Ops） | 未开始 |

## 等级体系

学历梗 8 级：幼儿园 → 小学生 → 初中生 → 高中生 → 大学生 → 研究生 → 博士生 → 教授。
大学生以上内部再分年级（大二 / 研一 / 博三），升级靠共享、评论、签到等行为积累经验。
实现见 `src/lib/level.ts`。

## 本地开发

```bash
npm install
npx prisma generate
npm run dev
```

## 部署

部署在自有服务器（Docker），Cloudflare 负责 DNS 与 CDN。

```bash
# 构建（约 20 分钟）
docker compose -f compose.yml build app

# 上线（构建完成必须再跑一次，否则旧容器照跑）
docker compose -f docker-compose.yml up -d app
```

敏感配置放同目录 `.env`（已 gitignore），参考 `.env.ans.example`。

## 协作方式

- `main` 分支为生产基线，受保护
- 所有改动走 PR，合并前需确认构建通过
- 动数据库前必须备份：
  `docker exec prompts-chat-db pg_dump -U prompts -d prompts_chat -Fc -f /tmp/x.dump`
