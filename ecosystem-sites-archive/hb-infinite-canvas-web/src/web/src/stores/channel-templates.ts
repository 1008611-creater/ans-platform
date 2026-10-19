import type { ApiCallFormat, ChannelModel, ModelCapability, ModelChannel } from "./use-config-store";

/**
 * 渠道模板：预填接口地址与模型，用户只需要补 API Key。
 *
 * 铁律：模板里**绝不写 API Key**。仓库是公开的，Key 一旦进代码就等于泄露，
 * 只能让用户在界面里贴一次（存 localStorage）。
 */
export type ChannelTemplate = {
    id: string;
    /** 模板名，直接作为渠道名 */
    name: string;
    baseUrl: string;
    apiFormat: ApiCallFormat;
    /** 占位 Key（可选）。真实 Key 由服务端注入；留空会让 video.ts 直接抛 apiKeyRequired。 */
    apiKey?: string;
    /** 模型可自带插件脚本（可选）。 */
    models: Array<{ name: string; capability: ModelCapability; script?: string }>;
    imageBatchLimit?: number;
    editViaGenerations?: boolean;
    /** 提示文案，说明这个渠道还差什么才能用 */
    hint: string;
};

/**
 * 紫域（ziyuai.vip）插件脚本 —— 走渠道自带的 script 字段（model-plugin.ts 的 new Function 沙箱）。
 * 50 个模型只对应两段脚本（视频 45 / 图片 5），抽成模块级常量，避免 TS 源码膨胀约 150KB。
 *
 * 脚本里的沙箱变量只有 15 个：prompt / images / messages / params / model / baseUrl
 * / apiKey / systemPrompt / reasoningEffort / http / request / poll / sleep / signal / onDelta。
 * 真实 API Key 不在脚本里 —— 由 nginx 的 proxy_set_header Authorization 在服务端注入。
 * S8 会再包一层本站额度事务：/jobs 前 reserve，终态按 job.cost settle，提交前失败才 refund。
 *
 * ⚠️ 截至 2026-09-13，这两段脚本从未在真实浏览器里执行过一次，首次上线必须人工冒烟。
 */
export const ZIYU_VIDEO_SCRIPT = `function __creditCustomerCost(value) {
  var n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(1, Math.ceil(n * 1.5));
}
var __creditProviderHttp = http;
var __creditCatalog = null;
var __creditTask = null;
var __creditProviderJobId = null;
var __creditProviderSubmitted = false;
function __creditTaskId() { return "ziyu-" + Date.now() + "-" + Math.random().toString(36).slice(2); }
function __creditJob(value) { return (value && value.job) || value || null; }
async function __creditReserve(body) {
  var list = (__creditCatalog && Array.isArray(__creditCatalog.models)) ? __creditCatalog.models : [];
  var modelId = body && body.modelId;
  var modelEntry = null;
  for (var i = 0; i < list.length; i++) { if (list[i] && (list[i].id === modelId || list[i].name === modelId)) { modelEntry = list[i]; break; } }
  if (!modelEntry) throw new Error("紫域模型目录已变化，请刷新模型列表后重试");
  var match = String((body && body.duration) || "1").match(/(\\d+(?:\\.\\d+)?)/);
  var seconds = match ? Number(match[1]) : 1;
  var cps = Number(modelEntry.costPerSecond);
  var rawCost = cps > 0 ? cps * seconds : Number(modelEntry.cost || 0);
  var credits = __creditCustomerCost(rawCost);
  if (!(credits > 0)) throw new Error("紫域目录没有可用的计费信息，拒绝提交");
  var reservation = { id: __creditTaskId(), estimatedZiyuCost: rawCost, estimatedCredits: credits, modelId: modelEntry.id || modelId, seconds: seconds };
  __creditProviderJobId = null;
  __creditProviderSubmitted = false;
  // Server-managed 紫域路由会按实时目录在提交时预扣；浏览器只保留本地展示状态。
  __creditTask = reservation;
}
async function __creditSettle(job) {
  if (!__creditTask) return;
  var rawCost = Number(job && job.cost);
  if (!Number.isFinite(rawCost)) throw new Error("紫域终态没有 cost，保留预扣并转人工对账");
  // 终态结算由服务端轮询路由完成，浏览器不再提交可伪造的 cost。
  __creditTask = null;
  __creditProviderJobId = null;
  __creditProviderSubmitted = false;
}
async function __creditRefundBeforeProviderTask(reason) {
  if (!__creditTask || __creditProviderSubmitted) return;
  // provider task 尚未创建时由服务端提交路由自动退款。
  __creditTask = null;
}
http = {
  url: __creditProviderHttp.url,
  post: async function (path, payload, options) {
    if (path === "/jobs") {
      if (__creditTask) throw new Error("上一紫域任务尚未完成额度结算");
      await __creditReserve(payload || {});
      var created;
      try { created = await __creditProviderHttp.post(path, payload, options); }
      catch (error) { await __creditRefundBeforeProviderTask("provider_submit_failed"); throw error; }
      __creditProviderSubmitted = true;
      var createdJob = __creditJob(created);
      __creditProviderJobId = (created && (created.jobId || created.id)) || (createdJob && createdJob.id) || null;
      if (!__creditProviderJobId) throw new Error("紫域已响应但没有任务号，预扣保留待对账");
      return created;
    }
    return __creditProviderHttp.post(path, payload, options);
  },
  get: async function (path, options) {
    var result = await __creditProviderHttp.get(path, options);
    if (path === "/models") { __creditCatalog = result; return result; }
    if (path.indexOf("/jobs/") === 0) {
      var job = __creditJob(result);
      if (job && job.id) __creditProviderJobId = job.id;
      var status = String((job && job.status) || "").toLowerCase();
      if (["completed", "failed", "timed out", "timeout", "canceled", "cancelled"].indexOf(status) >= 0) await __creditSettle(job);
    }
    return result;
  },
};
try {
  var __creditResult = await (async function () {
// ===========================================================================
// 紫域 · 视频插件脚本（贴进渠道模型编辑器的 script 字段）
// 沙箱变量只有 15 个：prompt / images / messages / params / model / baseUrl
//   / apiKey / systemPrompt / reasoningEffort / http / request / poll / sleep
//   / signal / onDelta。不要引用其它任何东西。
//
// 路径纪律：只写 "/models" "/uploads" "/jobs"，不要写 \${baseUrl}/v1/... ——
//   因为 model-plugin.ts L40-43 会把非 http(s) 开头的路径交给 buildApiUrl()
//   拼装，正好拼成 /ziyu/api/v1/...，再由 nginx 剥掉 /ziyu 前缀。
//
// ★ 2026-09-13 实测口径（脚本按此重写，仍未经真实浏览器执行）：
//   - 提交 POST /jobs → HTTP 202，返回 { ok, job:{...}, user, billing, submitPending, credits }
//   - 轮询 GET  /jobs/{id} → { ok:true, job:{...} }（job 嵌在 .job 下）
//   - 结果在**顶层** job.resultUrl（previewUrl / preview 同值）；job.assets 是输入参考素材，不是产出
//   - 失败任务实测 19/19 全额退款（refunded:true, refundAmount==cost），但脚本仍按字段提示，不写死
//   - 上传 POST /uploads 是 JSON body（base64 data URL），不是 multipart
//
// ⚠️ 本脚本从未在真实浏览器里跑过一次（编写环境无浏览器）。
//    首次启用必须按 ACCEPTANCE.md 的 A-06 真机验证。
// ===========================================================================

// 本地展示名 → 紫域模型 id。展示名可随时改，id 以 GET /api/v1/models 为准。
// 新增模型时在这里补一行，并把同名模型加进渠道的 models 列表。
// 本文件收录 45 档视频（紫域线上视频目录全量）+ 5 档图片；目录会变，失效档位会在提交时报错让用户重选。
var MODEL_MAP = {"sd2.5":"doubao-seedance-2-5-260628","sd2":"doubao-seedance-2-0-260128","sd2fast":"doubao-seedance-2-0-fast-260128","doubao-seedance-2-5-260628":"doubao-seedance-2-5-260628","doubao-seedance-2-0-260128":"doubao-seedance-2-0-260128","doubao-seedance-2-0-fast-260128":"doubao-seedance-2-0-fast-260128"};

var requestedModel = String(model || "").trim();
var modelId = MODEL_MAP[requestedModel] || requestedModel;

// 目录实时拉取：紫域目录会变，本地只缓存分组与展示名。
// 2026-09-13 实测：目录共 44 个模型（39 video + 5 image），全部字段如下；
//   若这里查不到，说明该档位已被紫域下架，必须让用户重选，不要静默降级。
var catalog = await http.get("/models");
var list = (catalog && catalog.models) || [];
var entry = null;
for (var i = 0; i < list.length; i++) {
  var m = list[i];
  if (!m) continue;
  if (m.id === modelId || String(m.name || "").trim() === requestedModel) { entry = m; break; }
}
if (!entry) throw new Error("紫域目录里找不到模型 " + requestedModel + "，请到渠道设置里刷新模型列表");

// ---- 时长归一化：params.seconds 是字符串（1-20），allowedDurations 是整数数组 ----
var allowed = [];
if (entry.allowedDurations && entry.allowedDurations.length) {
  for (var j = 0; j < entry.allowedDurations.length; j++) {
    var d = Number(entry.allowedDurations[j]);
    if (d > 0) allowed.push(d);
  }
  allowed.sort(function (a, b) { return a - b; });
}
var seconds = Math.floor(Number(params && params.seconds) || 5);
if (!(seconds > 0)) seconds = 5;
if (allowed.length && allowed.indexOf(seconds) < 0) {
  var pick = allowed[0];
  for (var k = 0; k < allowed.length; k++) { if (allowed[k] <= seconds) pick = allowed[k]; }
  seconds = pick;
}

// ---- 模式：有参考图走 i2v，否则 t2v ----
var refs = [];
if (images && images.length) {
  for (var r = 0; r < images.length; r++) { if (images[r]) refs.push(images[r]); }
}
var mode = refs.length ? "i2v" : "t2v";
if (entry.modes && entry.modes.length && entry.modes.indexOf(mode) < 0) {
  throw new Error("模型 " + requestedModel + " 不支持 " + mode + "（可用：" + entry.modes.join("/") + "）");
}

// ---- 参考图上传：JSON body + base64 data URL，不是 multipart ----
// 紫域只收 JPG/PNG/WebP 静态图，一次最多 10 张；其它格式会被拒。
var assetUrls = [];
if (refs.length) {
  var files = [];
  for (var f = 0; f < refs.length && f < 10; f++) {
    var data = refs[f];
    if (data.indexOf("data:") !== 0) data = "data:image/png;base64," + data;
    files.push({ type: "image", name: "ref" + (f + 1) + ".png", data: data });
  }
  var uploaded = await http.post("/uploads", { files: files });
  var assets = (uploaded && uploaded.assets) || [];
  for (var a = 0; a < assets.length; a++) {
    if (assets[a] && assets[a].url) assetUrls.push(assets[a].url);
  }
}

// ---- 画幅：画布给的是 "auto" 或 "1280x720" 这类像素值 ----
var ratio = "16:9";
var rawRatio = String((params && params.ratio) || "");
if (/^(16:9|9:16|1:1|3:4|4:3)$/.test(rawRatio)) {
  ratio = rawRatio;
} else {
  var wh = /^(\\d+)x(\\d+)$/.exec(rawRatio);
  if (wh && Number(wh[1]) > 0 && Number(wh[2]) > 0) ratio = Number(wh[1]) >= Number(wh[2]) ? "16:9" : "9:16";
}

// ---- 幂等键：同一次调用内复用同一个值，网络超时重试不会重复扣费 ----
var idem = (typeof crypto !== "undefined" && crypto.randomUUID)
  ? crypto.randomUUID()
  : ("canvas-" + Date.now() + "-" + Math.random().toString(36).slice(2));

var body = { modelId: entry.id, mode: mode, prompt: prompt, ratio: ratio, duration: seconds + "秒" };
if (assetUrls.length) {
  var imgAssets = [];
  for (var u = 0; u < assetUrls.length; u++) imgAssets.push({ url: assetUrls[u] });
  body.assets = { image: imgAssets, video: [], audio: [] };
}

var created = await http.post("/jobs", body, { headers: { "Idempotency-Key": idem } });
var jobId = (created && (created.jobId || created.id)) || (created && created.job && created.job.id) || null;
if (!jobId) throw new Error("紫域没有返回任务号：" + JSON.stringify(created));

// ---- 轮询 4 秒一次，最长 45 分钟（6 分钟出片档位要留足）----
var done = await poll(
  function () { return http.get("/jobs/" + jobId); },
  function (state) {
    // 实测：提交与轮询都返回 { ok, job:{...} }，job 嵌在 .job 下；外层兜底留给未来的扁平形状。
    var job = (state && state.job) || state;
    if (!job || !job.status) return null;
    if (job.status === "failed") {
      var why = job.failureReason || job.message || "紫域任务失败";
      var tail = job.refunded ? "（已退回 " + (job.refundAmount || 0) + " 积分）" : "（未退回积分，请以紫域账单为准）";
      throw new Error(why + tail);
    }
    if (job.status === "completed") return job;
    return null;
  },
  { intervalMs: 4000, timeoutMs: 45 * 60 * 1000 }
);

// ★ 实测订正（旧结论写反，已作废）：产出只在**顶层** resultUrl（previewUrl / preview 同值）。
//   job.assets 是用户上传的**输入参考素材**，绝不能当产出 ——
//   实测反例 195f4a3a：结果已过 24 小时被清理，assets 里只剩输入参考视频；
//   若拿 assets 兜底，用户会收到"自己上传的输入"当成品。
var url = done.resultUrl || done.previewUrl || done.preview || null;
if (!url) throw new Error("紫域任务完成但没有产出地址（多半是结果 URL 已过 24 小时被紫域清理，不要标记为成功）");

// 返回 { url } 即可：video.ts L112-122 会认 url / video_url / result_url。
// 结果地址 24 小时后会被紫域清理，画布随后会把它落盘到本站媒体库。
return { url: url, ziyuCost: done.cost, ziyuJobId: jobId, durationSeconds: seconds };
  })();
  if (__creditTask) throw new Error("紫域脚本结束但额度尚未结算，结果不予交付");
  return __creditResult;
} catch (error) {
  await __creditRefundBeforeProviderTask("provider_task_not_created");
  throw error;
}`;

export const ZIYU_IMAGE_SCRIPT = `function __creditCustomerCost(value) {
  var n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(1, Math.ceil(n * 1.5));
}
var __creditProviderHttp = http;
var __creditCatalog = null;
var __creditTask = null;
var __creditProviderJobId = null;
var __creditProviderSubmitted = false;
function __creditTaskId() { return "ziyu-" + Date.now() + "-" + Math.random().toString(36).slice(2); }
function __creditJob(value) { return (value && value.job) || value || null; }
async function __creditReserve(body) {
  var list = (__creditCatalog && Array.isArray(__creditCatalog.models)) ? __creditCatalog.models : [];
  var modelId = body && body.modelId;
  var modelEntry = null;
  for (var i = 0; i < list.length; i++) { if (list[i] && (list[i].id === modelId || list[i].name === modelId)) { modelEntry = list[i]; break; } }
  if (!modelEntry) throw new Error("紫域模型目录已变化，请刷新模型列表后重试");
  var match = String((body && body.duration) || "1").match(/(\\d+(?:\\.\\d+)?)/);
  var seconds = match ? Number(match[1]) : 1;
  var cps = Number(modelEntry.costPerSecond);
  var rawCost = cps > 0 ? cps * seconds : Number(modelEntry.cost || 0);
  var credits = __creditCustomerCost(rawCost);
  if (!(credits > 0)) throw new Error("紫域目录没有可用的计费信息，拒绝提交");
  var reservation = { id: __creditTaskId(), estimatedZiyuCost: rawCost, estimatedCredits: credits, modelId: modelEntry.id || modelId, seconds: seconds };
  __creditProviderJobId = null;
  __creditProviderSubmitted = false;
  // Server-managed 紫域路由会按实时目录在提交时预扣；浏览器只保留本地展示状态。
  __creditTask = reservation;
}
async function __creditSettle(job) {
  if (!__creditTask) return;
  var rawCost = Number(job && job.cost);
  if (!Number.isFinite(rawCost)) throw new Error("紫域终态没有 cost，保留预扣并转人工对账");
  // 终态结算由服务端轮询路由完成，浏览器不再提交可伪造的 cost。
  __creditTask = null;
  __creditProviderJobId = null;
  __creditProviderSubmitted = false;
}
async function __creditRefundBeforeProviderTask(reason) {
  if (!__creditTask || __creditProviderSubmitted) return;
  // provider task 尚未创建时由服务端提交路由自动退款。
  __creditTask = null;
}
http = {
  url: __creditProviderHttp.url,
  post: async function (path, payload, options) {
    if (path === "/jobs") {
      if (__creditTask) throw new Error("上一紫域任务尚未完成额度结算");
      await __creditReserve(payload || {});
      var created;
      try { created = await __creditProviderHttp.post(path, payload, options); }
      catch (error) { await __creditRefundBeforeProviderTask("provider_submit_failed"); throw error; }
      __creditProviderSubmitted = true;
      var createdJob = __creditJob(created);
      __creditProviderJobId = (created && (created.jobId || created.id)) || (createdJob && createdJob.id) || null;
      if (!__creditProviderJobId) throw new Error("紫域已响应但没有任务号，预扣保留待对账");
      return created;
    }
    return __creditProviderHttp.post(path, payload, options);
  },
  get: async function (path, options) {
    var result = await __creditProviderHttp.get(path, options);
    if (path === "/models") { __creditCatalog = result; return result; }
    if (path.indexOf("/jobs/") === 0) {
      var job = __creditJob(result);
      if (job && job.id) __creditProviderJobId = job.id;
      var status = String((job && job.status) || "").toLowerCase();
      if (["completed", "failed", "timed out", "timeout", "canceled", "cancelled"].indexOf(status) >= 0) await __creditSettle(job);
    }
    return result;
  },
};
try {
  var __creditResult = await (async function () {
// ===========================================================================
// 紫域 · 图片插件脚本（贴进渠道模型编辑器的 script 字段）
// 与视频脚本同源，差异只有：mode 固定 t2i、一次可出多张、无时长。
//
// ⚠️ 两条未验证分支：
//   1) 多张（count > 1）是串行提交 N 个任务，未真机验证；
//   2) 图生图（requestEdit 带参考图）把参考图放进 assets.image，
//      但紫域图片模型的 modes 只声明了 t2i，是否真的吃参考图**未验证**。
//      在验证通过之前，图生图请继续用 OpenLux 渠道。
//
// ⚠️ 2026-09-13 新增实测风险：image-2-1k（cost=5）实测提交后卡在 processing 5 分钟，
//   最终 status=timed out 失败（全额退款）。图片模型可能长时间卡住甚至超时，
//   UI 必须给出"排队/可能超时"的提示，不能静默转圈。
// ===========================================================================

var MODEL_MAP = {"image2.5sunburst":"gpt-image-2.5-sunburst-c","image2":"gpt-image-2-c","gpt-image-2.5-sunburst-c":"gpt-image-2.5-sunburst-c","gpt-image-2-c":"gpt-image-2-c"};

var requestedModel = String(model || "").trim();
var modelId = MODEL_MAP[requestedModel] || requestedModel;

var catalog = await http.get("/models");
var list = (catalog && catalog.models) || [];
var entry = null;
for (var i = 0; i < list.length; i++) {
  var m = list[i];
  if (!m) continue;
  if (m.id === modelId || String(m.name || "").trim() === requestedModel) { entry = m; break; }
}
if (!entry) throw new Error("紫域目录里找不到模型 " + requestedModel + "，请到渠道设置里刷新模型列表");

var ratio = "1:1";
var rawRatio = String((params && params.ratio) || (params && params.size) || "");
if (/^(16:9|9:16|1:1|3:4|4:3)$/.test(rawRatio)) {
  ratio = rawRatio;
} else {
  var wh = /^(\\d+)x(\\d+)$/.exec(rawRatio);
  if (wh && Number(wh[1]) > 0 && Number(wh[2]) > 0) {
    var w = Number(wh[1]), h = Number(wh[2]);
    ratio = w === h ? "1:1" : (w > h ? "16:9" : "9:16");
  }
}

// 参考图（图生图）：上传后放进 assets.image —— 这一分支未验证。
var assetUrls = [];
if (images && images.length) {
  var files = [];
  for (var f = 0; f < images.length && f < 10; f++) {
    var data = images[f];
    if (!data) continue;
    if (data.indexOf("data:") !== 0) data = "data:image/png;base64," + data;
    files.push({ type: "image", name: "ref" + (f + 1) + ".png", data: data });
  }
  if (files.length) {
    var uploaded = await http.post("/uploads", { files: files });
    var assets = (uploaded && uploaded.assets) || [];
    for (var a = 0; a < assets.length; a++) { if (assets[a] && assets[a].url) assetUrls.push(assets[a].url); }
  }
}

var want = Math.floor(Number(params && params.count) || 1);
if (!(want > 0)) want = 1;
if (want > 4) want = 4;

// 收集一次任务里的所有图片地址。
// ★ 实测订正（旧结论写反，已作废）：产出只在**顶层** resultUrl / previewUrl / preview（三字段同值）。
//   job.assets.image 是用户上传的**输入参考图**，绝不能当产出返回 ——
//   实测反例 0046e0d8：assets.image 那 3 条是任务创建前上传的参考图，不是出片结果。
//   一个任务可能有多个产出（多图），全部去重收集，不能只取第一个。
function collectImages(job) {
  var urls = [];
  var top = [job.resultUrl, job.previewUrl, job.preview];
  for (var q = 0; q < top.length; q++) { if (top[q] && urls.indexOf(top[q]) < 0) urls.push(top[q]); }
  return urls;
}

var out = [];
for (var n = 0; n < want; n++) {
  var idem = (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : ("canvas-img-" + Date.now() + "-" + n + "-" + Math.random().toString(36).slice(2));

  var body = { modelId: entry.id, mode: "t2i", prompt: prompt, ratio: ratio };
  if (assetUrls.length) {
    var imgAssets = [];
    for (var v = 0; v < assetUrls.length; v++) imgAssets.push({ url: assetUrls[v] });
    body.assets = { image: imgAssets, video: [], audio: [] };
  }

  var created = await http.post("/jobs", body, { headers: { "Idempotency-Key": idem } });
  var jobId = (created && (created.jobId || created.id)) || (created && created.job && created.job.id) || null;
  if (!jobId) throw new Error("紫域没有返回任务号：" + JSON.stringify(created));

  var done = await poll(
    function () { return http.get("/jobs/" + jobId); },
    function (state) {
      // 实测：轮询返回 { ok:true, job:{...} }，job 嵌在 .job 下。
      var job = (state && state.job) || state;
      if (!job || !job.status) return null;
      if (job.status === "failed") {
        var why = job.failureReason || job.message || "紫域任务失败";
        var tail = job.refunded ? "（已退回 " + (job.refundAmount || 0) + " 积分）" : "（未退回积分，请以紫域账单为准）";
        throw new Error(why + tail);
      }
      if (job.status === "completed") return job;
      return null;
    },
    { intervalMs: 4000, timeoutMs: 20 * 60 * 1000 }
  );

  var urls = collectImages(done);
  if (!urls.length) throw new Error("紫域任务完成但没有图片地址");
  out = out.concat(urls);
}

// normalizePluginImages 认字符串数组、{url}、{dataUrl}。
return out;
  })();
  if (__creditTask) throw new Error("紫域脚本结束但额度尚未结算，结果不予交付");
  return __creditResult;
} catch (error) {
  await __creditRefundBeforeProviderTask("provider_task_not_created");
  throw error;
}`;

export const channelTemplates: ChannelTemplate[] = [
    {
        id: "ziyu",
        name: "ANS 官方算力渠道 (OpenLux + 火山方舟)",
        baseUrl: "/api/ziyu",
        apiFormat: "openai",
        apiKey: "ans-official-proxy",
        models: [
            { name: "image2.5sunburst", capability: "image", script: ZIYU_IMAGE_SCRIPT },
            { name: "image2", capability: "image", script: ZIYU_IMAGE_SCRIPT },
            { name: "sd2.5", capability: "video", script: ZIYU_VIDEO_SCRIPT },
            { name: "sd2", capability: "video", script: ZIYU_VIDEO_SCRIPT },
            { name: "sd2fast", capability: "video", script: ZIYU_VIDEO_SCRIPT },
        ],
        hint: "ANS 官方算力直连：生图采用 OpenLux (image2.5sunburst / image2)，视频采用火山方舟 Seedance (sd2.5 / sd2 / sd2fast)，统一扣减 ANS 算力积分，失败自动退回。",
    },
    {
        id: "openlux",
        name: "OpenLux (自带 Key 直连)",
        baseUrl: "https://api.openlux.ai/v1",
        apiFormat: "openai",
        imageBatchLimit: 1,
        editViaGenerations: true,
        models: [
            { name: "gpt-image-2.5-sunburst-c", capability: "image" },
            { name: "gpt-image-2-c", capability: "image" },
        ],
        hint: "OpenLux 官方生图渠道（填入自己的 sk-... Key 即可直连 image2.5sunburst 与 image2）。",
    },
];

export function createChannelFromTemplate(template: ChannelTemplate): ModelChannel {
    return {
        id: template.id,
        name: template.name,
        baseUrl: template.baseUrl,
        apiKey: template.apiKey ?? "",
        apiFormat: template.apiFormat,
        models: template.models.map((model): ChannelModel => ({
            name: model.name,
            capability: model.capability,
            ...(model.script ? { script: model.script } : {}),
        })),
        ...(template.imageBatchLimit ? { imageBatchLimit: template.imageBatchLimit } : {}),
        ...(template.editViaGenerations ? { editViaGenerations: true } : {}),
    };
}

/** 默认注入用的紫域渠道：模板只在「从模板添加」弹窗里，而持久化 merge 会按 localStorage 重建渠道列表。 */
export const ZIYU_CHANNEL_ID = "ziyu";

export function createDefaultZiyuChannel(): ModelChannel {
    const template = channelTemplates.find((item) => item.id === ZIYU_CHANNEL_ID);
    if (!template) throw new Error("channel-templates: missing ziyu template");
    return createChannelFromTemplate(template);
}

/**
 * 判断一个渠道是不是紫域。
 *
 * 为什么不能只比 id：默认注入的那条 id 是 "ziyu"，但用户还能从模板再加一条（id 会变成
 * "ziyu-2" 之类）。模型选择器要按「是不是紫域」决定走哪个拉取接口，只认 id 会漏。
 */
export function isZiyuChannel(channel: Pick<ModelChannel, "id" | "baseUrl"> | null | undefined): boolean {
    if (!channel) return false;
    if (channel.id === ZIYU_CHANNEL_ID || channel.id.startsWith(`${ZIYU_CHANNEL_ID}-`)) return true;
    const baseUrl = (channel.baseUrl || "").trim().toLowerCase();
    return baseUrl === "/api/ziyu" || baseUrl.startsWith("/api/ziyu/") || baseUrl === "/ziyu/api" || baseUrl.startsWith("/ziyu/");
}
