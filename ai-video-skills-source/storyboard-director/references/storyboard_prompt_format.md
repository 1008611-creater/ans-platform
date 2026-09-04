# Storyboard Prompt Format

## Purpose

Use this file when the user wants final storyboard prompts rather than internal analysis.

## Default Chinese format

Use this shape:

```text
全局风格：
...

【00-12s｜第一幕：标题】
镜头1：0-4s [中景] ...
镜头2：4-7s [近景] ...
镜头3：7-12s [特写] ...
音效：...
```

## Front-label rule

Keep front labels sparse.

- maximum `1-2` labels
- usually `shot size` first
- add angle or special cue only if it materially helps

Do not put long movement chains in labels.

## Movement rule

Write movement in the sentence body.

Good:

```text
镜头2：4-7s [近景] 绒绒伸出小爪轻轻扒拉棉桃，镜头顺着动作缓慢推近，棉桃只轻微晃动，没有变得饱满。
```

Bad:

```text
镜头2：4-7s [近景][平视][广角视感][慢推→横移→跟拍] ...
```

## Expression rule

If the beat depends on feeling, write expression visibly inside the shot line.

Good:

```text
镜头3：7-10s [中近景] 绒绒收回小爪，眼神带着一点失落看向絮絮，像是在等它再试一次。
```

## Sound rule

Keep sound at the end of the scene block.

Do not interrupt shot lines with sound notes.

## Review mode

Only expose:

- director decision
- action timing validation
- critique
- scoring

when the user explicitly asks for review or analysis.
