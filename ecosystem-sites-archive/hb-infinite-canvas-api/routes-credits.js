// ============================================================================
// 无限画布 · 计费相关路由（批次 1 · 收得到钱）
// 文件：canvas-api/routes-credits.js
// 模块制式：**ESM**（与 canvas-api/package.json 的 "type": "module" 一致）
//   ⚠️ 本目录全部是 ESM。import 路径必须带 .js 扩展名；
//      运行时 require() 在 ESM 里不可用，所有依赖必须提到文件顶部。
// ============================================================================
//
// 用法：本文件是一个"挂载函数"，不改 server.js 的路由风格，也不自己造一套。
// 在 canvas-api/server.js 里按下面【6 处必改】接进去即可。
// 完整接线说明见同目录 APPLY.md。
//
// ---------------------------------------------------------------------------
// 【必改 1】顶部 import（放在 server.js 现有 import 区）
// ---------------------------------------------------------------------------
//     import { mountCreditRoutes } from './routes-credits.js';
//
// ---------------------------------------------------------------------------
// 【必改 2】CORS 允许头白名单 —— 必须加 Idempotency-Key
// ---------------------------------------------------------------------------
//   现状（server.js 约 L52–55）只允许：
//     Content-Type, Authorization, Content-Range, X-Upload-Offset
//   ⚠️ 紫域提交要求带 Idempotency-Key。如果前端要跨域发这个头，
//      预检请求会因为不在白名单里而失败（浏览器侧表现为 CORS 报错，
//      服务端日志里什么都看不到）。改成：
//
//     const ALLOWED_HEADERS = [
//       'Content-Type', 'Authorization', 'Content-Range',
//       'X-Upload-Offset', 'Idempotency-Key',
//     ].join(', ');
//
// ---------------------------------------------------------------------------
// 【必改 3】isBinaryUpload 白名单 —— 本批新增路由不需要改
// ---------------------------------------------------------------------------
//   现状（server.js 约 L41–43）：
//     const isBinaryUpload = (req) =>
//       (req.method === 'PUT' || req.method === 'PATCH') &&
//       (req.path.startsWith('/api/media/') || req.path.startsWith('/api/sync/'));
//
//   本批新增的接口全部是 GET / POST + JSON body，**没有二进制上传**，
//   因此这一行**不需要改**。但请注意：
//   - 若将来新增"用户直接上传素材到紫域"这类二进制 PUT/PATCH 路由，
//     必须把该路径加进 isBinaryUpload 的判定，否则 body 会被 JSON parser 吃掉，
//     表现为"上传成功但文件是空的"。
//
// ---------------------------------------------------------------------------
// 【必改 4】注册路由（放在 /api/auth/* 之后、/api/media/* 之前）
// ---------------------------------------------------------------------------
//     mountCreditRoutes(app, {
//       requireAuth,
//       requireAdmin,        // ← 需要新增这个中间件，见下
//       registerMedia,       // server.js 里已有的函数
//       query,               // db.js 里的 query
//     });
//
// ---------------------------------------------------------------------------
// 【必改 5】requireAdmin 中间件（server.js 里目前没有）
// ---------------------------------------------------------------------------
//   在 requireAuth 定义之后加：
//
//     function requireAdmin(req, res, next) {
//       if (!req.user) return res.status(401).json({ error: 'unauthorized' });
//       if (req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
//       next();
//     }
//
//   ⚠️ 这是"新用户拿不到管理员"的防线之一。
//      users.role 的 CHECK 约束是 ('user','admin')，
//      promoteToAdminIfFirst() 只对第一个注册者生效，两者配合才安全。
// ============================================================================

import { createHash, randomBytes } from 'node:crypto';
import {
    getCreditSummary,
    reserveTaskCredits,
    settleTaskCredits,
    refundTaskCredits,
    getFreeTrialStatus,
    consumeFreeTrial,
    adminAdjustBalance,
    adminCreditOverview,
    reconcileChannelUsage,
    customerCost,
    REDEEM_DENOMINATIONS,
} from './credits.js';
import { readUnifiedQuota, redeemWithAns } from './unified-quota.js';
import { redeemCode, listRedemptions, signPayload } from './ldxp-redeem.js';
import * as ziyu from './ziyu.js';

/** 免费试拍每月次数（可配置）。默认 3。 */
function freeTrialLimit() {
    return 0;
}

/** 统一的错误应答：不要把内部异常原文透给前端。 */
function fail(res, err, status = 500) {
    const message = String(err?.message || '');
    if (message.startsWith('UNIFIED_QUOTA_')) return res.status(message.endsWith('_402') ? 402 : 503).json({ error: message });
    const code = (err && err.code) || 'INTERNAL_ERROR';
    if (status >= 500) console.error('[credits]', code, err && err.message);
    return res.status(status).json({ error: code });
}

function providerTaskId(payload) {
    const job = payload && payload.job && typeof payload.job === 'object' ? payload.job : payload;
    return String(payload?.jobId || payload?.video_id || payload?.id || job?.id || '').trim() || null;
}

function terminalStatus(value) {
    const status = String(value || '').toLowerCase();
    return ['completed', 'succeeded', 'success', 'done', 'failed', 'error', 'cancelled', 'canceled', 'timed out', 'timeout'].includes(status);
}

function localTaskId(channel, userId, idempotencyKey) {
    const digest = createHash('sha256').update(`${channel}:${userId}:${idempotencyKey}`).digest('hex').slice(0, 40);
    return `${channel}:${digest}`;
}

async function readRawBody(req, maxBytes = 64 * 1024 * 1024) {
    const chunks = [];
    let total = 0;
    for await (const chunk of req) {
        total += chunk.length;
        if (total > maxBytes) {
            const error = new Error('REQUEST_BODY_TOO_LARGE');
            error.status = 413;
            throw error;
        }
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

function requestKey(req) {
    const explicit = String(req.headers['idempotency-key'] || '').trim();
    // Idempotency is opt-in. Without a caller supplied key, two identical
    // prompts are still two separate generation requests.
    return explicit ? explicit.slice(0, 200) : randomBytes(24).toString('hex');
}

function agnesProxyBase() {
    const base = String(process.env.AGNES_PROXY_URL || '').trim().replace(/\/+$/, '');
    if (!base) {
        const error = new Error('AGNES_PROXY_NOT_CONFIGURED');
        error.code = 'AGNES_PROXY_NOT_CONFIGURED';
        throw error;
    }
    return base;
}

async function callAgnesProxy(path, { method = 'GET', body, contentType, headers: extraHeaders = {}, timeoutMs = 600000 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const headers = { ...extraHeaders };
        const token = String(process.env.AGNES_PROXY_ACCESS_TOKEN || '').trim();
        if (token) headers.Authorization = `Bearer ${token}`;
        if (contentType) headers['Content-Type'] = contentType;
        if (body !== undefined && body !== null && !contentType) headers['Content-Type'] = 'application/json';
        const response = await fetch(agnesProxyBase() + path, {
            method,
            headers,
            body: body === undefined || body === null ? undefined : (Buffer.isBuffer(body) ? body : JSON.stringify(body)),
            signal: controller.signal,
        });
        const responseType = response.headers.get('content-type') || '';
        const raw = Buffer.from(await response.arrayBuffer());
        let payload = null;
        if (raw.length) {
            const text = raw.toString('utf8');
            try { payload = JSON.parse(text); } catch { payload = { raw: text.slice(0, 1000) }; }
        }
        if (!response.ok) {
            const error = new Error('AGNES_PROXY_HTTP_' + response.status);
            error.code = 'AGNES_PROXY_HTTP_' + response.status;
            error.status = response.status;
            error.payload = payload;
            throw error;
        }
        return { payload, responseType, status: response.status };
    } finally {
        clearTimeout(timer);
    }
}

// ---------------------------------------------------------------------------
// SQL 片段：落盘成功后把结果登记回 channel_usage（对账用）。
//
// 为什么用 TICK 拼字符串而不是直接写模板字符串：
//   本文件会被落地器整体搬运，历史上模板字符串里嵌套反引号会被工具链截断。
//   用 String.fromCharCode(96) 拼出来，语义完全一样，但不会被工具链吃掉。
// ---------------------------------------------------------------------------
const TICK = String.fromCharCode(96);

const SQL_MARK_ZIYU_RESULT = TICK +
    'UPDATE channel_usage ' +
    '   SET result_url = $3, local_media_key = $4, updated_at = NOW() ' +
    " WHERE channel = 'ziyu' AND task_id = $1 AND user_id = $2" +
    TICK;

async function ownedProviderTask(channel, providerTask, userId, query) {
    const result = await query(
        `SELECT id, user_id, channel, task_id, provider_task_id, status, ziyu_cost, charged_credits
           FROM channel_usage
          WHERE channel = $1 AND provider_task_id = $2 AND user_id = $3
          LIMIT 1`,
        [channel, providerTask, userId],
    );
    return result.rows[0] || null;
}

async function localChannelTask(channel, taskId, userId, query) {
    const result = await query(
        `SELECT id, user_id, channel, task_id, provider_task_id, status, ziyu_cost, charged_credits
           FROM channel_usage
          WHERE channel = $1 AND task_id = $2 AND user_id = $3
          LIMIT 1`,
        [channel, taskId, userId],
    );
    return result.rows[0] || null;
}

async function claimChannelTask({ channel, userId, taskId, modelId = null, mode = null, status = 'reserved', query }) {
    const inserted = await query(
        `INSERT INTO channel_usage
             (user_id, channel, task_id, model_id, mode, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (channel, task_id) DO NOTHING
         RETURNING id, user_id, channel, task_id, provider_task_id, status, ziyu_cost, charged_credits`,
        [userId, channel, taskId, modelId, mode, status],
    );
    if (inserted.rowCount === 1) return { created: true, row: inserted.rows[0] };
    return { created: false, row: await localChannelTask(channel, taskId, userId, query) };
}

function jobObject(payload) {
    return payload && payload.job && typeof payload.job === 'object' ? payload.job : payload;
}

function numericDuration(value, fallback = 1) {
    const match = String(value ?? '').match(/(\d+(?:\.\d+)?)/);
    const n = match ? Number(match[1]) : Number(fallback);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

function ziyuEstimate(body, catalog) {
    const requestedModel = String(body?.modelId || '').trim();
    const models = Array.isArray(catalog?.models) ? catalog.models : [];
    const model = models.find((item) => item && (item.id === requestedModel || item.name === requestedModel));
    if (!model || model.enabled === false) {
        const error = new Error('ZIYU_MODEL_NOT_AVAILABLE');
        error.code = 'ZIYU_MODEL_NOT_AVAILABLE';
        error.status = 400;
        throw error;
    }
    const mode = String(body?.mode || (model.type === 'video' ? 't2v' : 't2i')).trim();
    if (Array.isArray(model.modes) && model.modes.length && !model.modes.includes(mode)) {
        const error = new Error('ZIYU_MODE_NOT_SUPPORTED');
        error.code = 'ZIYU_MODE_NOT_SUPPORTED';
        error.status = 400;
        throw error;
    }
    const defaultDur = model.type === 'video' ? 5 : 1;
    const normalizedDuration = ziyu.normalizeDuration(body?.duration ?? defaultDur, model.allowedDurations);
    const seconds = numericDuration(normalizedDuration ?? body?.duration ?? defaultDur, defaultDur);
    const cps = Number(model.costPerSecond);
    const baseCost = cps > 0 ? cps * seconds : Number(model.cost || 0);
    if (!Number.isFinite(baseCost) || baseCost <= 0) {
        const error = new Error('ZIYU_COST_UNAVAILABLE');
        error.code = 'ZIYU_COST_UNAVAILABLE';
        error.status = 503;
        throw error;
    }
    return { model, mode, normalizedDuration, seconds, baseCost };
}

function statusFromJob(payload) {
    const job = jobObject(payload);
    return String(job?.status || '').trim().toLowerCase() || 'submitted';
}

/**
 * 挂载计费路由。
 * @param {import('express').Express} app
 * @param {object} deps { requireAuth, requireAdmin, registerMedia, query }
 */
function mountCreditRoutes(app, deps) {
    const { requireAuth, requireAdmin, registerMedia, query } = deps;
    if (typeof requireAuth !== 'function') throw new Error('mountCreditRoutes: requireAuth is required');
    if (typeof requireAdmin !== 'function') throw new Error('mountCreditRoutes: requireAdmin is required');

    // -----------------------------------------------------------------------
    // 余额与流水
    // -----------------------------------------------------------------------

    // GET /api/credits/me → { balance, pricing, ledger, freeTrial }
    app.get('/api/credits/config', (_req, res) => res.json({ ok: true, cnyPerCredit: 0.1, multiplier: 1, freeTrialLimit: 0, denominations: [100, 300, 500, 1000, 2000, 5000], unifiedQuotaEnabled: true }));
    app.get('/api/credits/me', requireAuth, async (req, res) => {
        try {
            const unified = await readUnifiedQuota(req.user.email);
            const freeTrial = await getFreeTrialStatus(req.user.id, freeTrialLimit());
            if (unified) return res.json({ ...unified, pricing: { cnyPerCredit: 0.1, multiplier: 1, denominations: [100, 300, 500, 1000, 2000, 5000] }, freeTrial: null });
            const summary = await getCreditSummary(req.user.id);
            res.json({ ...summary, freeTrial });
        } catch (err) {
            if (String(err?.message || '').startsWith('UNIFIED_QUOTA_')) return res.status(503).json({ error: err.message });
            fail(res, err);
        }
    });

    // POST /api/credits/redeem  body: { code }
    // 文案纪律：前端提示用"粘贴兑换码"，不要出现固定积分人民币比例。
    app.post('/api/credits/redeem', requireAuth, async (req, res) => {
        try {
            const code = req.body && String(req.body.code || '').trim();
            if (!code) return res.status(400).json({ error: 'LDXP_REDEEM_CODE_INVALID' });
            if (!code.toUpperCase().startsWith('NN-')) {
                const ansRedeem = await redeemWithAns({ email: req.user.email, code });
                if (ansRedeem && ansRedeem.ok && ansRedeem.body?.ok) {
                    return res.json({
                        ok: true,
                        redeemedCredits: ansRedeem.body.redeemedPoints,
                        balance: ansRedeem.body.balance,
                        authority: 'ans',
                    });
                }
                return res.status(400).json({ error: ansRedeem?.body?.error || 'LDXP_REDEEM_CODE_INVALID', message: ansRedeem?.body?.message });
            }
            const result = await redeemCode({ userId: req.user.id, code });
            if (!result.ok) {
                // 码被用过 / 非法 都返回 400，不泄露"这张码是否存在"
                return res.status(400).json({ error: result.code });
            }
            res.json({
                ok: true,
                redeemedCredits: result.redeemedCredits,
                balance: result.balance,
            });
        } catch (err) {
            if (err && err.code === 'LDXP_PAYMENT_CHANNEL_UNAVAILABLE') {
                return res.status(503).json({ error: 'LDXP_PAYMENT_CHANNEL_UNAVAILABLE' });
            }
            fail(res, err);
        }
    });

    // GET /api/credits/redemptions
    app.get('/api/credits/redemptions', requireAuth, async (req, res) => {
        try { res.json({ items: await listRedemptions(req.user.id) }); }
        catch (err) { fail(res, err); }
    });

    // -----------------------------------------------------------------------
    // 扣费：预扣 / 结算 / 退款
    // 前端出片链路在提交前调用 reserve，任务结束后调用 settle。
    // -----------------------------------------------------------------------

    // POST /api/credits/reserve  body: { taskId, credits, metadata? }
    app.post('/api/credits/reserve', requireAuth, async (req, res) => {
        return res.status(410).json({ error: 'CREDITS_ENDPOINT_RETIRED' });
        try {
            const { taskId, credits, metadata } = req.body || {};
            if (!taskId) return res.status(400).json({ error: 'TASK_ID_REQUIRED' });
            const result = await reserveTaskCredits({
                userId: req.user.id, taskId, credits, metadata: { ...(metadata || {}), email: req.user.email },
            });
            if (!result.ok) return res.status(402).json({ error: result.code, balance: result.balance });
            res.json(result);
        } catch (err) { fail(res, err); }
    });

    // POST /api/credits/settle  body: { taskId, ziyuCost, status? }
    // ⚠️ ziyuCost 必须来自紫域返回的 cost 字段，不要本地推算。
    //    cost = 0 → 不退款（按差额退）；cost > 0 → 按 ×1.5 向上取整结算。
    app.post('/api/credits/settle', requireAuth, async (req, res) => {
        return res.status(410).json({ error: 'CREDITS_ENDPOINT_RETIRED' });
        try {
            const { taskId, ziyuCost, status, metadata } = req.body || {};
            if (!taskId) return res.status(400).json({ error: 'TASK_ID_REQUIRED' });
            if (ziyuCost === undefined || ziyuCost === null) {
                return res.status(400).json({ error: 'ZIYU_COST_REQUIRED' });
            }
            const result = await settleTaskCredits({
                userId: req.user.id, taskId, ziyuCost,
                status: status || 'completed', metadata: { ...(metadata || {}), email: req.user.email },
            });
            res.json(result);
        } catch (err) { fail(res, err); }
    });

    // POST /api/credits/refund  body: { taskId, reason? }
    // 只用于"任务根本没建立起来"这类确定要退的场景。失败任务不要无脑退，走 settle。
    app.post('/api/credits/refund', requireAuth, async (req, res) => {
        return res.status(410).json({ error: 'CREDITS_ENDPOINT_RETIRED' });
        try {
            const { taskId, reason } = req.body || {};
            if (!taskId) return res.status(400).json({ error: 'TASK_ID_REQUIRED' });
            const result = await refundTaskCredits({ userId: req.user.id, taskId, reason: reason || undefined, metadata: { email: req.user.email } });
            // 已结算过的任务不允许再退（结算本身已含"多退少补"），返回 409 让前端能区分
            // "退成功了" 与 "这笔不该退"。
            if (!result.ok) return res.status(409).json(result);
            res.json(result);
        } catch (err) { fail(res, err); }
    });

    // 报价工具：前端拿到紫域 cost 后可先换算给用户看
    app.get('/api/credits/quote', requireAuth, (req, res) => {
        const ziyuCost = Number(req.query.ziyuCost);
        if (!Number.isFinite(ziyuCost)) return res.status(400).json({ error: 'INVALID_COST' });
        res.json({ ziyuCost, credits: customerCost(ziyuCost) });
    });

    // -----------------------------------------------------------------------
    // 免费试拍（Agnes flash）：必须登录 + 每月限次
    // -----------------------------------------------------------------------

    // GET /api/credits/free-trial
    app.get('/api/credits/free-trial', requireAuth, async (req, res) => {
        try { res.json(await getFreeTrialStatus(req.user.id, freeTrialLimit())); }
        catch (err) { fail(res, err); }
    });

    // POST /api/credits/free-trial/consume
    // ⚠️ 调用 Agnes flash 之前必须先过这一关。未登录 → 401（requireAuth 挡住）。
    app.post('/api/credits/free-trial/consume', requireAuth, async (req, res) => {
        try {
            const result = await consumeFreeTrial(req.user.id, freeTrialLimit());
            if (!result.ok) {
                return res.status(429).json({
                    error: result.code,
                    status: result.status,
                    hint: '免费试拍次数已用完，购买兑换码可获得更多额度',
                });
            }
            res.json(result);
        } catch (err) { fail(res, err); }
    });

    // POST/GET /api/credits/free-trial/check
    // -----------------------------------------------------------------------
    // 给 nginx 的 auth_request 子请求用（见 deploy/batch2-nginx.conf.snippet）。
    //
    // 为什么需要它：撤掉 /agnes/ 的 cookie 门禁之后，免费试拍端点就变成公开的，
    // 必须在服务端限次。nginx 的 auth_request 只会发 GET 子请求、$request_method
    // 拿不到原始方法，所以这里**只看 URI 不看方法**——能走到这条路由就说明
    // 请求命中的是 location = /agnes/v1/videos（唯一消耗端点）。
    //
    // 约定：2xx = 放行（auth_request 只认 2xx），401/403 = 拦截。
    //   - 未登录            → requireAuth 直接 401
    //   - 次数用尽 / 已关闭 → 403（FREE_TRIAL_EXHAUSTED / FREE_TRIAL_DISABLED）
    //   - 扣次成功          → 204（无正文，避免子请求响应体被误当页面返回）
    //
    // ⚠️ 代价：一次提交消耗一次，即使上游随后拒绝也不退。这是 auth_request
    //    只能"先放行后转发"的固有取舍，已在验收文档中如实标注。
    app.all('/api/credits/free-trial/check', requireAuth, async (req, res) => {
        try {
            const result = await consumeFreeTrial(req.user.id, freeTrialLimit());
            if (!result.ok) {
                return res.status(403).json({
                    error: result.code,
                    status: result.status,
                    hint: '免费试拍次数已用完，购买兑换码可获得更多额度',
                });
            }
            return res.status(204).end();
        } catch (err) { fail(res, err); }
    });

    // -----------------------------------------------------------------------
    // 紫域模型目录（服务端代理，前端拿不到 key）
    // -----------------------------------------------------------------------

    app.get('/api/ziyu/media/:file', (req, res) => {
        const buf = typeof ziyu.getMediaBuffer === 'function' ? ziyu.getMediaBuffer(req.params.file) : null;
        if (!buf) return res.status(404).end();
        res.type('image/png').set('Cache-Control', 'public, max-age=86400').send(buf);
    });

    app.get('/api/ziyu/v1/media/:file', (req, res) => {
        const buf = typeof ziyu.getMediaBuffer === 'function' ? ziyu.getMediaBuffer(req.params.file) : null;
        if (!buf) return res.status(404).end();
        res.type('image/png').set('Cache-Control', 'public, max-age=86400').send(buf);
    });

    // GET /api/ziyu/models → { ok, models, groups }
    app.get('/api/ziyu/models', async (req, res) => {
        try {
            if (!ziyu.isConfigured()) return res.status(503).json({ error: 'ZIYU_NOT_CONFIGURED' });
            const catalog = await ziyu.fetchModelCatalog();
            res.json({ ...catalog, groups: ziyu.groupModels(catalog.models) });
        } catch (err) { fail(res, err, err && err.status ? 502 : 500); }
    });

    // GET /api/ziyu/me → 紫域侧账号信息（积分余额），用于人工对账
    // Controlled provider paths keep upstream credentials and quota decisions on the API server.
    app.get('/api/ziyu/v1/models', async (_req, res) => {
        try {
            if (!ziyu.isConfigured()) return res.status(503).json({ error: 'ZIYU_NOT_CONFIGURED' });
            const catalog = await ziyu.fetchModelCatalog();
            res.json({ ...catalog, groups: ziyu.groupModels(catalog.models) });
        } catch (err) { fail(res, err, err && err.status ? 502 : 500); }
    });

    app.post('/api/ziyu/v1/uploads', requireAuth, async (req, res) => {
        try {
            if (!ziyu.isConfigured()) return res.status(503).json({ error: 'ZIYU_NOT_CONFIGURED' });
            const body = req.body && typeof req.body === 'object' ? req.body : {};
            if (!Array.isArray(body.files) || body.files.length === 0) return res.status(400).json({ error: 'FILES_REQUIRED' });
            res.json(await ziyu.callZiyu('/api/v1/uploads', { method: 'POST', body, timeoutMs: 120000 }));
        } catch (err) { fail(res, err, err && err.status ? 502 : 500); }
    });

    app.post('/api/ziyu/v1/jobs', requireAuth, async (req, res) => {
        const key = requestKey(req);
        const taskId = localTaskId('ziyu', req.user.id, key);
        try {
            if (!ziyu.isConfigured()) return res.status(503).json({ error: 'ZIYU_NOT_CONFIGURED' });
            const existing = await localChannelTask('ziyu', taskId, req.user.id, query);
            if (existing?.provider_task_id) return res.json(await ziyu.callZiyu('/api/v1/jobs/' + encodeURIComponent(existing.provider_task_id), { timeoutMs: 30000 }));
            if (existing) return res.status(409).json({ error: 'TASK_SUBMISSION_IN_PROGRESS' });
            const catalog = await ziyu.fetchModelCatalog();
            const estimate = ziyuEstimate(req.body || {}, catalog);
            const providerBody = {
                modelId: estimate.model.id,
                mode: estimate.mode,
                prompt: String(req.body?.prompt || ''),
                ratio: req.body?.ratio == null ? undefined : String(req.body.ratio),
                duration: estimate.normalizedDuration == null ? undefined : String(estimate.normalizedDuration),
                assets: req.body?.assets && typeof req.body.assets === 'object' ? req.body.assets : undefined,
            };
            if (!providerBody.prompt.trim()) return res.status(400).json({ error: 'PROMPT_REQUIRED' });
            Object.keys(providerBody).forEach((field) => providerBody[field] === undefined && delete providerBody[field]);
            const reserved = await reserveTaskCredits({
                userId: req.user.id, taskId, credits: customerCost(estimate.baseCost),
                metadata: { channel: 'ziyu', capability: estimate.model.type === 'video' ? 'video' : 'image', modelId: estimate.model.id, mode: estimate.mode, estimatedZiyuCost: String(estimate.baseCost), seconds: String(estimate.seconds), email: req.user.email },
            });
            if (!reserved.ok) return res.status(402).json({ error: reserved.code, balance: reserved.balance });
            await claimChannelTask({ channel: 'ziyu', userId: req.user.id, taskId, modelId: estimate.model.id, mode: estimate.mode, status: 'reserved', query });
            let payload;
            try {
                payload = await ziyu.callZiyu('/api/v1/jobs', { method: 'POST', body: providerBody, headers: { 'Idempotency-Key': key }, timeoutMs: 120000 });
            } catch (err) {
                await refundTaskCredits({ userId: req.user.id, taskId, reason: 'provider_submit_failed', metadata: { channel: 'ziyu', email: req.user.email } }).catch(() => {});
                await query(`UPDATE channel_usage SET status = 'failed', error_code = $4, updated_at = NOW() WHERE channel = $1 AND task_id = $2 AND user_id = $3`, ['ziyu', taskId, req.user.id, String(err?.code || 'PROVIDER_SUBMIT_FAILED').slice(0, 100)]).catch(() => {});
                throw err;
            }
            const providerId = providerTaskId(payload);
            if (!providerId) {
                await refundTaskCredits({ userId: req.user.id, taskId, reason: 'provider_task_missing', metadata: { channel: 'ziyu', email: req.user.email } }).catch(() => {});
                await query(`UPDATE channel_usage SET status = 'failed', error_code = 'PROVIDER_TASK_MISSING', updated_at = NOW() WHERE channel = 'ziyu' AND task_id = $1 AND user_id = $2`, [taskId, req.user.id]).catch(() => {});
                return res.status(502).json({ error: 'PROVIDER_TASK_MISSING' });
            }
            await query(`UPDATE channel_usage SET provider_task_id = $3, status = $4, updated_at = NOW() WHERE channel = $1 AND task_id = $2 AND user_id = $5`, ['ziyu', taskId, providerId, statusFromJob(payload), req.user.id]);
            res.status(202).json(payload);
        } catch (err) { fail(res, err, err && err.status ? err.status : 500); }
    });

    // LAOBA 任务中心只读索引：只返回当前用户自己的任务，
    // 不把上游密钥、内部账本字段或别人的任务暴露给浏览器。
    app.get('/api/ziyu/tasks', requireAuth, async (req, res) => {
        try {
            const rawLimit = Number(req.query.limit || 50);
            const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.floor(rawLimit), 1), 100) : 50;
            const { rows } = await query(
                `SELECT task_id, provider_task_id, model_id, mode, status, charged_credits,
                        ziyu_cost, result_url, local_media_key, error_code, created_at, updated_at
                   FROM channel_usage
                  WHERE channel = 'ziyu' AND user_id = $1
                  ORDER BY created_at DESC
                  LIMIT $2`,
                [req.user.id, limit],
            );
            const refreshed = await Promise.all(rows.map(async (row) => {
                const rowStatus = String(row.status || '').toLowerCase();
                const failed = ['failed', 'error', 'cancelled', 'canceled', 'timeout', 'timed out'].includes(rowStatus);
                const persisted = Boolean(row.local_media_key && row.result_url);
                if (!row.provider_task_id || failed || (terminalStatus(row.status) && persisted) || !ziyu.isConfigured()) return row;
                try {
                    const payload = await ziyu.callZiyu('/api/v1/jobs/' + encodeURIComponent(row.provider_task_id), { timeoutMs: 30000 });
                    const status = statusFromJob(payload);
                    const job = jobObject(payload);
                    const rawCost = Number(job?.cost);
                    let resultUrl = row.result_url;
                    let localMediaKey = row.local_media_key;
                    if (['failed', 'error', 'cancelled', 'canceled', 'timeout', 'timed out'].includes(status)) {
                        await refundTaskCredits({ userId: req.user.id, taskId: row.task_id, reason: 'provider_task_failed', metadata: { channel: 'ziyu', providerTaskId: row.provider_task_id, email: req.user.email } });
                        await query(`UPDATE channel_usage SET status = $4, updated_at = NOW() WHERE channel = $1 AND task_id = $2 AND user_id = $3`, ['ziyu', row.task_id, req.user.id, status]);
                        return { ...row, status };
                    }
                    if (terminalStatus(status) && (!resultUrl || !localMediaKey)) {
                        const kind = (row.mode === 't2i' || row.mode === 'i2i') ? 'image' : 'video';
                        const resolved = resultUrl ? { ok: true, urls: [{ url: resultUrl, kind }] } : ziyu.resolveResultUrls(payload, kind);
                        if (!resolved.ok) return row;
                        for (const item of resolved.urls) {
                            if (!localMediaKey) {
                                const saved = await ziyu.persistRemoteMedia({ userId: req.user.id, taskId: row.task_id, url: item.url, registerMedia, kind: item.kind || kind });
                                if (!saved.ok) return row;
                                localMediaKey = saved.storageKey;
                            }
                            resultUrl = item.url;
                            break;
                        }
                        await query(`UPDATE channel_usage SET result_url = $3, local_media_key = $4, updated_at = NOW() WHERE channel = $1 AND task_id = $2 AND user_id = $5`, ['ziyu', row.task_id, resultUrl, localMediaKey, req.user.id]);
                    }
                    if (terminalStatus(status)) {
                        if (!Number.isFinite(rawCost) || !localMediaKey) return row;
                        await settleTaskCredits({ userId: req.user.id, taskId: row.task_id, ziyuCost: rawCost, status, metadata: { channel: 'ziyu', providerTaskId: row.provider_task_id, email: req.user.email } });
                        await query(`UPDATE channel_usage SET status = $4, ziyu_cost = $5, updated_at = NOW() WHERE channel = $1 AND task_id = $2 AND user_id = $3`, ['ziyu', row.task_id, req.user.id, status, rawCost]);
                        return { ...row, status, ziyu_cost: rawCost, result_url: resultUrl, local_media_key: localMediaKey };
                    }
                    await query(`UPDATE channel_usage SET status = $4, updated_at = NOW() WHERE channel = $1 AND task_id = $2 AND user_id = $3`, ['ziyu', row.task_id, req.user.id, status]);
                    return { ...row, status };
                } catch {
                    return row;
                }
            }));            res.json({
                tasks: refreshed.map((row) => ({
                    id: row.task_id,
                    providerTaskId: row.provider_task_id,
                    model: row.model_id,
                    mode: row.mode,
                    status: row.status,
                    chargedCredits: row.charged_credits,
                    providerCost: row.ziyu_cost,
                    resultUrl: row.result_url,
                    mediaUrl: row.local_media_key ? `/api/media/${encodeURIComponent(row.local_media_key)}` : null,
                    errorCode: row.error_code,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at,
                })),
            });
        } catch (err) { fail(res, err); }
    });

    app.get('/api/ziyu/v1/jobs/:providerTaskId', requireAuth, async (req, res) => {
        const providerId = String(req.params.providerTaskId || '').trim();
        try {
            if (!providerId) return res.status(400).json({ error: 'PROVIDER_TASK_REQUIRED' });
            if (!ziyu.isConfigured()) return res.status(503).json({ error: 'ZIYU_NOT_CONFIGURED' });
            const owned = await ownedProviderTask('ziyu', providerId, req.user.id, query);
            if (!owned) return res.status(404).json({ error: 'TASK_NOT_FOUND' });
            const payload = await ziyu.callZiyu('/api/v1/jobs/' + encodeURIComponent(providerId), { timeoutMs: 30000 });
            const status = statusFromJob(payload);
            const job = jobObject(payload);
            if (terminalStatus(status)) {
                const rawCost = Number(job?.cost);
                if (!Number.isFinite(rawCost)) return res.status(502).json({ error: 'PROVIDER_COST_MISSING' });
                await settleTaskCredits({ userId: req.user.id, taskId: owned.task_id, ziyuCost: rawCost, status, metadata: { channel: 'ziyu', providerJobId: providerId, email: req.user.email } });
                await query(`UPDATE channel_usage SET status = $4, ziyu_cost = $5, updated_at = NOW() WHERE channel = $1 AND task_id = $2 AND user_id = $3`, ['ziyu', owned.task_id, req.user.id, status, rawCost]);
            } else {
                await query(`UPDATE channel_usage SET status = $4, updated_at = NOW() WHERE channel = $1 AND task_id = $2 AND user_id = $3`, ['ziyu', owned.task_id, req.user.id, status]);
            }
            res.json(payload);
        } catch (err) { fail(res, err, err && err.status ? 502 : 500); }
    });

    app.get('/api/agnes/models', async (_req, res) => {
        res.json({ object: 'list', data: [{ id: 'sd2.5', object: 'model' }, { id: 'sd2', object: 'model' }, { id: 'sd2fast', object: 'model' }] });
    });

    app.get('/api/agnes/v1/models', async (_req, res) => {
        res.json({ object: 'list', data: [{ id: 'sd2.5', object: 'model' }, { id: 'sd2', object: 'model' }, { id: 'sd2fast', object: 'model' }] });
    });

    app.post('/api/agnes/v1/videos', requireAuth, async (req, res) => {
        let body = req.body;
        const contentType = String(req.headers['content-type'] || 'application/json');
        const isMultipart = contentType.toLowerCase().includes('multipart/form-data');
        try {
            if (isMultipart) body = await readRawBody(req);
            const key = requestKey(req);
            const taskId = localTaskId('agnes', req.user.id, key);
            const claimed = await claimChannelTask({ channel: 'agnes', userId: req.user.id, taskId, modelId: isMultipart ? null : String(body?.model || ''), mode: isMultipart ? null : String(body?.mode || ''), status: 'reserved', query });
            if (!claimed.created) {
                if (claimed.row?.provider_task_id) {
                    const replay = await callAgnesProxy('/v1/videos/' + encodeURIComponent(claimed.row.provider_task_id), { timeoutMs: 30000 });
                    return res.status(replay.status).type(replay.responseType || 'application/json').send(replay.payload);
                }
                return res.status(409).json({ error: 'TASK_SUBMISSION_IN_PROGRESS' });
            }
            const trial = await consumeFreeTrial(req.user.id, freeTrialLimit());
            if (!trial.ok) {
                await query(`DELETE FROM channel_usage WHERE channel = 'agnes' AND task_id = $1 AND user_id = $2 AND provider_task_id IS NULL`, [taskId, req.user.id]).catch(() => {});
                return res.status(429).json({ error: trial.code, status: trial.status });
            }
            let result;
            try {
                result = await callAgnesProxy('/v1/videos', { method: 'POST', body, contentType, headers: { 'Idempotency-Key': key }, timeoutMs: 600000 });
            } catch (err) {
                await query(`UPDATE channel_usage SET status = 'failed', error_code = $3, updated_at = NOW() WHERE channel = 'agnes' AND task_id = $1 AND user_id = $2`, [taskId, req.user.id, String(err?.code || 'AGNES_SUBMIT_FAILED').slice(0, 100)]).catch(() => {});
                throw err;
            }
            const providerId = providerTaskId(result.payload);
            if (!providerId) {
                await query(`UPDATE channel_usage SET status = 'failed', error_code = 'PROVIDER_TASK_MISSING', updated_at = NOW() WHERE channel = 'agnes' AND task_id = $1 AND user_id = $2`, [taskId, req.user.id]);
                return res.status(502).json({ error: 'PROVIDER_TASK_MISSING' });
            }
            await query(`UPDATE channel_usage SET provider_task_id = $3, status = 'submitted', updated_at = NOW() WHERE channel = 'agnes' AND task_id = $1 AND user_id = $2`, [taskId, req.user.id, providerId]);
            res.status(result.status).type(result.responseType || 'application/json').send(result.payload);
        } catch (err) { fail(res, err, err && err.status ? 502 : 500); }
    });

    app.get('/api/agnes/v1/videos/:providerTaskId', requireAuth, async (req, res) => {
        const providerId = String(req.params.providerTaskId || '').trim();
        try {
            if (!providerId) return res.status(400).json({ error: 'PROVIDER_TASK_REQUIRED' });
            const owned = await ownedProviderTask('agnes', providerId, req.user.id, query);
            if (!owned) return res.status(404).json({ error: 'TASK_NOT_FOUND' });
            const result = await callAgnesProxy('/v1/videos/' + encodeURIComponent(providerId), { timeoutMs: 30000 });
            const status = statusFromJob(result.payload);
            await query(`UPDATE channel_usage SET status = $4, updated_at = NOW() WHERE channel = 'agnes' AND task_id = $1 AND user_id = $2 AND provider_task_id = $3`, [owned.task_id, req.user.id, providerId, status]);
            res.status(result.status).type(result.responseType || 'application/json').send(result.payload);
        } catch (err) { fail(res, err, err && err.status ? 502 : 500); }
    });

    // GET /api/ziyu/me → 紫域侧账号信息（积分余额），用于人工对账
    app.get('/api/ziyu/me', requireAuth, requireAdmin, async (req, res) => {
        try {
            if (!ziyu.isConfigured()) return res.status(503).json({ error: 'ZIYU_NOT_CONFIGURED' });
            res.json(await ziyu.callZiyu('/api/v1/me', { timeoutMs: 15000 }));
        } catch (err) { fail(res, err, err && err.status ? 502 : 500); }
    });

    // POST /api/ziyu/persist  body: { taskId, url?, kind? }
    // 紫域结果 URL 24 小时后清理 → 任务完成后必须立即落盘。
    //
    // ★ 2026-09-13 实测订正：产出在**顶层 resultUrl**，不要回看 assets
    //   （assets 是用户上传的输入参考素材，拿它落盘 = 把参考图当成品交付）。
    //   旧实现直接拿 body.url 落盘，且只看第一个 URL，两个后果：
    //   ① 前端漏传 url 就落不了盘；② 多图任务只存第一张。
    app.post('/api/ziyu/persist', requireAuth, async (req, res) => {
        try {
            const { taskId, url, kind } = req.body || {};
            const mediaKind = kind || 'video';

            let resolved = null;
            if (taskId) {
                if (!ziyu.isConfigured()) return res.status(503).json({ error: 'ZIYU_NOT_CONFIGURED' });
                const job = await ziyu.callZiyu('/api/v1/jobs/' + encodeURIComponent(taskId), { timeoutMs: 30000 });
                const j = job && job.job && typeof job.job === 'object' ? job.job : job;
                const status = j && typeof j === 'object' ? j.status : null;
                if (status !== 'completed') {
                    return res.status(409).json({ error: 'TASK_NOT_COMPLETED', status: status || null, progress: (j && j.progress) || null });
                }
                resolved = ziyu.resolveResultUrls(job, mediaKind);
                if (!resolved.ok) {
                    console.warn('[credits] RESULT_URL_MISSING taskId=' + taskId + ' kind=' + mediaKind);
                    return res.status(422).json({ error: 'RESULT_URL_MISSING', warning: resolved.warning, taskId });
                }
            } else if (!url) {
                return res.status(400).json({ error: 'URL_REQUIRED' });
            }

            if (typeof registerMedia !== 'function') return res.status(500).json({ error: 'MEDIA_NOT_READY' });

            const items = resolved && resolved.urls.length ? resolved.urls : [{ url, kind: mediaKind }];
            const saved = [];
            for (const item of items) {
                const one = await ziyu.persistRemoteMedia({
                    userId: req.user.id, taskId, url: item.url, registerMedia, kind: item.kind || mediaKind,
                });
                if (!one.ok) {
                    // 已知取舍：部分成功会中断，已落盘的那几个不回滚（它们本身可用）。
                    return res.status(502).json({ error: one.code, url: item.url, savedCount: saved.length });
                }
                saved.push({ ...one, url: item.url, kind: item.kind || mediaKind });
            }

            const first = saved[0];
            if (typeof query === 'function' && taskId) {
                await query(SQL_MARK_ZIYU_RESULT, [taskId, req.user.id, first.url, first.storageKey])
                    .catch(() => { /* 登记失败不影响落盘结果 */ });
            }

            // 向后兼容：顶层仍带 storageKey/bytes/checksum/mimeType（老前端只读这几个）。
            res.json({
                ...first,
                ok: true,
                count: saved.length,
                items: saved.map((s) => ({ url: s.url, storageKey: s.storageKey, bytes: s.bytes, mimeType: s.mimeType, kind: s.kind })),
            });
        } catch (err) { fail(res, err, err && err.status ? 502 : 500); }
    });

    // -----------------------------------------------------------------------
    // 管理员
    // -----------------------------------------------------------------------

    // GET /api/admin/credits/overview
    app.get('/api/admin/credits/overview', requireAuth, requireAdmin, async (req, res) => {
        try { res.json(await adminCreditOverview()); } catch (err) { fail(res, err); }
    });

    // POST /api/admin/credits/adjust  body: { userId, amount, note? }
    app.post('/api/admin/credits/adjust', requireAuth, requireAdmin, async (req, res) => {
        try {
            const { userId, amount, note } = req.body || {};
            if (!userId || amount === undefined) return res.status(400).json({ error: 'INVALID_INPUT' });
            res.json(await adminAdjustBalance({ userId, adminId: req.user.id, amount, note: note || '' }));
        } catch (err) { fail(res, err, 400); }
    });

    // GET /api/admin/credits/reconcile?days=1
    app.get('/api/admin/credits/reconcile', requireAuth, requireAdmin, async (req, res) => {
        try { res.json({ diffs: await reconcileChannelUsage({ days: req.query.days }) }); }
        catch (err) { fail(res, err); }
    });

    // GET /api/admin/credits/denominations
    app.get('/api/admin/credits/denominations', requireAuth, requireAdmin, (req, res) => {
        res.json({ denominations: REDEEM_DENOMINATIONS });
    });

    // POST /api/admin/credits/generate  body: { credits, count }
    // ⚠️ 在线生成只是"临时补货"。默认方式仍然是本地脚本批量生成（码不经过服务器）。
    //    在线生成会把明文码经 HTTP 返回给管理员 —— 这是可接受的风险，
    //    但不要把它做成批量几千张的常规通道。
    app.post('/api/admin/credits/generate', requireAuth, requireAdmin, (req, res) => {
        try {
            const { credits, count } = req.body || {};
            const denom = Number(credits);
            const n = Number(count);
            if (!REDEEM_DENOMINATIONS.includes(denom)) return res.status(400).json({ error: 'INVALID_DENOMINATION' });
            if (!Number.isFinite(n) || n < 1 || n > 200) return res.status(400).json({ error: 'INVALID_COUNT' });

            const secret = process.env.LDXP_REDEEM_SECRET;
            if (!secret || secret.length < 32) return res.status(503).json({ error: 'LDXP_PAYMENT_CHANNEL_UNAVAILABLE' });

            const codes = [];
            for (let i = 0; i < n; i += 1) {
                const nonce = randomBytes(12).toString('hex').toUpperCase();
                const payload = 'NN-' + denom + '-' + nonce;
                codes.push(payload + '-' + signPayload(payload, secret));
            }
            // 只返回这一次，不落库、不记日志。
            res.json({ credits: denom, count: codes.length, codes });
        } catch (err) { fail(res, err); }
    });
}

export { mountCreditRoutes, freeTrialLimit };
