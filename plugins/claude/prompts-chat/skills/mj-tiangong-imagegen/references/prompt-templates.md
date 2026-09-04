# V8.2 天宫提示词模版（自然语言五层结构）

V8.2 吃自然语言描述句。每条提示词按五层展开，全部成句，不用关键词堆砌：

```text
[1 主体与事件] —— 画面里是什么、在做什么，一句话点明唯一主奇观
[2 空间与机位] —— 机位高度/距离/仰俯、前景中景远景的遮挡与纵深关系、人物尺度占比
[3 风格锚点] —— 只选一个：电影级写实数字绘景 / 真人实景观感 / 高端影视概念设计
[4 光线与色彩] —— 唯一主光的方向与冷暖、云顶云底色差、克制的色盘
[5 材质与氛围] —— 木/瓦/石/丝绸质感、空气透视、庄严静谧的情绪
```

规则：
- 画幅与机位语义要写进正文（"low eye-level wide view" / "vertical composition"），不只靠 `--ar` 标签。
- 排除项不进正文，全部放 `--no`。
- 人物尺度写具体百分比（"under five percent of frame height, only for scale"）。

---

## 模版一：天宫场景母图（9:16 竖版，漫剧默认）

```text
Vertical cinematic establishing shot of a Chinese celestial palace, [主奇观：如 a colossal circular heavenly gate rising above an endless cloud ocean]. [机位：Low eye-level wide view from a white stone terrace in the foreground], a broad stairway leading the eye toward the gate, foreground terrace and drifting mist clearly separated from the mid-ground colonnade and the far cloud horizon. [人物：Exactly three tiny immortals in flowing hanfu standing on the platform, under five percent of frame height, only for scale, with visible contact shadows]. Clouds act as real volumetric terrain, lifting the palace and catching the backlight, warm champagne light on cloud tops and cool blue-gray in shadow. Restrained palette of cloud white, pale stone and muted vermilion with touches of gold. High-end photorealistic film environment concept art, deep focus, serene monumental atmosphere
--v 8.2 --ar 9:16 --raw --stylize 500 --chaos 12 --hd --no text, watermark, logo, giant moon, extra spectacle, western palace, plastic CGI
```

## 模版二：角色定妆（3D 国漫天兵/仙人，9:16）

```text
Full-body character design sheet of [角色：a young heavenly soldier named Chen Qing], standing in a restrained neutral pose on a clean studio floor with soft contact shadow, seen from head to feet. [外貌：semi-realistic animated face with clean sculpted planes, grouped sculptural hair strands, wearing layered silver-white celestial armor with battle-worn cracks and faint blood traces over dark inner robes, a long straight sword at his side]. Traditional Chinese cross-collar garment logic, matte silk and weathered metal materials clearly separated, soft single key light from upper left, bright clean neutral background with slight depth. High-end 3D animation character final frame, not a photograph, not a portrait
--v 8.2 --ar 9:16 --raw --stylize 250 --chaos 5 --hd --no text, watermark, logo, photorealistic human skin, celebrity face, game UI, extra characters
```

## 模版三：道具档案（方形）

```text
Single prop asset sheet of [道具：a straight celestial sword with worn blade and blood stains, beside three small inner-flying swords], displayed alone on a clean neutral studio surface, three-quarter view, no hands and no characters. Clear material separation between polished metal, leather grip and silk tassel, soft studio key light with gentle shadow. High-end 3D animation prop design final frame
--v 8.2 --ar 1:1 --raw --stylize 250 --chaos 3 --hd --no text, watermark, logo, characters, hands, background scenery
```

## 模版四：战场/动作环境（南屿山类，9:16）

```text
Vertical cinematic wide shot of an ancient battlefield on a southern mountain, celestial soldiers in silver armor clashing with beast demons amid broken clouds and drifting smoke, one blood-soaked young soldier standing as the focal point in the lower third. High-angle view descending into the melee, layered depth from foreground wreckage to mid-ground clash to far shattered cloud horizon, figures small and scattered in clear group shapes. Single cold overcast key light with one warm break through smoke, restrained palette of steel gray, dark crimson and pale cloud. High-end photorealistic film environment concept art, deep focus, grim epic atmosphere
--v 8.2 --ar 9:16 --raw --stylize 500 --chaos 15 --hd --no text, watermark, logo, modern objects, game UI, character close-up
```

---

## 使用守则

1. 方括号 `[...]` 是槽位，用资产清单里的事实替换，一次只换一个主奇观。
2. 同系列资产：正文五层尽量冻结，只换主体层；风格一致性靠 `--sref`（见 reference-image-playbook）。
3. 每条提示词交付时必须附参数串与参考图清单（三件套），不允许只给正文。
