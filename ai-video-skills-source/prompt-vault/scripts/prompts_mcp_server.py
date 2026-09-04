"""prompts.chat MCP 服务器 - 让 WorkBuddy 直接搜索和读取提示词库"""
import json
import asyncio
import random
import string
from datetime import datetime, timezone
from typing import Any

import psycopg2
import psycopg2.extras
from mcp.server import Server, NotificationOptions
from mcp.server.models import InitializationOptions
from mcp.types import (
    Tool,
    TextContent,
    CallToolResult,
    ListToolsResult,
    CallToolRequestParams,
    PaginatedRequestParams,
)
from mcp.server.stdio import stdio_server

DB_CONFIG = {
    "host": "localhost",
    "port": 5433,
    "user": "prompts",
    "password": "prompts123",
    "dbname": "prompts_chat",
}

TOOLS = [
    Tool(
        name="search_prompts",
        description="搜索提示词库中的提示词，按关键词匹配标题、描述和内容",
        inputSchema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "搜索关键词"},
                "limit": {"type": "integer", "description": "返回条数上限（默认 10，最大 50）", "default": 10},
            },
            "required": ["query"],
        },
    ),
    Tool(
        name="get_prompt",
        description="获取单条提示词的完整内容，支持通过 ID 或标题搜索",
        inputSchema={
            "type": "object",
            "properties": {
                "prompt_id": {"type": "string", "description": "提示词的 ID 或标题关键词"},
            },
            "required": ["prompt_id"],
        },
    ),
    Tool(
        name="list_prompts",
        description="列出提示词库中的公开提示词，支持分页和分类筛选",
        inputSchema={
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "返回条数上限（默认 20，最大 100）", "default": 20},
                "offset": {"type": "integer", "description": "偏移量", "default": 0},
                "category": {"type": "string", "description": "按分类 slug 筛选（可选）"},
            },
        },
    ),
    Tool(
        name="list_categories",
        description="列出提示词库中的所有分类",
        inputSchema={
            "type": "object",
            "properties": {},
        },
    ),
    Tool(
        name="save_prompt",
        description="保存一条新提示词到提示词库，标题和内容必填，建议填写使用场景说明",
        inputSchema={
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "提示词标题"},
                "content": {"type": "string", "description": "提示词完整内容"},
                "type": {"type": "string", "description": "类型：VIDEO（视频）、STRUCTURED（结构化模板）、TEXT（文本）", "default": "TEXT"},
                "description": {"type": "string", "description": "简短描述说明用途和效果"},
                "usage": {"type": "string", "description": "使用场景：什么时候用、什么场景选它、什么效果。例如：当你要拍天宫大殿内部时用，效果：庄严压迫感"},
                "category_slug": {"type": "string", "description": "分类 slug，可选值：seedance-2-5、ai-video、ai-image、general-work、prompt-templates"},
            },
            "required": ["title", "content"],
        },
    ),
]


def search_prompts(query: str, limit: int = 10) -> str:
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        limit = min(limit, 50)
        cur.execute("""
            SELECT p.id, p.slug, p.title, p.description, 
                   LEFT(p.content, 300) as content_preview,
                   p.type, p."createdAt",
                   c.name as category_name,
                   u.name as author_name, u.username as author_username
            FROM "prompts" p
            LEFT JOIN "categories" c ON c.id = p."categoryId"
            LEFT JOIN "users" u ON u.id = p."authorId"
            WHERE p."deletedAt" IS NULL
              AND p."isUnlisted" = false
              AND p."isPrivate" = false
              AND (p.title ILIKE %s OR p.description ILIKE %s OR p.content ILIKE %s)
            ORDER BY p."createdAt" DESC
            LIMIT %s
        """, (f'%{query}%', f'%{query}%', f'%{query}%', limit))
        results = []
        for row in cur.fetchall():
            results.append({
                "id": row["id"],
                "slug": row["slug"],
                "title": row["title"],
                "description": row["description"],
                "content_preview": row["content_preview"],
                "type": row["type"],
                "category": row["category_name"],
                "author": row["author_name"] or row["author_username"],
            })
        return json.dumps({"count": len(results), "prompts": results}, ensure_ascii=False)
    finally:
        conn.close()


def get_prompt(prompt_id: str) -> str:
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            SELECT p.id, p.slug, p.title, p.description, p.content,
                   p.type, p."createdAt",
                   c.name as category_name,
                   u.name as author_name, u.username as author_username
            FROM "prompts" p
            LEFT JOIN "categories" c ON c.id = p."categoryId"
            LEFT JOIN "users" u ON u.id = p."authorId"
            WHERE p."deletedAt" IS NULL
              AND p."isUnlisted" = false
              AND p."isPrivate" = false
              AND (p.id = %s OR p.slug = %s)
            LIMIT 1
        """, (prompt_id, prompt_id))
        row = cur.fetchone()
        if not row:
            title_slug = prompt_id.replace("-", " ")
            cur.execute("""
                SELECT p.id, p.slug, p.title, p.description, p.content,
                       p.type, p."createdAt",
                       c.name as category_name,
                       u.name as author_name, u.username as author_username
                FROM "prompts" p
                LEFT JOIN "categories" c ON c.id = p."categoryId"
                LEFT JOIN "users" u ON u.id = p."authorId"
                WHERE p."deletedAt" IS NULL
                  AND p."isUnlisted" = false
                  AND p."isPrivate" = false
                  AND p.title ILIKE %s
                LIMIT 1
            """, (f'%{title_slug}%',))
            row = cur.fetchone()
        if not row:
            return json.dumps({"error": "提示词未找到"}, ensure_ascii=False)
        return json.dumps({
            "id": row["id"],
            "slug": row["slug"],
            "title": row["title"],
            "description": row["description"],
            "content": row["content"],
            "type": row["type"],
            "category": row["category_name"],
            "author": row["author_name"] or row["author_username"],
        }, ensure_ascii=False)
    finally:
        conn.close()


def list_prompts(limit: int = 20, offset: int = 0, category: str = None) -> str:
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        where = ["""p."deletedAt" IS NULL AND p."isUnlisted" = false AND p."isPrivate" = false"""]
        params = []
        if category:
            where.append("c.slug = %s")
            params.append(category)
        params.extend([min(limit, 100), offset])
        cur.execute(f"""
            SELECT p.id, p.slug, p.title, p.description, 
                   LEFT(p.content, 200) as content_preview,
                   p.type, p."createdAt",
                   c.name as category_name,
                   u.name as author_name, u.username as author_username
            FROM "prompts" p
            LEFT JOIN "categories" c ON c.id = p."categoryId"
            LEFT JOIN "users" u ON u.id = p."authorId"
            WHERE {' AND '.join(where)}
            ORDER BY p."createdAt" DESC
            LIMIT %s OFFSET %s
        """, params)
        results = [dict(r) for r in cur.fetchall()]
        return json.dumps({"count": len(results), "prompts": results}, ensure_ascii=False)
    finally:
        conn.close()


def list_categories() -> str:
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            SELECT c.id, c.name, c.slug, c.description,
                   COUNT(p.id) as prompt_count
            FROM "categories" c
            LEFT JOIN "prompts" p ON p."categoryId" = c.id AND p."deletedAt" IS NULL
            GROUP BY c.id, c.name, c.slug, c.description
            ORDER BY c.name
        """)
        results = [dict(r) for r in cur.fetchall()]
        return json.dumps({"categories": results}, ensure_ascii=False)
    finally:
        conn.close()


def save_prompt(title: str, content: str, type: str = "TEXT", description: str = "", usage: str = "", category_slug: str = "") -> str:
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # 查找用户
        USER_ID = "cmt7jxumq0000uvbwk3yzb42c"
        
        # 查找分类
        category_id = None
        if category_slug:
            cur.execute("SELECT id FROM \"categories\" WHERE slug = %s", (category_slug,))
            r = cur.fetchone()
            if r:
                category_id = r["id"]
        
        # 生成 slug
        rand_suffix = "".join(random.choices(string.hexdigits.lower(), k=12))
        slug = f"local-{rand_suffix}"
        now = datetime.now(timezone.utc)
        
        type_upper = "VIDEO" if type.upper() == "VIDEO" else "STRUCTURED" if type.upper() == "STRUCTURED" else "TEXT"
        
        # 组合描述：使用场景优先
        full_desc = f"使用场景：{usage} | {description}" if usage else (description or "")
        
        cur.execute("""
            INSERT INTO "prompts" (id, title, description, content, type, "isPrivate", "viewCount", 
                                   "createdAt", "updatedAt", "authorId", "categoryId", 
                                   "slug", "requiresMediaUpload", "isFeatured", "isUnlisted")
            VALUES (gen_random_uuid()::text, %s, %s, %s, %s::"PromptType", false, 0,
                    %s, %s, %s, %s,
                    %s, false, false, false)
            RETURNING id, slug
        """, (title, full_desc, content, type_upper, now, now, USER_ID, category_id, slug))
        
        row = cur.fetchone()
        conn.commit()
        
        return json.dumps({
            "success": True,
            "id": row["id"],
            "slug": row["slug"],
            "title": title,
            "category": category_slug or "未分类",
        }, ensure_ascii=False)
    except Exception as e:
        conn.rollback()
        return json.dumps({"error": str(e)}, ensure_ascii=False)
    finally:
        conn.close()


async def handle_list_tools(ctx, params: PaginatedRequestParams | None) -> ListToolsResult:
    return ListToolsResult(tools=TOOLS)


async def handle_call_tool(ctx, params: CallToolRequestParams) -> CallToolResult:
    name = params.name
    args = params.arguments or {}
    try:
        if name == "search_prompts":
            result = search_prompts(**args)
        elif name == "get_prompt":
            result = get_prompt(**args)
        elif name == "list_prompts":
            result = list_prompts(**args)
        elif name == "list_categories":
            result = list_categories()
        elif name == "save_prompt":
            result = save_prompt(**args)
        else:
            return CallToolResult(content=[TextContent(type="text", text=json.dumps({"error": f"Unknown tool: {name}"}))])
        return CallToolResult(content=[TextContent(type="text", text=result)])
    except Exception as e:
        return CallToolResult(content=[TextContent(type="text", text=json.dumps({"error": str(e)}))])


app = Server(
    "prompts-chat",
    on_list_tools=handle_list_tools,
    on_call_tool=handle_call_tool,
)


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="prompts-chat",
                server_version="1.0.0",
                capabilities=app.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )


if __name__ == "__main__":
    asyncio.run(main())