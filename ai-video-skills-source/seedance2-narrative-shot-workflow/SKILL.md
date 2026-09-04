---
name: seedance2-narrative-shot-workflow
description: Execute Seedance2 narrative shots from approved Image2 assets. Use when the user wants shot-by-shot Seedance2 prompts for AI short films, contest videos, all-AI narrative pieces, or Mx-Shell-style workflows with first-frame locks, timing beats, audio rules, and reroll strategy.
---

## 硬性提示词语言规则

- 本 skill 产出的所有提示词、负向词、镜头生成指令、图像/视频模型 prompt，默认必须用中文撰写。
- 只有用户明确要求英文，或目标平台/API 的固定字段、参数名、模型保留词必须使用英文时，才保留英文；场景、动作、构图、质感、限制条件仍用中文。
- 不要先写英文提示词再附中文翻译；直接输出中文提示词。

# Seedance2 Narrative Shot Workflow

Use this skill for dramatic narrative shots, not commerce clips.

## Core Rule

Do not write or execute Seedance2 shot prompts until `ai-video-fundamentals-skill` has passed the story, first-frame, and shot-unit gates. If the story has no hook, conflict, causality, reversal, or viewer-visible payoff, stop and rebuild the story first.

Treat each Seedance2 prompt as one shot order:

- one shot;
- one camera plan;
- one emotional beat;
- one audio rule set.

For continuous narrative scenes, treat the sequence as a chained scene, not as isolated shots. Generate shot 1 from an approved Image2 true first frame, extract the final usable frame from shot 1, then use that tail frame as the first-frame reference for shot 2. Repeat this tail-frame-to-first-frame process for every following shot until the scene ends.

For any continuous shot target longer than 5 seconds, such as 8s or 10s, do not force one long generation by default. Split it into 5-second chained sub-shots: generate sub-shot A, extract the approved tail frame, and use that tail frame as the first-frame reference for sub-shot B. This is the standard long-shot execution method, not a montage workaround.

Project override: when the selected Echoon model is `seedance-2.0-Q`, use native `4s` technical clips instead of the older `5s`/`6s` defaults. Any continuous beat longer than `4s` must be chained as `4s` parts, with the previous part's approved tail frame used as the next part's first frame.

Independent batch generation is only acceptable for non-continuous inserts, alternatives, or proof exploration. It is not acceptable for a scene where character position, room layout, prop placement, emotional continuity, or action timing must carry from one shot to the next.

## Workflow

1. Confirm the approved `true first frame`.
2. Confirm the role of every reference:
   - identity reference;
   - first frame;
   - scene continuity;
   - optional motion rhythm reference.
3. If the shot belongs to a continuous scene, confirm the continuity source:
   - shot 1 uses an Image2 first frame made from the required character, scene, and prop references;
   - shot N+1 uses shot N's final usable tail frame as the first-frame reference;
   - additional character, scene, or prop references are included only to repair or reinforce consistency, not to replace the tail frame.
4. If the requested continuous shot is longer than 5 seconds, split it before writing prompts:
   - sub-shot A covers `0-5s` and uses the approved Image2 true first frame;
   - sub-shot B covers `5-10s` and uses sub-shot A's approved tail frame as its first frame;
   - longer shots continue the same 5-second tail-frame chain;
   - each sub-shot gets its own one-shot order while preserving the same dramatic beat and action cause.
5. Write a short shot header:
   - shot id;
   - dramatic beat;
   - duration;
   - most important ban.
6. Lock the first frame and art style near the top.
7. Write the shot as timed beats, usually `0-1.5`, `1.5-3`, `3-5` for a 5-second shot.
8. Keep the camera rule singular and stable unless the shot truly requires movement.
9. Specify audio rules explicitly:
   - ambient sound;
   - dialogue lines in order;
   - whether music is banned or allowed.
10. Add negative constraints for:
    - subtitles;
    - watermarks;
    - identity drift;
    - style drift;
    - anatomy errors;
    - random extra people or text.
11. If the shot is important, plan reroll criteria before generation.
12. After generation, extract the final usable frame and inspect it before continuing:
     - no white-background character-sheet look;
     - character identity still matches;
     - location and prop positions are usable for the next shot;
     - emotional beat lands clearly;
     - no subtitles, watermarks, random paper text, or UI artifacts.
13. If the tail frame fails continuity, reroll or rebuild that shot before generating the next shot. Do not use an independent first frame to hard-cut past the failure; only use Image2 if it is explicitly repairing the same tail-frame continuity.

## Prompt Quality Rules

- The first frame is the visual contract.
- Identity references should not replace the final scene background unless intended.
- For continuous scenes, the previous shot tail frame is the strongest continuity reference for the next shot. Do not override it with a neutral character sheet or a generic first frame.
- Use Image2 plus the necessary character, scene, and prop references to create or repair first frames when the chain needs a clean continuity lock.
- Long-shot chaining must preserve one continuous action. It is not a license to turn one long shot into unrelated montage fragments.
- Do not use still frames, image slow-pushes, or PPT-style holds as substitutes for actual video motion.
- Camera instructions should be sparse and exact: fixed, locked-off, slow push, slight handheld, single pan.
- Dialogue prompts should specify sequence, speaker, and whether any extra lines are forbidden.
- Prefer believable micro-actions over complex choreography unless the shot is about choreography.
- White-background portraits, full-body character boards, poster-like character displays, or empty studio backgrounds inside a narrative scene are automatic failures.

## Reroll Strategy

Use rerolls on high-value shots when:

- expression is weak;
- timing slips;
- hands or props break;
- surprise behavior is interesting but continuity-safe;
- sound lands but visual acting does not.

Change only one of these between rerolls:

- emotion emphasis;
- motion intensity;
- camera stability;
- one prop interaction;
- one dialogue timing line.

## Continuity Chain Checklist

Before generating a continuous sequence:

- script the whole scene as a causal action chain;
- create shot 1's Image2 first frame from all required consistency references;
- for 8s, 10s, or longer continuous shots, list sub-shot A/B/C and the required tail-frame state for each segment;
- generate only the first proof shot;
- extract and inspect its tail frame;
- use the approved tail frame as the next shot's first frame;
- continue one shot at a time.

Do not proceed to the next shot when the current shot's tail frame cannot plausibly become the next shot's first frame.

## References

- Read `references/local-shot-patterns.md` for local validated structure.
- Read `references/reroll-checklist.md` before expensive iteration.
