# Easel 接入 ANS：实现、验收与发布边界

## 本次确认与交付边界

用户确认将 Easel 接入 ANS，并开放给 ANS 用户逐人独立使用；已允许新增 Easel 登录衔接和每用户独立容器。已授权本地实施、提交、推送任务分支及创建草稿 PR（#101）。合并、测试服务器及生产部署仍需各自明确授权。

本地入口为 /workflows/easel，工作台创作工具增加入口。开关默认关闭，未通过部署验收时显示“多用户接入准备中”，不宣称服务已可用。ANS 现有认证、数据库结构、算力计费与主导航未改动。

首版使用各用户自行配置的模型连接，不继承 ANS 或 Windows 用户级模型密钥，尚未统一扣除 ANS 算力积分。不得将本地网页启动、模型配置、容器参数测试写成真实生成、发布或上线完成。

## 模块边界

- ANS 页面和客户端：仅从服务端读取部署开关、公开来源和当前用户 ID；只接受配置来源、目标 iframe window 的消息，匹配服务端身份后显示工作台，退出或换号移除旧私密 DOM。
- services/easel-gateway：独立 Node 服务，使用内置库。复用现有 ANS OIDC Authorization Code + PKCE，验证 RS256、issuer、audience、nonce、state 和 token 时间；使用独立短期加密 HttpOnly cookie。每次请求从已验证 subject 派生稳定租户 ID，不接受浏览器指定租户。
- Docker 调度：每用户单独 workspace/home 持久卷、内部 bridge 网络和 worker；worker 非 root，根文件系统只读，无 Docker socket，无 ANS 密钥，限制内存/CPU/进程数。只有 gateway 有 Docker 访问权。worker 没有宿主端口，内部 bridge 使用 IPv4/IPv6 isolated gateway mode，拒绝有宿主桥接地址的旧网络；Docker Engine 至少 28。每用户 sidecar 的固定 worker 中继 8091 仅绑定宿主回环。已有容器、卷、网络的标签和安全配置不符时拒绝使用。
- egress sidecar：每用户独立代理，仅允许公网 HTTP/HTTPS；解析 DNS 后固定检查过的目标地址，拒绝私网、回环、元数据和重绑定结果。worker 内部网络不能直接出网。Node/常见 Python HTTP 库走代理；某些浏览器或主动清除代理的上游技能须另行适配和验证，不能为了“可用”开放宿主机网络。
- 上游 Easel：固定 bb3c8ff0463f36c202454d74171682ba6e470cb1，保留 LICENSE 与来源说明。Docker 构建使用稀疏检出，不引入展示视频。前端锁文件补丁修复该版本的依赖审计问题，前端素材地址补丁绑定原始 owner；聊天、发布草稿、平台缓存与跨标签通信按用户隔离。前端制品由 gateway 从固定目录读取，不能从可被 Agent 改写的用户容器提供页面或脚本。生成 HTML/API 文档使用 opaque-origin sandbox，不能继承登录网关权限。

## 身份与草稿保护

公开 origin 必须是独立 HTTPS origin，不能与 ANS 同源。注册 OIDC 客户端只需要 openid/profile，不索取 email。回调固定为 EASEL_PUBLIC_ORIGIN/ans/oidc/callback，不能跟随用户提供的回跳。

会话不超过四分钟，userinfo 最多缓存三十秒。长 SSE 到原会话有效期会主动断开，即使页面已续期；上游已有按 turnId/lastEventId 恢复机制，但长任务恢复仍需真实环境验收。嵌入工作台每三分钟通过隐藏 iframe 静默续登录，保留原创作 DOM；续登录失败或身份不符会移除工作台并提示重新登录。实际 API 请求附带加载页面的 owner，gateway 要求 owner 等于当前已验证 session，防止旧标签在换号后把操作发到新账号。owner 是一致性检查，不是鉴权凭证。图片、音频、视频和下载使用 /ans/media/{owner}/ 地址，必须同时匹配已验证会话；未标识 owner 的旧素材地址拒绝访问。静默续期超时 45 秒即移除内层工作台。

ANS cookie、access token、Authorization 和用户指定的身份头不转发给 worker；worker Set-Cookie 不返回浏览器。动态与私密响应禁止缓存，SSE 禁止代理缓冲；上游重定向不透传，写请求必须来自 Easel origin，上传上限 64 MiB。

## 验收目标

1. 已登录用户从 ANS 工作台进入自己唯一的 Easel 环境；匿名、伪造 cookie/header、过期/撤销身份、错误 nonce/state/签名被拒绝。
2. 用户 A/B 的画像、素材、平台凭据、模型配置、进程与网络互不共享；旧标签或账号切换不能操作另一个用户。
3. 初次创建、重复进入、并发、容量耗尽、服务重启和工作空间停止/恢复均可验证；持久数据不被自动删除。
4. 静默续登录、长 SSE、未保存输入、浏览器第三方 cookie 限制、手机布局都通过浏览器验收。
5. 模型使用前由用户配置并确认费用；实际生成和各平台登录/发布需任务对应授权，逐个平台验证。不能依据宣传文案承诺自动发布成功。
6. 部署版本可以追溯到 ANS main/PR、上游 commit、补丁与 image digest；磁盘额度、备份、资源容量、网络和回滚方案已检查。

## 已完成与待验证

本地已实现页面、登录、owner 绑定代理、隔离调度、出网代理与部署模板。上游 Web 已在独立预览环境启动，前端构建成功；该预览为无模型、无社媒账号的 API 模式，并不代表 OpenClaw 工具链可用。上游前端锁文件修复后 npm audit 报告零漏洞；ANS 原有依赖安装仍报告七项审计问题，未跨范围升级。

本地相关测试共 48 项通过（网关 36 项，ANS 12 项），相关 ESLint 零警告，分层边界检查通过，ANS 类型检查及同步 main 后的生产构建已通过；完整 lint 为零错误（355 条既有警告），PR #101 的同步 main 提交 a7951455 已通过 GitHub CI；追加前端素材补丁再次完成 TypeScript/Vite 构建，并通过干净原文件的 git apply --check。这些单元测试和构建与下面的真实 Docker 验收分别记录。

网关/身份/网络策略单元测试使用真实 HTTP 服务和临时 RSA 密钥，模拟 ANS provider 与 Docker，不替代真实容器和生产 OIDC 的验收。2026-10-15 早先本机 Docker 引擎查询超时，稍后再次查询已成功（Engine 29.5.2），未重启 Docker 或改动已有容器。固定前端的真实 Linux TypeScript/Vite 构建及导出成功；egress 镜像构建成功，本地 digest 为 sha256:c4b2bf2b197ab5e499a5f690d30114c9f5e3e2c1356293dc19ec0a1293417575。worker 镜像已构建成功，本地 digest 为 sha256:0cc945e828d9aa594455e80fdf51324aca896a6b03f52ca7d190cbbca4211635。模型生成、平台发布和目标部署环境的 OIDC 未验证；生产 ANS_EASEL_ENABLED 仍保持关闭。

2026-10-15 执行 runtime-smoke.mjs --run，真实 Docker 联调 11 项全部通过：两个独立 worker 的 API 与 OpenClaw 健康检查；不继承 ANS/本机模型和认证凭据；独立 workspace/home 卷；受限 worker 中 Chromium 启动；匿名、旧账号请求及跨账号素材访问被拒绝；worker 无法直连另一租户、正在监听的宿主机服务和公网；代理拒绝云元数据；经代理访问公共 HTTPS；第三个活动用户触发容量限制；worker/egress 停止后恢复数据；gateway 调度器重建后安全接管既有容器。测试使用加密的合成会话与模拟 userinfo，不代表真实 ANS OIDC 或浏览器跨域登录通过。临时 namespace 的测试容器、卷与网络均已清理，未操作其他容器。

2026-10-15 新增 browser-smoke.mjs，并在本地独立 PostgreSQL + ANS 生产构建 + 两个实际 Easel Docker worker 上完成浏览器联调，八项通过：匿名入口转真实登录；两名合成用户通过真实 credentials 与 OIDC code/PKCE/token/JWKS/userinfo 打开固定前端；静默续期保留可见 iframe、原 DOM 和未保存文字；390px ANS 外层页面无横向溢出；真实退出后移除旧私密页面；换号隔离浏览器草稿和真实 worker 素材，旧 owner 被拒绝；模拟嵌入 Cookie 不可用时关闭旧页面并显示独立窗口入口，该入口可用当前账号打开实际工作台；启动失败或前端未渲染时不提前报告 ready，并提供绑定账号的重试入口。使用一次性 localhost 自签 HTTPS 证书和不同端口的两个 origin，未导入系统信任；网关仅信任此次测试证书，未模拟身份签发/验证。续期计时器从三分钟加速到十二秒，Cookie 丢失通过拦截测试页面的 gateway 请求模拟，不等于生产域名下所有浏览器第三方 Cookie 策略均已验证。截图已人工检查。临时数据库、容器、卷、网络、服务和证书已清理，保留脱敏报告和合成账号截图于本机临时证据目录。未配置真实模型或社媒账号，未调用生成/发布。完整生产构建、类型、分层、48 项测试通过；完整 lint 为零错误、355 条既有警告。新增首次使用说明，续期用轻提示保留编辑页面；独立窗口登录失败显示中英文恢复提示，避免空白页。生产入口仍默认关闭。PR 最新提交的 CI 状态以 GitHub 为准。此前提交 18467be4 的 GitHub CI 已全部通过。

仍须在目标部署环境验收 DNS/证书、真实配置下的 OIDC 和浏览器 Cookie 策略、长 SSE 到期/重连与长任务恢复，以及实际手机的内层编辑与导出；验证出网代理覆盖各平台浏览器脚本、宿主机桥接/DNS/IPv6 策略及持久卷备份。本地 Cookie 丢失模拟不能替代这些检查。当前只有用户数量和运行资源限制，未实现磁盘硬配额。上游媒体工具的真实生成/发布、依赖审计与端到端平台流程仍待对应授权后验证。

持久 workspace 卷包含上游代码和用户数据，镜像升级不会自动替换旧卷内代码；升级前必须做分版本卷迁移、备份和回滚，不能仅换镜像标签宣称所有用户完成升级。当前进程仅支持单 gateway 实例，事务和调度锁在内存；不得直接部署多副本。

## 部署模板（尚未部署）

- services/easel-worker/Dockerfile：固定上游源码、前端补丁、完整 Python 媒体依赖、Chromium、OpenClaw 2026.10.3；最小构建上下文避免上传无关本机文件。constraints.txt 将 biliup 固定为上游允许范围内提供预编译安装包的 1.2.9，避免 1.2.11 的源码构建准备卡住。
- services/easel-gateway/Dockerfile.egress：出网代理和固定入站中继 sidecar。
- services/easel-worker/Dockerfile 的 frontend target：构建固定前端制品，包含素材账号绑定补丁；设置 EASEL_FRONTEND_DIR 到只允许部署用户写入的版本目录。gateway 用户只读，worker 不挂载该目录。
- services/easel-gateway/.env.example：空凭据模板；真实文件放在 Git 外，权限 0600。COOKIE_KEY 可独立轮换；TENANT_KEY 必须稳定保存，否则租户卷映射改变。
- ans-easel.service.example：宿主机回环 Node gateway，独立系统用户；Docker group 相当于高权限，仅给该服务。
- nginx.conf.example：独立 HTTPS 入口，不记录回调/输入/凭据，不缓冲 SSE。

构建示例（必须在验收环境进行）：

```sh
docker build --target frontend --output type=local,dest=/opt/ans-easel/frontend/bb3c8ff -f services/easel-worker/Dockerfile .
docker build -f services/easel-worker/Dockerfile -t ans-easel-worker:bb3c8ff .
docker build -f services/easel-gateway/Dockerfile.egress -t ans-easel-egress:1 .
node --env-file=/etc/ans-easel/gateway.env services/easel-gateway/server.mjs
```

ANS OIDC_CLIENTS_FILE 注册表中追加 Easel 客户端，保留已有客户端与秘密，不改写既有登录。精确 callback 和 client secret 在私有配置里登记。验收通过后才设置 ANS_EASEL_ENABLED=1 与 ANS_EASEL_ORIGIN；示例域名 easel.cauai.fun 尚未验证 DNS/证书或用户占用，不能据此直接上线。

## 检查与回滚

```sh
node --test services/easel-gateway/*.test.mjs
# 仅在已授权的本地 Docker 验收环境执行；创建并清理独立的合成账号测试资源
node services/easel-gateway/runtime-smoke.mjs --run
# 本地真实 ANS/OIDC 浏览器验收：临时数据库、随机 HTTPS 端口与独立测试资源；需预先构建镜像和固定前端
node services/easel-gateway/browser-smoke.mjs --run /absolute/path/to/fixed/frontend
npx vitest run src/__tests__/lib/easel-embed.test.ts src/__tests__/components/easel-workspace.test.tsx
npm run typecheck
npm run build
```

部署前审查所有未跟踪文件与实际差异，不上传 .env、密钥、日志、素材、截图或用户数据。发布授权后按项目规定提交分支、PR、审查、main 构建和测试部署；生产部署仍需独立授权。

回滚首先关闭 ANS_EASEL_ENABLED，拒绝新进入；停止仅标有对应 namespace 的 gateway/worker/egress，保留所有持久卷和租户密钥。恢复前一个已验证的 ANS main 构建、固定前端目录与 Easel image；任何需要改动卷内代码的回滚先还原对应备份。不得删除卷、重置 TENANT_KEY、停止其他 namespace 或强推 main。
