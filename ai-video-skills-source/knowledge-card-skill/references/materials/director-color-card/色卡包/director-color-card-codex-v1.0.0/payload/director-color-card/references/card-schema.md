# 导演色卡字段协议

每张卡必须使用以下 ASCII 标记，中文内容写在冒号后。ASCII 标记用于跨平台自动校验。

```markdown
## D001 | 中文名 / Latin Name

- [FILMS]: FILM1=《片名》；FILM2=《片名》；FILM3=《片名》
- [PALETTE_BASIS]: 导演综合 / 电影专属《片名》
- [VISUAL_DEFINITION]: 一句话定义
- [BEST_FOR]: 适用题材、情绪、场景和时长
- [NARRATIVE_ENGINE]: 冲突或情绪如何被推动
- [FRAMING]: 画幅、构图、景别、机位、空间
- [CAMERA_MOTION]: 类型、速度、触发、停止
- [BLOCKING_PERFORMANCE]: 人物调度、视线、表演强度、环境响应
- [FILM_COLOR_SOURCES]: 代表电影中的色彩观察点
- [COLOR_SWATCHES]:
  - 中文色名 `#RRGGBB` | 20% | CARRIER: 典型载体 | ROLE: 叙事作用
- [LIGHTING_TONE]: 光源、软硬、色温、曝光、对比、黑位、肤色
- [PRODUCTION_DESIGN]: 场景、服装、道具、天气、材质
- [GRADING_RECIPE]: 高光、中间调、阴影、肤色、局部色、颗粒
- [EDITING_RHYTHM]: 镜长、剪辑依据、转场、留白
- [SOUND_LANGUAGE]: 对白、环境音、拟音、音乐、静默
- [SEEDANCE_MOTION]: 时间中的动作、运镜、环境响应、结束状态
- [STYLE_ANCHORS]: A1=...；A2=...；A3=...；A4=...；A5=...
- [AVOID]: N1=...；N2=...；N3=...；N4=...；N5=...
- [COPY_BLOCK]: 可直接复制的紧凑风格模块
```

规则：代表电影或综合色彩依据 1–5 项；固定 6 个色块；色块占比总计 100%；HEX 是近似值，不代替自然语言；电影专属卡必须写明片名。
