# OpenLux gpt-image-2-c 能力清单（2026-08-24 实测）

基于真实 API 调用逐项验证，非猜测。

## 端点与模型
- Endpoint: `POST https://api.openlux.ai/v1/images/generations`
- Model: `gpt-image-2-c`
- Auth: `Authorization: Bearer <api_key>`
- Content-Type: `application/json`

## 尺寸 / 比例（实测全部成功）
| 请求 size | 实际返回像素 | 说明 |
|---|---|---|
| `1024x1024` | 1024x1024 | 方形 |
| `1536x1024` | 1536x1024 | 横向 |
| `1024x1536` | 1024x1536 | 纵向 |
| `2048x2048` | 2048x2048 | 2K 方形 |
| `4096x4096` | **2880x2880** | 本渠道 4K 上方上限为 2880 |
| `4096x2304` | **3840x2160** | 真 4K 横屏 (16:9) |
| `2304x4096` | **2160x3840** | 真 4K 竖屏 (9:16) 实测 ✅ |

> 注意：请求 `4096x4096` 实际返回 2880x2880，说明该渠道对 4K 方形有限制；想拿最大 4K 分辨率用 `4096x2304`（横屏 3840x2160）或 `2304x4096`（竖屏 2160x3840）。渠道 4K 像素上限约 9M，超过则降档到 3840×2160 / 2160×3840。

## 质量与输出
- `quality=high`：实测`支持（高清）。默认行为未指定时走渠道默认。
- `output_format=jpeg`：实测支持返回 JPEG（默认输出为 PNG base64）。
- 基础输出：`data[0].b64_json`（base64 字符串），可用 `base64.b64decode` 落盘。不支持 url 直链（实测 response_format=url 无效）。

## 图生图（改图）
- **方式**：在 `/v1/images/generations` 请求体加 `image` 参数：
  - `"image": "<data_uri>"`（单个字符串）✅ 实测可用
  - `"image": ["<data_uri>"]`（数组）✅ 实测可用
- data URI 格式：`data:image/png;base64,<base64>`
- prompt 里语言描述要改什么（如“将猫改成蓝色”“换成白底”）。
- **注意**：`/v1/images/edits`（multipart）不支持，实测报 `failed to parse multipart form`。全走 generations 接口。
- 参考图上限：单张已实测通过。多张参考图（数组多元素）上限未逐一实测；按 OpenAI gpt-image 惯例通常支持多张，但本渠道建议小规模逐步验证，不一次性塞大量图。

## 已知限制
- `n` 参数不支持（只能一次返回一张；`n=1` 即可，传 `n>1` 会失败）。如需多张，分开多次调用。
- 不支持 url 响应（必须接收 base64 再落盘）。
- 生成耗时较长（单张 30–75 秒），网络/上游也会波动，超时必须给足（≥300s）。

## 错误排查
- 429 + `upstream rejected the request`：通常是参数不被支持（例如内嵌 `<image>url</image>` 的旧式参考图写法、或 size 非法）。改用 `image` 参数、合法 size 重试。
- 500 + `failed to parse multipart form`：用了 `/images/edits`，改回 `/images/generations`。
- 时间太长被中断：脚本已在后台/长超时运行，参考 `generate_image.py` 的 http timeout 设置。