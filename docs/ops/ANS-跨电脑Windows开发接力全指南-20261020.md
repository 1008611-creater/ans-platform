# ANS (AI Never Stops) 跨电脑（Mac → Windows）无缝接力开发全指南

> **文档版本**：v1.0（2026-10-20 00:50 跨机交接基线）  
> **适用场景**：从当前 Mac 工作台切换至 Windows 电脑继续推进 `ANS`（**`AI Never Stops`**，`https://ans.cauai.fun`）主站及全矩阵生态子站开发。  
> **GitHub 主仓库**：`https://github.com/1008611-creater/ans-platform.git`（最新同步分支：`develop` & `release-verify`）

---

## 一、飞书在线云文档总目录（4 大核心台账）

换到 Windows 电脑后，所有业务定价、服务器拓扑、上游渠道与跨机接力手册均已沉淀在以下飞书云文档中：

| 优先级 | 文档名称 | 核心用途 | 飞书在线链接 |
| :--- | :--- | :--- | :--- |
| **P0** | **《ANS 全站积分定价、成本核算与毛利率总表（v3）》** | 全站生图/视频/3D/语音/LLM 成本价、积分价、毛利率及 VibePlan `1.21x~1.50x` 算力膨胀总表 | [https://narcb9vct6.feishu.cn/wiki/OcX7wkPaYiOrPdkevmFcSaqBnbg](https://narcb9vct6.feishu.cn/wiki/OcX7wkPaYiOrPdkevmFcSaqBnbg) |
| **P1** | **《ANS 全站服务器拓扑与运维急救手册（2026-10）》** | 三台生产服务器容器、端口、跨站积分桥 `ans-exam-quota-bridge` 与排障回滚命令 | [https://my.feishu.cn/wiki/KPMvwxQ4LiREbkkJauUcj4NcnFh](https://my.feishu.cn/wiki/KPMvwxQ4LiREbkkJauUcj4NcnFh) |
| **P2** | **《ANS 上游渠道台账与产品矩阵规范（2026-10）》** | OpenLux / 火山方舟 / Tripo / 小米 Mimo / APIC 五大渠道配置、上下架清单与品牌红线 | [https://my.feishu.cn/wiki/DSCOwQZz8iWeVHkZ5WdcFBGvnth](https://my.feishu.cn/wiki/DSCOwQZz8iWeVHkZ5WdcFBGvnth) |
| **P0** | **《ANS 跨电脑（Mac → Windows）无缝接力开发全指南》** | 本文档：Windows 环境一键拉取、Skills 恢复、SSH 配置与新会话唤醒词 | 见下方正文（同步归档于仓库 `docs/ops/ANS-跨电脑Windows开发接力全指南-20261020.md`） |

---

## 二、Windows 电脑第 1 步：拉取 GitHub 全量仓库

在 Windows 电脑打开 **PowerShell** 或 **Git Bash**，执行以下命令拉取已沉淀全部主站、子站、Skills 与运维文档的最新仓库：

```powershell
# 1. 克隆仓库并直接检出最新 develop 分支（与 release-verify 完全同步）
git clone -b develop https://github.com/1008611-creater/ans-platform.git
cd ans-platform

# 2. 安装主站依赖
npm install
```

### 仓库全量沉淀目录全景图

| 仓库内路径 | 沉淀内容说明 | 对应线上站点 / 生产服务器路径 |
| :--- | :--- | :--- |
| `src/`、`public/`、`messages/`、`prisma/` | **ANS 主站全量源码**（含 VibePlan `1.21x~1.50x` 算力膨胀、小恐龙 3D 展厅 `/showcase/ans-3d/`、四视图、Tripo 3D、模型广场、算力账本） | `https://ans.cauai.fun`<br>`haika-1757:/srv/ans-releases/ans-bd8876f3-20261017/` |
| `ecosystem-sites-archive/hb-infinite-canvas-api/` | **无限画布 AIGC 工作台后端源码**（OpenLux 生图 2点/张 + 火山方舟 `sd2.5`/`sd2`/`sd2fast` + ANS 积分核销） | `https://hb.cauai.fun/api`<br>`haika-1757:/opt/infinite-canvas/api/` |
| `ecosystem-sites-archive/hb-infinite-canvas-web/` | **无限画布 AIGC 工作台前端源码与构建脚本**（`src/web/` + `rebuild.sh` + `cutover.sh`） | `https://hb.cauai.fun`<br>`haika-1757:/opt/canvas-build/` |
| `ecosystem-sites-archive/ans-exam-quota-bridge/` | **ANS 跨站算力积分核销桥源码**（供 `hb`/`image2`/`zsm`/`kaogong` 统一调取 ANS 积分） | `haika-1757:127.0.0.1:4318` |
| `ecosystem-sites-archive/image2-cauai/` | **Image2 提示词案例库、生图工作台与扭蛋机全量源码** | `https://image2.cauai.fun`<br>`haika-niannian:/opt/image2-cauai/` |
| `ecosystem-sites-archive/zsm-photo-shoot/` | **VibePhoto 知微影像 AI 合影全量源码**（Next.js + `runtime/access.mjs` + `runtime/provider.mjs`） | `https://zsm.cauai.fun`<br>`kaogong:/var/www/zsm-photo-shoot/current/` |
| `ecosystem-sites-archive/kaogong-site/` | **公考行测申论 AI 伴学站与错题分析源码**（`kaogong` + `kaogong-public` + `exam-analysis-wrongbook`） | `https://kaogong.cauai.fun`<br>`kaogong:/var/www/kaogong/` |
| `ecosystem-sites-archive/resume-and-video-site/` | **个人 3D 简历与 AI 商业视频作品集源码**（轻量化归档，不含超大 `.glb`/`.mp4` 二进制包） | `https://resume.cauai.fun` & `https://video.cauai.fun`<br>`kaogong:/var/www/resume.cauai.fun/` |
| `ecosystem-sites-archive/pet-memorial-3d/` | **ANS 宠物 3D 打印手办与电子永生桌宠工程源码** | 本地研发工程 `pet-memorial/` |
| `ecosystem-sites-archive/ans-points-sdk/` | **ANS 统一算力积分客户端 SDK** | 本地研发工程 `ans-points-sdk/` |
| `ecosystem-sites-archive/haika-1757-infra/` | **主站网关 `cauai-entry`、APIC 计费桥 `apic-monitor`、3D Worker 归档** | `haika-1757:/opt/cauai-entry/` & `/opt/apic-monitor/` |
| `ecosystem-sites-archive/infra-systemd-nginx/` | **`kaogong` 与 `haika-niannian` 全部 Nginx 站点路由配置** | `/etc/nginx/sites-available/*` |
| `ai-video-skills-source/` | **全部 17 套自研与全局 Skills 源码**（含 `ans-ui-ux-baseline`、`oil-ui`、`oil-frontend`、`oil-cover`、`oil-visual`、`mg-styles-15`、`image2.5genskill`、`feishu-doc-publisher`、`agent-reach` 等） | `.agents/skills/` & `~/.gemini/config/skills/` |
| `docs/ops/` | **全部飞书台账 Markdown 原件 + 全局规则 `GLOBAL-GEMINI-RULES.md` + 发布状态手册** | 与飞书云文档 1:1 对应 |

---

## 三、Windows 电脑第 2 步：一键恢复 AI 规则与 17 套 Skills

在 Windows 电脑克隆好 `ans-platform` 后，在仓库根目录打开 **PowerShell** 运行以下脚本，即可把全部 **17 套 Skills** 和 **全局 `GEMINI.md` 铁律** 一键安装到 Windows 的 Antigravity / Codex / Claude 目录中：

```powershell
# 在 ans-platform 仓库根目录下执行（PowerShell）：
$GeminiRoot = "$HOME\.gemini"
$SkillsDest = "$GeminiRoot\config\skills"
$WorkspaceSkills = ".\.agents\skills"

New-Item -ItemType Directory -Force -Path $SkillsDest | Out-Null
New-Item -ItemType Directory -Force -Path $WorkspaceSkills | Out-Null

# 1. 恢复全部 17 套 Skills 到当前工作区 .agents/skills 及全局 ~/.gemini/config/skills
Copy-Item -Path ".\ai-video-skills-source\*" -Destination $WorkspaceSkills -Recurse -Force
Copy-Item -Path ".\ai-video-skills-source\*" -Destination $SkillsDest -Recurse -Force

# 2. 恢复全局 GEMINI.md 规则
Copy-Item -Path ".\docs\ops\GLOBAL-GEMINI-RULES.md" -Destination "$GeminiRoot\GEMINI.md" -Force

Write-Host "✅ 17 套 Skills 与全局 GEMINI.md 规则已完整恢复至 Windows 环境！" -ForegroundColor Green
```

---

## 四、Windows 电脑第 3 步：配置三台生产服务器 SSH 免密登录

将 Mac 上的两把部署私钥拷贝到 Windows 的 `C:\Users\<你的Windows用户名>\.ssh\server-deploy-20261016\` 目录：
1. `haika_niannian_ed25519`（用于登录 `haika-1757` 与 `haika-niannian`）
2. `kaogong_deploy_ed25519`（用于登录 `kaogong`）

然后在 `C:\Users\<你的Windows用户名>\.ssh\config` 中写入以下配置：

```ssh-config
Host haika-1757 haika-kidswear-1757
    HostName 38.76.193.254
    Port 22
    User root
    IdentityFile ~/.ssh/server-deploy-20261016/haika_niannian_ed25519
    IdentitiesOnly yes
    ServerAliveInterval 30
    ServerAliveCountMax 3

Host kaogong cizong-hermes-1802
    HostName 114.134.185.16
    Port 22
    User root
    IdentityFile ~/.ssh/server-deploy-20261016/kaogong_deploy_ed25519
    IdentitiesOnly yes
    ServerAliveInterval 30
    ServerAliveCountMax 3

Host haika-niannian haika-niannian-admin
    HostName 103.85.227.94
    Port 22
    User niannian-admin
    IdentityFile ~/.ssh/server-deploy-20261016/haika_niannian_ed25519
    IdentitiesOnly yes
    ServerAliveInterval 30
    ServerAliveCountMax 3
```

> **Windows 权限注意**：在 PowerShell 中对私钥执行一次权限收紧，防止 Windows OpenSSH 报 `Permissions are too open`：
> ```powershell
> icacls "$HOME\.ssh\server-deploy-20261016\*" /inheritance:r /grant:r "$($env:USERNAME):(R)"
> ```

---

## 五、当前已完成工作快照（截至 2026-10-20 00:50）

1. **项目精简与 3D 展厅纯化（已上线）**：
   - 已下架所有「念念」相关项目、`AIGC 动效作品集`、`童装动作迁移制作台`、`toonflow`、`one.cauai.fun`，AIGC 工作台唯一保留 `hb.cauai.fun`（无限画布）。
   - `/showcase/ans-3d/index.html` 已彻底移除创作者人物 3D 模型（`person.glb`）及眼动追踪计算，仅保留小恐龙吉祥物 3D 互动，且**小恐龙换装互动保持 100% 免费**。
2. **全站 AI 渠道切换与积分统一定价（已上线并通过三轮双盲终审）**：
   - **生图**：全站统一走 OpenLux 渠道 `image2`（`gpt-image-2-c`）与 `image2.5sunburst`（`gpt-image-2.5-sunburst-c`），单张统一定价 **2 积分/张（¥0.20）**，4K 正交四视图 **5 积分/次（¥0.50）**。
   - **生视频**：彻底停用 `zyai`，全站切换至火山方舟（Volcengine Ark）渠道，上架三模型：`sd2.5`（**50 积分/5秒 = 10点/秒**）、`sd2`（**30 积分/5秒 = 6点/秒**）、`sd2fast`（**15 积分/5秒 = 3点/秒**），取消旧 `1.5x` 暗扣倍率。
   - **主站工具与模型**：Tripo 3D 建模 **20 积分/次**；DeepSeek V4.1 Flash **1.5x 倍率**（输入 32.4 / 输出 129.6 积分/百万 Token）；小恐龙 Mimo V2.5 TTS 语音 **1 积分/次**（失败自动退费）。
   - **全站统一 ANS 积分账本**：`hb.cauai.fun`、`image2.cauai.fun`、`zsm.cauai.fun`、`kaogong.cauai.fun` 100% 走 ANS 统一账号与算力积分（`ans-exam-quota-bridge`），所有本地免费额度（月度3次、每日2次、10次免费开拍、免费视频周卡）均已清零。
3. **VibePlan 订阅会员 `1.21x ~ 1.50x` 算力膨胀（已上线）**：
   - 实付价格不变，赠送积分全面上调：`plan-week` ¥19 → **230 积分 (1.21x)**、`plan-month` ¥49 → **650 积分 (1.33x)**、`plan-quarter` ¥129 → **1,800 积分 (1.40x，3×600)**、`pro-week` ¥49 → **600 积分 (1.22x)**、`pro-month` ¥129 → **1,800 积分 (1.40x)**、`pro-quarter` ¥329 → **4,950 积分 (1.50x，3×1,650)**。

---

## 六、换到 Windows 电脑后的首条 AI 唤醒词（直接复制粘贴）

在 Windows 电脑打开编辑器后，直接向 AI 发送以下一段话即可无缝续接所有上下文：

```text
我已经从 Mac 切换到 Windows 电脑继续开发 ANS (AI Never Stops, https://ans.cauai.fun)。
请先读取仓库内的以下 4 份交接与基线文件，完整恢复上下文：
1. docs/ops/ANS-跨电脑Windows开发接力全指南-20261020.md
2. docs/ops/ANS-全站积分定价与毛利率总表-20261019.md
3. docs/ops/ANS-全站服务器拓扑与运维急救手册-20261020.md
4. docs/ops/ANS-上游渠道台账与产品矩阵规范-20261020.md
读取完毕后告诉我，我们继续推进 ANS 网站开发。
```
