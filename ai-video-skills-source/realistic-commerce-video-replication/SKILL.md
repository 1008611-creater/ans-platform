---
name: realistic-commerce-video-replication
description: name: realistic-commerce-video-replication
---

---
name: realistic-commerce-video-replication
description: Create, rewrite, replicate, or quality-control realistic natural commerce short-video scripts, shot lists, and AI image/video prompts for products, especially food, fruit, agricultural goods, local specialties, handmade goods, and live-commerce assets. Use when the user asks to copy/复刻/reference a high-performing commerce video or image, produce product short videos, Douyin/Kuaishou/Xiaohongshu commerce visuals, Image2/Seedance/Runway/Jimeng prompts, product first frames, branded package scenes, or complains that generated images look fake, staged, plastic, generic, over-designed, lack hook, lack proof, lack viral selling point, or lack natural light.
---

## 硬性提示词语言规则

- 本 skill 产出的所有提示词、负向词、镜头生成指令、图像/视频模型 prompt，默认必须用中文撰写。
- 只有用户明确要求英文，或目标平台/API 的固定字段、参数名、模型保留词必须使用英文时，才保留英文；场景、动作、构图、质感、限制条件仍用中文。
- 不要先写英文提示词再附中文翻译；直接输出中文提示词。

# Realistic Commerce Video Replication

Use this skill to make product short-video visuals and scripts feel real, natural, designed, and conversion-ready. Treat the user's core requirements as quality gates, not prompt adjectives:

For AI-generated video execution, apply `ai-video-fundamentals-skill` before prompts or assets. This skill owns commerce realism and hook/proof logic; the fundamentals skill owns the story gate, first-frame gate, and >5s tail-frame chaining rule.

- real and natural before beautiful
- designed composition before random framing
- hook and proof before product display
- natural light before cinematic over-lighting
- reproducible scoring before subjective taste

## Required Workflow

1. **Define the commerce thesis.**
   - Product: what is being sold.
   - Audience: who needs to believe it.
   - Offer/occasion: why buy now, gift, seasonal, freshness, scarcity, convenience, status, taste, price, trust.
   - One-sentence promise: the specific transformation or relief the product provides.

2. **Build the hook and proof chain before making visuals.**
   - Use `references/hook-and-proof-script.md` when creating or improving scripts.
   - Use `references/chinese-commerce-script.md` for Chinese Douyin/Kuaishou/Xiaohongshu口播, especially fruit/live-commerce scripts.
   - Use `references/tiktok-commerce-script-patterns.md` when the user provides winning commerce-script samples, asks for 爆款/钩子/爆点, or says the writing does not match Chinese short-video thinking.
   - Identify one primary hook, one primary burst point, and 3-5 proof beats.
   - Every image/shot must serve one beat. Remove "pretty but non-evidentiary" shots.

3. **If a reference exists, extract its transferable DNA.**
   - Use `references/replication-loop.md` when the user asks to copy, mimic, emulate, reference, "复刻", "照这个感觉", or improve based on prior outputs.
   - Separate transferable structure from non-transferable surface details.
   - Preserve the reason the reference works, not the exact objects, faces, or accidental style noise.

4. **Design the visual system.**
   - Use `references/realism-and-composition.md` before writing image/video prompts.
   - Choose a real camera situation, not a generic ad scene: handheld orchard phone, window-lit packing table, kitchen unboxing, market stall, workshop bench, delivery handoff.
   - Decide composition intent for each shot: thumb-stopping face/product contrast, proof close-up, process credibility, packaging memory, final purchase confidence.

5. **Write prompts as scene instructions, not adjective piles.**
   - Specify physical scene, subject action, framing, light source, material evidence, and forbidden fake artifacts.
   - For branded packaging, ask the model to generate the package with simple exact text, but keep brand exposure limited to surfaces where it would naturally appear.
   - Avoid stacking too many requirements into one image. If one shot must prove freshness, do not also demand full origin, full package, face, CTA, price, and logo.

6. **Score before accepting output.**
   - Reject or reroll images/scripts that fail any hard gate below.
   - Save prompts, outputs, and review notes when producing project assets.

## Hard Gates

Do not accept an output just because it is attractive. It must pass:

- **Reality:** product texture, hands, light, environment, and scale look physically plausible.
- **Naturalness:** no plastic fruit, waxy skin, AI-smooth faces, fake luxury glow, generic stock-photo staging.
- **Designed composition:** a clear visual hierarchy and intended frame, not centered clutter.
- **Hook/proof:** the shot or line answers why the viewer should stop, believe, and continue.
- **Natural light:** motivated source, believable shadows, no impossible rim lights or overprocessed HDR unless explicitly desired.
- **Text control:** no random text, price, UI, watermark, QR, fake labels, or malformed brand copy unless the task allows it.

## Output Pattern

For a complete commerce-video package, produce:

1. Script spine: hook, conflict/doubt, proof sequence, burst point, close.
2. Shot list: 5-8 shots, each with purpose, action, framing, light, proof, and failure risks.
3. Image/video prompts: one focused prompt per shot.
4. Quality review: pass/reroll notes against the hard gates.

Use concise Chinese if the user is operating in Chinese.

## Prompt Skeleton

```text
Use case: realistic commerce short-video <first frame | proof shot | process shot | close shot>
Product and promise: <specific product + buyer-relevant promise>
Shot purpose: <hook | proof | process trust | packaging memory | close>
Scene: <real location, time, practical light source>
Action: <one concrete action happening now>
Subject evidence: <texture, scale, freshness, material, hand interaction>
Composition: <foreground/midground/background, lens/framing, negative space, hierarchy>
Lighting: <motivated natural light and shadow behavior>
Brand/text: <exact text only if needed, natural placement>
Avoid: <fake artifacts, random text, excessive polish, plastic texture, impossible hands>
```

## Review Rubric

Score each item 0-2. Reroll if total is below 9/12 or any hard gate scores 0.

- Reality and physical plausibility
- Natural product/material texture
- Composition and visual hierarchy
- Hook/proof value
- Natural motivated light
- Text/brand control

When rerolling, change one main cause at a time, such as "less studio, more handheld orchard table", "remove extra text", "tighten macro proof", or "simplify brand surface".

## References

- Read `references/realism-and-composition.md` for image/video prompt principles, composition patterns, natural light rules, and failure modes.
- Read `references/hook-and-proof-script.md` for hook, burst point, proof-chain, and short-video script templates.
- Read `references/chinese-commerce-script.md` before writing Chinese spoken scripts or on-screen copy.
- Read `references/tiktok-commerce-script-patterns.md` when adapting from provided high-performing scripts or writing stronger Douyin/TikTok commerce scripts.
- Read `references/replication-loop.md` when deriving reusable patterns from a reference, previous failed output, or user critique.
