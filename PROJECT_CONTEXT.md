# ANS 项目上下文

## 产品定位

ANS 是面向 CAU 学生的 AI 能力社区，与 CAUHub 同属一个组织，但保持独立的产品和数据边界。首期核心循环是：发现 → 运行 → 收藏 → 复用。

## 当前技术栈

- Next.js App Router、React、TypeScript
- PostgreSQL + Prisma
- NextAuth 身份认证
- next-intl 多语言
- Vitest 单元/API/组件测试
- Docker + GitHub Actions 部署

## 领域对象

`User`、`Prompt`、`Template`、`Run`、`AuditLog`、`QuotaPool`、`QuotaLedger`、评论、收藏和通知已经存在或正在使用。工作流能力当前以 Prompt 连接和外部链接为主，本次重构将逐步引入受约束的 DAG 模型。

## 重要边界

- 学校邮箱 + 邀请码是首期成员入口
- 公开身份使用匿名昵称
- 凭证、模型 Key、数据库连接只在服务端
- 公开内容必须保留作者、来源和版权信息
- 不承诺不存在的发布能力
- API 额度必须可审计、可限流、可回滚

## 工程现状

- 当前源码集中在 `src/app`、`src/components`、`src/lib`
- 现有测试集中在 `src/__tests__`
- 生产迁移和部署验收仍需单独演练
- 本文件生成时工作区已有未提交改动，重构不得覆盖这些改动

