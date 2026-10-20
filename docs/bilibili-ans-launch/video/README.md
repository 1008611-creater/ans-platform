# B站视频生产线（全自动出片）

> 目标：让「大肥鱼在ANS当运营」这个账号**每天能持续出片**，而不是只有 Day0 就断更（对标账号 Claude大小姐 Day0 34 万 → Day2 跌到 1.36 万，断更/降质是主要死因）。

## 一条命令出一天

```powershell
python make_day.py --day 2 --title "【Day 2】让五个模型互相改提示词，改完是涨分还是掉分"
```

自动完成：**配音 → 渲染 → 响度归一(-14 LUFS) → 抽帧质检 → 封面 → 发布文案**。
分镜只写一个 JSON（见 `days/day1.json`），其余全部自动。

## 文件地图

| 文件 | 作用 |
|---|---|
| `engine.py` | 画布/字体/精灵/截图/品牌条/进度条/清单/迷你图集等基础件 |
| `render.py` | 时间轴渲染（帧直接管道给 ffmpeg，不落盘），按 `ANS_TIMELINE` / `ANS_DAY_LABEL` / `ANS_OUT_PREFIX` 参数化 |
| `audio.py` | numpy 合成芯片音乐 BGM + 6 个音效（无外部素材依赖） |
| `build_vo.py` | edge-tts 逐镜配音（**按天分目录**，避免跨天复用旧音频） |
| `loudness.py` | 响度归一（实测原混音仅 -19.3 LUFS，偏小 5dB） |
| `qc.py` | 逐镜抽帧质检联络表 |
| `make_cover.py` | 封面（参数化：标题三行 / 副标题 / 角标 / 主角帧） |
| `make_day.py` | **每日一键出片**主入口 |
| `publish.py` / `publish.ps1` | 基于 `bilibili_api.VideoUploader` 的发布（B站 CLI 无上传命令，故自建） |
| `day1/` | Day1 实测数据与评分脚本（含原始输出 JSON） |
| `day2/` | Day2 同行评审实验（互相改提示词 → 重考） |

> 生成物（MP4 / 配音 / 截图 / 帧序列）**不入库**，见 `../.gitignore`；脚本可完整复现。

## 已出成片

| 期 | 时长 | 内容 | 数据来源 |
|---|---|---|---|
| Day 0 | 90.5s | 账号人设 + 128 个像素表情 + ANS 真实产品截图（含像素世界地图）+ 双形态 | 自研像素 IP |
| Day 1 | 80.8s | **五个模型同考一题**：统一 Prompt、单轮、禁工具、每模型 3 次采样 | **真实 API 实测**（15 次调用） |

Day1 结果（五维加权，满分 100）：DeepSeek V4.1 Flash **98** ｜ GLM-5.3 93 ｜ Kimi K2.7 87 ｜ Qwen3.8-27B 78 ｜ Hunyuan Hy4 75。
规则、评分口径与**原始输出**全部公开在 `day1/raw.json` / `day1/scores.json`，发布时配同目录的评分长图。

## ⛔ 唯一的阻塞点（人工）

1. 注册 B站账号「大肥鱼在ANS当运营」（需手机号 + 实名）；
2. `bili login` 扫码登录。

之后 `pwsh -File publish.ps1` 即可发布。详见 `PUBLISH-SOP.md`。
