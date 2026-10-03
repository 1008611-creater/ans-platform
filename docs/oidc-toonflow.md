# ANS → Toonflow 单点登录接入说明

## 当前认证现状与方案

ANS 使用 NextAuth.js v5：密码登录由 Credentials provider 处理；身份记录在 PostgreSQL 的 `users` 表；`User.id` 是 ANS 内部 CUID，登录会话通过 NextAuth JWT 保存。仓库原有 `src/lib/plugins/auth/oidc.ts` 是 ANS 作为 OIDC 客户端登录外部站点的插件，与 IdP 能力不同。

本实现增加单个受控的 Toonflow 客户端，沿用 ANS 登录会话与用户记录。不创建第二套密码系统，不新增依赖或数据库迁移。授权码使用现有 `verification_tokens` 表，数据库只保存 SHA-256 码摘要和短时 grant；兑换时用单条 `DELETE ... RETURNING` 原子取走，确保单次使用。`sub` 固定为数据库 `User.id`，不会因邮箱、用户名变化而改变。注销端点暂不提供：ANS 使用本地会话，标准 OIDC RP-initiated logout 需要额外的安全回跳注册和产品级登出语义，当前 Toonflow 登录闭环不依赖它。

## Issuer 和端点

Issuer 必须配置为无尾斜线的公开 HTTPS 根地址：`https://ans.cauai.fun`。

- Discovery：`https://ans.cauai.fun/.well-known/openid-configuration`
- Authorization：`https://ans.cauai.fun/api/oidc/authorize`
- Token：`https://ans.cauai.fun/api/oidc/token`
- UserInfo：`https://ans.cauai.fun/api/oidc/userinfo`
- JWKS：`https://ans.cauai.fun/api/oidc/jwks`

支持 `response_type=code`、`grant_type=authorization_code`、`client_secret_basic`、必需的 PKCE `S256`，不提供 implicit/password/refresh token。Scopes 为 `openid`、`profile`、`email`。`openid` 返回稳定 `sub`；`profile` 返回 `name`、`preferred_username` 和存在时的 `picture`；`email` 返回 `email`、`email_verified`。UserInfo 只返回授权 scope 对应的字段。Access token 与 ID token 用 RS256 签名，含 `iss`、`aud`、`sub`、`iat`、`exp`；ID token 包含客户端 `nonce`。授权码 3 分钟有效、兑换一次；access token 与 ID token 有效 5 分钟。

## Toonflow 客户端登记

部署方只允许一个客户端 ID、一个客户端密钥、一个精确回调 URL。回调地址必须是完整 HTTPS URL（本机开发可用 localhost），路径和查询部分均需逐字一致；不接受通配符、URL 前缀匹配、fragment 或凭据。Toonflow 应发起标准授权码流程，使用 CSPRNG 生成至少 128-bit 的 `state`、`nonce` 和 PKCE verifier，发送 `code_challenge=BASE64URL(SHA256(verifier))`、`code_challenge_method=S256`，在服务端用 HTTP Basic 客户端认证兑换授权码，并校验 ID Token 的签名、`iss`、`aud`、`exp`、`iat`、`nonce`。客户端应将最初发起流程时的 state 与回调 state 精确比较；state 是 RP 的防 CSRF 状态，IdP 只能安全回显，不能替 RP 判定它是否正确。

`redirect_uri` 由 Toonflow 提供后，在 ANS 部署环境变量 `OIDC_TOONFLOW_REDIRECT_URI` 中设置为完全相同的值。当前只支持注册一个回调地址。

## 非敏感接入参数

- Issuer：`https://ans.cauai.fun`
- Client ID：由部署方生成并设置 `OIDC_TOONFLOW_CLIENT_ID`
- Client authentication：`client_secret_basic`
- Scopes：`openid profile email`
- Response type / grant：`code` / `authorization_code`
- PKCE：必需，`S256`
- User identity key：`sub`（ANS `User.id`）

Client Secret 与签名私钥不是接入文档参数，不应放进浏览器代码、客户端配置、issue、聊天或日志。Toonflow 的 client secret 仅配置在 Toonflow 服务端。

## 安全密钥配置与轮换

使用组织批准的密钥管理器注入生产容器环境；如果部署只能使用主机 `.env`，该文件必须不进入 Git、限制为部署用户可读（POSIX 权限 0600），不要将其复制到聊天或仓库。变量必须包括：`OIDC_ISSUER`、`OIDC_TOONFLOW_CLIENT_ID`、`OIDC_TOONFLOW_CLIENT_SECRET`、`OIDC_TOONFLOW_REDIRECT_URI`、`OIDC_SIGNING_KEY_ID`、`OIDC_SIGNING_PRIVATE_KEY`。私钥需为 RSA 2048 位或更强。PEM 可在环境变量中用字面 `\\n` 表示换行。不要在日志打印这些变量。

生成密钥时在受控机器上执行，不将输出贴入会话：

```sh
umask 077
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out oidc-signing-private.pem
openssl pkey -in oidc-signing-private.pem -pubout -out oidc-signing-public.pem
```

保存当前公钥用于验证其与私钥匹配后，可将私钥安全注入 `OIDC_SIGNING_PRIVATE_KEY`。代码从私钥派生 JWKS 公钥；可选的 `OIDC_SIGNING_PUBLIC_KEY` 只用于发布 JWKS，必须与私钥匹配。轮换时使用新私钥和新 `kid`，同时配置旧 `kid` 与旧公钥到 `OIDC_PREVIOUS_KEY_ID` / `OIDC_PREVIOUS_PUBLIC_KEY`。旧公钥至少保留到所有旧 access token 超过 5 分钟寿命并留出部署时钟偏差后，再单独移除。私钥丢失或泄漏后立即轮换并撤销旧环境密钥。

`.env.example` 和 Compose 文件只定义变量名，不包含密钥。修改 Compose 环境映射需要按正式发布流程部署后端新容器才会生效；本实现没有在本次执行生产部署。

## 部署和回滚

1. 生成并安全保管 RSA 密钥；在 ANS 主机配置上列出的环境变量，在 Toonflow 服务端安全设置客户端 ID/密钥。
2. 将 Toonflow 提供的唯一 HTTPS callback URL 同时登记到 Toonflow 与 `OIDC_TOONFLOW_REDIRECT_URI`，逐字校验。
3. 部署应用后，检查 discovery、JWKS、服务端登录、完整 code + PKCE 流程；确认 HTTPS 反向代理保留 `AUTH_URL` 与安全 Cookie 配置。
4. 未配置 OIDC 环境变量时，端点不对外服务并返回 503；现有 `/api/auth/*` 和 ANS 登录保持原样。
5. 回滚时先从 Compose/密钥管理器移除 OIDC 专用变量，再回滚应用版本；不需要数据库迁移。移除密钥并不会登出现有 ANS 会话。

## 已知限制 / 上线前检查

- 这是面向 Toonflow 的单客户端实现，不是通用 IdP 管理控制台；目前一个精确 redirect URI、无 refresh token、无动态注册/授权同意页。
- 需由 RP 校验 `state` 与 ID token `nonce`，服务端无法仅凭请求判断 RP 的 state 是否“正确”。ANS 必须已登录，未登录会跳转到现有登录页，并把原授权请求作为回跳地址。
- 授权码保存在现有验证令牌表；测试覆盖单次原子消费。运行端数据库角色必须允许该表 DELETE/INSERT；本任务不触碰生产库。
- 上线前应把测试使用的 client secret、私钥从独立安全随机生成器中生成并交付密钥管理器；本地/CI 测试密钥只临时生成，禁止复用。
