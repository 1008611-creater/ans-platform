---
name: niannian-zhijian
description: name: niannian-zhijian
---

---
name: niannian-zhijian
description: Build, improve, brand, deploy, and verify 念念智剪, the OpenChatCut-based AI video editor at edit.cauai.fun. Use for automatic rough cuts, MiMo ASR or TTS, Qwen forced alignment, captions, transitions, exports, editor-brand changes, public deployment, and integration with Niannian AI.
---

# 念念智剪

念念智剪是部署在 `https://edit.cauai.fun` 的独立 AI 剪辑器。把它作为念念 AI 的一键成片能力，而不是另做一层自定义包装前端。用户进入后应直接看到并使用剪辑器本体。

## 产品边界

- 主站 `ai.cauai.fun`、Cloudflare Tunnel、主站 Nginx 和 `niannian-ai` 服务是受保护边界。编辑器通过独立 Nginx 和 `edit-ai-openchatcut.service` 运行，任何编辑器发布都不得覆盖主站配置。
- 生产入口固定为 `https://edit.cauai.fun`。不要回退到本机 `127.0.0.1`，也不要购买或改用 `edit.ai.cauai.fun`。
- 用户明确要求保留原剪辑器功能与信息架构。不要制作额外的营销落地页、门户、复杂仪表盘或套壳前端。
- 先从线上基线建立独立候选包，只改用户请求涉及的编辑器文件；上线后保留回滚基线与对应 AGPL 源码包。

## 品牌

- 产品名使用“念念智剪”。修改时覆盖浏览器标题、favicon、顶栏文字、助手可见名称、移动端素材页和用户主动询问时的自我介绍。
- 使用用户指定的权威 Logo 源 `E:\codex\aisp\aidaihuo\github-selected-projects\deeptutor\web\public\niannian-logo.svg`，复制到编辑器的 `public/niannian-logo.svg` 后再引用。不要以 favicon、生成图或旧 OpenChatCut 图标替代它。
- 保留源码、上游许可证和兼容性说明的真实边界；产品默认不主动突出上游名，只有用户主动询问来源、开源或兼容性时才说明 OpenChatCut。

## AI 剪辑契约

- 语音合成和语音识别使用 MiMo，密钥只保存在服务器环境变量或用户本机私有环境文件中，绝不写入前端、日志、Skill 或源码包。
- 已知文案与实际音频的时间轴必须使用 `Qwen3-ForcedAligner-0.6B` 输出词级或汉字级时间戳。不要以 `Qwen3-ASR-0.6B`、普通 ASR 或平均分配时间戳替代强制对齐；ASR 仍由 MiMo 执行。
- 粗剪应先删除无意义的长停顿，再安排字幕、配音、镜头切点和转场。转场不能用来掩盖相邻片段之间过长的静音；保留必要语义停顿，避免形成明显断裂。
- 导出前确认预览代理、媒体路径、字幕时间轴与导出队列使用同一项目素材，不把可播放预览当作导出成功。

## 公网部署

- 当前服务链路为：`edit.cauai.fun -> Cloudflare Tunnel -> 127.0.0.1:19184 -> 独立 Nginx -> 127.0.0.1:18085 -> 编辑器服务`。不要修改主站 Tunnel token 或 `niannian-ai` 的服务配置。
- 公网 Vite 服务必须在 `vite.config.ts` 设置 `server.hmr: false`，并且 systemd 的启动命令不能加入 `--mode production`。这避免 React Fast Refresh 输出 `$RefreshReg$` 而浏览器缺少 preamble 时产生黑屏。
- 每次发布可见前端代码后，用真实公网浏览器打开首页和已有工程，检查标题、Logo、编辑器首屏和控制台错误。构建通过或 HTTP `200` 不是验收。
- 上游合并或新增服务能力后，先在 `server/plugins/index.ts` 确认每个新增插件只装配一次，再对每个新增 POST 路由做只读方法探针（GET 应返回 405，不能为了探针调用真实 Provider），最后继续真实公网浏览器验收。设置页或源码入口存在，不代表后端能力已经可用。
- 每个上线版本同步生成对应的 AGPL 源码压缩包，更新 `/open-source/` 入口；排除 `.env`、凭据、用户上传媒体和运行时私有数据。

## 执行顺序

1. 确认用户要的是剪辑能力、品牌、导出、供应商接入还是部署；保留不相关的主站和已批准剪辑器界面。
2. 在独立候选包实现最小改动。涉及 AI 时保持 MiMo ASR/TTS 与 Qwen 强制对齐的职责分离；涉及品牌时使用权威 Logo。
3. 发布后通过公网真实路径验证编辑器，确认 `edit-ai-openchatcut`、`nginx` 和 `niannian-ai` 均正常，再更新开源源码下载包并报告用户可直接使用的入口。
