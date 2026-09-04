"""保存提示词到 prompts.chat 的命令行工具"""
import json
import sys
import os
import argparse
import psycopg2
import psycopg2.extras
import random
import string
from datetime import datetime, timezone

DB_CONFIG = {
    "host": "localhost",
    "port": 5433,
    "user": "prompts",
    "password": "prompts123",
    "dbname": "prompts_chat",
}

USER_ID = "cmt7jxumq0000uvbwk3yzb42c"


def save_prompt(title, content, type="TEXT", description="", category_slug=""):
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        category_id = None
        if category_slug:
            cur.execute("SELECT id FROM \"categories\" WHERE slug = %s", (category_slug,))
            r = cur.fetchone()
            if r:
                category_id = r["id"]
        rand_suffix = "".join(random.choices(string.hexdigits.lower(), k=12))
        slug = f"local-{rand_suffix}"
        now = datetime.now(timezone.utc)
        type_upper = "VIDEO" if type.upper() == "VIDEO" else "STRUCTURED" if type.upper() == "STRUCTURED" else "TEXT"
        cur.execute("""
            INSERT INTO "prompts" (id, title, description, content, type, "isPrivate", "viewCount",
                                   "createdAt", "updatedAt", "authorId", "categoryId",
                                   "slug", "requiresMediaUpload", "isFeatured", "isUnlisted")
            VALUES (gen_random_uuid()::text, %s, %s, %s, %s::"PromptType", false, 0,
                    %s, %s, %s, %s, %s, false, false, false)
            RETURNING id, slug
        """, (title, description or "", content, type_upper, now, now, USER_ID, category_id, slug))
        row = cur.fetchone()
        conn.commit()
        print(f"✅ 已保存: {title}")
        print(f"   ID: {row['id']}")
        print(f"   Slug: {row['slug']}")
        print(f"   分类: {category_slug or '未分类'}")
        return row['id']
    except Exception as e:
        conn.rollback()
        print(f"❌ 保存失败: {e}")
        return None
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser(description="保存提示词到 prompts.chat")
    parser.add_argument("--title", "-t", required=True, help="提示词标题")
    parser.add_argument("--content", "-c", required=True, help="提示词内容")
    parser.add_argument("--type", "-T", default="TEXT", choices=["TEXT", "VIDEO", "STRUCTURED"], help="提示词类型")
    parser.add_argument("--description", "-d", default="", help="描述说明")
    parser.add_argument("--usage", "-u", default="", help="使用场景：什么时候用、什么场景选它、什么效果。格式：使用场景：当你要...时用。效果：...")
    parser.add_argument("--category", "-C", default="", help="分类 slug")
    args = parser.parse_args()
    # 如果提供了 usage，追加到 description 前面
    full_desc = f"使用场景：{args.usage} | {args.description}" if args.usage else args.description
    save_prompt(args.title, args.content, args.type, full_desc, args.category)


if __name__ == "__main__":
    main()