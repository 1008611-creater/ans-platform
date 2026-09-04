---
name: agnes-video-gen
description: |
  Agnes生视频 — 用 Agnes Video 2.5 / 2.5 Flash API 直接生成 AI 视频，支持文生视频、首尾帧控制、参考图生成，本地图片自动上传，任务轮询，成片自动下载。
  触发词：「agnes生视频」「agnes video」「agnes出视频」「用agnes抽卡」「agnes flash」「用 agnes 生成视频」「agnes API 出片」。
  关键事实：Flash 版限时免费（720P/4-12秒）；标准版 $0.025~0.055/秒；官方无上传端点，本地图片默认自动传免 Token 的 catbox 获得公网 URL；不必走 Pavo 画布，API 可直连。
---

# Agnes 生视频 Skill

用 Agnes AI 官方 API 直接生成 AI 视频。不走画布，脚本化调用，适合批量抽卡和工作流接入。

## 一、前置准备（首次使用）

### 1. Python 解释器（重要）
**不要用默认的 `python`**（workbuddy 内置 Python 3.13 标准库残缺，缺 gettext/random 等模块）。统一用系统 Python 3.12：

```bash
PY312="/c/Users/lsb/AppData/Local/Programs/Python/Python312/python.exe"
```

下文所有命令中 `$PY312` 即指该解释器。若路径失效，用 `where python` 重新找一个能跑 `python -c "import argparse"` 的解释器。

{删除那句重复的“并在更新后的 SKILL.md 里把”那句，把原本的配置保留}

## 二、三种模式

| mode | 用途 | 必传 | 禁传 |
|---|---|---|---|
| `text` | 纯文生视频 | 仅提示词 | 任何媒体参数 |
| `keyframe` | 首帧/尾帧控制 | `--first-frame` 或 `--last-frame` 至少一个 | `--images` |
| `reference` | 参考图生成 | `--images` 至少一张（≤5张） | 首尾帧参数 |

模型与分辨率：

| 模型 | 分辨率 | 价格 | 场景 |
|---|---|---|---|
| `agnes-video-2.5-flash`（默认） | 仅 720P | **限时免费** | 预演、抽卡、测提示词 |
| `agnes-video-2.5` | 720P/960P/2K | $0.025/$0.040/$0.055 每秒 | 正式成片 |

通用限制：单次 4~12 秒；`aspect_ratio` 支持 `21:9 16:9 4:3 1:1 3:4 9:16`；一次只能出 1 条（并行多抽就多次调用）。当前账号实测接口限流为约 1 request/minute；提交超时不要立即重复提交，避免异步任务重复创建。

## 三、标准用法

### 1. 文生视频（免费预演）

```bash
"$PY312" "C:/Users/lsb/.workbuddy/skills/agnes-video-gen/scripts/agnes_video.py" text \
  --prompt "少女站在天宫朱红立柱前，侧脸逆光，金色云海翻涌，体积雾，电影感" \
  --ar 9:16 --seconds 5
```

### 2. 首帧控制（本地图片自动上传）

```bash
"$PY312" "C:/Users/lsb/.workbuddy/skills/agnes-video-gen/scripts/agnes_video.py" keyframe \
  --prompt "镜头缓慢推进，纱衣与发丝随气流飘动，光尘颗粒上升" \
  --first-frame "./shot01.png" --ar 9:16
```

### 3. 参考图保持角色一致（最多5张）

```bash
"$PY312" "C:/Users/lsb/.workbuddy/skills/agnes-video-gen/scripts/agnes_video.py" reference \
  --prompt "以 <Picture 1> 中的角色为准，保持外观与服装完全一致，缓步走过白玉回廊" \
  --images ./character.png --ar 9:16
```

提示词中引用素材：`<Picture N>` / `<Audio N>` / `<Video N>`，编号从 1 开始。

### 4. 标准版出正式 2K 成片

```bash
"$PY312" "C:/Users/lsb/.workbuddy/skills/agnes-video-gen/scripts/agnes_video.py" keyframe \
  --prompt "..." --first-frame "./shot01.png" \
  --model agnes-video-2.5 --size 2K --ar 9:16
```

成片默认保存到 `E:\agnes\<video_id>.mp4`（skill 已把默认输出目录固定为 E:\agnes），可用 `--out` 指定其他目录。

## 四、批量抽卡（多次生成）

脚本单次出一版，需要多抽就循环调用：

```bash
for i in 1 2 3; do
  "$PY312" "C:/Users/lsb/.workbuddy/skills/agnes-video-gen/scripts/agnes_video.py" text \
    --prompt "..." --ar 9:16 --out "./agnes_output/take$i"
done```

**成本闸门**：批量调用前必须先与用户确认次数与模型（Flash 免费可放开，标准版必须明确授权）。

## 五、异常处理

| 现象 | 原因与处理 |
|---|---|
| `缺少 AGNES_API_KEY` | 未配置环境变量，见前置准备 |
| `401` | Key 无效或过期，去 platform 重建 |
| `400 size must be 720P` | Flash 只支持 720P，换标准版或去掉 --size |
| `400 images length must not exceed 5` | 参考图超过 5 张 |
| 模式字段冲突 400 | 对照第二节模式表，清理禁传参数 |
| 图床上传失败 | 脚本默认 catbox、失败自动降级 uguu（均免 Token）；catbox 拒绝非浏览器 UA |
| 媒体素材拉取失败 | URL 必须公网可访问、无需登录、任务完成前不过期 |
| reference 提交卡死/超时 | **双根因实测**：① 参考图太大（约7MB大图会让提交挂住）→ 脚本对>1.5MB本地图自动压成长边1280 JPEG；② **图床选错**：catbox 在国内能传但 Agnes 后端拉不到会永久挂起（POST 永不返回）。脚本默认已改为 uguu 图床（Agnes 可正常回源）。若手动传 URL，务必用 Agnes 能拉到的图床（uguu 已验证可用），不要直接用 catbox 链接 |
| Python urllib 提交超时 | 本机若有系统代理（HTTPS_PROXY），`urllib` 经代理访问 apihub 的 TLS 会被断。脚本已改用系统 `curl` 通道（curl 实测稳定）。无 curl 时降级 urllib |
| `429 rate_limit_exceeded` | 当前账号约 1 次/分钟，等满 1 分钟再发；提交超时不要立即重投 |

## 六、注意

- 免费是限时促销，政策可能调整；量产前先确认当前价格。
- **参考图务必小图**：>1.5MB 的本地图脚本会自动压缩；手动传 URL 时自己先压到长边 ≤1280、几百 KB 以内。
- uguu 链接保留期短（约几天），只适合当次提交后立即消费，不要长期引用。
- API Key 不要提交到代码仓库或回显到对外内容。
- 输入视频时长会计费（标准版），参考图前 5 张免费、超出每张 $0.005。
- 涉及正式付费出片的项目（如天宫漫剧），出片动作需项目 owner 当次授权。
