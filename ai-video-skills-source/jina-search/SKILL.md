---
name: jina-search
description: name: jina-search
---

---
name: jina-search
description: name: jina-search
---

---
name: jina-search
description: Search the web and read web pages with Jina AI Search/Reader. Use when Codex needs a lightweight web search, page extraction, or source gathering workflow through Jina using JINA_API_KEY, especially for Chinese/English research notes, prompt research, or summarizing URLs.
---

# Jina Search

Use this skill for Jina AI search and reader tasks.

## Credentials

Read `JINA_API_KEY` or comma-separated `JINA_API_KEYS` from the current environment or from a `.env` file in the current working directory or one of its parents. The skill directory `.env` is also supported for personal local credentials.

When `JINA_API_KEYS` contains multiple keys, the script tries them in order. If a key returns an insufficient-balance `402`, the script removes that exhausted key from the skill directory `.env` and retries with the next key.

Do not write the API key into prompts, final answers, or committed docs.

## Script

Use the bundled script:

```powershell
python $env:USERPROFILE\.codex\skills\jina-search\scripts\jina_search.py search "query terms"
python $env:USERPROFILE\.codex\skills\jina-search\scripts\jina_search.py read "https://example.com/page"
```

Useful options:

- `--format text`: default plain Jina output.
- `--format json`: request JSON when the endpoint supports it.
- `--timeout 45`: override request timeout.
- `--no-key`: call without Authorization for public/free fallback checks.

## Workflow

1. Use `search` for discovery queries.
2. Use `read` for URLs that should be summarized or extracted.
3. Cite primary URLs in final answers when web information materially affects the result.
4. Keep quotes short; summarize long pages instead of copying them.

