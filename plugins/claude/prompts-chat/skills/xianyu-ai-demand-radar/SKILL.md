---
name: xianyu-ai-demand-radar
description: name: xianyu-ai-demand-radar
---

---
name: xianyu-ai-demand-radar
description: Discover, validate, score, and productize AI-related Goofish/Xianyu demand. Use when the user wants to mine AI information-gap products, find hot AI services, turn accumulated AI workflows/assets into sellable listings, rank opportunities, create listing angles from trends, or build a repeatable demand research workflow for Goofish/Xianyu.
---

# Xianyu AI Demand Radar

## Core Rule

Use this skill to turn noisy AI trends into sellable Xianyu/Goofish opportunities. Prioritize evidence-backed demand over abstract strategy: buyer pain, search language, competitor proof, delivery feasibility, reusable assets, and a clear listing path.

Avoid risky or deceptive offers. For face, portrait, video replacement, and image services, require buyer-owned/authorized material, avoid public figures and NSFW, and never promise guaranteed virality, income, platform approval, or undetectable realism.

## Workflow

1. Frame the opportunity space.
   - Start from the user's assets, examples, links, buyer chats, published listing data, and recent AI hotspots.
   - Split opportunities into: deployment/service, workflow/template, prompt/SOP, generated deliverable, tool/site access, and custom implementation.
   - Treat the user's owned assets as an advantage: working websites, Image2 case library, ComfyUI workflows, AI video pipelines, scripts, and prior listing performance.

2. Gather demand evidence.
   - Follow local search preference when present; for this workspace, prefer `jina-search` for web search and page reading.
   - Search Xianyu/Goofish, Bilibili, YouTube, Zhihu, Xiaohongshu, 36Kr, GitHub/LiblibAI/ModelScope, and relevant tool docs.
   - Capture concrete signals: views, likes, comments asking for workflow/deployment, "想要" count, competitor price, recency, repeated pain words, hardware/API barriers, and delivery gaps.
   - Use `references/workflow.md` for source matrix and query templates.

3. Score each idea.
   - Use the WORTH score:
     - `heat`: trend and traffic proof, 0-5
     - `pain`: buyer urgency and confusion, 0-5
     - `asset_fit`: match with user's reusable assets, 0-5
     - `reuse`: delivery repeatability, 0-5
     - `price_power`: room for paid packages, 0-5
     - `risk`: policy, ethics, platform, support burden, 0-5
     - `score = heat + pain + asset_fit + reuse + price_power - risk`
   - Use `scripts/score_opportunities.py` for JSON scoring tables when working with many ideas.

4. Productize top ideas.
   - Turn each high-score opportunity into one first listing, not a vague business line.
   - For every listing angle, specify: target buyer, buyer search terms, title, first price, package ladder, delivery contents, required buyer materials, proof assets, cover image concept, support boundary, and risk wording.
   - Prefer ideas that strengthen one account position: AI workflow, AI deployment, and AI image/video delivery. Avoid scattershot listings that dilute account tags.
   - Decide whether to hand off to `xianyu-product-publisher` for listing images and Goofish publishing.

5. Evaluate compounding value.
   - For each selected idea, state which reusable assets it creates: demand notes, image templates, copy, SOP/FAQ, proof cases, scripts/workflows, or buyer-chat data.
   - Recommend a 14-day listing sequence when the user is building the account, usually 2-3 high-quality same-niche listings per day.
   - Paid exposure should only amplify listings with natural clicks, wants, chats, or orders; do not recommend buying traffic for unproven listings.

6. Build a demand radar output.
   - Save structured opportunities in `output/demand_radar/` when operating in this workspace.
   - Include source URLs and dates for evidence that materially affects recommendations.
   - Produce a ranked list plus a "next 3 listings to publish" recommendation.

## References

- Read `references/workflow.md` for the full research SOP, source matrix, search queries, scoring rubric, and productization checklist.
- Read `references/opportunity_schema.json` when creating machine-readable opportunity files.
- Use `scripts/score_opportunities.py` to rank opportunities from a JSON file.

## Handoff

When the user asks to上架/发布 a selected opportunity, use `xianyu-product-publisher` next. Pass the selected opportunity, evidence summary, title angle, package pricing, image directions, and compliance notes.
