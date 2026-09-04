---
name: niannian-commerce-release-integrity
description: name: niannian-commerce-release-integrity
---

---
name: niannian-commerce-release-integrity
description: "Prevent mixed website assets, stale cache releases, duplicate runtime ownership, workbench regressions, false completion, and unsafe promotion for Niannian AI websites. Use before any live ai.cauai.fun or dh.cauai.fun code, CSS, JavaScript, SSR, route, asset, authentication, media, or deployment change; also use when a change appears deployed but users still see old or broken behavior."
---

# 念念网站发布一致性

Use this skill as the release owner for `$niannian-commerce-website`. It was created from observed failures: multiple candidate overlays, old static assets behind new version labels, duplicate client runtimes, incomplete logged-in verification, session misclassification, and missing media objects.

## Product Branches

This skill governs two separate products. Select the branch from the target domain before reading or changing source:

- **主站 `ai.cauai.fun`**: canonical source is `E:\codex\aisp\aidaihuo\niannian-ai-canonical-local`; the production owner is Haika host `haika-niannian`, with static root `/var/www/niannian-ai`. The browser canvas lives at same-site `/studio/`; `workbench`, `studio`, and `canvas-entry` are part of the same release identity.
- **带货站 `dh.cauai.fun`**: retain the existing commerce workflow contract below. Its source, API, project data, and release packages are not interchangeable with the main site.

For the `ai.cauai.fun` branch, never use `niannian-ai-web`, `sd2.cauai.fun`, `http://127.0.0.1`, `localhost`, Electron, or an old local preview as a baseline, candidate source, or public delivery path. A local preview may validate behavior only. If the source root, public origin, and release label cannot be tied to one package, stop before editing.

Before a main-site candidate, record the exact online release, source hash, changed scope, protected approved surfaces, and project data used for comparison. A main-site candidate may change only the declared surface; a workbench or studio change must not silently alter the approved homepage, shared header, production stages, or logo.

## Non-Negotiable States

Keep exactly four artifact states:

- **线上基线**: read-only copy of the release actually serving the selected target domain.
- **已批准快照**: user-approved URL, screenshot, or release reference.
- **候选包**: one bounded change with a parent baseline, declared scope, allowed files, and protected surfaces.
- **归档**: superseded or rollback releases; never edit or publish directly from it.

Do not call a local folder, arbitrary preview, old worktree, or prior candidate the online baseline. Do not begin a candidate while the repository path, active image, deployed Compose project, and public HTML cannot be tied to one release.

## 1. Establish Identity Before Editing

Record these facts before a live candidate exists:

1. Target domain and product branch are exact: `https://ai.cauai.fun` for the main site or `https://dh.cauai.fun` for the commerce workflow; the local source root belongs to that target.
2. Local source root and its Git revision or content hash.
3. Public URL, retrieval time, active image/release label, Compose project and Web service.
4. HTML asset URLs and hashes for every changed or shared JS, CSS, SSR chunk, and brand asset.
5. The project/account data and user-approved screenshot or URL used for comparison.

Do not use a source root for another product as a candidate. For the commerce branch, `ai.cauai.fun` and `sd2.cauai.fun` remain invalid; for the main-site branch, `dh.cauai.fun`, `sd2.cauai.fun`, localhost, and Electron remain invalid. A domain/source mismatch is a stop condition, not an implementation detail.

Run the structural preflight before implementation:

```powershell
node "$env:USERPROFILE\.codex\skills\niannian-commerce-release-integrity\scripts\release-plan-check.mjs" .\release-plan.json
```

Read [release-plan.example.json](references/release-plan.example.json) when creating the plan. The script validates a declared contract; it does not prove a production deployment. Production truth still comes from container configuration, online HTML, asset readback, and the browser.

### Diagnostic Output Safety

Read remote runtime identity through an explicit `docker inspect --format` allowlist. Request only the image, image digest, release label, Compose project/config paths, working directory, mounts, ports, and health fields needed for the current check. Do not emit raw `docker inspect` JSON, container environment variables, credentials, session material, signed URLs, or private media references into terminal output, Skill evidence, or chat. If an unredacted result has already been produced, stop copying it, rotate only credentials proven exposed to an unauthorized audience, and continue diagnosis with allowlisted fields.

## 2. Build One Candidate

- Copy only the verified online baseline to a newly named candidate.
- Declare one requested page/function scope and its allowed files. Include shared CSS, JS, SSR, routes, and asset references only when required by that scope.
- Never mount or copy a full historical workbench bundle merely to alter a Logo, small copy, or single control.
- Keep exactly one source of every served path. A release must not combine candidate A's JS, candidate B's CSS, a base image's public directory, and candidate C's SSR.
- Build one complete versioned Web image. The final runtime image must contain the current build's entire required public output, not just renamed HTML references.

### 跨平台 Node 依赖与源码快照

当候选包含 Node.js 服务端时，候选包只包含已声明的源码、静态资源、`package.json` 和 `package-lock.json`；不得携带本机 `node_modules`。发布前记录候选和活动 Linux 包的 `package-lock.json` 哈希；只有哈希一致时，才可在目标 Linux 主机从已验证的 Linux 依赖物化新包，或按该锁文件在目标主机安装依赖。不得将 Windows、macOS 或另一 CPU 架构的原生模块复制到 Linux 生产包。

命名候选必须读取一个明确的 Git 提交作为已跟踪源码快照，不能混入工作区未提交修改；与运行合同有关、但不由 Git 跟踪的文件必须逐项列入包清单并由哈希验证。上传后先核对压缩包和解压包哈希，再切换应用入口并在健康窗口内验证；启动失败立即切回完整的上一包，静态入口保持与应用入口同一版本。此规则不授权额外部署、依赖升级、凭据读取或生产数据修改。

## 3. Prove Runtime Ownership and Cache Identity

Before promotion, verify from the running candidate:

- one Web container and one Compose project own public traffic;
- no bind mounts or second containers override JS, CSS, SSR, or Logo paths;
- every public HTML asset URL identifies the candidate release;
- downloaded public assets hash to the candidate files inside the running image;
- the expected client runtime executes under CSP, including any required nonce;
- legacy handlers, SSR hydration, and compatibility code do not each mutate the same page region.

A changing query string alone is not cache proof. A new image label alone is not asset proof. A `200` response alone is not runtime proof.

## 4. Verify the Real User Path

Use the same account and project state for baseline and candidate. Verify the requested interaction and every protected surface affected by shared code.

Minimum evidence for a workbench or template release:

1. Login state remains stable while opening the workbench and material library.
2. Template or personal-template selection binds the chosen media to the opened project.
3. All affected six-step controls both change state and show their actual action surface.
4. Protected image/video media resolves, has nonzero intrinsic dimensions, and reaches a playable state. A record marked `READY` is insufficient.
5. Desktop and 390px have no incoherent overlap, hidden action, page-level overflow, or regression against the approved snapshot.
6. Price, billing, and template pages remain on the intended runtime and preserve their protected entry paths.

When an auth-only path cannot be tested because the account is unavailable, do not promote it as fully accepted. Report that exact gap and keep the current baseline unless the user explicitly accepts a bounded release without that proof.

## 5. Promote and Read Back

Use the existing production Compose project name and replace only the Web service unless the requested change explicitly requires another service. A failed temporary stack, port conflict, wrong path, or failed image build is not a release; remove only the exact failed temporary target after confirming it is not active.

After switching:

1. Read back the active container image, Compose config, and mounted paths.
2. Fetch online HTML and every changed asset. Verify they identify the same release and their hashes match the running image.
3. Re-run the browser path from a fresh page and an already-open page when cache or client navigation was relevant.
4. Save the result as the next online baseline and archive the previous baseline unchanged.

## Observed Guards

Apply these guards because they have already failed in this product:

| Observed trigger | Protected action | Owner | Exit condition |
| --- | --- | --- | --- |
| Multiple candidate overlays or duplicate Web containers previously overwrote workbench files. | Publishing Web assets. | Release owner. | One complete image, one Web service, no conflicting mounts, public hashes match. |
| HTML referenced stale `?v=` assets after a release. | Reporting a frontend fix as live. | Release owner. | HTML, running image, downloaded asset, and browser all identify the candidate. |
| CSS/JS cleanup removed step behavior or restored old UI. | Changing shared workbench rendering. | Change author. | Changed interaction and protected six-step surfaces pass desktop and 390px. |
| Transient auth errors looked like logout and leaked stale private state. | Changing auth, templates, or material loading. | Change author. | Confirmed `401` clears private state; transient failures preserve session and do not expose private cards. |
| `READY` media records lacked playable objects or used a slow raw object route. | Releasing template or playback changes. | Media owner. | Object exists, protected URL resolves, browser decodes and plays the intended rendition. |

Read [incident-derived-rules.md](references/incident-derived-rules.md) when a current failure matches one of these patterns.

## Main-Site Browser Gate

For an `ai.cauai.fun` workbench or studio candidate, the release is not ready when a static check or HTTP `200` is the only evidence. The real browser must open the same project at desktop and 390px, load the intended `workbench` or `/studio/` route, show the requested interaction, report zero console errors, and load the current versioned JS/CSS and brand assets. If the browser check is blocked, the candidate remains blocked and the production switch is forbidden.

The candidate package must contain every hashed asset referenced by its HTML. A changed entry module without its dynamic chunks is an incomplete package. Verify asset MIME type as well as status because an SPA HTML fallback can return `200` for a missing SVG or JavaScript file.

For the main-site candidate, run the repository gate before any remote write:

```powershell
pwsh -NoProfile -File .\authority\check_main_site_candidate.ps1 `
  -CandidateRoot .\authority\candidates\<candidate> `
  -PackageRoot .\release-staging\<release>\package `
  -Component workbench -RequireBrowserEvidence -RequireReleaseManifest
```

The gate is a promotion prerequisite, not a replacement for the real browser readback. A nonzero result means the candidate stays a candidate and the current online baseline remains unchanged.

## Completion

Report a release as complete only with: release ID, online URL, changed path, baseline comparison, asset/readback evidence, real browser result, rollback release, and any intentionally unverified path. Do not hide a missing authenticated test, a failed data repair, or a blocked deployment behind readiness output.
