---
name: tiangong-moodboard
description: This skill should be used when creating or updating a Chinese celestial-palace moodboard from multiple reference images or video frames, especially when the task involves人物、远景巨构、中近景日常、素材道具分类, extracting visual style/cinematography/color-lighting/character/material responsibilities, or compiling reusable prompts for celestial-palace image and video generation. It coordinates the moodboard layer with the authoritative celestial-megastructure DNA and routes the result to MJ image prompts or Seedance video prompts without copying protected characters, dialogue, logos, watermarks, or exact frames.
agent_created: true
---

# 天宫情绪板 Skill

## 目标

建立参考图到可执行提示词之间的中间层。先按职责分类参考图，再提取视觉风格、摄影语言、色彩光影、人物方向和道具材质，最后与天宫四类 DNA（远景巨构/人物/中近景日常/素材道具）合并，供静态生图和视频提示词共同使用。

**四类 DNA 独立、不可互相替代**。每张参考图必须先确定属于哪一类，再读对应类别的 DNA 提取规则。

## 四类 DNA 对应关系

| 参考图类别 | DNA 类别 | DNA 文件中的节 | 情绪板提取重点 |
|-----------|---------|--------------|--------------|
| 人物/ | B 人物 DNA | B1-B9 | 体态、面部、发型、服饰、动作、情绪、光材质 |
| 远景巨构/ | A 远景巨构 DNA | A1-A15 | 建筑形制、尺度、云海、天瀑、门洞、视角 |
| 中近景日常/ | C 中近景日常 DNA | C1-C7 | POV/OTS/中近景构图、空间遮挡、门窗光 |
| 素材道具/ | D 素材道具 DNA | D1-D6 | 材质系统、道具形制、使用状态、光响应 |

## 触发场景

在以下任务中调用本 Skill：

- 用户提供多张天宫、仙侠、3D 国漫参考图或视频帧；
- 用户要求制作天宫情绪板、视觉板、参考图学习板；
- 用户要求提取人物、中近景、远景巨构、材质道具风格；
- 用户要生成天宫人物、场景、道具图片或 Seedance 视频，且已有参考素材；
- 用户要求“参考这些图的质感”，但不要求复制原图。

## 权威关系

按以下优先级工作：

1. **剧本/资产事实**：确定人物、地点、动作、道具和镜头目标；
2. **本 Skill**：确定参考图职责和情绪板提取结果；
3. **四类 DNA**：`C:/Users/lsb/.codex/skills/mj-tiangong-imagegen/references/celestial-megastructure-dna.md`
   - 远景巨构需求 → 读 A 类（建筑、云海、尺度、主光、视角）
   - 人物需求 → 读 B 类（体态、面部、发型、服饰、动作、情绪）
   - 中近景需求 → 读 C 类（POV/OTS/遮挡/窗光/门光）
   - 素材道具需求 → 读 D 类（材质系统、道具形制、使用状态）
4. `C:/Users/lsb/.codex/skills/mj-tiangong-imagegen/references/celestial-megastructure-prompts.md`：静态提示词模板；
5. `C:/Users/lsb/.workbuddy/skills/sd2-5-guofeng-skill/SKILL.md`：Seedance 2.5 动作链、镜头目的、参考职责和视频负向约束。

完整方法、分类规则、情绪板摘要模板和用户提示词框架见 `references/moodboard-method.md`。

## 四类目录

使用以下四类整理参考图：

- `人物/`：人物气质、体态、发型、服饰、面部方向；
- `远景巨构/`：天宫尺度、建筑群、云海、天瀑、门洞和空间纵深；
- `中近景日常/`：中近景、POV、OTS、人物与门窗栏杆/宫檐/雾气关系；
- `素材道具/`：木构、玉石、瓦、丝绸、云、光、雾、水、金属及道具使用状态。

一张图可被多个类别引用，但每次调用必须标明当前职责。

## 编译流程

1. 读取剧本事实和镜头目标，不从参考图推断剧情。
2. **判断当前任务属于四类中的哪一类**（远景巨构/人物/中近景日常/素材道具），选对应类别的 DNA 进行校验。
3. 读取参考图目录，给每张图登记来源、类别、可继承维度和不可继承项。
4. 输出内部"天宫情绪板摘要"：视觉风格、摄影风格、色彩光影、人物参考、素材道具和不继承项。
5. **用对应类别的 DNA 校验**：
   - 远景巨构 → A 类：建筑身份、云海物理、尺度、视角体系
   - 人物 → B 类：体态、面部、发型、服饰、动作、情绪、五大原则
   - 中近景日常 → C 类：POV/OTS 规则、前景遮挡、窗光/门光
   - 素材道具 → D 类：材质系统、道具形制、使用状态、光响应
6. 需要静态图片时，调用 `mj-tiangong-imagegen`，人物/中近景优先考虑模板 6C/6E，POV 优先考虑 6D。
7. 需要视频时，调用 `sd2-5-guofeng-skill`，把情绪板转成画面目的、机位、景别、动作链、光线、材质和参考职责，不把静态提示词机械复制进视频正文。
8. 交付提示词时区分：剧本事实、情绪板继承项、DNA 硬约束、平台参数和负向约束。
9. 生成结果按情绪板一致性与对应类别 DNA 质量门双重验收。

## 硬边界

- 不复制参考图人物身份、具体脸、对白、logo、水印、可读文字、版权角色或逐帧构图；
- 不让情绪板覆盖已确认剧本事实；
- 不把远景图的人物自动当作角色锁定图；
- 不凭空增加参考图没有的剧情、道具或空间；
- 不用情绪板绕过平台安全词、资源权限或资产验收；
- 没有真实参考素材时，不声称已读取参考图。

## 参考文件

- `references/moodboard-method.md`：情绪板制作与调用规范、用户提示词框架、输出模板和硬边界。
- `references/moodboard-results.md`：四类情绪板提取结果，基于实际视频帧的视觉风格/摄影/色彩/人物/道具综合提取。
