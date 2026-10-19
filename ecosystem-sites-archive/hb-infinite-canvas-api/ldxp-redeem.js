// ============================================================================
// 无限画布 · 卡密兑换（批次 1 · 收得到钱）
// 文件：canvas-api/ldxp-redeem.js
// 模块制式：**ESM**（与 canvas-api/package.json 的 "type": "module" 一致）
// 依赖：node:crypto、./db.js、./credits.js
// ============================================================================
//
// 码格式（沿用念念已验证的做法，不要改格式 —— 已有生成器与用户手里的码依赖它）
//
//   NN-{点数}-{nonce 12 字节 hex 大写}-{HMAC-SHA256 前 32 位 hex 大写}
//   例：NN-100-A1B2C3D4E5F60718293A4B5C-<32 位大写 hex>
//   正则：/^NN-(100|300|500|1000)-[A-Z0-9]{16,64}-[A-F0-9]{32}$/
//
// 签名 = HMAC-SHA256(secret, "NN-{点数}-{nonce}") 取前 32 位 hex
// 密钥 = 环境变量 LDXP_REDEEM_SECRET（>=32 字符，只存服务器，绝不进仓库/前端）
//
// 安全要求（逐条都必须在代码里体现）
//   1. 只存码的 SHA256 哈希，绝不存明文。
//   2. 用 timingSafeEqual 定长时间比较，防时序侧信道。
//   3. 用 INSERT ... ON CONFLICT (code_hash) DO NOTHING 抢占兑换权，
//      changed === 1 才到账；重复提交绝不重复到账。
//   4. 兑换与到账在同一个事务里完成。
// ============================================================================

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { query } from './db.js';
import { withTransaction, ensureWallet, writeLedger, REASONS, REDEEM_DENOMINATIONS } from './credits.js';

const CODE_PREFIX = 'NN';
const MIN_SECRET_LENGTH = 32;
const SIGNATURE_HEX_LENGTH = 32;

/** 归一化：去空白、转大写。返回 null 表示格式非法。 */
function normalizeCode(input) {
    if (typeof input !== 'string') return null;
    const code = input.trim().toUpperCase();
    if (!code) return null;
    if (!/^NN-(100|300|500|1000)-[A-Z0-9]{16,64}-[A-F0-9]{32}$/.test(code)) return null;
    return code;
}

/** 读密钥。缺失或过短 = 支付通道不可用（宁可拒服务，不可降级放行）。 */
function redeemSecret() {
    const secret = process.env.LDXP_REDEEM_SECRET;
    if (!secret || secret.length < MIN_SECRET_LENGTH) {
        const err = new Error('LDXP_PAYMENT_CHANNEL_UNAVAILABLE');
        err.code = 'LDXP_PAYMENT_CHANNEL_UNAVAILABLE';
        throw err;
    }
    return secret;
}

/** 计算一张码的签名（生成器与校验共用同一段逻辑，保证一致）。 */
function signPayload(payload, secret) {
    return createHmac('sha256', secret).update(payload).digest('hex').slice(0, SIGNATURE_HEX_LENGTH).toUpperCase();
}

/**
 * 校验签名（定长时间比较）。
 * @returns {{ok:boolean, code?:string, credits?:number, codeHash?:string}}
 */
function verifyCode(code) {
    const normalized = normalizeCode(code);
    if (!normalized) return { ok: false, code: 'LDXP_REDEEM_CODE_INVALID' };

    const secret = redeemSecret();
    const parts = normalized.split('-');
    const credits = Number(parts[1]);
    if (!REDEEM_DENOMINATIONS.includes(credits)) return { ok: false, code: 'LDXP_REDEEM_CODE_INVALID' };

    const payload = parts.slice(0, 3).join('-');
    const received = Buffer.from(parts[3], 'hex');
    const expected = Buffer.from(signPayload(payload, secret), 'hex');
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
        return { ok: false, code: 'LDXP_REDEEM_CODE_INVALID' };
    }

    const codeHash = createHash('sha256').update(normalized).digest('hex');
    return { ok: true, credits, codeHash };
}

/**
 * 兑换。整个流程在一个事务里：
 *   1. 校验签名（格式 / 面额 / HMAC）
 *   2. 确保钱包行存在
 *   3. INSERT credit_redemptions ... ON CONFLICT (code_hash) DO NOTHING
 *      —— rowCount === 1 才算抢到，否则是"已使用"
 *   4. 加余额 + 写流水
 *
 * @returns {{ok:boolean, code?:string, redeemedCredits?:number, balance?:number}}
 */
async function redeemCode({ userId, code }) {
    const verified = verifyCode(code);
    if (!verified.ok) return verified;

    return withTransaction(async (client) => {
        await ensureWallet(client, userId);

        // 抢占：唯一主键是防重复到账的最终防线
        const claim = await client.query(
            `INSERT INTO credit_redemptions (code_hash, user_id, credits)
             VALUES ($1, $2, $3)
             ON CONFLICT (code_hash) DO NOTHING
             RETURNING code_hash`,
            [verified.codeHash, userId, verified.credits]
        );
        if (claim.rowCount !== 1) {
            return { ok: false, code: 'LDXP_REDEEM_CODE_USED' };
        }

        const upd = await client.query(
            `UPDATE user_credits SET balance = balance + $2, updated_at = NOW()
              WHERE user_id = $1 RETURNING balance`,
            [userId, verified.credits]
        );
        const balanceAfter = upd.rows[0].balance;

        await writeLedger(client, {
            userId,
            amount: verified.credits,
            balanceAfter,
            reason: REASONS.redeem,
            metadata: { codeHash: verified.codeHash },
        });

        return { ok: true, redeemedCredits: verified.credits, balance: balanceAfter };
    });
}

/** 兑换历史（账号面板可选展示）。 */
async function listRedemptions(userId, { limit = 20 } = {}) {
    const res = await query(
        `SELECT credits, redeemed_at FROM credit_redemptions
          WHERE user_id = $1 ORDER BY redeemed_at DESC LIMIT $2`,
        [userId, Math.min(Math.max(Number(limit) || 20, 1), 200)]
    );
    return res.rows;
}

export {
    CODE_PREFIX,
    MIN_SECRET_LENGTH,
    SIGNATURE_HEX_LENGTH,
    normalizeCode,
    signPayload,
    verifyCode,
    redeemCode,
    listRedemptions,
};
