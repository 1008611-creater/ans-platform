# Xianyu/Goofish Listing Workflow Reference

## Competitor Extraction

For a competitor link, capture these facts:

- What is the buyer actually purchasing?
- What outcome is promised?
- What proof or examples does the seller show?
- What price points are visible?
- What fields, photos, or preferences must a buyer provide?
- What turnaround/revision terms are promised?
- What claims must be softened to avoid disputes?

Never reuse the competitor's exact wording as the final listing. Treat it as market research.

## Copy Pattern

Recommended Chinese listing structure:

1. First line: title-like hook, readable as a listing title.
2. Opening: name the trend/use case in buyer language.
3. Differentiator: explain why this version feels more real, useful, fast, or polished.
4. Can do: list styles/options in one compact line.
5. Buyer sends: numbered requirements.
6. Delivery: turnaround, queue rule, revision count.
7. Limitation: clear AI/service disclaimer without scaring buyers away.
8. Packages: low anchor, recommended middle option, premium option.
9. Call to action: direct拍 or private chat.

Keep claims believable. Avoid "100% same", "guaranteed viral", or claims that imply identity misuse.

## Image Set

For service listings, create 5-8 original images:

- `01_首图`: immediate hook, one strong before/after or result scene.
- `02_案例`: grid showing 3-4 style outcomes.
- `03_人群款`: one target-buyer example, such as女生款/男生款/情侣款.
- `04_场景款`: another high-intent scene or style variant.
- `05_下单流程`: concise steps.
- `06_发图要求`: input requirements, revision note, and limitations.
- Optional `07_套餐价格`: packages if the page supports multiple price signals poorly.

Images must be original. If the user asks for "脸随便找", use synthetic/generated faces rather than real identifiable people unless the source is authorized.

## Publish Config Schema

Create a JSON file in the workspace:

```json
{
  "title": "韩系棒球赛AI照｜像被直播镜头扫到｜2h出图可改2次",
  "body": "正文，不要重复标题也可以；脚本会自动把 title 放第一行。",
  "price": "19.9",
  "originalPrice": "33.33",
  "noShipping": true,
  "imagePaths": [
    "D:\\codex-work\\xianyu\\output\\xianyu_product_images\\01_首图.png"
  ]
}
```

Use absolute image paths on Windows. Keep 5-8 images and verify every file exists before filling the page.

## Browser Notes

The Codex in-app browser may be enough for clicking and inspecting, but some environments block file chooser upload. When upload is blocked:

1. Use the helper script's `open` action to launch Microsoft Edge with CDP.
2. Ask the user to log in inside that Edge window.
3. Run `fill` after login.
4. Inspect the screenshot in `output/playwright`.
5. Only run `publish --confirm-publish` after the user clearly confirms.

If Goofish changes DOM labels, inspect:

- `input[type="file"]`
- `div[contenteditable="true"]`
- price inputs with placeholders like `0.00`
- buttons whose visible text is exactly `发布`

Session-state warning:

- If the user was logged out and logged in again, do not trust the old publish form. A stale form can still render, but select clicks or button clicks may not update real state. Refresh or reopen `/publish`, verify the page is not showing login prompts or default reset fields, then rerun the fill helper.
- A strong stale-session signal is: category dropdown opens and options can be clicked, but the selected category immediately remains unchanged, or the page resets to empty fields such as `添加首图` and `游戏装备`.

Known category profile:

- For AI image, Image2, ComfyUI, and AI design service listings, try `AI图文工具/服务` before generic design categories. Web publish currently works when required fields are filled.
- Useful defaults: `计价方式=元/次`, `输入类型=文生图 + 图生图`, `功能类型=图片制作 + 图片修改`.
- If `AI图文工具/服务` is selected, verify the extra fields appear and are filled before final publish; otherwise the publish button can look available but still fail validation.

## Review Checklist

Before publish:

- At least 5 images uploaded and no duplicates.
- First image is the intended cover.
- Title is not copied from competitor.
- Body states delivery, revision policy, and limitations.
- Price and original price are correct.
- Shipping is set to `无需邮寄` when selling a digital/service product.
- Screenshot captured for user review.
- User has explicitly confirmed final publish.

After publish:

- Capture final URL.
- Capture screenshot.
- Read visible platform warnings or moderation text and report it.
