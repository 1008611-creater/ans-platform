import { createHash, randomUUID } from 'node:crypto';

const openluxJobs = new Map();
const openluxMediaBuffers = new Map();
const arkTasksMeta = new Map();

function openluxBase() {
    return String(process.env.OPENLUX_BASE_URL || 'https://api.openlux.ai/v1').trim().replace(/\/+$/, '');
}

function openluxKey() {
    return String(process.env.OPENLUX_API_KEY || '').trim();
}

function arkBase() {
    return String(process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').trim().replace(/\/+$/, '');
}

function arkKey() {
    return String(process.env.ARK_API_KEY || '').trim();
}

function isConfigured() {
    return Boolean(openluxKey() || arkKey());
}

function apiBase() {
    return arkBase();
}

function apiKey() {
    return arkKey();
}

const OFFICIAL_MODELS = [
    {
        id: 'gpt-image-2.5-sunburst-c',
        name: 'image2.5sunburst',
        displayName: 'Image 2.5 Sunburst (OpenLux)',
        type: 'image',
        channel: 'openlux',
        cost: 2,
        costPerSecond: 0,
        modes: ['t2i', 'i2i'],
        allowedRatios: ['1:1', '3:2', '2:3', '16:9', '9:16', '3:4', '4:3'],
        allowedDurations: [],
        enabled: true,
    },
    {
        id: 'gpt-image-2-c',
        name: 'image2',
        displayName: 'Image 2 (OpenLux)',
        type: 'image',
        channel: 'openlux',
        cost: 2,
        costPerSecond: 0,
        modes: ['t2i', 'i2i'],
        allowedRatios: ['1:1', '3:2', '2:3', '16:9', '9:16', '3:4', '4:3'],
        allowedDurations: [],
        enabled: true,
    },
    {
        id: 'doubao-seedance-2-5-260628',
        name: 'sd2.5',
        displayName: 'Seedance 2.5 (火山旗舰 SD2.5 · 50点/5秒)',
        type: 'video',
        channel: 'volcengine',
        cost: 50,
        costPerSecond: 10,
        modes: ['t2v', 'i2v', 'r2v'],
        allowedRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
        allowedDurations: [4, 5, 6, 8, 10, 12, 15],
        enabled: true,
    },
    {
        id: 'doubao-seedance-2-0-260128',
        name: 'sd2',
        displayName: 'Seedance 2.0 (火山标准 SD2 · 30点/5秒)',
        type: 'video',
        channel: 'volcengine',
        cost: 30,
        costPerSecond: 6,
        modes: ['t2v', 'i2v', 'r2v'],
        allowedRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
        allowedDurations: [4, 5, 6, 8, 10, 12],
        enabled: true,
    },
    {
        id: 'doubao-seedance-2-0-fast-260128',
        name: 'sd2fast',
        displayName: 'Seedance 2.0 Fast (火山极速 SD2Fast · 15点/5秒)',
        type: 'video',
        channel: 'volcengine',
        cost: 15,
        costPerSecond: 3,
        modes: ['t2v', 'i2v', 'r2v'],
        allowedRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
        allowedDurations: [4, 5, 6, 8, 10, 12],
        enabled: true,
    },
];

function normalizeModel(raw) {
    return raw;
}

async function fetchModelCatalog() {
    return {
        ok: true,
        models: OFFICIAL_MODELS,
    };
}

function groupModels(models) {
    const list = Array.isArray(models) ? models : OFFICIAL_MODELS;
    const video = list.filter((m) => m.type === 'video');
    const image = list.filter((m) => m.type !== 'video');
    const tiers = new Map();
    for (const m of list) {
        const tier = m.cost ?? 0;
        if (!tiers.has(tier)) tiers.set(tier, []);
        tiers.get(tier).push(m);
    }
    const byCost = [...tiers.entries()]
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([tier, ms]) => ({ tier: Number(tier), models: ms }));
    return { video, image, byCost };
}

function normalizeDuration(requested, allowedDurations) {
    const allowed = Array.isArray(allowedDurations) ? allowedDurations.filter((x) => x != null) : [];
    if (allowed.length === 0) return null;
    const num = (v) => {
        const m = String(v).match(/(\d+(?:\.\d+)?)/);
        return m ? Number(m[1]) : NaN;
    };
    const wanted = num(requested);
    if (Number.isFinite(wanted)) {
        const exact = allowed.find((a) => num(a) === wanted);
        if (exact !== undefined) return exact;
        const le = allowed
            .map((a) => ({ raw: a, n: num(a) }))
            .filter((x) => Number.isFinite(x.n) && x.n <= wanted)
            .sort((a, b) => b.n - a.n)[0];
        if (le) return le.raw;
        const ge = allowed
            .map((a) => ({ raw: a, n: num(a) }))
            .filter((x) => Number.isFinite(x.n))
            .sort((a, b) => a.n - b.n)[0];
        if (ge) return ge.raw;
    }
    return allowed[0];
}

function sizeForRatio(ratio) {
    const r = String(ratio || '1:1').trim();
    if (r === '16:9' || r === '3:2' || r === '4:3') return '1536x1024';
    if (r === '9:16' || r === '2:3' || r === '3:4') return '1024x1536';
    return '1024x1024';
}

function getMediaBuffer(id) {
    return openluxMediaBuffers.get(String(id || '').replace(/\.png$/i, '')) || null;
}

async function runOpenLuxJob(jobId, modelId, body) {
    const job = openluxJobs.get(jobId);
    if (!job) return;
    try {
        const targetModel = (modelId.includes('2.5') || modelId.includes('sunburst'))
            ? 'gpt-image-2.5-sunburst-c'
            : 'gpt-image-2-c';
        const payload = {
            model: targetModel,
            prompt: String(body?.prompt || '').trim(),
            n: 1,
            size: sizeForRatio(body?.ratio),
            quality: 'high',
        };
        const refImages = Array.isArray(body?.assets?.image) ? body.assets.image : [];
        if (refImages.length > 0 && refImages[0]?.url) {
            payload.image = refImages[0].url;
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 300000);
        try {
            const res = await fetch(`${openluxBase()}/images/generations`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${openluxKey()}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'curl/8.7.1',
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data?.error?.message || `OpenLux HTTP ${res.status}`);
            }
            const item = Array.isArray(data?.data) ? data.data[0] : null;
            let buf = null;
            if (item?.b64_json) {
                buf = Buffer.from(item.b64_json, 'base64');
            } else if (item?.url) {
                const imgRes = await fetch(item.url);
                if (imgRes.ok) buf = Buffer.from(await imgRes.arrayBuffer());
            }
            if (!buf || !buf.length) {
                throw new Error('OpenLux returned empty image data');
            }
            openluxMediaBuffers.set(jobId, buf);
            const mediaPath = `/api/ziyu/media/${jobId}.png`;
            job.status = 'completed';
            job.resultUrl = mediaPath;
            job.previewUrl = mediaPath;
            job.preview = mediaPath;
            job.updatedAt = new Date().toISOString();
        } finally {
            clearTimeout(timer);
        }
    } catch (err) {
        job.status = 'failed';
        job.cost = 0;
        job.refunded = true;
        job.refundAmount = 2;
        job.failureReason = String(err?.message || err || 'OpenLux image generation failed');
        job.updatedAt = new Date().toISOString();
    }
}

async function submitVolcArkVideoJob(modelId, body) {
    let targetModel = 'doubao-seedance-2-5-260628';
    let cps = 10;
    if (modelId === 'sd2fast' || modelId.includes('fast')) {
        targetModel = 'doubao-seedance-2-0-fast-260128';
        cps = 3;
    } else if (modelId === 'sd2' || modelId === 'doubao-seedance-2-0-260128') {
        targetModel = 'doubao-seedance-2-0-260128';
        cps = 6;
    }
    const durMatch = String(body?.duration || '5').match(/(\d+)/);
    const duration = Math.max(4, Math.min(15, durMatch ? Number(durMatch[1]) : 5));
    const estimatedCost = Number((cps * duration).toFixed(2));

    const content = [{ type: 'text', text: String(body?.prompt || '').trim() }];
    const refImages = Array.isArray(body?.assets?.image) ? body.assets.image : [];
    const hasFirstFrame = refImages.length > 0 && body?.mode !== 'r2v';
    if (refImages.length > 0) {
        if (body?.mode === 'r2v') {
            for (const img of refImages.slice(0, 4)) {
                if (img?.url) {
                    content.push({ type: 'image_url', image_url: { url: img.url }, role: 'reference_image' });
                }
            }
        } else {
            if (refImages[0]?.url) {
                content.push({ type: 'image_url', image_url: { url: refImages[0].url }, role: 'first_frame' });
            }
            if (refImages[1]?.url) {
                content.push({ type: 'image_url', image_url: { url: refImages[1].url }, role: 'last_frame' });
            }
        }
    }

    const arkPayload = {
        model: targetModel,
        content,
        resolution: '720p',
        duration,
        framespersecond: 24,
        generate_audio: true,
        watermark: false,
    };
    if (!hasFirstFrame && body?.ratio) {
        arkPayload.ratio = String(body.ratio);
    }

    const res = await fetch(`${arkBase()}/contents/generations/tasks`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${arkKey()}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(arkPayload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.id) {
        const err = new Error(data?.error?.message || `Volcengine Ark HTTP ${res.status}`);
        err.status = res.status || 502;
        err.code = data?.error?.code || 'ARK_SUBMIT_FAILED';
        throw err;
    }
    const taskId = String(data.id);
    arkTasksMeta.set(taskId, {
        id: taskId,
        model: targetModel,
        duration,
        cost: estimatedCost,
        createdAt: new Date().toISOString(),
    });
    return {
        ok: true,
        id: taskId,
        jobId: taskId,
        job: {
            id: taskId,
            status: 'processing',
            cost: estimatedCost,
        },
    };
}

async function pollVolcArkVideoJob(taskId) {
    const cachedMeta = arkTasksMeta.get(taskId);
    const res = await fetch(`${arkBase()}/contents/generations/tasks/${encodeURIComponent(taskId)}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${arkKey()}`,
            'Content-Type': 'application/json',
        },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(data?.error?.message || `Volcengine Ark poll HTTP ${res.status}`);
        err.status = res.status || 502;
        throw err;
    }
    const inferredDur = Math.max(4, Number(data?.duration || data?.content?.duration || 5));
    const inferredModel = String(data?.model || '').toLowerCase();
    const inferredCps = inferredModel.includes('2-5') || inferredModel.includes('2.5') ? 10 : inferredModel.includes('fast') ? 3 : 6;
    const meta = cachedMeta || { cost: inferredCps * inferredDur };
    const rawStatus = String(data?.status || '').toLowerCase();
    if (rawStatus === 'succeeded') {
        const videoUrl = data?.content?.video_url || null;
        return {
            ok: true,
            id: taskId,
            job: {
                id: taskId,
                status: 'completed',
                cost: meta.cost,
                resultUrl: videoUrl,
                previewUrl: videoUrl,
                preview: videoUrl,
            },
        };
    }
    if (rawStatus === 'failed' || rawStatus === 'cancelled' || rawStatus === 'canceled' || rawStatus === 'expired') {
        return {
            ok: true,
            id: taskId,
            job: {
                id: taskId,
                status: 'failed',
                cost: 0,
                refunded: true,
                refundAmount: meta.cost,
                failureReason: data?.error?.message || '火山方舟视频生成失败',
            },
        };
    }
    return {
        ok: true,
        id: taskId,
        job: {
            id: taskId,
            status: 'processing',
            cost: meta.cost,
        },
    };
}

async function callZiyu(path, { method = 'GET', body } = {}) {
    const cleanPath = String(path || '').trim();
    if (cleanPath === '/api/v1/models') {
        return fetchModelCatalog();
    }
    if (cleanPath === '/api/v1/uploads' && method === 'POST') {
        const files = Array.isArray(body?.files) ? body.files : [];
        return {
            ok: true,
            assets: files.map((f, i) => ({
                url: f?.data || '',
                type: f?.type || 'image',
                name: f?.name || `ref-${i + 1}.png`,
            })),
        };
    }
    if (cleanPath === '/api/v1/jobs' && method === 'POST') {
        const modelId = String(body?.modelId || '').trim();
        const isImage = modelId.includes('image') || body?.mode === 't2i' || body?.mode === 'i2i';
        if (isImage) {
            const jobId = 'openlux_' + randomUUID().replace(/-/g, '');
            const job = {
                id: jobId,
                status: 'processing',
                cost: 2,
                createdAt: new Date().toISOString(),
            };
            openluxJobs.set(jobId, job);
            setImmediate(() => {
                runOpenLuxJob(jobId, modelId, body).catch(() => {});
            });
            return {
                ok: true,
                id: jobId,
                jobId,
                job,
            };
        }
        return submitVolcArkVideoJob(modelId, body);
    }
    if (cleanPath.startsWith('/api/v1/jobs/') && method === 'GET') {
        const taskId = decodeURIComponent(cleanPath.slice('/api/v1/jobs/'.length));
        if (taskId.startsWith('openlux_')) {
            const job = openluxJobs.get(taskId);
            if (!job) {
                const err = new Error('TASK_NOT_FOUND');
                err.status = 404;
                throw err;
            }
            return { ok: true, id: taskId, job };
        }
        return pollVolcArkVideoJob(taskId);
    }
    if (cleanPath === '/api/v1/me') {
        return {
            ok: true,
            provider: 'openlux+volcengine',
            openluxConfigured: Boolean(openluxKey()),
            volcengineConfigured: Boolean(arkKey()),
        };
    }
    throw new Error(`Unsupported provider path: ${cleanPath}`);
}

function extractResultUrls(job, kind) {
    const j = job && job.job && typeof job.job === 'object' ? job.job : job;
    if (!j || typeof j !== 'object') return [];
    const out = [];
    const seen = new Set();
    const push = (rawUrl) => {
        const url = typeof rawUrl === 'string' ? rawUrl.trim() : '';
        if (!url || seen.has(url)) return;
        seen.add(url);
        const inferred = inferMediaType(url, kind === 'image' ? 'image/png' : 'video/mp4');
        const guessed = inferred.mimeType.startsWith('image/')
            ? 'image'
            : (inferred.mimeType.startsWith('audio/') ? 'audio' : 'video');
        out.push({
            url,
            kind: kind || guessed,
            mime: inferred.mimeType,
            size: null,
            name: null,
            source: 'result',
        });
    };
    push(j.resultUrl);
    push(j.previewUrl);
    push(j.preview);
    return out;
}

function extractInputAssets(job) {
    const j = job && job.job && typeof job.job === 'object' ? job.job : job;
    if (!j || typeof j !== 'object') return [];
    const assets = j.assets;
    if (!assets || typeof assets !== 'object') return [];
    const out = [];
    const seen = new Set();
    for (const k of ['image', 'video', 'audio']) {
        const list = Array.isArray(assets[k]) ? assets[k] : [];
        for (const a of list) {
            if (!a || typeof a !== 'object') continue;
            const url = typeof a.url === 'string' ? a.url.trim() : '';
            if (!url || seen.has(url)) continue;
            seen.add(url);
            out.push({
                url,
                kind: a.type || k,
                mime: a.mime || null,
                size: typeof a.size === 'number' ? a.size : null,
                name: a.name || null,
                uploadedAt: a.uploadedAt || null,
            });
        }
    }
    return out;
}

function resolveResultUrls(job, kind) {
    const j = job && job.job && typeof job.job === 'object' ? job.job : job;
    const urls = extractResultUrls(j, kind);
    const status = j && typeof j === 'object' ? j.status : null;
    if (urls.length > 0) return { ok: true, urls, warning: null };
    const warning = status === 'completed'
        ? 'RESULT_URL_MISSING：任务已完成但没有产出地址'
        : 'RESULT_URL_MISSING：任务尚未产出可落盘的结果';
    return { ok: false, urls: [], warning };
}

function inferMediaType(url, fallbackMime = 'video/mp4') {
    const clean = String(url).split('?')[0].toLowerCase();
    const m = clean.match(/\.([a-z0-9]{2,5})$/);
    const ext = m ? m[1] : '';
    const map = {
        mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        webp: 'image/webp', gif: 'image/gif', mp3: 'audio/mpeg', wav: 'audio/wav',
    };
    return { ext: ext || (fallbackMime.startsWith('image/') ? 'png' : 'mp4'), mimeType: map[ext] || fallbackMime };
}

async function persistRemoteMedia({ userId, taskId, url, registerMedia, kind = 'video' }, { timeoutMs = 300000 } = {}) {
    if (!url || typeof url !== 'string') return { ok: false, code: 'NO_RESULT_URL' };
    if (typeof registerMedia !== 'function') throw new Error('persistRemoteMedia: registerMedia dependency is required');

    let buffer;
    let contentType = '';
    if (url.startsWith('/api/ziyu/media/')) {
        const id = url.slice('/api/ziyu/media/'.length).replace(/\.png$/i, '');
        buffer = openluxMediaBuffers.get(id);
        contentType = 'image/png';
        if (!buffer) return { ok: false, code: 'DOWNLOAD_FAILED', message: 'Local OpenLux buffer expired' };
    } else {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(url, { signal: controller.signal });
            if (!res.ok) return { ok: false, code: 'DOWNLOAD_FAILED', status: res.status };
            contentType = res.headers.get('content-type') || '';
            buffer = Buffer.from(await res.arrayBuffer());
        } catch (err) {
            return { ok: false, code: 'DOWNLOAD_FAILED', message: String(err && err.message || err) };
        } finally {
            clearTimeout(timer);
        }
    }
    if (!buffer || !buffer.length) return { ok: false, code: 'EMPTY_RESULT' };

    const inferred = inferMediaType(url, contentType.startsWith('image/') ? contentType : (kind === 'image' ? 'image/png' : 'video/mp4'));
    const checksum = createHash('sha256').update(buffer).digest('hex');
    const storageKey = 'ziyu/' + userId + '/' + (taskId || checksum.slice(0, 16)) + '.' + inferred.ext;
    const objectKey = storageKey;

    await registerMedia(userId, storageKey, objectKey, buffer, {
        mimeType: inferred.mimeType,
        sourceUrl: url,
    });

    return { ok: true, storageKey, bytes: buffer.length, checksum, mimeType: inferred.mimeType };
}

export {
    isConfigured,
    apiBase,
    apiKey,
    callZiyu,
    fetchModelCatalog,
    normalizeModel,
    groupModels,
    normalizeDuration,
    extractResultUrls,
    extractInputAssets,
    resolveResultUrls,
    inferMediaType,
    persistRemoteMedia,
    getMediaBuffer,
};
