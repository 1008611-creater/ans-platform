---
name: xianyu-product-publisher
description: name: xianyu-product-publisher
---

---
name: xianyu-product-publisher
description: End-to-end Goofish/Xianyu listing workflow. Use when the user gives a Xianyu/Goofish competitor product link and wants Codex to read the listing, reconstruct stronger Chinese sales copy, generate original product images, prepare a publish pack, automate the Goofish publish page with Playwright/CDP, upload images, and publish only after explicit user confirmation.
---

# Xianyu Product Publisher

## Core Rule

Use this skill to convert another seller's Goofish/Xianyu listing into the user's own ready-to-publish listing. Do not copy the competitor's images or wording directly. Build a new offer: original images, rewritten copy, clear package pricing, and transparent service limitations.

Before clicking the final `发布` button, get explicit user confirmation in the current conversation unless the user has already said to publish.

## Workflow

1. Read the competitor link.
   - Prefer the user's configured search/reader preference when present, especially `jina-search` for linked Goofish pages.
   - Extract product type, price range, promise, target buyer, key visuals, service flow, risk wording, and any category hints.
   - Summarize what is being sold without reproducing the seller's exact copy.

2. Rebuild the offer.
   - Write a sharper title with a real buyer hook.
   - Write a natural Chinese description that states what buyers send, what they receive, turnaround time, revision policy, and limitations.
   - Add package pricing and private-chat quick replies when useful.
   - Save a publish pack in the workspace, usually `xianyu_publish_pack.md`.

3. Generate original listing images.
   - Use the active image generation skill requested by the user, such as `image2-direct`, `ikun-image2`, or `runninghub-image2-text`.
   - Make images that sell the same kind of service/product without reusing competitor originals.
   - For AI portrait/service listings, use synthetic faces or user-provided authorized references only.
   - Produce 5-8 images: hook cover, result grid, audience-specific examples, process/rules, and package/requirements.
   - Save final images in a stable folder such as `output/xianyu_product_images`.

4. Prepare a machine-readable publish config.
   - Create `publish_config.json` with title, body, prices, no-shipping choice, and absolute image paths.
   - Use `references/workflow.md` for the recommended schema and quality checklist.

5. Open and fill Goofish.
   - If the in-app browser can fill fields, use it for inspection.
   - If file upload is blocked, use the bundled helper script with a real Edge CDP session.
   - Ask the user to log in when needed, then rerun the helper.
   - If the account session drops, the publish page may remain visible while selects/buttons stop changing real state. Treat "UI clicks but category/form does not update" as a login-state warning: recheck login, refresh the publish page, and rerun fill before further clicking.

6. Review before publishing.
   - Capture a screenshot after filling/uploading.
   - Tell the user exactly what is ready: image count, title, price, and screenshot path.
   - Wait for a clear "发布吧/可以发布/确认发布" before final publish.

7. Publish and verify.
   - Run the publish action only after confirmation.
   - Capture the final URL and screenshot.
   - Report the published item URL and any platform warning text.

## Script

Use `scripts/goofish_publish_helper.js` for repeated browser operations:

```powershell
node C:\Users\lsb\.codex\skills\xianyu-product-publisher\scripts\goofish_publish_helper.js open --workspace D:\codex-work\xianyu
node C:\Users\lsb\.codex\skills\xianyu-product-publisher\scripts\goofish_publish_helper.js fill --workspace D:\codex-work\xianyu --config D:\codex-work\xianyu\publish_config.json
node C:\Users\lsb\.codex\skills\xianyu-product-publisher\scripts\goofish_publish_helper.js inspect --workspace D:\codex-work\xianyu
node C:\Users\lsb\.codex\skills\xianyu-product-publisher\scripts\goofish_publish_helper.js publish --workspace D:\codex-work\xianyu --confirm-publish
```

The helper connects to Edge on `GOOFISH_CDP_PORT` or port `9223`. Set `PLAYWRIGHT_MODULE` if Playwright is installed somewhere other than `%TEMP%\xianyu-pw\node_modules\playwright`.

## Troubleshooting Notes

- When login expires, Goofish can leave a stale publish form open. Symptoms: category options are visible but choosing one snaps back, final button stays disabled, or form content resets to defaults such as `游戏装备` / `添加首图`. Re-login first, then rerun `fill`.
- If a category shows `网页版暂不支持发布此分类`, try a nearby supported category first; if all web categories are blocked, prepare the same title/body/images for APP or emulator publishing.

## References

Read `references/workflow.md` when executing the full workflow, building `publish_config.json`, or adapting the Playwright helper to a changed Goofish page.

Use `references/publish_config.example.json` as a copyable starting point for the helper config.
