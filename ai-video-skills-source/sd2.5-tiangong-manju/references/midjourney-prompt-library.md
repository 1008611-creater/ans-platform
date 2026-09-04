# Midjourney 天宫巨构参考提示词库（A–J 十模块）

> ⚠️ **已废弃（2026-08-24）**：本库为 V6/V7 关键词式写法，与 Midjourney V8.2 现行语法（自然语言成句、禁画质词、正文禁否定句、`--cref` 废除改 `--oref`）不兼容。新权威见 `mj-tiangong-imagegen` Skill。本文件仅作构图与题材的历史参考。

依据 `design-xianxia-celestial-shots/references/midjourney-celestial-palace-rules.md` 的 A–J 稳定模块与组装顺序编译，每条都是可直接复制提交的成品。使用原则：

- 一条提示词 = 一个主空间事件，不混搭多个模块的奇观。
- 系列相邻镜头至少改变构图/机位/主奇观/时间/人物策略中的三项。
- 需要锁定风格时，在自己已验收的图上加 `--sref <URL>`；不垫第三方版权图。
- 画面太乱 → 降 `--chaos` + 删次要元素；建筑西化 → 正向加 `strictly oriental Chinese xianxia palace architecture, layered flying eaves and dougong brackets`。

负面基线（各条已内嵌，按需裁剪）：
```text
--no text logo watermark signature neon cyberpunk western castle European palace western dome cathedral sci-fi spaceship anime cartoon plastic water flat fog oversized figures character close-up
```

---

## A. 极简圆门 / 仙人指路

核心事件：从巨大圆形开口看见云海、低太阳、远山宫阙。画幅 16:9，人物右下三分之一。

```text
16:9 cinematic Chinese xianxia film still, eye-level 35mm lens, a monumental circular opening in a weathered stone celestial gate occupying seventy percent of frame, through it an endless cloud ocean under a low soft sun with distant mountain palaces, exactly two tiny robed immortal figures under four percent of frame height standing at lower right third only for scale, an ancient windswept pine branch crossing the upper right, ivory pale gold soft gray-blue deep pine green palette with huge negative space, subtle asymmetry, matte stone and silk texture, volumetric haze, serene sacred minimal atmosphere, high-end photorealistic concept art --ar 16:9 --raw --stylize 210 --chaos 5 --hd --no text logo watermark neon cyberpunk western castle portal glow ellipse broken ring thin flat circle oversized figures character close-up clutter
```

## B. 天宫柱廊 / 长廊 / 云巅

核心事件：巨柱与檐下空间把人压成极小尺度，一点透视收向云海。画幅 16:9，低机位。

```text
16:9 cinematic Chinese xianxia film still, low eye-level 24mm wide lens from beneath a colossal traditional timber corridor, monumental vermilion columns with layered dougong brackets receding to one vanishing point, architecture occupying sixty percent of frame with beams and glazed tile eaves cropping the top, open cloud sea negative space on the right, one tiny rear-facing adult immortal in moon-white hanfu under three percent of frame height for scale, mirror-polished pale jade floor with soft broken reflections, warm sunrise side light with golden rim on eaves, restrained ivory pale jade teal and gold palette, realistic carved wood weathered bronze polished stone, deep atmospheric perspective, serene monumental atmosphere --ar 16:9 --raw --stylize 260 --chaos 8 --hd --no text logo watermark western castle European palace flat fog plastic CGI oversized figures character close-up
```

## C. 水上天宫 / 天河 / 海阁

核心事件：低水线看白玉宫池，软破碎反射。画幅 16:9，水面占下半部。

```text
16:9 cinematic Chinese xianxia film still, low waterline 28mm lens, a white jade celestial palace terrace floating on a calm celestial river occupying the lower half, tiny immortal figures on mid-ground bridges far from camera, distant floating karst peaks and pavilions cut apart by drifting fog, soft broken wet-jade reflections with subtle ripples on the water surface not a perfect mirror, cloud white pale jade celadon ivory palette with a single coral-red sleeve accent, cool diffused morning light with one warm break, deep atmospheric perspective, serene dreamlike atmosphere, high-end photorealistic fantasy environment --ar 16:9 --raw --stylize 240 --chaos 10 --hd --no text logo watermark western castle perfect mirror reflection swimming pool aquarium artificial water plastic water flat fog oversized figures
```

## D. 宗门 / 雨后桥 / 山林岩盖

核心事件：雨后白玉桥或天然岩盖下的可居住仙境。画幅 16:9，冷白天光+窄暖阳破口。

```text
16:9 cinematic Chinese xianxia film still, 28mm lens after rain, a long white jade bridge crossing a deep cloud valley beneath a natural limestone overhang with layered palace terraces grown into the cliff, tiny figures under three percent of frame crossing the bridge, distant palace districts waterfalls and a lone white crane only as depth layers, cool overcast daylight with one narrow warm sun break, wet stone with broken reflections, cloud white pale stone teal palette, realistic weathered rock and timber, deep atmospheric perspective, vast negative space of fog, tranquil living immortal-realm atmosphere --ar 16:9 --raw --stylize 240 --chaos 10 --hd --no text logo watermark western castle flat fog muddy colors railings oversized figures character close-up
```

## E. 落霞 / 青鸾 / 空中灵禽

核心事件：两侧宫亭夹出开阔云隙，一只青鸾横飞。画幅 21:9 超宽。

```text
21:9 ultra-wide cinematic Chinese xianxia film still, 40mm lens, two symmetric palace pavilions framing a wide open cloud gap at the sides while two thirds of frame belong to sky cloud valley and bright distant horizon, one single azure luan phoenix with one head one body two spread wings two tucked legs one continuous long tail flying across the gap at clear distance, tiny robed figures on the pavilion terraces under three percent of frame, dusk gold and cool blue-gray palette, soft backlight on cloud tops, deep atmospheric perspective, serene epic atmosphere --ar 21:9 --raw --stylize 280 --chaos 12 --hd --no text logo watermark western castle extra heads extra wings fused birds bird landing on roof cute pet oversized figures
```

## F. 洪荒能量瀑布（无建筑无生物）

核心事件：熔金神性能量瀑布从裂天坠入赤云海。画幅 9:16 强垂直，人物 <0.8%。

```text
9:16 vertical cinematic Chinese honghuang film still, compressed telephoto 85mm lens, a molten golden energy waterfall falling vertically from a rift in the burning sky into a crimson cloud ocean, the energy cascade as the only subject, one tiny silhouette under one percent of frame at the very bottom only for scale, strong vertical vanishing direction, bronze dark red charred black molten gold and white-hot core palette, immense scale and heat haze, deep atmospheric perspective, awe-inspiring primordial atmosphere --ar 9:16 --raw --stylize 380 --chaos 22 --hd --no text logo watermark buildings creatures constructed objects lava river horizontal flow anime cartoon
```

## G. 天梯 / 竖向奔赴

核心事件：白玉天梯向云海星河坠落或上升。画幅 9:16，越肩俯瞰。

```text
9:16 vertical cinematic Chinese xianxia film still, over-the-shoulder 60mm lens looking down along an almost vertical white jade celestial stairway plunging toward a cloud ocean and a distant celestial city, one tiny rear-facing immortal climbing the stairs under three percent of frame, continuous unbroken stair edges with strong high-altitude compression, star mist and drifting clouds serving only as leading lines, cold blue-silver palette with faint warm gold at the far end, deep atmospheric perspective, vertigo and pilgrimage atmosphere --ar 9:16 --raw --stylize 280 --chaos 10 --hd --no text logo watermark western castle broken stair floating steps oversized figures face close-up flat fog
```

## H. 月宫露台 / 俯瞰对照

核心事件：仙宫露台上的背影女神俯瞰云海下的灯火或大地弧线。画幅 16:9，冷蓝夜+低饱和金边。

```text
16:9 cinematic Chinese xianxia film still, night 35mm lens from a moon palace terrace, one rear-facing goddess silhouette in flowing robes standing at the terrace edge under eight percent of frame, looking down over an endless night cloud sea toward faint distant lights below, cool moonlit terrace in the foreground against the far world in layered depth, cold blue night palette with low-saturation gold edge light, no neon cyberpunk glow, soft moon backlight and deep atmospheric perspective, solemn fate-like final-chapter atmosphere --ar 16:9 --raw --stylize 260 --chaos 8 --hd --no text logo watermark neon cyberpunk western castle aurora overload oversized figures face close-up
```

## I. 神兽托城 / 玄武 / 鲲城

核心事件：神兽本身即巨构，背负宫殿穿越云海。画幅 16:9，神兽占画面中心。

```text
16:9 cinematic Chinese xianxia film still, 32mm lens, a colossal divine tortoise-black tortoise carrying an entire celestial palace city on its shell drifting through an endless cloud ocean, the beast occupying the absolute center and half the sky, palace roofs bridges and white jade structures firmly rooted on the shell not floating, tiny figures on the palace terraces under two percent of frame, clear separate materials of scales shell clouds golden tiles and white jade bridges, warm dusk side light with gold rim on shell ridges, bronze gold cloud-white palette, deep atmospheric perspective, monumental mythic atmosphere --ar 16:9 --raw --stylize 320 --chaos 16 --hd --no text logo watermark western dragon monster attack cute pet toy look western castle oversized figures character close-up
```

## J. 沙海蓬莱 / 废墟天宫 / 飞天巨门

核心事件：荒漠或云海中浮现悬浮天宫，城墙如山脉延展。画幅 16:9，人物 tiny as dust。

```text
16:9 cinematic Chinese xianxia film still, 40mm lens, a floating celestial palace city emerging above a vast empty desert like a mountain range, immense walls and towers stretching beyond frame edges, tiny human figures as dust at the bottom only for scale, golden early morning soft backlight, sand white pale gold and cool shadow palette with restrained vermilion accents, no sci-fi beams or glowing particles, deep atmospheric perspective and huge negative space of desert, awe and pilgrimage atmosphere --ar 16:9 --raw --stylize 280 --chaos 12 --hd --no text logo watermark sci-fi spaceship neon glowing particles western castle oversized figures character close-up
```

---

## 使用备注

- 本库为**参考弹药**，正式进入生产（S3 资产）时，每条仍需过 `chinese-celestial-palace` 质量门（总分 ≥85，无建筑/云/尺度/主光/文字/多奇观硬失败）才能写入 `asset_manifest`。
- 竖版抖音镜头（9:16）优先用 F、G 两条的竖向压迫结构；A/B/C/D 需重构为竖向时按 `style-bible.md` 第二节"漫剧适配调整"处理。
- 每跑出一张满意图，把该图的 `--seed` 记回本文件对应模块，供系列复现。
