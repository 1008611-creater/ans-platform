// ============================================================================
// 无限画布 · 邮箱验证码（签发 / 校验 / 限次）
// 文件：canvas-api/email-verify.js
// 模块制式：**ESM**
// 依赖：./db.js（query）
//
// 口径
//   - 6 位数字，10 分钟有效，最多错 5 次，用过即作废
//   - 同一邮箱 60 秒只能发一次；同一 IP 每小时有上限
//   - **只存 HMAC，不存明文**（见 schema.sql 第 7 节）
//
// ⚠️ 本模块只管验证码本身，**发信在 email.js**。
//    两者分开的原因：发信是外部依赖（会超时、会挂），验证码是纯本地状态，
//    混在一起会出现"码发出去了但数据库没记下"这类对不上的问题。
// ============================================================================

import crypto from 'node:crypto';
import { query } from './db.js';

/** 验证码有效期（秒）。 */
const TTL_SECONDS = Math.max(60, Number(process.env.EMAIL_CODE_TTL_SECONDS) || 600);

/** 同一邮箱两次发码的最小间隔（秒）。 */
const RESEND_COOLDOWN = Math.max(10, Number(process.env.EMAIL_CODE_RESEND_COOLDOWN) || 60);

/** 单个验证码最多可校验失败几次，超过即作废。 */
const MAX_ATTEMPTS = Math.max(1, Number(process.env.EMAIL_CODE_MAX_ATTEMPTS) || 5);

/** 同一 IP 每小时最多发几码（防批量注册）。 */
const IP_HOUR_LIMIT = Math.max(1, Number(process.env.EMAIL_CODE_IP_HOUR_LIMIT) || 10);

/**
 * 验证码的不可逆摘要。
 *
 * 必须用 HMAC 而不是裸 SHA256：6 位数字只有 100 万种组合，裸哈希可以被
 * 枚举反推（秒级）。带上 JWT_SECRET 之后，即使数据库整个泄露，
 * 攻击者没有密钥也算不出可用验证码。
 */
function codeHash(email, code) {
    const key = process.env.JWT_SECRET;
    if (!key || key.length < 16) {
        throw new Error('JWT_SECRET 未配置或过短（<16），拒绝签发验证码');
    }
    return crypto.createHmac('sha256', key).update(`${email}:${code}`).digest('hex');
}

/** 6 位随机数字。用 randomInt 而不是 Math.random（后者可预测）。 */
function randomCode() {
    return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

/**
 * 签发一个验证码并落库。
 *
 * @returns {Promise<{ok:true, code:string, ttlSeconds:number}
 *          |{ok:false, reason:'code_too_soon'|'ip_rate_limited', retryAfter:number}>}
 *
 * ⚠️ 返回的 code 是明文，**只在内存里传给发信函数，绝不写日志**。
 */
export async function issueCode({ email, ip = null, purpose = 'register' }) {
    // 1) 冷却：同一邮箱 60 秒内只发一次
    const recent = await query(
        `SELECT EXTRACT(EPOCH FROM (created_at + ($3 || ' seconds')::interval - NOW())) AS retry_after
           FROM email_verification_codes
          WHERE email = $1 AND purpose = $2
          ORDER BY created_at DESC
          LIMIT 1`,
        [email, purpose, String(RESEND_COOLDOWN)]
    );
    const retryAfter = Number(recent.rows?.[0]?.retry_after || 0);
    if (retryAfter > 0) {
        return { ok: false, reason: 'code_too_soon', retryAfter: Math.ceil(retryAfter) };
    }

    // 2) IP 限次：同一 IP 一小时内上限
    if (ip) {
        const byIp = await query(
            `SELECT COUNT(*)::int AS n
               FROM email_verification_codes
              WHERE ip = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
            [String(ip)]
        );
        if (Number(byIp.rows?.[0]?.n || 0) >= IP_HOUR_LIMIT) {
            return { ok: false, reason: 'ip_rate_limited', retryAfter: 3600 };
        }
    }

    // 3) 落库（只存摘要）
    const code = randomCode();
    await query(
        `INSERT INTO email_verification_codes (email, code_hash, purpose, expires_at, ip)
         VALUES ($1, $2, $3, NOW() + ($4 || ' seconds')::interval, $5)`,
        [email, codeHash(email, code), purpose, String(TTL_SECONDS), ip ? String(ip) : null]
    );

    return { ok: true, code, ttlSeconds: TTL_SECONDS };
}

/**
 * 校验并消费一个验证码。
 *
 * @returns {Promise<{ok:true} | {ok:false, reason:string}>}
 *   reason: 'code_invalid'（码错 / 过期 / 已用）| 'code_locked'（错太多次已作废）
 */
export async function verifyCode({ email, code, purpose = 'register' }) {
    const digest = codeHash(email, String(code || ''));

    const hit = await query(
        `SELECT id FROM email_verification_codes
          WHERE email = $1 AND purpose = $2 AND code_hash = $3
            AND consumed_at IS NULL AND expires_at > NOW()
          ORDER BY created_at DESC
          LIMIT 1`,
        [email, purpose, digest]
    );

    if (hit.rows?.[0]?.id) {
        // 用掉即作废：同一个码不能注册两个账号
        await query(
            `UPDATE email_verification_codes SET consumed_at = NOW() WHERE id = $1`,
            [hit.rows[0].id]
        );
        return { ok: true };
    }

    // 没命中 → 给最新那条未消费记录记一次失败；超阈值直接作废
    const latest = await query(
        `SELECT id, attempts FROM email_verification_codes
          WHERE email = $1 AND purpose = $2 AND consumed_at IS NULL
          ORDER BY created_at DESC
          LIMIT 1`,
        [email, purpose]
    );

    const row = latest.rows?.[0];
    if (row?.id) {
        const attempts = Number(row.attempts || 0) + 1;
        if (attempts >= MAX_ATTEMPTS) {
            await query(
                `UPDATE email_verification_codes
                    SET attempts = $2, consumed_at = NOW()
                  WHERE id = $1`,
                [row.id, attempts]
            );
            return { ok: false, reason: 'code_locked' };
        }
        await query(
            `UPDATE email_verification_codes SET attempts = $2 WHERE id = $1`,
            [row.id, attempts]
        );
    }

    // 统一回 code_invalid：不区分"码错 / 已过期 / 已用过"，避免被拿来探测
    return { ok: false, reason: 'code_invalid' };
}

/**
 * 撤销刚签发的码（发信失败时用）。
 *
 * 为什么必须撤：码已经落库且处于"可校验"状态，但邮件没发出去 ——
 * 用户永远看不到它，它却能被撞对。虽然 6 位码 + 5 次上限（约 1/20 万）
 * 风险很低，但既然拿得到就别留。
 */
export async function revokeLatestCode({ email, purpose = 'register' }) {
    const res = await query(
        `UPDATE email_verification_codes
            SET consumed_at = NOW()
          WHERE id = (
                SELECT id FROM email_verification_codes
                 WHERE email = $1 AND purpose = $2 AND consumed_at IS NULL
                 ORDER BY created_at DESC
                 LIMIT 1
          )`,
        [email, purpose]
    );
    return { revoked: res.rowCount || 0 };
}

/** 清理过期/已消费的旧记录，供定时任务或管理员手动调用。 */
export async function purgeExpiredCodes({ olderThanHours = 24 } = {}) {
    const res = await query(
        `DELETE FROM email_verification_codes
          WHERE created_at < NOW() - ($1 || ' hours')::interval`,
        [String(Math.max(1, Number(olderThanHours) || 24))]
    );
    return { deleted: res.rowCount || 0 };
}

export { TTL_SECONDS, RESEND_COOLDOWN, MAX_ATTEMPTS, IP_HOUR_LIMIT };
