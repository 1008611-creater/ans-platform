# Image2 Capability Taxonomy

Use this taxonomy when the user wants to know what Image2 can make and how to replicate each type.

## Core Categories

| Category | What To Test | Stable Signals | Fragile Signals | Good Public Angle |
|---|---|---|---|---|
| Character identity transfer | Same person across new scenes | Face stays consistent in medium shot | Distant faces, heavy style, crowded scenes | Same reference, six worlds |
| Character set / IP | Same designed character across poses | Outfit, silhouette, color logic repeat | Hands, full-body pose, expression drift | Build a reusable AI character |
| Product photography | Product in new scenes | Shape, material, label position preserved | Transparent packaging, small text, hands | One product, many ad scenes |
| E-commerce poster | Product plus selling atmosphere | Clear product, clean layout, usable space | Text errors, clutter, fake labels | Product visual before copywriting |
| Text poster | Exact title or short slogan | Large short text, simple layout | Dense Chinese, mixed small copy | How far can Image2 typeset |
| UI / mockup | App screens and devices | Overall screen composition | Exact small UI text and icons | Fast concept mockups |
| Multi-reference fusion | Identity + pose + style + background | Clear role binding between references | Model blends roles incorrectly | Image role binding tests |
| Scene transfer | Same subject in new environment | Subject remains readable | Background dominates subject | Turn one input into a scene library |
| Style transfer | Same content in visual style | Color, mood, texture changes | Identity/product gets overwritten | Style strength ladder |
| Video first frame | Still image prepared for video model | Clear subject, motion direction, uncluttered frame | Tiny faces, busy backgrounds, ambiguous action | Image2 as video pre-production |
| Brand/social assets | Covers, banners, thumbnails | Strong composition and mood | Logo/text exactness | Fast content packaging |
| Repair / variation | Fix or expand an existing image | Small changes stay localized | Global style or identity changes | Retouch boundary notes |

## Scoring Dimensions

Score each category 1 to 5:

- Stability: repeated runs stay close to the goal.
- Replication: another creator can reproduce the look with the recipe.
- Control: prompt variables change the intended part without breaking the rest.
- Commercial value: useful for ads, covers, product pages, or posts.
- Review risk: lower score means more likely to trigger platform review or policy issues.

## Replication Card Template

```text
Type:
Best for:
Input needed:
Prompt skeleton:
Variable controls:
Negative constraints:
Success checklist:
Common failures:
Publish angle:
Next test:
```

## Visual Atlas Layout

For dashboards or notes, use three layers:

1. Overview map: all categories with scores and priority.
2. Selected category detail: sample prompt, variable controls, stable/fragile conditions.
3. Result log: thumbnails or file links, score, failure notes, and final publish caption.
