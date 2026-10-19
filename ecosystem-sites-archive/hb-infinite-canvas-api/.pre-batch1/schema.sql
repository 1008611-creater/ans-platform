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
