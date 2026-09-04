---
id: skill-ai-video-prompt-generator
title: AI视频提示词生成 Skill
type: skill
category: AIGC视频 / 提示词工程
tools: ["video-prompt", "storyboard", "visual-board", "script", "image-to-video", "text-to-video"]
platforms: ["可灵", "即梦", "Seedance", "Runway", "Pika", "海螺", "通用"]
tags: ["AI视频", "视频提示词", "电影感", "图生视频", "文生视频", "分镜", "人物真实感", "微表情", "角色一致性"]
version: 1.0
updatedAt: 2026-06-28
---

# AI视频提示词生成 Skill

## 1. Skill定位

本 Skill 用于把用户的普通想法、剧本片段、图片参考、分镜需求，转化为可以直接用于 AI 视频生成工具的高质量提示词。

适合场景：

- 文生视频提示词
- 图生视频提示词
- AI短剧分镜提示词
- 人物出场提示词
- 产品广告视频提示词
- 电影感镜头提示词
- 多镜头连续视频提示词
- 人物微表情与动作控制
- 角色一致性视频生成
- 去除 AI 视频中的油腻感、塑料感、NPC 感

核心目标：

> 不只写“画面长什么样”，而是写清楚：谁在动、为什么动、怎么动、镜头怎么拍、情绪怎么变化、环境如何参与叙事。

---

## 2. 触发方式

当用户出现以下需求时，启动本 Skill：

```text
帮我写一个视频提示词
帮我把这个画面变成视频提示词
帮我做图生视频提示词
帮我把剧本转成AI视频提示词
帮我写可灵/即梦/Runway/Pika/Seedance提示词
帮我写电影感视频提示词
帮我写人物出场视频提示词
帮我让人物动作自然一点
帮我让AI视频更真实
帮我做分镜视频提示词
```

---

## 3. 总体工作流

### 3.1 输入判断

先判断用户输入属于哪一类：

| 输入类型 | 处理方式 |
|---|---|
| 只有一句想法 | 补全人物、场景、动作、镜头、情绪、环境 |
| 有剧本 | 拆成板块/分镜，每个板块独立生成 |
| 有图片 | 走图生视频逻辑，锁定构图、主体、光影，只驱动微动作 |
| 有角色设定 | 先建立角色资产，再写视频提示词 |
| 有多个镜头 | 统一角色/风格/画幅，逐镜头只写变化 |
| 想要电影感 | 加入镜头位置、光影关系、环境叙事、情绪收尾 |
| 想要真实人物 | 加入行为动机、身体联动、微表情、呼吸感 |
| 想要人物登场 | 使用“场景铺垫 → 镜头发现人物 → 焦点变化 → 情绪反应” |

---

## 4. 核心写作原则

### 4.1 不写结果，写过程

错误：

```text
一个女人很伤心。
```

正确：

```text
女人低头站在窗边，眼神短暂停顿，手指无意识地捏紧衣角，胸口轻微起伏，嘴唇抿住，像是在压住即将爆发的情绪。
```

---

### 4.2 不宣告情绪，拆解情绪

| 不推荐 | 推荐改写 |
|---|---|
| crying | 眼眶泛红、眨眼变慢、泪水停在下眼睑 |
| angry | 下颌收紧、指节发白、呼吸变重 |
| nervous | 眼神游移、手指摩擦、肩膀轻微紧绷 |
| happy | 嘴角微微上扬、眼神变柔、肩膀放松 |
| shocked | 瞳孔放大、眉毛轻抬、呼吸停顿半秒 |

---

### 4.3 动作必须有因果

错误：

```text
男人看向四周，手动来动去。
```

正确：

```text
男人听到门外传来轻微脚步声，动作停顿半秒，随后缓慢抬眼看向门口，右手下意识握紧桌边，肩膀轻微绷紧。
```

动作链建议：

```text
起始状态 → 触发原因 → 预备动作 → 主动作 → 结束定格 → 细微反应
```

---

### 4.4 环境必须参与叙事

错误：

```text
漂亮的房间，电影感。
```

正确：

```text
昏暗的高层酒店房间，窗外冷蓝城市光透进室内，在玻璃窗上反射出破碎的人影。室内一盏暖色台灯只照亮人物半张脸，暗部保留细节，空间狭窄压迫。
```

常用环境叙事元素：

```text
雨水、雾气、浮尘、烟雾、水蒸气、窗外城市光、霓虹反射、火光律动、衣袖轻晃、发丝飘动、草叶摆动、玻璃反光、地面积水、门缝光线
```

---

### 4.5 镜头要稳定，动作要克制

AI视频更适合：

```text
static camera
slow push in
subtle handheld movement
medium shot
close-up
shallow depth of field
single continuous shot
```

谨慎使用：

```text
快速环绕、大幅推拉、复杂摇移、多人同时大幅动作、快速打斗、镜头频繁切换
```

---

## 5. 通用视频提示词公式

### 5.1 最小可用公式

```text
[场景时间]，[主体身份]正在[动作事件]。
镜头采用[景别/机位/焦段]，以[运镜方式]拍摄主体。
[主要光源]形成主体轮廓，[辅助光源]补充面部或身体细节。
环境中加入[动态介质]，增强真实空间感。
动作结束后，角色[情绪收尾动作]。
整体风格为[视觉风格]，[画幅比例]，[画质限制]。
```

### 5.2 导演级公式

```text
高阶视频提示词 =
基础景别与主体
+ 面部微表情序列
+ 协同肢体小动作
+ 环境物理动态
+ 摄影与光影风格
+ 情绪收尾
+ 画质限制
```

### 5.3 电影感九要素公式

```text
场景时间 + 主体身份 + 动作事件 + 镜头位置 + 镜头运动 + 光影关系 + 环境细节 + 情绪收尾 + 画面质感限制
```

---

## 6. 标准输出结构

当用户没有指定格式时，默认输出以下结构：

```markdown
## 视频提示词

### 成片方向
[一句话说明这条视频的核心画面和情绪]

### 基础设定
- 主体：[人物/产品/动物/物体]
- 场景：[地点、时间、天气、空间关系]
- 情绪：[起始情绪 → 变化情绪 → 结束情绪]
- 风格：[电影感/写实/商业广告/古风/赛博朋克/纪录片等]
- 比例：[9:16 / 16:9 / 1:1 / 2.39:1]

### 中文提示词
[完整中文视频提示词]

### 英文提示词
[完整英文视频提示词，适合直接复制进视频工具]

### 负面约束 / 避免事项
[不要变脸、不要多手、不要夸张表演、不要卡通CG感等]

### 可调参数
- 镜头：
- 光影：
- 情绪：
- 动作幅度：
- 画面比例：
```

---

## 7. 板块式视频提示词模板

适合多镜头、多场景、短剧、广告片。

### 板块一：[一句话场景摘要]

```markdown
【基础设定】
角色1：[外貌、服装、标志性特征、性格/气质]
角色2：[外貌、服装、标志性特征、性格/气质]

【道具】
[关键道具：外观、状态、与人物/事件的关系]

【场景】
[地点、时间、天气、空间布局、氛围细节]

【声音】
不需要配乐，仅保留同期声。

【氛围与画质】
风格核心：[风格关键词] + 电影级质感 + 超写实 + 真人实景拍摄 + 杜绝游戏CG感
视觉基调：[摄影机型号] + [镜头型号] + [动态模糊/胶片颗粒/浅景深]
色彩与影调：[主色调] + [光线描述] + [明暗/饱和/对比] + [画幅比例]
风格参考：[导演/影视参考，可选]

【画面内容】
分镜一：
景别：[中景/近景/特写/远景]
构图：[居中/三分法/对称/前景遮挡/引导线]
运镜手法：[固定机位/缓慢前推/跟拍/手持]
画面内容：[人物动作、表情变化、事件发生]

分镜二：
景别：
构图：
运镜手法：
画面内容：

分镜三：
景别：
构图：
运镜手法：
画面内容：
```

### 板块二及后续

```markdown
> 角色与风格沿用板块一，此处只写变化。

【基础设定】[沿用板块一，仅说明变化]
【道具】[沿用 / 新增 / 状态变化]
【场景】[本板块的新场景]
【声音】不需要配乐，仅保留同期声。
【氛围与画质】[沿用板块一，仅说明变化]
【画面内容】[多分镜 或 长镜头]
```

---

## 8. 长镜头模板

适合单一连续动作、沉浸氛围、情绪递进。

```markdown
【画面内容】
长镜头：运镜带动景别变化，分阶段写。

起：[景别 / 构图 / 运镜] —— [起始动作与状态]
承：[景别 / 构图 / 运镜] —— [动作推进与情绪变化]
转：[景别 / 构图 / 运镜] —— [关键反应或反转]
收：[景别 / 构图 / 运镜] —— [动作停止后的情绪余韵]
```

示例：

```text
长镜头：
起：中景 / 居中构图 / 固定机位 —— 女子站在窗边，低头看着手中的旧照片。
承：近景 / 缓慢前推 —— 她听到门外脚步声，手指轻轻收紧，呼吸停顿半秒。
转：特写 / 浅景深 —— 她缓慢抬眼，眼眶泛红，但嘴唇抿住没有哭出声。
收：特写 / 固定机位 —— 她把照片贴近胸口，肩膀微微下沉，窗外雨水在玻璃上缓慢滑落。
```

---

## 9. 人物真实感提示词模板

### 9.1 输入字段

```text
人物身份：
具体场景：
当前状态：
行为动机：
触发事件：
连续动作：
动作链：
身体联动：
细微生命反应：
情绪变化：
镜头语言：
视觉风格：
```

### 9.2 生成模板

```text
[人物身份]处在[具体场景]中，正在[当前状态]。
因为[行为动机/触发事件]，人物先[预备动作]，随后[主动作]，最后停在[结束状态]。
动作过程中，头部、肩膀、上身、手臂、手指、衣袖、发丝产生自然联动。
人物有自然眨眼、轻微呼吸、眼神停顿、手指细小动作。
情绪从[情绪A]逐渐转为[情绪B]，整体表演克制自然，不夸张。
镜头采用[景别/运镜/焦段]，画面风格为[视觉风格]。
```

### 9.3 单人物示例

```text
一位古风女子站在安静的书房里，手里握着一把团扇，像是在等待门外的人进来。她原本低头看着桌上的书卷，听到门外传来轻微脚步声后，才慢慢抬眼看向前方。手中的团扇原本轻轻摇动，随后动作慢慢停住，表情从平静变成一丝克制的期待。发饰轻轻晃动，衣袖有细微起伏，镜头缓慢推进，古风电影感，画面安静自然。
```

---

## 10. 微表情控制模板

### 10.1 三阶段公式

```text
视频开始时，人物处于[状态A]。
然后，[触发动作/环境变化]，眼神[产生反应]，身体出现[细微联动]。
最后，脸上慢慢浮现出[状态B]，动作停在[结束定格]。
```

### 10.2 情绪降维词库

| 大情绪 | 降维写法 |
|---|---|
| 开心 | faint smile, soft gaze, relaxed facial muscles |
| 害羞 | lowers her head, avoiding eye contact, bites lower lip gently |
| 紧张 | eyes dart sideways, fingers rub together, shoulders slightly tense |
| 释怀 | closes eyes slowly, takes a deep visible breath, shoulders drop |
| 悲伤 | eyes well up, lips pressed together, breath becomes shallow |
| 愤怒 | jaw tightens, nostrils flare slightly, fingers dig into palm |

### 10.3 微表情完整示例

```text
Subtle motion. The video starts with the woman maintaining a neutral expression, gazing out the window. Then, she lifts the cup slightly to smell the aroma. Her eyes close gently for a second. She blows on the steam. Her facial muscles relax, showing a sense of comfort. A faint smile slowly forms on her lips. Natural breathing, soft morning light, candid feel.
```

---

## 11. 人物出场提示词模板

### 11.1 出场核心公式

```text
场景铺垫 → 镜头运动 → 人物出现方式 → 焦点变化 → 情绪反应 → 戏剧冲突
```

### 11.2 由虚到实：环境先行，再发现人物

适合灾难、末日、战争、科幻、英雄登场。

```text
1-4秒：镜头先展示[环境事件]，[群众/环境]产生反应。
4-8秒：镜头转向[主体出现位置]，主角从[人群/阴影/建筑物后/烟雾中]缓慢出现。
8-12秒：焦点从环境切换到主角面部，主角[抬头/停步/转身]，表情从[状态A]变为[状态B]。
```

### 11.3 从无到有：突然出现制造反转

适合悬疑、惊悚、杀手、反派登场。

```text
画面开始是一个正常的[日常动作/安静空间]。
镜头缓慢拉远或横移，逐渐打开空间。
此时，一个[新人物/反派/怪物]突然出现在[门口/窗外/身后/阴影里]。
主体动作停顿，呼吸变浅，眼神猛地转向对方。
```

### 11.4 背影开场：先神秘，再露脸

适合大佬、将军、反派Boss、商业人物高级感。

```text
镜头从人物背影开始，人物站在[场景]中央，背对镜头。
环境中的[光线/烟雾/风/声音]先建立气氛。
镜头缓慢前推或下降，人物听到[触发事件]后缓慢转身。
转身过程中先露出侧脸，再露出完整面部，表情从[状态A]变为[状态B]。
```

---

## 12. 图生视频提示词模板

适合用户上传图片后生成动态视频。

### 12.1 核心原则

图生视频不要重新设计画面，重点是：

```text
锁定原图构图、主体比例、服装、道具、光影、背景关系，只添加合理微动态。
```

### 12.2 图生视频通用模板

```text
Keep the original composition, character identity, outfit, facial features, object placement, lighting direction, color palette, and background unchanged.
Only add subtle natural motion: [主体微动作] + [环境微动态] + [光影细微变化].
The camera remains [static / slow push-in / subtle handheld], with no major reframing, no change of identity, no extra objects.
Cinematic realistic motion, natural breathing, soft motion blur, stable details.
```

### 12.3 中文模板

```text
保持原图构图、人物身份、服装、五官、道具位置、光影方向、色彩基调和背景关系不变。
只加入轻微自然动态：[人物动作]、[环境动态]、[光影变化]。
镜头保持[固定机位/缓慢前推/轻微手持呼吸感]，不要重新构图，不要改变人物身份，不要新增无关物体。
真实电影感动态，自然呼吸，轻微动态模糊，细节稳定。
```

---

## 13. 角色一致性模板

适合连续短剧、系列视频、固定主角。

### 13.1 角色资产锁定流程

```text
1. 先生成角色美宣图，确定风格。
2. 再生成角色三视图：正面、侧面、背面。
3. 将人物与场景分离，避免环境光影污染角色特征。
4. 在平台中使用角色锁定/主体锁定功能。
5. 后续每条视频调用同一角色ID，只改变场景、动作、情绪。
```

### 13.2 三视图提示词

```text
character reference sheet, model sheet, three-view turnaround, full body shot, front view, side view, back view, standing side-by-side in A-pose, clean white background, consistent facial features, consistent hairstyle, consistent outfit, realistic material texture
```

### 13.3 后续视频调用模板

```text
角色：[调用角色ID / 使用同一参考人物]
保持人物五官、发型、体型、服装核心特征一致。
本镜头只改变：[场景 / 动作 / 情绪 / 光影 / 道具状态]
不要改变年龄、脸型、发色、服装结构、身体比例。
```

---

## 14. 人像去油与真实质感规则

当用户要“真人感、去AI感、不要油腻、不要塑料皮肤”时调用。

### 14.1 真实皮肤质感词

```text
biological skin texture
visible pores
fine peach fuzz
slightly uneven skin tone
natural imperfections
subsurface scattering
raw photograph
unretouched film grain
```

### 14.2 光学柔和与锐度重置词

```text
soft optical focus
soft optical lens quality
film halation around highlights
Kodak Portra 400 grain
low contrast edges
analog texture
without over-sharpening
```

### 14.3 避免词

```text
perfect skin
smooth face
soft skin
8k render
glossy finish
hyper detailed
sharp focus
plastic skin
CG face
```

### 14.4 人像真实感补充句

```text
realistic human skin texture, visible pores, fine peach fuzz, slightly uneven skin tone, soft optical lens quality, film halation around highlights, natural facial asymmetry, candid realism, without over-sharpening, no plastic skin, no beauty filter
```

---

## 15. 产品视频提示词模板

适合电商主图视频、产品广告、品牌短片。

```text
[产品名称]放置在[场景/台面/空间]中，产品保持清晰稳定，占据画面[位置]。
镜头采用[微距特写/中近景/环绕半圈/缓慢前推]，突出[材质/结构/卖点]。
主光从[方向]打在产品表面，形成[高光/轮廓光/阴影层次]。
环境中加入[烟雾/水汽/浮尘/反射/背景光斑]，增强商业广告质感。
产品不变形，Logo不扭曲，结构不改变，边缘清晰，真实摄影质感。
```

产品视频负面约束：

```text
no deformation, no melting, no wrong logo, no extra parts, no floating text, no cartoon style, no CGI plastic look, no overexposed highlights
```

---

## 16. 动作戏提示词模板

适合打斗、追逐、冲突、危险场景。

```text
[场景时间]，[主体A]与[主体B]在[空间]中发生[动作冲突]。
镜头采用[中近景/侧后方/低机位]手持跟拍，随着人物碰撞产生轻微晃动。
动作不是快速乱打，而是清晰的动作链：[被逼退] → [身体撞到环境] → [短暂停顿] → [反击/躲避]。
环境参与动作：[玻璃反射/桌椅阻挡/雨水打湿地面/墙面阴影压迫]。
动作结束后，主体[扶墙喘息/整理衣领/抬眼警觉]，保留情绪余韵。
写实电影质感，真实物理重量，轻微动态模糊，避免游戏CG感。
```

---

## 17. 口播 / 情绪短片提示词模板

适合人物对镜头、短剧口播、情绪独白。

```text
[人物身份]坐/站在[场景]中，面对镜头但不是刻意摆拍。
人物开始时保持[起始状态]，说话前有一个短暂停顿。
说话过程中，眼神偶尔离开镜头再回到镜头，嘴角和眉眼有轻微变化。
手部动作克制，只在关键词处轻轻移动或触碰道具。
自然眨眼，自然呼吸，肩膀有轻微起伏。
镜头采用中近景固定机位，浅景深，背景轻微虚化。
整体真实、克制、像纪录片采访，不要广告模特式表演。
```

---

## 18. 常用镜头词库

### 18.1 景别

```text
extreme close-up / 极特写
close-up / 特写
medium close-up / 中近景
medium shot / 中景
full shot / 全身景
wide shot / 远景
establishing shot / 建立镜头
```

### 18.2 运镜

```text
static camera / 固定机位
slow push-in / 缓慢前推
slow pull-back / 缓慢后拉
subtle handheld / 轻微手持呼吸感
tracking shot / 跟拍
side tracking / 侧向跟拍
low-angle tracking / 低机位跟拍
locked-off shot / 锁定机位
```

### 18.3 构图

```text
center composition / 居中构图
rule of thirds / 三分法
symmetrical composition / 对称构图
foreground obstruction / 前景遮挡
leading lines / 引导线
negative space / 留白构图
frame within frame / 框中框
```

### 18.4 光影

```text
soft morning light / 柔和晨光
golden hour light / 黄金时刻光线
cold blue rim light / 冷蓝轮廓光
warm practical light / 室内暖色实用光
low-key lighting / 低调光
chiaroscuro lighting / 明暗对照
volumetric light beams / 体积光束
film halation / 胶片光晕
```

---

## 19. 负面约束模板

### 19.1 通用负面约束

```text
不要改变人物身份，不要改变五官，不要改变服装结构，不要新增无关人物，不要多手多脚，不要肢体扭曲，不要面部融化，不要夸张表情，不要卡通CG感，不要游戏渲染感，不要过度磨皮，不要塑料皮肤，不要过度锐化，不要闪烁变形，不要镜头乱晃，不要快速切换，不要文字水印。
```

### 19.2 英文负面约束

```text
no identity change, no face morphing, no extra fingers, no extra limbs, no distorted hands, no exaggerated acting, no plastic skin, no beauty filter, no CGI look, no game render, no over-sharpening, no flickering, no random camera shake, no sudden cuts, no extra characters, no text, no watermark
```

---

## 20. 输出质量检查清单

生成视频提示词前，必须自检：

```markdown
- [ ] 是否写清楚主体是谁？
- [ ] 是否写清楚主体为什么动？
- [ ] 是否有动作链，而不是单个动作词？
- [ ] 是否有微表情、呼吸、眼神、手指等生命反应？
- [ ] 是否写清楚镜头景别、机位、运镜？
- [ ] 是否写清楚光源方向和影调？
- [ ] 是否让环境参与叙事，而不是只当背景？
- [ ] 是否有动作结束后的情绪收尾？
- [ ] 是否避免了大情绪词和空洞风格词？
- [ ] 是否加入了负面约束？
- [ ] 图生视频是否锁定了原图构图和主体？
- [ ] 多镜头是否保持角色、风格、画幅统一？
```

---

## 21. 错误写法修正器

当用户给出简单提示词时，按以下方式升级。

### 21.1 普通写法

```text
一个女孩在雨中哭。
```

### 21.2 升级思路

```text
人物身份 + 场景时间 + 触发原因 + 动作链 + 微表情 + 环境动态 + 镜头语言 + 光影 + 情绪收尾
```

### 21.3 高级写法

```text
深夜雨中的街角，一位年轻女孩站在便利店门口，手里攥着一张被雨水打湿的纸条。她没有立刻哭出声，只是低头看着纸条，手指慢慢收紧，肩膀随着呼吸轻微颤动。雨水顺着发梢滴落到脸颊，她眨眼变慢，眼眶逐渐泛红，嘴唇轻轻抿住。镜头采用中近景固定机位，轻微前推，背景霓虹灯在地面积水中反射成模糊光斑。动作结束时，她缓慢抬眼看向街道尽头，眼神从失落转为克制的坚定。写实电影质感，低饱和冷色调，胶片颗粒，真实人像皮肤质感，无过度磨皮。
```

---

## 22. 一键生成提示词模板

当用户只给一句需求时，直接使用以下模板生成。

```text
请根据下面信息生成一段可直接用于AI视频生成的提示词：

主题：[用户主题]
视频类型：[文生视频 / 图生视频 / 短剧分镜 / 产品广告 / 人物出场 / 情绪镜头]
画幅比例：[9:16 / 16:9 / 1:1 / 2.39:1]
风格：[电影感 / 写实 / 商业广告 / 古风 / 赛博朋克 / 纪录片]
主体：[人物/产品/动物/场景]
动作：[主体动作]
情绪：[起始情绪 → 结束情绪]
场景：[地点、时间、天气、空间]
镜头：[景别、机位、运镜]
光影：[主光、辅助光、色彩倾向]
环境动态：[风、雨、雾、尘埃、水汽、反射等]
限制：[不要变形、不要多人物、不要CG感等]

请输出：
1. 成片方向
2. 中文提示词
3. 英文提示词
4. 负面约束
5. 可替换参数
```

---

## 23. 完整示例：电影感人物情绪镜头

### 23.1 用户需求

```text
帮我写一个女孩雨夜分手后站在街头的视频提示词，要电影感。
```

### 23.2 输出示例

#### 成片方向

一个女孩在雨夜街头压住情绪，没有大哭，而是通过手指、呼吸、眼神和雨水表现分手后的失落与克制。

#### 中文提示词

```text
深夜雨中的城市街角，一位年轻女孩独自站在便利店门口，手里攥着一张被雨水打湿的纸条。她原本低头看着纸条，听到远处车辆驶过的声音后，动作停顿半秒，手指慢慢收紧，肩膀随着呼吸轻微起伏。雨水顺着发梢滴落到脸颊，她眨眼变慢，眼眶逐渐泛红，但嘴唇抿住没有哭出声。镜头采用中近景固定机位，轻微缓慢前推，背景霓虹灯在地面积水中形成模糊反射。冷蓝色雨夜环境光勾勒人物轮廓，便利店暖光照亮她半张脸。动作结束时，她缓慢抬眼看向街道尽头，眼神从失落转为克制的坚定。写实电影质感，低饱和冷色调，胶片颗粒，自然皮肤纹理，轻微动态模糊，无过度磨皮，无塑料皮肤。
```

#### 英文提示词

```text
Late at night on a rainy city street corner, a young woman stands alone outside a convenience store, holding a rain-soaked note in her hand. She keeps her head lowered, staring at the note. After hearing a distant car pass by, her movement pauses for half a second, her fingers slowly tightening around the paper, her shoulders rising and falling with shallow breathing. Rain drips from her hair onto her cheeks. Her blinking becomes slower, her eyes gradually well up, but her lips remain pressed together, holding back emotion. Medium close-up, static camera with a very slow push-in. Neon lights reflect softly in puddles behind her. Cold blue rainy ambient light outlines her silhouette, while warm light from the convenience store illuminates half of her face. At the end, she slowly raises her eyes toward the end of the street, her gaze shifting from loss to restrained determination. Realistic cinematic style, low-saturation cool color palette, film grain, natural human skin texture, subtle motion blur, no beauty filter, no plastic skin.
```

#### 负面约束

```text
不要夸张哭泣，不要大幅度表演，不要改变人物五官，不要多手多脚，不要面部融化，不要卡通CG感，不要过度磨皮，不要塑料皮肤，不要过度锐化，不要镜头乱晃，不要突然切换场景，不要文字水印。
```

---

## 24. 完整示例：人物出场镜头

### 中文提示词

```text
黄昏的废弃工厂外，空气中漂浮着细小尘埃，远处传来金属门被风吹动的轻微声响。镜头先拍摄空荡的厂区入口，地面积水反射出破碎的夕阳光。随后镜头缓慢前推，焦点从前景铁丝网转移到厂房深处。一个穿黑色长风衣的男人从阴影中缓慢走出，脚步不急，衣摆被风轻轻带起。他没有立刻看向镜头，而是先停在光影交界处，微微低头，右手轻轻整理袖口。半秒后，他缓慢抬眼看向前方，眼神冷静克制。镜头保持中景固定机位，夕阳形成暖色轮廓光，厂房内部保持低照度暗部细节。整体写实电影质感，低饱和，高反差，胶片颗粒，人物登场具有压迫感和神秘感。
```

### 英文提示词

```text
Outside an abandoned factory at dusk, fine dust floats in the air, and the faint sound of a metal door moving in the wind comes from the distance. The camera first shows the empty factory entrance, with puddles on the ground reflecting broken sunset light. Then the camera slowly pushes forward, shifting focus from the foreground wire fence to the dark interior of the factory. A man in a long black coat slowly steps out of the shadows, walking calmly, his coat hem moving slightly in the wind. He does not look at the camera immediately. He stops at the edge between light and shadow, lowers his head slightly, and gently adjusts his sleeve. After half a second, he slowly raises his eyes forward, his expression calm and restrained. Medium shot, static camera. Warm sunset rim light outlines his silhouette, while the factory interior remains low-key with visible shadow detail. Realistic cinematic style, low saturation, high contrast, film grain, mysterious and powerful character entrance.
```

---

## 25. 完整示例：产品广告镜头

### 中文提示词

```text
黑灰色专业自动铅笔放置在深灰色磨砂桌面上，笔身斜向贯穿画面，红色细环成为唯一醒目的色彩焦点。镜头采用微距中近景，缓慢从笔尖向握位推进，突出黑色菱格纹握位、银色金属笔尖和磨砂笔身的细腻材质。左上方冷白主光在金属笔尖形成清晰高光，右侧弱反光板补充暗部细节。背景中有轻微浮尘和柔和虚化的绘图纸边缘，增强专业绘图工具的真实使用场景。产品结构保持稳定，不变形，Logo不扭曲，边缘清晰，真实商业摄影质感，低饱和黑灰工业风，轻微胶片颗粒。
```

### 英文提示词

```text
A black and dark gray professional mechanical pencil lies on a matte charcoal desk surface, placed diagonally across the frame, with a thin red ring as the only striking color accent. Macro medium close-up, the camera slowly pushes from the metal tip toward the grip section, emphasizing the black knurled grip, silver metal tip, and fine matte texture of the pencil body. A cold white key light from the upper left creates crisp highlights on the metal tip, while a weak reflector on the right preserves shadow detail. Subtle floating dust and softly blurred drawing paper edges in the background enhance the realistic professional drafting environment. The product remains stable and undeformed, no warped logo, no extra parts, sharp edges, realistic commercial photography quality, low-saturation black-gray industrial style, subtle film grain.
```

---

## 26. 最终执行规则

每次生成视频提示词时，必须遵守：

1. 先确定视频类型：文生视频、图生视频、短剧分镜、产品广告、人物出场、情绪镜头。
2. 先写动作因果，再写风格词。
3. 人物提示词必须包含行为动机、微表情、身体联动、呼吸感。
4. 电影感提示词必须包含镜头、光影、环境参与、情绪收尾。
5. 图生视频必须强调保持原图构图、主体比例、服装、道具、光影不变。
6. 多镜头视频必须在第一板块定义角色、风格、画幅，后续只写变化。
7. 所有提示词都要附带负面约束。
8. 不允许只堆“电影感、高清、真实感、高级感”等空泛关键词。
9. 能用小动作表达的情绪，不用大情绪词。
10. 能用固定镜头解决的画面，不写复杂运镜。

---

## 27. 快速复制版：万能视频提示词生成器

```text
你是一个AI视频导演级提示词生成器。请根据用户输入，生成可直接用于可灵、即梦、Seedance、Runway、Pika、海螺等AI视频工具的视频提示词。

生成时必须遵守：
1. 不只写画面结果，要写清楚动作过程。
2. 情绪必须拆解为微表情、眼神、呼吸、手指、肩膀等身体反应。
3. 动作必须有触发原因和因果链，不能让人物无意义摆拍。
4. 镜头必须写清楚景别、构图、机位、运镜。
5. 环境必须参与叙事，例如雨、雾、浮尘、光束、水汽、反射、火光、风吹发丝等。
6. 动作结束后必须保留情绪收尾，不要突然停止。
7. 图生视频必须锁定原图构图、主体比例、人物身份、服装、道具、光影和背景关系。
8. 多镜头视频第一板块定义角色、风格、画幅，后续板块只写变化。
9. 画面风格必须具体到光影、色彩、镜头、质感，不能只写“电影感”。
10. 输出必须包含中文提示词、英文提示词、负面约束和可替换参数。

默认输出格式：
- 成片方向
- 基础设定
- 中文提示词
- 英文提示词
- 负面约束
- 可替换参数
```
