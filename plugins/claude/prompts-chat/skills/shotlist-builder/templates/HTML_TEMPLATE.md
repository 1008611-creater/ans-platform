# HTML 模板

输出是单个自包含 HTML 文件。沿用团队既有模板的 CSS/JS；模板结构和稳定字段名不得改变。

## Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>分镜表 — 场次 {SCOPE}（含 Seedance 2.0 提示词）</title>
  <style>{HOUSE_CSS}</style>
</head>
<body>
<div class="container">
  <header class="top">
    <h1>分镜表 — <span>场次 {SCOPE}（含 Seedance 2.0 提示词）</span></h1>
    <div class="sub">交付给 {USERNAME} · {N_SCENES} 个场次 · {N_SHOTS} 个镜头 · 含中文电影级提示词</div>
    <div class="stats">
      <div class="stat"><div class="v">{N_SCENES}</div><div class="l">场次</div></div>
      <div class="stat"><div class="v">{N_SHOTS}</div><div class="l">镜头总数</div></div>
      <div class="stat"><div class="v">{N_PLANS}</div><div class="l">景别类型</div></div>
    </div>
  </header>

  <div class="toolbar">
    <input type="text" id="search" placeholder="搜索场景、对白、地点…">
    <select id="planFilter">
      <option value="">全部景别</option>
      {PLAN_OPTIONS}
    </select>
    <button onclick="window.print()">🖨 打印 / PDF</button>
    <button class="clear" onclick="resetFilters()">重置</button>
  </div>

  <div class="toc">
    <div class="toc-row"><span class="toc-label">场次</span>{TOC_LINKS}</div>
  </div>

  <h2 class="block-title first">场次 {SCOPE}</h2>

  {SCENE_BLOCKS}

  <div class="empty-state" id="emptyState" style="display:none;">没有找到结果，请重置筛选条件。</div>
</div>
<script>{HOUSE_JS}</script>
</body>
</html>
```

## Per-scene block

```html
<section class="scene pal-red" id="sc{N}">
  <div class="scene-head">
    <div class="scene-num-row">
      <span class="scene-num">场次 {N}</span>
    </div>
    <h2 class="scene-title">{INT_EXT_HEADER}</h2>
    <div class="scene-meta">
      <span><b>地点：</b>{LOCATION_DESC}</span>
      <span><b>情绪：</b><i>{MOOD}</i></span>
      <span class="shot-count">{N_SHOTS} 个镜头</span>
    </div>
  </div>
  <div class="table-wrap">
    <table class="shotlist">
      <colgroup>
        <col style="width:60px"><col style="width:140px"><col style="width:140px"><col style="width:auto"><col style="width:30%"><col style="width:35%">
      </colgroup>
      <thead>
        <tr><th>#</th><th>景别</th><th>摄影机</th><th>动作</th><th>场景文本</th><th>Seedance 2.0 提示词</th></tr>
      </thead>
      <tbody>
        {SHOT_ROWS_WITH_PROMPTS}
      </tbody>
    </table>
  </div>
</section>
```

## Shot row + prompt cell

The first row of a prompt group carries the rowspanned `c-script` and `c-prompt` cells. Subsequent rows in the same group only have `c-num`, `c-plan`, `c-cam`, `c-act`.

```html
<tr data-scene="{N}" data-plan="{PLAN_CODE}">
  <td class="c-num">{SHOT_NUM}</td>
  <td class="c-plan"><span class="badge p-{PLAN_CLASS}">{PLAN_LABEL}</span></td>
  <td class="c-cam">{CAMERA_NOTE}</td>
  <td class="c-act">{ACTION_BEAT_EN}</td>
  <td class="c-script" rowspan="{GROUP_SIZE}">
    <div class="script-inner">{FULL_SCENE_TEXT_EN}</div>
  </td>
  <td class="c-prompt" rowspan="{GROUP_SIZE}">
    <div style="font-size:11px; line-height:1.6;">
      {PROMPT_BLOCKS}
    </div>
  </td>
</tr>
{ADDITIONAL_ROWS_NO_RIGHT_CELLS}
```

## Prompt block (one per 15-sec prompt)

```html
<div style="border-top:1px solid #333; margin:12px 0 8px; padding-top:8px;">
  <b style="color:#22c55e;">提示词 {N}</b>
  <span style="color:#666; font-size:10px;">[{TAG}]</span>
  <button style="margin-left:8px;padding:2px 8px;background:#27272a;border:1px solid #3f3f46;border-radius:4px;color:#a1a1aa;font-size:10px;cursor:pointer" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.textContent)">Copy</button>
</div>
<div class="prompt-block">{CHINESE_PROMPT}</div>
```

The `{TAG}` is a short bracketed shorthand like `[MS-CU · door open + boots]` or `[ECU · polaroid + Roko face]` — describes the prompt at a glance.

## CSS + JS

Reuse the team's house CSS/JS verbatim. Do not modify palettes, fonts, or layout. Director palette logic (`pal-black` / `pal-blue` / `pal-red`) defaults to `pal-red` for all scenes unless director assignment is explicitly requested.

**景别代码说明：**稳定的 `data-plan` 代码继续使用 `WS`、`MS`、`CU` 等英文代码，用户可见的徽标和筛选选项必须显示中文。复用旧模板时只调整内部 CSS 类名，不把代码暴露给用户。

## Filter dropdown

```html
<select id="planFilter">
  <option value="">全部景别</option>
  <option value="WS">大全景</option>
  <option value="MS">中景</option>
  <option value="CU">近景</option>
  <option value="ECU">特写</option>
  <option value="MACRO">微距</option>
  <option value="PAN">摇摄</option>
  <option value="OS">画外音</option>
  <option value="VO">旁白</option>
  <option value="VO+MS">旁白 · 中景</option>
  <option value="DISSOLVE">叠化</option>
</select>
```
