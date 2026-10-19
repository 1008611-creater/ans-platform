-- 画布服务端数据模型
-- 设计原则：
--   1) 服务端是真相来源，浏览器只是视图。
--   2) media_files 单独建表并留 source_url —— 专门治「外链视频无声无息失效」这个洞。
--   3) 软删除（deleted_at），同步冲突时宁可留着也不丢。
--   4) 不用外键级联删，避免误删连坐。

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- users.email 用了 CITEXT（大小写不敏感的邮箱），这个类型来自 citext 扩展。
-- 忘了建扩展的话，建表会在第一个 CITEXT 列上直接报 type "citext" does not exist，
-- 而 migrate() 又是在启动时跑的 —— 表现就是容器反复重启、nginx 502。
CREATE EXTENSION IF NOT EXISTS "citext";

-- ---------- 账号 ----------
CREATE TABLE IF NOT EXISTS users (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email          CITEXT NOT NULL UNIQUE,
    username       TEXT UNIQUE,
    display_name   TEXT NOT NULL DEFAULT '',
    password_hash  TEXT NOT NULL,
    role           TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- 刷新令牌：只存哈希，泄露库也换不走会话
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL UNIQUE,
    user_agent  TEXT NOT NULL DEFAULT '',
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_expires ON refresh_tokens (expires_at);

-- ---------- 画布项目 ----------
-- payload 存整份 project 快照（节点、连线、视口），与前端 Project 结构一一对应。
-- 为什么不拆节点表：画布节点结构变动频繁，拆表会让每次改版都要迁移；
-- 先把整块存下来保证不丢，等结构稳定再考虑拆。
CREATE TABLE IF NOT EXISTS projects (
    id          TEXT PRIMARY KEY,              -- 沿用前端 nanoid，便于迁移
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name        TEXT NOT NULL DEFAULT '未命名项目',
    payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects (user_id, updated_at DESC);

-- ---------- 素材 ----------
-- kind: text | image | video
-- data 内保留 storageKey（如 image:xxx / video:xxx），指向 media_files
CREATE TABLE IF NOT EXISTS assets (
    id          TEXT PRIMARY KEY,              -- 沿用前端 nanoid
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    kind        TEXT NOT NULL CHECK (kind IN ('text', 'image', 'video')),
    title       TEXT NOT NULL DEFAULT '',
    cover_url   TEXT NOT NULL DEFAULT '',
    tags        TEXT[] NOT NULL DEFAULT '{}',
    source      TEXT,
    note        TEXT,
    data        JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_assets_user ON assets (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_kind ON assets (user_id, kind);

-- ---------- 媒体文件 ----------
-- ★ source_url 是这张表存在的理由：
--   画布里那些指向 Agnes 平台 CDN 的视频，外链随时会过期。
--   登记进这张表后，即使源站挂了，我们本地仍留有副本和原始出处。
CREATE TABLE IF NOT EXISTS media_files (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    storage_key  TEXT NOT NULL UNIQUE,          -- image:xxx / video:xxx / file:xxx
    object_key   TEXT NOT NULL,                 -- 落盘相对路径
    mime_type    TEXT NOT NULL DEFAULT 'application/octet-stream',
    bytes        BIGINT NOT NULL DEFAULT 0,
    width        INTEGER,
    height       INTEGER,
    checksum     TEXT,                          -- sha256，回读校验用
    source_url   TEXT,                          -- ★ 原始外链，长期留档
    imported_at  TIMESTAMPTZ,                   -- 由外链抓回的时间
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_media_user ON media_files (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_source ON media_files (source_url) WHERE source_url IS NOT NULL;

-- ---------- 工作台日志（图像 / 视频）----------
CREATE TABLE IF NOT EXISTS workbench_logs (
    id          TEXT PRIMARY KEY,               -- 沿用前端 nanoid
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    domain      TEXT NOT NULL CHECK (domain IN ('image-workbench', 'video-workbench')),
    payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_logs_domain ON workbench_logs (user_id, domain, created_at DESC);

-- ============================================================================
-- 无限画布 · 额度与卡密表结构（批次 1 · 收得到钱）
-- 文件：canvas-api/schema-credits.sql
-- 目标库：Postgres 16（canvas-api 的 DATABASE_URL 指向的库）
-- ============================================================================
--
-- ⚠️ 衔接方式（二选一，必须在应用时明确选一条，见 APPLY.md 第 2 步）
--
--   canvas-api/db.js 的 migrate() 只读取并整体执行一个文件：schema.sql。
--   它不会自动发现本文件。所以本文件有两种落地方式：
--
--   方式 A（推荐，改动最小）：
--       把本文件的全部内容【追加到 canvas-api/schema.sql 末尾】，
--       不新增文件、不改 db.js。migrate() 下次启动时整段执行，
--       本文件里所有语句都写成 IF NOT EXISTS，重复执行安全。
--
--   方式 B（保留独立文件）：
--       修改 db.js 的 migrate()，在读取 schema.sql 之后
--       再读取并执行本文件。需要改 db.js 与 Dockerfile.api 的 COPY 行。
--
--   两种方式都必须保证：migrate() 是幂等的，且可以在已有数据的库上重复跑。
--
-- ---------------------------------------------------------------------------
-- 记账口径（与 docs/REVENUE_MODEL.md 一致）
--
--   1 点 = ¥0.10
--   卡密面额：100 / 300 / 500 / 1000 点 = ¥10 / ¥30 / ¥50 / ¥100
--   出片扣费 = 紫域返回的 cost（积分）× 1.5，向上取整
--   兑换码只存 SHA256 哈希，绝不存明文
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------------------------------------------------------------------------
-- 1. 用户余额（钱包）
--    balance 是唯一权威余额；所有增减都必须同时写一条 credit_ledger。
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_credits (
    user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance     INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 2. 额度流水（审计与对账的唯一账本）
--    amount 为负表示扣减，为正表示到账。
--    task_id + reason 唯一 —— 这是防重复扣费 / 防重复退款的幂等键。
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credit_ledger (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount      INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reason      TEXT NOT NULL,
    task_id     TEXT,
    recharge_request_id BIGINT,
    metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 幂等键：同一个 task 的同一个 reason 只允许一条流水。
-- 用 partial unique index，允许 task_id 为 NULL 的流水（如兑换、人工调整）多条共存。
CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_ledger_task_reason
    ON credit_ledger (task_id, reason)
    WHERE task_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_credit_ledger_user
    ON credit_ledger (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_reason
    ON credit_ledger (reason);

-- ---------------------------------------------------------------------------
-- 3. 兑换记录（只存码的 SHA256 哈希，绝不存明文）
--    code_hash 是主键 —— 这是"同一张卡密只能到账一次"的抢占点。
--    INSERT ... ON CONFLICT (code_hash) DO NOTHING，changed===1 才算抢到。
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credit_redemptions (
    code_hash   TEXT PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credits     INTEGER NOT NULL CHECK (credits > 0),
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_redemptions_user
    ON credit_redemptions (user_id, redeemed_at DESC);

-- ---------------------------------------------------------------------------
-- 4. 渠道用量记录（紫域等付费渠道的逐次调用对账）
--    ziyu_cost 是紫域返回的 cost 原值（积分），
--    charged_credits 是实际扣给用户的点数（= ceil(ziyu_cost * 1.5)）。
--    两者分开存，因为"紫域积分"与"用户点数"不是一个单位。
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS channel_usage (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel         TEXT NOT NULL,                  -- 例如 'ziyu'
    task_id         TEXT NOT NULL,                  -- 幂等键，通常 = 紫域 jobId
    model_id        TEXT,
    mode            TEXT,                           -- i2v / t2v / t2i
    status          TEXT NOT NULL DEFAULT 'submitted',
                    -- submitted / completed / failed
    ziyu_cost       INTEGER,                        -- 紫域返回的 cost 原值（积分）
    charged_credits INTEGER,                        -- 预扣与结算的用户点数
    duration_seconds INTEGER,
    result_url      TEXT,
    local_media_key TEXT,                           -- 落盘到 MEDIA_ROOT 后的 storage_key
    error_code      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_channel_usage_task
    ON channel_usage (channel, task_id);

-- Provider task ids are kept separate from the local/idempotency task id so
-- polling can be authorized per account after the browser has received a
-- provider response.
ALTER TABLE channel_usage
    ADD COLUMN IF NOT EXISTS provider_task_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_channel_usage_provider_task
    ON channel_usage (channel, provider_task_id)
    WHERE provider_task_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_channel_usage_user
    ON channel_usage (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_channel_usage_status
    ON channel_usage (status);

-- ---------------------------------------------------------------------------
-- 5. 免费试拍配额（Agnes flash）
--    每账号每月重置 N 次（默认 3，由 FREE_TRIAL_MONTHLY_LIMIT 控制）。
--    用 (user_id, period) 做行键，period 形如 '2026-09'。
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS free_trial_usage (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period      TEXT NOT NULL,                      -- 'YYYY-MM'（服务器本地月）
    used        INTEGER NOT NULL DEFAULT 0 CHECK (used >= 0),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, period)
);

-- ---------------------------------------------------------------------------
-- 6. 管理员人工调整余额的审计（可选但建议保留，便于事后追责）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credit_adjustments (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    admin_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount      INTEGER NOT NULL,
    note        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_adjustments_user
    ON credit_adjustments (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 7. 邮箱验证码（注册 / 后续可复用于找回密码）
--
--    ⚠️ 只存 code_hash，绝不存明文验证码。
--    code_hash = HMAC-SHA256(key = JWT_SECRET, msg = "<email>:<code>")
--
--    为什么必须带服务端密钥而不是裸 SHA256：6 位数字只有 100 万种组合，
--    裸哈希可被枚举反推（秒级）。带密钥后，数据库泄露也拿不到可用验证码。
--    ⚠️ 因此 JWT_SECRET 一旦更换，所有未使用的验证码立即失效（可接受）。
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_verification_codes (
    id           BIGSERIAL PRIMARY KEY,
    email        TEXT NOT NULL,
    code_hash    TEXT NOT NULL,
    purpose      TEXT NOT NULL DEFAULT 'register',
    expires_at   TIMESTAMPTZ NOT NULL,
    attempts     INTEGER NOT NULL DEFAULT 0,
    consumed_at  TIMESTAMPTZ,
    ip           TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_codes_lookup
    ON email_verification_codes (email, purpose, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_codes_ip
    ON email_verification_codes (ip, created_at DESC);

-- ---------------------------------------------------------------------------
-- 完成。所有语句均幂等，可在已有数据的库上重复执行。
-- ---------------------------------------------------------------------------
