/**
 * 账号与会话。
 *
 * 令牌策略：JWT 访问令牌（短命）放 HttpOnly cookie，刷新令牌（长命）只存哈希。
 * 为什么不用纯 JWT：无法吊销。用户改密码或踢设备时要能立刻失效。
 */
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "./db.js";

export const SESSION_COOKIE = "canvas_session";
export const REFRESH_COOKIE = "canvas_refresh";
export const LEGACY_COOKIE = "canvas_auth";

const ACCESS_TTL_SECONDS = Number(process.env.ACCESS_TTL_SECONDS || 12 * 60 * 60); // 12 小时
const REFRESH_TTL_SECONDS = Number(process.env.REFRESH_TTL_SECONDS || 30 * 24 * 60 * 60); // 30 天

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);

function secret() {
    const value = process.env.JWT_SECRET;
    if (value && value.length >= 16) return value;
    // 没配就自己造一个并警告 —— 重启后所有会话失效，但至少不会用空密钥裸奔
    if (!globalThis.__canvasDevSecret) {
        globalThis.__canvasDevSecret = crypto.randomBytes(48).toString("hex");
        console.warn("[auth] 未配置 JWT_SECRET，已生成临时密钥（重启后登录态失效）");
    }
    return globalThis.__canvasDevSecret;
}

export function hashPassword(plain) {
    return bcrypt.hash(String(plain), BCRYPT_ROUNDS);
}

export function verifyPassword(plain, hash) {
    return bcrypt.compare(String(plain), String(hash));
}

export function signAccessToken(user) {
    return jwt.sign({ sub: user.id, email: user.email, role: user.role }, secret(), {
        expiresIn: ACCESS_TTL_SECONDS,
    });
}

function hashToken(token) {
    return crypto.createHash("sha256").update(String(token)).digest("hex");
}

export async function issueRefreshToken(userId, userAgent = "") {
    const token = crypto.randomBytes(48).toString("hex");
    const expiresAt = new Date(Date.now() + REFRESH_TTL_SECONDS * 1000);
    await query(
        `INSERT INTO refresh_tokens (user_id, token_hash, user_agent, expires_at) VALUES ($1, $2, $3, $4)`,
        [userId, hashToken(token), String(userAgent).slice(0, 255), expiresAt],
    );
    return { token, expiresAt };
}

export async function rotateRefreshToken(presented) {
    if (!presented) return null;
    const { rows } = await query(
        `SELECT * FROM refresh_tokens WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
        [hashToken(presented)],
    );
    const row = rows[0];
    if (!row) return null;
    await query(`UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1`, [row.id]);
    const next = await issueRefreshToken(row.user_id, row.user_agent);
    return { userId: row.user_id, refresh: next };
}

export async function revokeRefreshToken(presented) {
    if (!presented) return;
    await query(`UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1`, [
        hashToken(presented),
    ]);
}

export async function revokeAllRefreshTokens(userId) {
    if (!userId) return;
    await query(`UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, [userId]);
}

export function verifyAccessToken(token) {
    try {
        return jwt.verify(token, secret());
    } catch {
        return null;
    }
}

export async function findUserById(id) {
    const { rows } = await query(
        `SELECT id, email, username, display_name, role, created_at, last_login_at FROM users WHERE id = $1`,
        [id],
    );
    return rows[0] || null;
}

export async function findUserByEmail(email) {
    const { rows } = await query(`SELECT * FROM users WHERE email = $1`, [String(email).toLowerCase()]);
    return rows[0] || null;
}

export async function createUser({ email, password, displayName, username }) {
    const passwordHash = await hashPassword(password);
    const { rows } = await query(
        `INSERT INTO users (email, username, display_name, password_hash)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, username, display_name, role, created_at`,
        [String(email).toLowerCase(), username || null, displayName || "", passwordHash],
    );
    return rows[0];
}

export const cookieOptions = (maxAgeSeconds) => ({
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "1",
    path: "/",
    maxAge: maxAgeSeconds * 1000,
});

/**
 * 顺手把站点门禁 cookie 也发了。
 *
 * 为什么：nginx 的页面门禁认的是一个写死在配置里的静态串。要做真账号，
 * 正路是把门禁换成 auth_request 动态校验 —— 但那意味着 API 一挂，整站 500，
 * 连我自己都会被锁在外面。
 *
 * 所以分两步走：现在保持门禁不变，登录成功时由 API 补发这个静态 cookie，
 * 用户「一次登录」既过门禁又拿到会话；等账号体系跑稳了再换成 auth_request。
 */
export function setSitePassCookie(res) {
    const token = process.env.CANVAS_LEGACY_TOKEN;
    if (!token) return;
    res.cookie(LEGACY_COOKIE, token, cookieOptions(ACCESS_TTL_SECONDS));
}

export function setSessionCookies(res, user, refresh) {
    res.cookie(SESSION_COOKIE, signAccessToken(user), cookieOptions(ACCESS_TTL_SECONDS));
    res.cookie(REFRESH_COOKIE, refresh.token, cookieOptions(REFRESH_TTL_SECONDS));
    setSitePassCookie(res);
}

export function clearSessionCookies(res) {
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.clearCookie(REFRESH_COOKIE, { path: "/" });
    res.clearCookie(LEGACY_COOKIE, { path: "/" });
}

export const TTL = { ACCESS_TTL_SECONDS, REFRESH_TTL_SECONDS };
