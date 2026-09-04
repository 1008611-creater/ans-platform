# Handoff Contract

Use before moving between planning, design, implementation, launch, or mini program release.

## Strategy To Design

Must have:

- project type;
- target user;
- primary action;
- page or screen list;
- tone and aesthetic direction;
- source-of-truth decision.

## Design To Implementation

Must have:

- design source path or URL;
- frames/screens;
- component list;
- typography, color, spacing tokens;
- responsive or mini program screen rules;
- interaction states;
- asset export plan.

## Mini Program Design To Implementation

Must have:

- selected stack: `wechat_native`, `taro`, or `uni_app`;
- AppID status;
- page list and tabBar plan;
- component library choice: TDesign, WeUI, Vant Weapp, NutUI, or native components;
- required capabilities: login, payment, upload, share, map, subscription message, customer service, analytics;
- backend/API contract for each capability;
- privacy and permission prompts;
- target base library version if known.

## Implementation To Launch

Must have:

- local run command;
- build/deploy command;
- environment variables;
- analytics/tracking needs;
- SEO/social metadata for websites;
- preview method for mini programs;
- screenshot, browser, DevTools, or real-device verification record.

## Mini Program Implementation To Release

Must have:

- WeChat DevTools project path;
- `miniprogramRoot`;
- `app.json` page, tabBar, and subpackage coverage;
- legal domains and backend endpoints;
- payment merchant/test record when payment is used;
- upload storage/backend record when upload is used;
- privacy policy and user data collection notes;
- preview QR or experience-version evidence;
- upload record and review status before claiming release.

## Never Claim Complete Without

- requested artifact existing;
- route-appropriate verification;
- clear list of anything not done.
