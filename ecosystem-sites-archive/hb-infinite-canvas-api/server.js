/**
 * 无限画布服务端 API。
 *
 * 定位：服务端是真相来源，浏览器只是视图。
 * 和之前 WebDAV 那套最大的区别 —— 这里「认识」数据：知道哪个视频来自哪条生成任务、
 * 原始外链是什么、什么时候抓回来的。外链失效也不会无声无息丢东西。
 *
 * 环境变量：
 *   DATABASE_URL        postgres 连接串
 *   JWT_SECRET          访问令牌密钥（>=16 字符，务必配）
 *   MEDIA_ROOT          媒体落盘目录，默认 /data/media
 *   PORT                监听端口，默认 8790
 *   CANVAS_LEGACY_TOKEN 旧的站点静态 cookie 值；配了就当作「后门」，
 *                       用于在 API 出问题时仍能打开页面（只放行页面，不放行数据）
 *   ALLOW_REGISTER      默认 1；关掉后只能由管理员建号
 */
import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

import cookieParser from "cookie-parser";
import express from "express";

import { query, migrate, closeDb } from "./db.js";
import * as auth from "./auth.js";
import { mountCreditRoutes } from "./routes-credits.js";
import { sendMail, smtpConfigured } from "./email.js";
import { issueCode, verifyCode, revokeLatestCode, TTL_SECONDS } from "./email-verify.js";
import { verifyUnifiedAssertion } from "./unified-auth.js";
import { authWithAns } from "./unified-quota.js";

const app = express();
const PORT = Number(process.env.PORT || 8790);
const MEDIA_ROOT = process.env.MEDIA_ROOT || "/data/media";
const PART_MAX_AGE_HOURS = Number(process.env.PART_MAX_AGE_HOURS || 24);
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 2 * 1024 * 1024 * 1024);

app.set("trust proxy", true);
app.use(cookieParser());
// 二进制上传（/api/media、/api/sync 的 PUT/PATCH）必须拿到原始 Buffer。
// 全局 express.json() 会把 Content-Type: application/json 的请求体先解析成对象，
// 于是 raw 中间件再拿到时已经不是 Buffer，manifest 这类 JSON 文件就传不上来。
// 所以这两条路径上的上传请求跳过 JSON 解析。
const jsonParser = express.json({ limit: "200mb" });
const formParser = express.urlencoded({ extended: false });
const isBinaryUpload = (req) =>
    (req.method === "PUT" || req.method === "PATCH") &&
    (req.path.startsWith("/api/media/") || req.path.startsWith("/api/sync/"));
app.use((req, res, next) => (isBinaryUpload(req) ? next() : jsonParser(req, res, next)));
app.use((req, _res, next) => (req.is("application/x-www-form-urlencoded") ? formParser(req, _res, next) : next()));

// 同源部署，但 MCP/agent 与本地调试会跨域调用，放行凭据
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization, Content-Range, X-Upload-Offset, Idempotency-Key",
        );
        res.setHeader("Access-Control-Expose-Headers", "X-Upload-Offset, X-Upload-Total, X-Upload-Complete");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    }
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
});

// ---------------------------------------------------------------- 鉴权中间件

function readAccessToken(req) {
    const fromCookie = req.cookies?.[auth.SESSION_COOKIE];
    if (fromCookie) return fromCookie;
    const header = req.headers.authorization || "";
    return header.startsWith("Bearer ") ? header.slice(7) : "";
}

/** 数据接口：必须有真会话。后门 cookie 不算，避免拿到旧密码就能拖库。 */
async function requireAuth(req, res, next) {
    try {
        const token = readAccessToken(req);
        if (!token) return res.status(401).json({ error: "unauthorized" });
        const payload = auth.verifyAccessToken(token);
        if (!payload) return res.status(401).json({ error: "unauthorized" });
        const user = await auth.findUserById(payload.sub);
        if (!user) return res.status(401).json({ error: "unauthorized" });
        req.user = user;
        next();
    } catch (error) {
        console.error("[auth] 鉴权异常:", error && error.message);
        res.status(500).json({ error: "auth_failed" });
    }
}

/** 管理员守卫：未登录 401，非管理员 403。只用于 /api/admin/* 与 /api/ziyu/me。 */
function requireAdmin(req, res, next) {
    if (!req.user) return res.status(401).json({ error: "auth_required" });
    if (req.user.role !== "admin") return res.status(403).json({ error: "admin_required" });
    next();
}

/** nginx auth_request 用：真会话 或 旧站点 cookie 都放行（后者仅开页面） */
app.get("/api/auth/verify", (req, res) => {
    const token = readAccessToken(req);
    if (token && auth.verifyAccessToken(token)) return res.sendStatus(200);
    return res.sendStatus(401);
});

// ---------------------------------------------------------------- 账号

app.get("/api/health", async (_req, res) => {
    try {
        await query("SELECT 1");
        res.json({ ok: true, db: true });
    } catch (error) {
        res.status(503).json({ ok: false, db: false, error: error.message });
    }
});

/** 客户端 IP。已开 trust proxy，req.ip 会解析 X-Forwarded-For。 */
function clientIp(req) {
    return String(req.ip || req.socket?.remoteAddress || "").slice(0, 64);
}

// POST /api/auth/register/code —— 发注册验证码
//
// ⚠️ fail-closed：SMTP 没配就 503，**绝不放行**。
//    放行等于"验证码形同虚设"，比明确报错危险得多 —— 你会以为已经验证过了。
app.post("/api/auth/register/code", async (req, res) => {
    try {
        if (process.env.ALLOW_REGISTER === "0") return res.status(403).json({ error: "registration_closed" });
        if (!smtpConfigured()) {
            console.error("[auth] 请求发码但 SMTP 未配置 —— 拒绝（fail-closed）");
            return res.status(503).json({ error: "mail_not_configured" });
        }
        const email = String(req.body?.email || "").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "invalid_email" });
        if (await auth.findUserByEmail(email)) return res.status(409).json({ error: "email_taken" });

        const issued = await issueCode({ email, ip: clientIp(req), purpose: "register" });
        if (!issued.ok) return res.status(429).json({ error: issued.reason, retryAfter: issued.retryAfter });

        try {
            await sendMail({
                to: email,
                subject: "无限画布 · 注册验证码",
                text: [
                    `你的注册验证码是 ${issued.code}`,
                    "",
                    `${Math.round(TTL_SECONDS / 60)} 分钟内有效，最多可试 5 次。`,
                    "如果这不是你本人操作，忽略本邮件即可。",
                ].join("\n"),
            });
        } catch (mailError) {
            console.error("[auth] 验证码邮件发送失败:", mailError && mailError.message);
            await revokeLatestCode({ email, purpose: "register" }).catch(() => {});
            return res.status(502).json({ error: "mail_send_failed" });
        }

        // ⚠️ 明文验证码只出现在邮件里，不进日志、不进响应体
        res.json({ ok: true, ttlSeconds: issued.ttlSeconds });
    } catch (error) {
        console.error("[auth] 发码失败:", error && error.message);
        res.status(500).json({ error: "code_issue_failed" });
    }
});

app.post("/api/auth/register", async (req, res) => {
    try {
        if (process.env.ALLOW_REGISTER === "0") return res.status(403).json({ error: "registration_closed" });
        const email = String(req.body?.email || "").trim().toLowerCase();
        const password = String(req.body?.password || "");
        const displayName = String(req.body?.displayName || "").trim();
        const code = String(req.body?.code || "").trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "invalid_email" });
        if (password.length < 8) return res.status(400).json({ error: "password_too_short" });
        if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: "invalid_code" });
        if (await auth.findUserByEmail(email)) return res.status(409).json({ error: "email_taken" });

        // 邮箱验证码：未通过一律拒绝，不做"配置缺失就放行"的降级
        const checked = await verifyCode({ email, code, purpose: "register" });
        if (!checked.ok) {
            const status = checked.reason === "code_locked" ? 429 : 400;
            return res.status(status).json({ error: checked.reason });
        }

        // Public registration must never grant an administrative role.  Admin
        // access is an explicit operator action, separate from sign-up.
        const fresh = await auth.createUser({ email, password, displayName });
        await authWithAns({ mode: "register", email, password, name: displayName || email.split("@")[0] }).catch(() => {});
        const refresh = await auth.issueRefreshToken(fresh.id, req.headers["user-agent"]);
        auth.setSessionCookies(res, fresh, refresh);
        res.status(201).json({ user: fresh });
    } catch (error) {
        console.error("[auth] 注册失败:", error && error.message);
        res.status(500).json({ error: "register_failed" });
    }
});

app.post("/api/auth/login", async (req, res) => {
    try {
        const email = String(req.body?.email || "").trim().toLowerCase();
        const password = String(req.body?.password || "");
        // 1. Try ANS Unified Account authentication first
        const ansAuth = await authWithAns({ mode: "login", email, password }).catch(() => null);
        let user = await auth.findUserByEmail(email);
        if (ansAuth && ansAuth.ok && ansAuth.body?.ok) {
            if (!user) {
                user = await auth.createUser({
                    email,
                    password,
                    displayName: ansAuth.body.user?.name || email.split("@")[0],
                });
            }
            await query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [user.id]);
            const fresh = await auth.findUserById(user.id);
            const refresh = await auth.issueRefreshToken(user.id, req.headers["user-agent"]);
            auth.setSessionCookies(res, fresh, refresh);
            return res.json({ user: fresh, authority: "ans", balance: ansAuth.body.balance });
        }
        // 2. Fallback to local user verification and auto-sync to ANS
        const hash = user?.password_hash || "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
        const ok = await auth.verifyPassword(password, hash);
        if (!user || !ok) return res.status(401).json({ error: "invalid_credentials" });
        await authWithAns({ mode: "register", email, password, name: user.display_name || email.split("@")[0] }).catch(() => {});
        await query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [user.id]);
        const fresh = await auth.findUserById(user.id);
        const refresh = await auth.issueRefreshToken(user.id, req.headers["user-agent"]);
        auth.setSessionCookies(res, fresh, refresh);
        res.json({ user: fresh, authority: "ans" });
    } catch (error) {
        console.error("[auth] 登录失败:", error && error.message);
        res.status(500).json({ error: "login_failed" });
    }
});

app.post("/api/auth/refresh", async (req, res) => {
    try {
        const presented = req.cookies?.[auth.REFRESH_COOKIE] || req.body?.refreshToken;
        const rotated = await auth.rotateRefreshToken(presented);
        if (!rotated) return res.status(401).json({ error: "invalid_refresh_token" });
        const user = await auth.findUserById(rotated.userId);
        if (!user) return res.status(401).json({ error: "invalid_refresh_token" });
        auth.setSessionCookies(res, user, rotated.refresh);
        res.json({ user });
    } catch (error) {
        console.error("[auth] 刷新失败:", error && error.message);
        res.status(500).json({ error: "refresh_failed" });
    }
});

app.post("/api/auth/logout", async (req, res) => {
    try {
        await auth.revokeRefreshToken(req.cookies?.[auth.REFRESH_COOKIE] || req.body?.refreshToken);
    } catch {
        // 登出失败也要清 cookie，别把人卡住
    }
    auth.clearSessionCookies(res);
    res.json({ ok: true });
});

app.get("/api/auth/me", async (req, res) => { try { const t = readAccessToken(req); const p = t && auth.verifyAccessToken(t); const u = p && await auth.findUserById(p.sub); return res.json({ user: u || null }); } catch { return res.json({ user: null }); } });

// New API bridge login. Disabled until UNIFIED_AUTH_SECRET is configured.
async function unifiedLogin(req, res) {
    try {
        const identity = verifyUnifiedAssertion(req.body?.assertion);
        if (!identity || identity.purpose !== "login" || identity.audience !== "hb" || !identity.subject || !identity.jti) return res.status(401).json({ error: "invalid_unified_assertion" });
        let user = await auth.findUserByEmail(identity.email);
        if (!user) {
            user = await auth.createUser({
                email: identity.email,
                password: `unified-shadow-${crypto.randomBytes(32).toString("base64url")}`,
                displayName: identity.email,
            });
            user = await auth.findUserById(user.id);
        }
        const refresh = await auth.issueRefreshToken(user.id, req.headers["user-agent"]);
        auth.setSessionCookies(res, user, refresh);
        if (req.body?.redirect === "1" || req.query?.redirect === "1") return res.redirect("/");
        res.json({ user, unifiedSubject: identity.subject || null });
    } catch (error) {
        console.error("[auth] 统一账号桥接失败:", error && error.message);
        res.status(500).json({ error: "unified_auth_failed" });
    }
}
app.post("/api/auth/unified", unifiedLogin);

app.post("/api/auth/unified/logout", async (req, res) => {
    try {
        const identity = verifyUnifiedAssertion(req.body?.assertion);
        if (!identity || identity.purpose !== "logout" || identity.audience !== "hb" || !identity.subject || !identity.jti) return res.status(401).json({ error: "invalid_unified_assertion" });
        const user = await auth.findUserByEmail(identity.email);
        if (user) await auth.revokeAllRefreshTokens(user.id);
        auth.clearSessionCookies(res);
        res.json({ ok: true });
    } catch {
        res.status(500).json({ error: "unified_logout_failed" });
    }
});

// 额度 / 卡密 / 紫域目录 / 落盘 / 管理员对账（批次 1）
mountCreditRoutes(app, { requireAuth, requireAdmin, registerMedia, query });

// ---------------------------------------------------------------- 通用 CRUD

async function listRows(table, userId, since) {
    const params = [userId];
    let where = `user_id = $1 AND deleted_at IS NULL`;
    if (since) {
        params.push(since);
        where += ` AND updated_at > $2`;
    }
    const { rows } = await query(
        `SELECT * FROM ${table} WHERE ${where} ORDER BY updated_at DESC`,
        params,
    );
    return rows;
}

/**
 * 批量 upsert，同步用：一次把本地改动全推上来，按 id 覆盖。
 *
 * 只写「客户端真的给了的字段」：给 null/undefined 的列直接跳过，让数据库用默认值。
 * 否则 INSERT 时 created_at 会被显式写成 NULL，撞上 NOT NULL 直接 500；
 * 更新时也会把好端端的值覆盖成空。
 */
async function upsertRows(table, userId, items, columns) {
    const saved = [];
    for (const item of items || []) {
        if (!item?.id) continue;
        const present = columns.filter(
            (c) => item[c.field] !== undefined && item[c.field] !== null,
        );
        if (!present.length) continue;
        const cols = present.map((c) => c.column);
        const values = present.map((c) => item[c.field]);
        const placeholders = cols.map((_, i) => `$${i + 3}`);
        const updates = cols.map((c) => `${c} = EXCLUDED.${c}`).join(", ");
        const sql = `INSERT INTO ${table} (id, user_id, ${cols.join(", ")})
                     VALUES ($1, $2, ${placeholders.join(", ")})
                     ON CONFLICT (id) DO UPDATE SET ${updates}, updated_at = now(), deleted_at = NULL
                     WHERE ${table}.user_id = EXCLUDED.user_id
                     RETURNING *`;
        const { rows } = await query(sql, [item.id, userId, ...values]);
        if (rows[0]) saved.push(rows[0]);
    }
    return saved;
}

app.get("/api/projects", requireAuth, async (req, res) => {
    try {
        res.json({ items: await listRows("projects", req.user.id, req.query.since) });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put("/api/projects", requireAuth, async (req, res) => {
    try {
        const saved = await upsertRows(
            "projects",
            req.user.id,
            req.body?.items,
            [
                { field: "name", column: "name" },
                { field: "payload", column: "payload" },
            ],
        );
        res.json({ items: saved });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete("/api/projects/:id", requireAuth, async (req, res) => {
    try {
        await query(`UPDATE projects SET deleted_at = now() WHERE id = $1 AND user_id = $2`, [
            req.params.id,
            req.user.id,
        ]);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/assets", requireAuth, async (req, res) => {
    try {
        res.json({ items: await listRows("assets", req.user.id, req.query.since) });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put("/api/assets", requireAuth, async (req, res) => {
    try {
        const saved = await upsertRows(
            "assets",
            req.user.id,
            req.body?.items,
            [
                { field: "kind", column: "kind" },
                { field: "title", column: "title" },
                { field: "coverUrl", column: "cover_url" },
                { field: "tags", column: "tags" },
                { field: "source", column: "source" },
                { field: "note", column: "note" },
                { field: "data", column: "data" },
                { field: "metadata", column: "metadata" },
            ],
        );
        res.json({ items: saved });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete("/api/assets/:id", requireAuth, async (req, res) => {
    try {
        await query(`UPDATE assets SET deleted_at = now() WHERE id = $1 AND user_id = $2`, [
            req.params.id,
            req.user.id,
        ]);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/workbench/:domain/logs", requireAuth, async (req, res) => {
    try {
        if (!["image-workbench", "video-workbench"].includes(req.params.domain))
            return res.status(400).json({ error: "bad_domain" });
        const { rows } = await query(
            `SELECT * FROM workbench_logs
             WHERE user_id = $1 AND domain = $2 AND deleted_at IS NULL
             ORDER BY created_at DESC`,
            [req.user.id, req.params.domain],
        );
        res.json({ items: rows });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put("/api/workbench/:domain/logs", requireAuth, async (req, res) => {
    try {
        if (!["image-workbench", "video-workbench"].includes(req.params.domain))
            return res.status(400).json({ error: "bad_domain" });
        const saved = await upsertRows(
            "workbench_logs",
            req.user.id,
            req.body?.items,
            [{ field: "payload", column: "payload" }],
        );
        res.json({ items: saved });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ---------------------------------------------------------------- 媒体文件

function safeObjectKey(userId, storageKey) {
    // storageKey 形如 image:AZd2qgUV / video:xxx；只保留字母数字与少数符号
    const cleaned = String(storageKey).replace(/[^A-Za-z0-9._:-]/g, "_");
    const [kind = "file", name = "unnamed"] = cleaned.split(":");
    const dir = path.join(MEDIA_ROOT, String(userId));
    return { dir, finalPath: path.join(dir, `${kind}_${name}`), objectKey: `${userId}/${kind}_${name}` };
}

async function ensureDir(dir) {
    await fsp.mkdir(dir, { recursive: true });
}

function parseContentRange(value) {
    const m = /^bytes\s+(\d+)-(\d+)\/(\d+)$/.exec(String(value || "").trim());
    if (!m) return null;
    const start = Number(m[1]);
    const end = Number(m[2]);
    const total = Number(m[3]);
    if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(total)) return null;
    if (start > end || end >= total || total <= 0) return null;
    return { start, end, total };
}

/** 整包上传 */
app.put(
    "/api/media/:storageKey",
    requireAuth,
    express.raw({ type: "*/*", limit: MAX_UPLOAD_BYTES }),
    async (req, res) => {
        try {
            const storageKey = decodeURIComponent(req.params.storageKey);
            const { dir, finalPath, objectKey } = safeObjectKey(req.user.id, storageKey);
            await ensureDir(dir);
            const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
            if (!body.length) return res.status(400).json({ error: "empty_body" });
            await fsp.writeFile(finalPath, body);
            await registerMedia(req.user.id, storageKey, objectKey, body, {
                mimeType: req.headers["content-type"] || "application/octet-stream",
            });
            res.status(201).json({ storageKey, bytes: body.length });
        } catch (error) {
            console.error("[media] 上传失败:", error && error.message);
            res.status(500).json({ error: "upload_failed" });
        }
    },
);

/**
 * 分片上传：复刻 canvas-webdav 的协议（PUT + Content-Range）。
 * 公网上传会撞 Cloudflare 的 100 秒源站墙，不分片大文件必断。
 */
app.patch(
    "/api/media/:storageKey",
    requireAuth,
    express.raw({ type: "*/*", limit: MAX_UPLOAD_BYTES }),
    async (req, res) => {
        let partPath = "";
        try {
            const storageKey = decodeURIComponent(req.params.storageKey);
        const range = parseContentRange(req.headers["content-range"]);
        // 提前返回前读完请求体，否则 keep-alive 连接上的残留 body 会污染下一个请求
        if (!range) {
            req.resume();
            return res.status(400).json({ error: "bad_content_range" });
        }
        const { dir, finalPath, objectKey } = safeObjectKey(req.user.id, storageKey);
            await ensureDir(path.join(dir, ".parts"));
            partPath = path.join(dir, ".parts", path.basename(finalPath) + ".part");

            const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
            let current = 0;
            try {
                current = (await fsp.stat(partPath)).size;
            } catch {
                current = 0;
            }

            if (range.start === 0) {
                await fsp.writeFile(partPath, body);
                current = body.length;
            } else if (range.start === current) {
                await fsp.appendFile(partPath, body);
                current += body.length;
            } else {
                res.setHeader("X-Upload-Offset", String(current));
                return res.status(409).json({ error: "offset_mismatch", offset: current });
            }

            if (current < range.total) {
                res.setHeader("X-Upload-Offset", String(current));
                res.setHeader("X-Upload-Total", String(range.total));
                return res.status(204).end();
            }

            await fsp.rename(partPath, finalPath);
            partPath = "";
            const saved = await fsp.readFile(finalPath);
            await registerMedia(req.user.id, storageKey, objectKey, saved, {
                mimeType: req.headers["content-type"] || "application/octet-stream",
            });
            res.setHeader("X-Upload-Complete", "1");
            res.status(201).json({ storageKey, bytes: saved.length });
        } catch (error) {
            console.error("[media] 分片上传失败:", error && error.message);
            res.status(500).json({ error: "chunk_upload_failed" });
        }
    },
);

async function registerMedia(userId, storageKey, objectKey, buffer, { mimeType, sourceUrl }) {
    const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
    await query(
        `INSERT INTO media_files (user_id, storage_key, object_key, mime_type, bytes, checksum, source_url, imported_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $7::text IS NULL THEN NULL ELSE now() END)
         ON CONFLICT (storage_key) DO UPDATE SET
           object_key = EXCLUDED.object_key,
           mime_type = EXCLUDED.mime_type,
           bytes = EXCLUDED.bytes,
           checksum = EXCLUDED.checksum,
           source_url = COALESCE(EXCLUDED.source_url, media_files.source_url),
           deleted_at = NULL`,
        [userId, storageKey, objectKey, mimeType, buffer.length, checksum, sourceUrl || null],
    );
}

app.get("/api/media/:storageKey", requireAuth, async (req, res) => {
    try {
        const storageKey = decodeURIComponent(req.params.storageKey);
        const { rows } = await query(
            `SELECT * FROM media_files WHERE storage_key = $1 AND user_id = $2 AND deleted_at IS NULL`,
            [storageKey, req.user.id],
        );
        const row = rows[0];
        if (!row) return res.status(404).json({ error: "not_found" });
        const { finalPath } = safeObjectKey(req.user.id, storageKey);
        res.type(row.mime_type);
        res.setHeader("Content-Length", String(row.bytes));
        res.sendFile(finalPath);
    } catch (error) {
        res.status(404).json({ error: "not_found" });
    }
});

/**
 * ★ 外链抢救：把一条外部 URL 抓回服务端存起来，并记下原始出处。
 * 画布里那些 Agnes CDN 视频就是靠这个入口留档 —— 链接哪天失效，我们还有副本。
 */
app.post("/api/media/import-url", requireAuth, async (req, res) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Number(process.env.IMPORT_TIMEOUT_MS || 300000));
    try {
        const url = String(req.body?.url || "").trim();
        if (!/^https?:\/\//i.test(url)) return res.status(400).json({ error: "bad_url" });
        const hinted = req.body?.storageKey;
        const kind = String(req.body?.kind || (/video/i.test(req.body?.mimeType || "") ? "video" : "image"));
        const storageKey = hinted || `${kind}:${crypto.randomBytes(9).toString("base64url")}`;

        const upstream = await fetch(url, { signal: controller.signal });
        if (!upstream.ok) return res.status(502).json({ error: "upstream_failed", status: upstream.status });
        const buffer = Buffer.from(await upstream.arrayBuffer());
        if (!buffer.length) return res.status(502).json({ error: "empty_upstream" });

        const { dir, finalPath, objectKey } = safeObjectKey(req.user.id, storageKey);
        await ensureDir(dir);
        await fsp.writeFile(finalPath, buffer);
        await registerMedia(req.user.id, storageKey, objectKey, buffer, {
            mimeType: upstream.headers.get("content-type") || req.body?.mimeType || "application/octet-stream",
            sourceUrl: url,
        });
        res.status(201).json({
            storageKey,
            bytes: buffer.length,
            url: `/api/media/${encodeURIComponent(storageKey)}`,
            sourceUrl: url,
        });
    } catch (error) {
        console.error("[media] 外链导入失败:", error && error.message);
        res.status(500).json({ error: "import_failed", detail: error.message });
    } finally {
        clearTimeout(timer);
    }
});

app.get("/api/media", requireAuth, async (req, res) => {
    try {
        const { rows } = await query(
            `SELECT storage_key, mime_type, bytes, width, height, checksum, source_url, created_at
             FROM media_files WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`,
            [req.user.id],
        );
        res.json({ items: rows });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ---------------------------------------------------------------- 同步文件柜
//
// 为什么还要一层「文件柜」：前端现在的同步逻辑是按域读写 manifest.json + 媒体文件，
// 要让它整体上船，最小改动就是给它一个账号隔离的文件读写口子。
// 与 WebDAV 那套的本质差别在两点：
//   1. 按 user_id 分目录 —— 换浏览器、清缓存都不影响服务端的数据；
//   2. 与 media_files 表同源 —— 媒体文件的出处（source_url）在数据库里留着档。
// 结构化 migration（projects/assets 从 JSON 挪进表里）留到下一步，前端不用再动。

const SYNC_ROOT = process.env.SYNC_ROOT || "/data/sync";

/** 把用户传来的相对路径钉死在自己的目录里，越界一律拒绝 */
function safeSyncPath(userId, rawPath) {
    const cleaned = String(rawPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
    if (!cleaned) return null;
    const segments = cleaned.split("/").filter(Boolean);
    if (segments.some((s) => s === "." || s === "..")) return null;
    if (segments.some((s) => s.startsWith(".tmp-") || s === ".parts")) return null;
    const dir = path.join(SYNC_ROOT, String(userId), path.dirname(cleaned));
    return { dir, finalPath: path.join(SYNC_ROOT, String(userId), cleaned) };
}

app.get("/api/sync/*", requireAuth, async (req, res) => {
    try {
        const target = safeSyncPath(req.user.id, req.params[0]);
        if (!target) return res.status(400).json({ error: "bad_path" });
        await fsp.access(target.finalPath);
        res.sendFile(target.finalPath);
    } catch {
        res.status(404).json({ error: "not_found" });
    }
});

app.put("/api/sync/*", requireAuth, express.raw({ type: "*/*", limit: MAX_UPLOAD_BYTES }), async (req, res) => {
    try {
        const target = safeSyncPath(req.user.id, req.params[0]);
        if (!target) return res.status(400).json({ error: "bad_path" });
        const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
        if (!body.length) return res.status(400).json({ error: "empty_body" });
        await ensureDir(target.dir);
        await fsp.writeFile(target.finalPath, body);
        res.status(201).json({ path: req.params[0], bytes: body.length });
    } catch (error) {
        console.error("[sync] 写入失败:", error && error.message);
        res.status(500).json({ error: "write_failed" });
    }
});

/** 分片写：与 /api/media 同协议（PATCH + Content-Range），大文件不分片必被公网掐断 */
app.patch("/api/sync/*", requireAuth, express.raw({ type: "*/*", limit: MAX_UPLOAD_BYTES }), async (req, res) => {
    let partPath = "";
    try {
        const target = safeSyncPath(req.user.id, req.params[0]);
        if (!target) return res.status(400).json({ error: "bad_path" });
        const range = parseContentRange(req.headers["content-range"]);
        // 提前返回前必须把请求体读完：HTTP keep-alive 会复用这条连接，
        // 残留的 body 会被当成下一个请求的一部分，后续分片就全乱了。
        if (!range) {
            req.resume();
            return res.status(400).json({ error: "bad_content_range" });
        }

        const partDir = path.join(target.dir, ".parts");
        await ensureDir(partDir);
        partPath = path.join(partDir, path.basename(target.finalPath) + ".part");

        const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
        let current = 0;
        try {
            current = (await fsp.stat(partPath)).size;
        } catch {
            current = 0;
        }

        if (range.start === 0) {
            await fsp.writeFile(partPath, body);
            current = body.length;
        } else if (range.start === current) {
            await fsp.appendFile(partPath, body);
            current += body.length;
        } else {
            res.setHeader("X-Upload-Offset", String(current));
            return res.status(409).json({ error: "offset_mismatch", offset: current });
        }

        if (current < range.total) {
            // 还没写完，分片必须留着等下一片 —— 这里绝不能清理 partPath
            res.setHeader("X-Upload-Offset", String(current));
            res.setHeader("X-Upload-Total", String(range.total));
            return res.status(204).end();
        }

        await ensureDir(target.dir);
        await fsp.rename(partPath, target.finalPath);
        partPath = "";
        res.setHeader("X-Upload-Complete", "1");
        res.status(201).json({ path: req.params[0], bytes: current });
    } catch (error) {
        // 只有出错才丢掉半成品，避免把半个文件当成完整文件
        if (partPath) {
            try {
                await fsp.unlink(partPath);
            } catch {
                /* 已被清理，忽略 */
            }
        }
        console.error("[sync] 分片写入失败:", error && error.message);
        res.status(500).json({ error: "chunk_write_failed" });
    }
});

/** 列出已同步的域与体积，让用户能确认「东西真的在服务端」 */
app.get("/api/sync", requireAuth, async (req, res) => {
    const root = path.join(SYNC_ROOT, String(req.user.id));
    const items = [];
    const walk = async (dir, prefix) => {
        let entries;
        try {
            entries = await fsp.readdir(dir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
            if (entry.isDirectory()) {
                if (entry.name === ".parts") continue;
                await walk(full, rel);
                continue;
            }
            try {
                const stat = await fsp.stat(full);
                items.push({ path: rel, bytes: stat.size, updatedAt: stat.mtime.toISOString() });
            } catch {
                /* 忽略 */
            }
        }
    };
    await walk(root, "");
    items.sort((a, b) => b.bytes - a.bytes);
    res.json({ items, totalBytes: items.reduce((sum, item) => sum + item.bytes, 0) });
});

// ---------------------------------------------------------------- 启动

async function sweepStaleParts(dir, maxAgeMs, depth = 0) {
    if (depth > 4) return 0;
    let removed = 0;
    let entries;
    try {
        entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
        return 0;
    }
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            removed += await sweepStaleParts(full, maxAgeMs, depth + 1);
            continue;
        }
        if (!entry.name.endsWith(".part")) continue;
        try {
            const stat = await fsp.stat(full);
            if (Date.now() - stat.mtimeMs > maxAgeMs) {
                await fsp.unlink(full);
                removed += 1;
            }
        } catch {
            /* 文件已被别的请求处理掉，忽略 */
        }
    }
    return removed;
}

export function startServer() {
    return new Promise((resolve) => {
        const server = app.listen(PORT, () => {
            console.log(`[canvas-api] 已启动: http://0.0.0.0:${PORT}  媒体目录 ${MEDIA_ROOT}`);
            resolve(server);
        });
        server.on("error", (error) => {
            console.error("[canvas-api] 监听失败:", error && error.message);
        });
    });
}

export { app, sweepStaleParts };

const invokedDirectly = process.argv[1] && /server\.js$/.test(process.argv[1]);
if (invokedDirectly) {
    try {
        await migrate();
        await ensureDir(MEDIA_ROOT);
        const removed = await sweepStaleParts(MEDIA_ROOT, PART_MAX_AGE_HOURS * 3600 * 1000);
        if (removed) console.log(`[media] 清理过期分片 ${removed} 个`);
        await startServer();
    } catch (error) {
        console.error("[canvas-api] 启动失败:", error && error.message);
        process.exit(1);
    }
    const shutdown = async () => {
        await closeDb();
        process.exit(0);
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
}
