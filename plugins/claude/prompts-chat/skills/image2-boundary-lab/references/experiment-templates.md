# Image2 Experiment Templates

## Experiment Matrix

| Test ID | Boundary | Input | Invariant Prompt | Variable | Expected Pass | Observed Result | Score | Post Takeaway |
|---|---|---|---|---|---|---|---|---|
| A1 | Identity consistency | Image 1 | Preserve same person | Stadium broadcast scene | Same face, new scene |  |  |  |
| A2 | Identity consistency | Image 1 | Preserve same person | Strong side light | Same identity under light change |  |  |  |
| B1 | Text rendering | Text only | Exact text in quotes | Chinese headline | No missing characters |  |  |  |

Use 4 to 8 rows for one public post. More rows are useful for internal notes, but can make the public story hard to follow.

## Character Identity Test Pack

Base prompt:

```text
Use Image 1 as the primary identity reference. Preserve the same adult person: face shape, facial proportions, hairstyle, hairline, skin tone, age impression, and realistic skin texture. Change only [scene / lighting / outfit / pose]. Output [format and aspect ratio]. No beautification, no identity change, no celebrity likeness, no logos, no extra text.
```

Suggested variables:

- Scene transfer: office, stadium, cafe, street, product shoot.
- Camera distance: close portrait, waist-up medium shot, full body, distant telephoto.
- Lighting: soft window light, stadium light, night neon, overcast outdoor.
- Expression: neutral, mild surprise, attentive, gentle smile.
- Style pressure: documentary photo, magazine cover, e-commerce lifestyle, film still.

Boundary notes to watch:

- Face is often more stable in close or medium shots than in distant full-body scenes.
- Heavy stylization can overpower identity preservation.
- If the output becomes "a similar person", reduce style words and move identity constraints to the first sentence.

## Text Rendering Test Pack

Base prompt:

```text
Create a clean poster with the exact headline "[TEXT]". The text must be spelled exactly as provided, with no extra characters, no missing characters, and no translation. Use simple typography, high contrast, and large readable letters.
```

Suggested tests:

- 2 to 4 Chinese characters.
- 6 to 10 Chinese characters.
- Short English headline.
- Mixed Chinese and English.
- Product label with small secondary text.

Boundary notes to watch:

- Short, isolated text is easier than dense copy.
- Mixed-language text and small packaging labels are more fragile.
- If text matters, test with plain layout before adding complex scenes.

## Product And Commerce Test Pack

Base prompt:

```text
Use Image 1 as the product reference. Preserve the product shape, color, material, label position, and visible logo/text. Place the same product in [scene]. Keep the product front-facing, fully visible, and commercially clean. No extra labels, no invented branding, no deformation.
```

Suggested variables:

- Background replacement: white studio, kitchen, outdoor table, retail shelf.
- Lighting: softbox, natural window, premium glossy, flat catalog.
- Interaction: hand holding, product on table, product beside model.

Boundary notes to watch:

- Transparent packaging, reflective surfaces, and tiny labels are high-risk.
- Hands near product can cause deformation.
- For ad work, score product preservation higher than background beauty.

## Video First-Frame Test Pack

Base prompt:

```text
Create a video-ready first frame. The subject is clear, centered, and unobstructed. Leave visual room for [motion direction]. Use simple background separation, natural lighting, and no text. The frame should imply the next action: [action].
```

Suggested tests:

- Walk-in frame, head turn, hand reaches for product, camera push-in, crowd cutaway.
- Check whether the image gives the video model enough motion cues without clutter.

Boundary notes to watch:

- Too many objects create unstable motion.
- A clear gaze direction and hand position help image-to-video models.
- Avoid tiny faces if identity preservation matters.

## Review-Friendly Rewrite Rules

When a prompt triggers review, rewrite toward neutral public-scene language:

- Replace named broadcast brands with "generic live sports broadcast".
- Replace "caught on camera" with "public audience cutaway".
- Use "adult" when describing people.
- Avoid sexualized focus on body details.
- Avoid real team, league, sponsor, or media logos unless the platform explicitly allows them.
