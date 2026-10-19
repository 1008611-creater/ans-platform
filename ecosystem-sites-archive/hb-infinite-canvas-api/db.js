/**
 * 数据库连接与建表。
 *
 * 刻意不引入 ORM：这个项目的数据模型还在变，直接写 SQL 更好改，
 * 也少一层「ORM 帮你生成了什么」的黑盒。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = path.dirname(fileURLToPath(import.meta.url));

export const DATABASE_URL =
    process.env.DATABASE_URL || "postgres://canvas:canvas@localhost:5432/canvas";

let pool = null;

export function getPool() {
    if (!pool) {
        pool = new pg.Pool({
            connectionString: DATABASE_URL,
            max: Number(process.env.PG_POOL_MAX || 10),
            // 服务端渲染/容器重启时数据库可能还没起来，别让连接直接炸
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 30000,
        });
        pool.on("error", (error) => {
            console.error("[db] 连接池异常:", error && error.message);
        });
    }
    return pool;
}

export async function query(text, params) {
    return getPool().query(text, params);
}

/** 建表（幂等，每次启动跑一遍）。失败只 warn，不阻止进程启动 —— 便于排障时先看日志。 */
export async function migrate() {
    const sql = fs.readFileSync(path.join(here, "schema.sql"), "utf8");
    await query(sql);
    console.log("[db] 建表/迁移完成");
}

export async function closeDb() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}
