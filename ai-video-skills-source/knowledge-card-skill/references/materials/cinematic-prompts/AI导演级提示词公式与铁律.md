---
id: rule-director-level-prompt-formula
title: AI导演级提示词公式与铁律
type: rule
category: 规则
tools: ["video-prompt", "storyboard"]
tags: ["导演提示词", "提示词公式", "固定镜头", "动作做减法", "造介质", "图生视频", "导演思维"]
keywords: ["AI导演提示词公式", "固定镜头AI", "动作做减法", "造介质AI", "微表情序列", "肢体因果联动"]
aliases: ["导演提示词公式", "导演铁律", "AI导演思维", "Director-Level Prompt Formula"]
priority: 9
updatedAt: 2026-06-08
---

# AI导演级提示词公式与铁律

## 适用场景
AI视频生成中，提示词缺乏导演思维，导致画面沦为"精致的塑料NPC"而非"有血有肉的电影级镜头"的问题。

## 核心规则

### 核心原则：AI视频导演的3大底层思维

| 思维 | 封印标签 | 换用动作 |
|------|---------|---------|
| 情绪要"拆解"，不要"宣告" | crying/angry/nervous等总结性词汇 | 胸腔起伏/眼神游离/指尖掐掌心等生理本能 |
| 肢体要"因果"，不要"摆拍" | moving hands/looking around等无意义指令 | 整理花茎/端茶吹气/切换重心等有目的动作 |
| 环境要"叙事"，不要"壁纸" | strong wind/peaceful background等空洞词汇 | 火光律动/阳光缓慢推移/热气升腾等环境微动 |

### AI导演级提示词核心公式

```
高阶提示词 = 基础景别与主体 + 面部微表情序列（眼/唇/肌肉） + 协同肢体小动作 + 环境物理动态（声音线索） + 摄影与光影风格
```

### 提示词实战5条铁律

| 铁律 | 说明 | 操作 |
|------|------|------|
| 一：做减法，锁死固定镜头 | 提示词开头加Static camera或限制景别 | 严禁推拉摇移等大动态运镜 |
| 二：加慢速，留出"发呆"空间 | 动作前高频使用slowly/subtly/gently | 压制AI运动幅度，让情绪慢节奏发酵 |
| 三：造介质，打破真空静音感 | 利用水蒸气/晨雾/光束/浮尘等微观介质 | 消除"绿幕抠图感" |
| 四：顺逻辑，动作指令严禁打架 | 确保物理逻辑自洽 | 双手端茶碗就不能再写用手整理头发 |
| 五：稳底座，图生视频是终极解法 | 高质量静态图+图生视频工作流 | 静态图锁死构图/光影，视频提示词专心驱动微动态 |

## 可调用内容

### 导演级提示词模板

```
[景别+固定镜头] + [主体+面部微表情序列] + [协同肢体小动作] + [环境物理动态] + [摄影与光影风格]
```

### 实操示例

#### 示例1：高山草甸温柔时刻（完整公式）

```
[景别+固定镜头] Medium shot, static camera.
[主体+面部微表情序列] The man slowly draws his gaze from afar, turning to meet the woman's eyes, his thoughtful expression softening.
[协同肢体小动作] He gently offers her a small bouquet of wildflowers. The woman leans slightly toward him, her hand softly and comfortingly resting on his forearm.
[环境物理动态] A gentle mountain breeze sweeps through, swaying the surrounding wildflowers and brushing stray hairs across their faces. Grass sways rhythmically in the wind.
[摄影与光影风格] Golden evening light, cinematic film aesthetic, 35mm film grain.
```

**完整提示词**：
```
Medium shot, static camera. On a sunlit alpine meadow, a gentle mountain breeze sweeps through, swaying the surrounding wildflowers and brushing stray hairs across their faces. The man slowly draws his gaze from afar, turning to meet the woman's eyes, his thoughtful expression softening as he gently offers her a small bouquet of wildflowers. The woman leans slightly toward him, her hand softly and comfortingly resting on his forearm. They share a quiet, tender moment in the golden evening light, surrounded by grass swaying rhythmically in the wind. Cinematic film aesthetic, 35mm film grain.
```

#### 示例2：晨光温茶释怀时刻（固定镜头+慢速）

```
[景别+固定镜头] Medium shot, static camera.
[主体+面部微表情序列] A woman slowly brings a wooden bowl to her lips with both hands. She gently blows on the steaming tea, then takes a slow, contented sip, closing her eyes with deep relief.
[协同肢体小动作] Her shoulders drop slightly as she exhales, fingers gently cradling the warm bowl.
[环境物理动态] In the background, out-of-focus amber bokeh glow from a fireplace flickers softly and rhythmically.
[摄影与光影风格] Morning light, Heidi film aesthetic, 35mm film grain.
```

**完整提示词**：
```
Medium shot, static camera. A woman slowly brings a wooden bowl to her lips with both hands. She gently blows on the steaming tea, then takes a slow, contented sip, closing her eyes with deep relief. Her shoulders drop slightly as she exhales, fingers gently cradling the warm bowl. In the background, out-of-focus amber bokeh glow from a fireplace flickers softly and rhythmically. Morning light, Heidi film aesthetic, 35mm film grain.
```

### 可调用内容速查

| 场景 | 公式应用 | 核心要点 |
|------|---------|---------|
| 温柔互动 | 固定镜头+眼神交汇+递物+风声+金色光 | 情绪拆解，肢体有因果 |
| 安静释怀 | 固定镜头+闭眼+端茶+火光闪烁+晨光 | 慢速动作，环境叙事 |
| 紧张压抑 | 固定镜头+眼神游离+手指收紧+雨声+冷光 | 微表情序列，物理逻辑自洽 |

### 错误 vs 正确对比

| 类型 | 操作 | 结果 |
|------|------|------|
| ❌ 错误（宣告情绪） | `She is crying and angry` | AI生成夸张表演，塑料感 |
| ✅ 正确（拆解情绪） | `Her eyes well up, fingers dig into her palms, chest rises and falls` | 情绪通过生理本能体现 |
| ❌ 错误（无意义动作） | `moving hands, looking around` | 动作像摆拍，无目的性 |
| ✅ 正确（因果动作） | `gently blowing on tea, cradling warm bowl` | 动作有生活目的和物理重力感 |
| ❌ 错误（大动态运镜） | `camera zooms in, pans around` | 主体变形穿模 |
| ✅ 正确（固定镜头） | `static camera, medium shot` | 微表情和环境微动足够丰富 |
| ❌ 错误（忽略介质） | `beautiful background` | 绿幕抠图感 |
| ✅ 正确（造介质） | `wildflowers swaying, dust floating in light beams` | 连接人物与环境，消除抠图感 |

## 避免事项

- ❌ **禁止总结性情绪词**：crying/angry/nervous等必须拆解为生理动作
- ❌ **禁止无意义动作指令**：moving hands/looking around等必须替换为有目的动作
- ❌ **禁止空洞环境词**：strong wind/peaceful background等必须替换为环境微动
- ❌ **禁止大动态运镜**：微表情/肢体/环境已丰富时，严禁推拉摇移
- ❌ **禁止动作指令打架**：双手端茶碗就不能再写用手整理头发
- ❌ **禁止跳过静态图底座**：必须用高质量静态图锁死构图/光影，再生成视频

## 相关知识

- [[AI视频微表情控制规则]]（微表情控制）
- [[AI环境声音视觉化规则]]（环境声音视觉化）
- [[AI单人物情绪状态注入规则]]（情绪状态注入）
- [[AI视频人物动作自然规则]]（动作自然度）
- [[AI图生视频光影减法规则]]（光影减法）
- [[神级生图视频提示词结构库]]（提示词结构库）
