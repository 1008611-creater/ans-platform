// ============================================================================
// 无限画布 · 额度核心（批次 1 · 收得到钱）
// 文件：canvas-api/credits.js
// 模块制式：**ESM**（与 canvas-api/package.json 的 "type": "module" 一致）
//   ⚠️ 本目录全部是 ESM：import 路径必须带 .js 扩展名，不得使用 CommonJS 制式。
//      写成 CommonJS 会让 server.js 的 import 直接抛 ERR_REQUIRE_ESM /
//      SyntaxError，表现为**整个 /api/ 挂掉（登录也进不去）**，
//      而发布日志可能全绿。
// 依赖：./db.js（getPool / query）
// ============================================================================
//
// 口径（与 docs/REVENUE_MODEL.md 一致，不要在前端重复定义）
//   1 点 = ¥0.10
//   出片扣费 = 紫域返回的 cost（积分）× 1.5，向上取整
//   失败任务不假设"必退" —— 一律以紫域返回的 cost 字段对账
//
// 设计约束
//   1. 所有余额增减都在同一个事务里完成：先改 balance，再写 ledger。
//   2. 幂等靠唯一索引 uq_credit_ledger_task_reason (task_id, reason)。
//      重复调用同 (taskId, reason) 时，第二次 INSERT 冲突 → 判定为重复，不重复加减。
//   3. 任何"扣了钱但没记账"或"记了账但没扣钱"的路径都不允许存在。
//
// ⚠️ 本模块只提供能力，不负责鉴权。路由层必须先 requireAuth 再调用。
// ============================================================================

import { getPool, query } from './db.js';

/** 紫域积分 → 用户点数的换算倍率。改这里 = 改定价，必须同步文档。 */
const CHANNEL_CREDIT_MULTIPLIER = 1.5;

/** 1 点对应的人民币（仅用于文案展示，不参与计算）。 */
const CNY_PER_CREDIT = 0.1;

/** 合法卡密面额（点数）。 */
const REDEEM_DENOMINATIONS = [100, 300, 500, 1000];

/** 流水原因常量。集中定义，避免各处手写字符串写错。 */
const REASONS = {
    redeem: 'ldxp_redeem',
    reservation: 'task_reservation',
    settle: 'task_settlement',
    refund: 'task_refund',
    adminAdjust: 'admin_adjust',
    freeTrial: 'free_trial',
};

/**
 * 紫域 cost（积分）→ 用户实际扣减点数。
 * 向上取整，最小 1 点（cost > 0 但算出来是 0 的情况不存在，但仍兜底）。
 */
function customerCost(ziyuCost) {
    const n = Number(ziyuCost);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.max(1, Math.ceil(n * CHANNEL_CREDIT_MULTIPLIER));
}

/**
 * 从 metadata 里安全取一个短字符串字段（用于 channel_usage 的登记）。
 * 只接受非空字符串，其它一律回落默认值 —— 避免把对象/数组写进 TEXT 列。
 */
function pickMeta(metadata, key, fallback) {
    const v = metadata && metadata[key];
    if (typeof v !== 'string') return fallback;
    const s = v.trim();
    return s ? s.slice(0, 200) : fallback;
}

/** 在一个事务里执行 fn(client)。失败自动 ROLLBACK，成功自动 COMMIT。 */
async function withTransaction(fn) {
    const client = await getPool().connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch (_) { /* 忽略回滚失败 */ }
        throw err;
    } finally {
        client.release();
    }
}

/** 确保钱包行存在（幂等）。必须在事务内调用。 */
async function ensureWallet(client, userId) {
    await client.query(
        `INSERT INTO user_credits (user_id, balance)
         VALUES ($1, 0)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
    );
}

/**
 * 写一条流水。必须在事务内调用，且调用前已更新 balance。
 * 依赖 uq_credit_ledger_task_reason 做幂等：冲突时返回 false（= 已存在）。
 */
async function writeLedger(client, { userId, amount, balanceAfter, reason, taskId = null, rechargeRequestId = null, metadata = {} }) {
    const res = await client.query(
        `INSERT INTO credit_ledger
             (user_id, amount, balance_after, reason, task_id, recharge_request_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [userId, amount, balanceAfter, reason, taskId, rechargeRequestId, JSON.stringify(metadata)]
    );
    return res.rowCount === 1;
}

/** 读余额（不存在则视为 0，不建行）。 */
async function getBalance(userId) {
    const res = await query('SELECT balance FROM user_credits WHERE user_id = $1', [userId]);
    return res.rowCount ? res.rows[0].balance : 0;
}

/** 账号面板用：余额 + 最近流水 + 定价口径。 */
async function getCreditSummary(userId, { ledgerLimit = 30 } = {}) {
    const balance = await getBalance(userId);
    const ledger = await query(
        `SELECT amount, balance_after, reason, task_id, metadata, created_at
           FROM credit_ledger
          WHERE user_id = $1
          ORDER BY created_at DESC, id DESC
          LIMIT $2`,
        [userId, Math.min(Math.max(Number(ledgerLimit) || 30, 1), 200)]
    );
    return {
        balance,
        pricing: {
            cnyPerCredit: CNY_PER_CREDIT,
            multiplier: CHANNEL_CREDIT_MULTIPLIER,
            denominations: REDEEM_DENOMINATIONS,
        },
        ledger: ledger.rows,
    };
}

// ---------------------------------------------------------------------------
// 预扣 / 结算 / 退款
// ---------------------------------------------------------------------------

/**
 * 任务级串行锁（事务内生效，提交/回滚自动释放）。
 *
 * 为什么必须有它：预扣/结算/退款的幂等原来是"先 SELECT 再 UPDATE"。
 * 这个写法只能防住**顺序重复调用**。两个并发请求会同时读到"没有这条流水"，
 * 于是各改一次余额，而 credit_ledger 的唯一索引只能挡住第二条流水 ——
 * 结果是"钱扣了两次、账只记了一次"，正是本文件开头第 3 条设计约束禁止的路径。
 *
 * pg_advisory_xact_lock 把同一个 taskId 的预扣/结算/退款串行化：
 * 第二个请求会等第一个提交后才开始，此时它就能读到已存在的那条流水。
 */
/**
 * 登记 / 更新渠道用量 —— **对账的唯一数据源**。
 *
 * 为什么必须有这一步：settleTaskCredits 与 reconcileChannelUsage 都只做 UPDATE / SELECT。
 * 如果没有任何 INSERT，channel_usage 永远为空 ⇒ 结算静默影响 0 行、对账返回空数组，
 * 界面上会**永远显示"全部正常"**。这比算错一笔更危险。
 *
 * 幂等：唯一索引 uq_channel_usage_task (channel, task_id) + ON CONFLICT。
 * 冲突时**不改 status**（避免把已完成的终态倒退回 reserved），只补 model_id/mode/预扣额。
 */
async function recordChannelUsage(client, { userId, taskId, metadata = {}, status = 'reserved', chargedCredits = null }) {
    const channel = pickMeta(metadata, 'channel', 'ziyu');
    await client.query(
        `INSERT INTO channel_usage
             (user_id, channel, task_id, model_id, mode, status, charged_credits)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (channel, task_id) DO UPDATE
             SET charged_credits = COALESCE(EXCLUDED.charged_credits, channel_usage.charged_credits),
                 model_id = COALESCE(EXCLUDED.model_id, channel_usage.model_id),
                 mode = COALESCE(EXCLUDED.mode, channel_usage.mode),
                 updated_at = NOW()`,
        [userId, channel, taskId,
         pickMeta(metadata, 'modelId', null), pickMeta(metadata, 'mode', null), status, chargedCredits]
    );
}

async function lockTask(client, taskId) {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['canvas-task:' + taskId]);
}

/**
 * 提交前预扣。
 * 余额不足直接拒绝（返回 ok:false, code:'CREDITS_INSUFFICIENT'），不发任务。
 *
 * 幂等：同一 (taskId, task_reservation) 重复调用只扣一次。
 *
 * @returns {{ok:boolean, code?:string, balance?:number, charged?:number, duplicate?:boolean}}
 */
async function reserveTaskCredits({ userId, taskId, credits, metadata = {} }) {
    const cost = Math.max(0, Math.floor(Number(credits) || 0));
    if (cost === 0) {
        // 零预扣也要登记一行：否则这条任务永远不会出现在 channel_usage 里，
        // 后续 settle 的 UPDATE 影响 0 行、对账看不见它 —— 又是一次假绿。
        if (taskId) {
            await withTransaction(async (client) => {
                await lockTask(client, taskId);
                await recordChannelUsage(client, { userId, taskId, metadata, status: 'reserved', chargedCredits: 0 });
            });
        }
        return { ok: true, balance: await getBalance(userId), charged: 0 };
    }
    if (!taskId) throw new Error('reserveTaskCredits: taskId is required');

    return withTransaction(async (client) => {
        await lockTask(client, taskId);
        await ensureWallet(client, userId);

        // 先看是否已经预扣过（幂等短路，避免重复扣）
        const existing = await client.query(
            `SELECT amount, balance_after FROM credit_ledger
              WHERE task_id = $1 AND reason = $2 AND user_id = $3`,
            [taskId, REASONS.reservation, userId]
        );
        if (existing.rowCount > 0) {
            return { ok: true, duplicate: true, charged: -existing.rows[0].amount, balance: existing.rows[0].balance_after };
        }

        // 条件扣减：余额不足时 rowCount === 0，什么都不改
        const upd = await client.query(
            `UPDATE user_credits
                SET balance = balance - $2, updated_at = NOW()
              WHERE user_id = $1 AND balance >= $2
              RETURNING balance`,
            [userId, cost]
        );
        if (upd.rowCount !== 1) {
            return { ok: false, code: 'CREDITS_INSUFFICIENT', balance: await readBalanceInTx(client, userId) };
        }

        const balanceAfter = upd.rows[0].balance;
        await writeLedger(client, {
            userId, amount: -cost, balanceAfter,
            reason: REASONS.reservation, taskId, metadata,
        });

        // 登记渠道用量（对账的唯一数据源）。任何出片请求都必须先过 reserve，
        // 所以这里是"任务一旦被受理就一定留下痕迹"的位置。
        await recordChannelUsage(client, { userId, taskId, metadata, status: 'reserved', chargedCredits: cost });

        return { ok: true, charged: cost, balance: balanceAfter };
    });
}

async function readBalanceInTx(client, userId) {
    const res = await client.query('SELECT balance FROM user_credits WHERE user_id = $1', [userId]);
    return res.rowCount ? res.rows[0].balance : 0;
}

/**
 * 任务完成后按紫域返回的 cost 对账结算。
 *
 * 规则（不要改成"失败必退"）：
 *   - 紫域 cost = 0  → 不退款（消耗为 0，用户没损失，预扣额度按实际差额退回）
 *   - 紫域 cost > 0  → 按 customerCost(cost) 结算
 *   - 预扣额 > 实际应扣 → 退回差额
 *   - 预扣额 < 实际应扣 → 补扣差额；余额不足时记为欠款（允许负向流水，但余额不允许为负，
 *     因此补扣失败时写一条 metadata.pending=true 的流水，由管理员人工处置）
 *
 * 幂等：同一 (taskId, task_settlement) 只结算一次。
 */
async function settleTaskCredits({ userId, taskId, ziyuCost, status = 'completed', metadata = {} }) {
    if (!taskId) throw new Error('settleTaskCredits: taskId is required');
    const actualCost = customerCost(ziyuCost);

    return withTransaction(async (client) => {
        await lockTask(client, taskId);
        await ensureWallet(client, userId);

        const already = await client.query(
            `SELECT id FROM credit_ledger
              WHERE task_id = $1 AND reason = $2 AND user_id = $3`,
            [taskId, REASONS.settle, userId]
        );
        if (already.rowCount > 0) {
            return { ok: true, duplicate: true, balance: await readBalanceInTx(client, userId) };
        }

        const reserved = await client.query(
            `SELECT amount FROM credit_ledger
              WHERE task_id = $1 AND reason = $2 AND user_id = $3`,
            [taskId, REASONS.reservation, userId]
        );
        const reservedAmount = reserved.rowCount ? -reserved.rows[0].amount : 0;
        const delta = actualCost - reservedAmount; // >0 补扣，<0 退回

        let balanceAfter;
        if (delta === 0) {
            const cur = await client.query('SELECT balance FROM user_credits WHERE user_id = $1', [userId]);
            balanceAfter = cur.rows[0].balance;
        } else if (delta < 0) {
            const upd = await client.query(
                `UPDATE user_credits SET balance = balance + $2, updated_at = NOW()
                  WHERE user_id = $1 RETURNING balance`,
                [userId, -delta]
            );
            balanceAfter = upd.rows[0].balance;
        } else {
            // 需要补扣：只有余额够才真扣，不够则记 pending 由人工处置
            const upd = await client.query(
                `UPDATE user_credits SET balance = balance - $2, updated_at = NOW()
                  WHERE user_id = $1 AND balance >= $2 RETURNING balance`,
                [userId, delta]
            );
            if (upd.rowCount === 1) {
                balanceAfter = upd.rows[0].balance;
            } else {
                balanceAfter = await readBalanceInTx(client, userId);
                metadata = { ...metadata, pending: true, shortfall: delta, note: '补扣失败：余额不足，待人工处置' };
            }
        }

        await writeLedger(client, {
            userId, amount: -delta, balanceAfter,
            reason: REASONS.settle, taskId,
            metadata: { ...metadata, ziyuCost, status, actualCost, reservedAmount },
        });

        await client.query(
            `UPDATE channel_usage
                SET status = $3, ziyu_cost = $4, charged_credits = $5, updated_at = NOW()
              WHERE channel = $6 AND task_id = $1 AND user_id = $2`,
            [taskId, userId, status, Number(ziyuCost) || 0, actualCost, pickMeta(metadata, 'channel', 'ziyu')]
        );

        return { ok: true, balance: balanceAfter, charged: actualCost, reserved: reservedAmount, delta };
    });
}

/**
 * 显式退款（只在确认需要退的时候调用，例如提交阶段直接报错、任务根本没建立）。
 * 幂等：同一 (taskId, task_refund) 只退一次。
 */
async function refundTaskCredits({ userId, taskId, reason = REASONS.refund, metadata = {} }) {
    if (!taskId) throw new Error('refundTaskCredits: taskId is required');
    return withTransaction(async (client) => {
        await lockTask(client, taskId);
        await ensureWallet(client, userId);

        // ★ 已经结算过的任务绝不能再退 —— 否则"结算时退回的差额"会被重复退一次，
        //   用户等于白拿一笔。结算流程本身就包含"多退少补"，退款只用于
        //   "任务根本没建立起来"这一类确定要退的场景。
        const settled = await client.query(
            `SELECT id FROM credit_ledger
              WHERE task_id = $1 AND reason = $2 AND user_id = $3`,
            [taskId, REASONS.settle, userId]
        );
        if (settled.rowCount > 0) {
            return { ok: false, code: 'ALREADY_SETTLED', balance: await readBalanceInTx(client, userId) };
        }

        const dup = await client.query(
            `SELECT id FROM credit_ledger
              WHERE task_id = $1 AND reason = $2 AND user_id = $3`,
            [taskId, reason, userId]
        );
        if (dup.rowCount > 0) {
            return { ok: true, refunded: false, duplicate: true, balance: await readBalanceInTx(client, userId) };
        }

        const reserved = await client.query(
            `SELECT amount FROM credit_ledger
              WHERE task_id = $1 AND reason = $2 AND user_id = $3`,
            [taskId, REASONS.reservation, userId]
        );
        if (reserved.rowCount === 0) {
            return { ok: true, refunded: false, balance: await readBalanceInTx(client, userId) };
        }
        const amount = -reserved.rows[0].amount;
        if (amount <= 0) {
            return { ok: true, refunded: false, balance: await readBalanceInTx(client, userId) };
        }

        const upd = await client.query(
            `UPDATE user_credits SET balance = balance + $2, updated_at = NOW()
              WHERE user_id = $1 RETURNING balance`,
            [userId, amount]
        );
        await writeLedger(client, {
            userId, amount, balanceAfter: upd.rows[0].balance,
            reason, taskId, metadata,
        });

        // 渠道用量收尾：任务根本没建立起来 → failed。
        // 只更新仍停在 reserved 的行，绝不覆盖已经 completed/failed 的终态。
        await client.query(
            `UPDATE channel_usage
                 SET status = 'failed', error_code = $4, updated_at = NOW()
               WHERE channel = $3 AND task_id = $1 AND user_id = $2
                 AND status = 'reserved'`,
            [taskId, userId, pickMeta(metadata, 'channel', 'ziyu'), String(reason).slice(0, 100)]
        );

        return { ok: true, refunded: true, amount, balance: upd.rows[0].balance };
    });
}

// ---------------------------------------------------------------------------
// 免费试拍配额（Agnes flash）
// ---------------------------------------------------------------------------

/** 当前计费周期（服务器本地月，'YYYY-MM'）。 */
function currentPeriod(now = new Date()) {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return y + '-' + m;
}

/** 读本月免费试拍剩余次数。 */
async function getFreeTrialStatus(userId, limit) {
    const monthlyLimit = Math.max(0, Number(limit) || 0);
    const period = currentPeriod();
    const res = await query(
        'SELECT used FROM free_trial_usage WHERE user_id = $1 AND period = $2',
        [userId, period]
    );
    const used = res.rowCount ? res.rows[0].used : 0;
    return { period, limit: monthlyLimit, used, remaining: Math.max(0, monthlyLimit - used) };
}

/**
 * 消费一次免费试拍配额。
 * 用原子 UPSERT 抢占：只有 changed === 1 才算拿到本次额度。
 *
 * @returns {{ok:boolean, code?:string, status:object}}
 */
async function consumeFreeTrial(userId, limit) {
    const monthlyLimit = Math.max(0, Number(limit) || 0);
    const period = currentPeriod();
    if (monthlyLimit === 0) {
        return { ok: false, code: 'FREE_TRIAL_DISABLED', status: await getFreeTrialStatus(userId, monthlyLimit) };
    }
    const res = await query(
        `INSERT INTO free_trial_usage (user_id, period, used, updated_at)
         VALUES ($1, $2, 1, NOW())
         ON CONFLICT (user_id, period)
         DO UPDATE SET used = free_trial_usage.used + 1, updated_at = NOW()
         WHERE free_trial_usage.used < $3
         RETURNING used`,
        [userId, period, monthlyLimit]
    );
    if (res.rowCount !== 1) {
        return { ok: false, code: 'FREE_TRIAL_EXHAUSTED', status: await getFreeTrialStatus(userId, monthlyLimit) };
    }
    return {
        ok: true,
        status: { period, limit: monthlyLimit, used: res.rows[0].used, remaining: Math.max(0, monthlyLimit - res.rows[0].used) },
    };
}

// ---------------------------------------------------------------------------
// 管理员
// ---------------------------------------------------------------------------

/** 管理员调整余额（正负均可，但结果不允许为负）。 */
async function adminAdjustBalance({ userId, adminId, amount, note = '' }) {
    const delta = Math.trunc(Number(amount) || 0);
    if (delta === 0) throw new Error('adminAdjustBalance: amount must be non-zero');
    return withTransaction(async (client) => {
        await ensureWallet(client, userId);
        const upd = await client.query(
            `UPDATE user_credits SET balance = balance + $2, updated_at = NOW()
              WHERE user_id = $1 AND balance + $2 >= 0 RETURNING balance`,
            [userId, delta]
        );
        if (upd.rowCount !== 1) throw new Error('CREDITS_BALANCE_WOULD_GO_NEGATIVE');
        const balanceAfter = upd.rows[0].balance;
        await client.query(
            `INSERT INTO credit_adjustments (user_id, admin_id, amount, note)
             VALUES ($1, $2, $3, $4)`,
            [userId, adminId, delta, note]
        );
        await writeLedger(client, {
            userId, amount: delta, balanceAfter,
            reason: REASONS.adminAdjust, metadata: { adminId, note },
        });
        return { ok: true, balance: balanceAfter };
    });
}

/** 管理员视图：所有钱包 + 渠道用量概览。 */
async function adminCreditOverview({ limit = 200 } = {}) {
    const wallets = await query(
        `SELECT u.id AS user_id, u.email, COALESCE(c.balance, 0) AS balance, c.updated_at
           FROM users u LEFT JOIN user_credits c ON c.user_id = u.id
          ORDER BY c.balance DESC NULLS LAST, u.created_at ASC
          LIMIT $1`,
        [Math.min(Math.max(Number(limit) || 200, 1), 2000)]
    );
    const usage = await query(
        `SELECT status, COUNT(*)::int AS count, COALESCE(SUM(ziyu_cost), 0)::int AS ziyu_cost,
                COALESCE(SUM(charged_credits), 0)::int AS charged_credits
           FROM channel_usage
          WHERE created_at > NOW() - INTERVAL '30 days'
          GROUP BY status`
    );
    return { wallets: wallets.rows, usage: usage.rows };
}

/**
 * 每日对账：紫域 cost 与本地扣减是否一致。
 * 返回差异行，**空数组表示一致**。
 *
 * 期望值必须与 customerCost() 逐分支等价（cost<=0 → 0；否则 max(1, ceil(cost*1.5))）。
 * 这里刻意用 SQL 再写一遍而不是引用 JS 函数：对账要能独立于业务代码复核。
 * 两处口径必须同步 —— 曾经写成 GREATEST(1, CEIL(...))，导致 cost=0 的任务
 * 被写成 0 却被期望成 1，**每天都会吐一批假差异**，真正的差异反而被淹没。
 *
 * 被标为差异的三类，都是有意义的人工处置项：
 *   - ziyu_cost IS NULL       → 预扣了但从未结算（任务卡住 / 前端没回调 settle）
 *   - charged_credits IS NULL → 没登记预扣额
 *   - 金额对不上              → 真正的算错
 */
async function reconcileChannelUsage({ days = 1 } = {}) {
    const res = await query(
        `SELECT task_id, user_id, model_id, status, ziyu_cost, charged_credits, created_at
           FROM channel_usage
          WHERE created_at > NOW() - ($1 || ' days')::interval
            AND (ziyu_cost IS NULL OR charged_credits IS NULL
                 OR charged_credits <> CASE WHEN ziyu_cost <= 0 THEN 0 ELSE GREATEST(1, CEIL(ziyu_cost * $2)) END)
          ORDER BY created_at DESC`,
        [String(Math.max(1, Number(days) || 1)), CHANNEL_CREDIT_MULTIPLIER]
    );
    return res.rows;
}

export {
    CHANNEL_CREDIT_MULTIPLIER,
    CNY_PER_CREDIT,
    REDEEM_DENOMINATIONS,
    REASONS,
    lockTask,
    customerCost,
    withTransaction,
    ensureWallet,
    writeLedger,
    getBalance,
    getCreditSummary,
    reserveTaskCredits,
    settleTaskCredits,
    refundTaskCredits,
    currentPeriod,
    getFreeTrialStatus,
    consumeFreeTrial,
    adminAdjustBalance,
    adminCreditOverview,
    reconcileChannelUsage,
};
