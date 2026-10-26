# /.well-known/skills/index.json 线上缺陷交接单（2026-10-20）

> **已作废（2026-10-26）**：该端点随上游 prompts.chat 技能包一起下线（PR #226），上线后返回 404，不再需要修复。以下内容仅作历史记录。

> 这份文件写给**发布该 JSON 的那一侧**（不是 ans-platform 仓库本身）。本文只描述现象、复现方式、
> 根因判断与验收标准，方便直接转发。

## 现象（线上实测）

```powershell
curl.exe -s https://ans.cauai.fun/.well-known/skills/index.json -o skills.json
python -c "import json;d=json.load(open('skills.json',encoding='utf-8'));s=d['skills'];print(len(s));print(s[2])"
```

2026-10-20 实测：**202 条**记录，存在三类缺陷：

1. **路径用了 Windows 反斜杠**（约 174 条），例如
   `{"name":"ai-video-fundamentals-skill","description":"name: ai-video-fundamentals-skill","files":["agents\\openai.yaml","SKILL.md"]}`。
   macOS / Linux 客户端按字面量取文件会失败（`agents\openai.yaml` 不是合法 POSIX 相对路径）。
2. **description 不是描述**：**148 / 202 条**把 `SKILL.md` 开头的 `name: <slug>` 行当成描述（如上例），
   另有部分条目描述为空。（2026-10-20 复核：JSON 文本里 **0 处 U+FFFD**，此前的"乱码"是终端按 GBK 显示造成的误判，
   已在下方改成交互式核对，不再作为缺陷主张。）
3. **source 指向旧目录**：条目里仍在引用 `plugins/claude/prompts-chat/skills`，
   而 ANS 仓库里同一批 skill 已迁到 `ai-video-skills-source/`（`plugins/...` 仍在仓库中，但那是历史路径）。

## 为什么不在 ans-platform 仓库里修

`ans-platform` 仓库里**没有**这份文件，也没有产出它的代码：

```bash
git ls-tree -r --name-only origin/main | grep -c '\.well-known/skills'   # 0
ls public/.well-known                                                      # 不存在
```

仓库里的 `_inventory.json`（同机生成的 skill 清单）**是干净的**：0 处反斜杠、0 处乱码，
说明线上那份不是这个脚本的这次产物，而是**另一侧扫描/序列化流程**生成的。

## 建议的修法（发布侧）

1. 路径一律用 `/` 拼接（`posixpath.join` 或 `"/".join(parts)`），不要用 `os.path.join` 后再直接序列化；
2. 以 UTF-8 写文件：`open(path, "w", encoding="utf-8")` + `json.dump(..., ensure_ascii=False)`；
3. `description` 取 `SKILL.md` front matter 的 `description:` 字段（缺失时截取首个非标题段落），
   不要取第一行；
4. `source` 用仓库根相对路径，并跟当前目录结构保持一致（`ai-video-skills-source/<skill>/SKILL.md`）。

## 验收标准（发布侧自检脚本）

```python
import json, pathlib
data = json.load(open("index.json", encoding="utf-8"))
skills = data["skills"]
assert skills, "空清单"
for s in skills:
    assert "\\" not in json.dumps(s), f"{s['name']} 含反斜杠路径"
    assert s.get("description") and not s["description"].startswith("name:"), f"{s['name']} 描述不合法"
    assert "\ufffd" not in json.dumps(s), f"{s['name']} 含替换字符（编码损坏）"  # 本次实测 0 处，作为回归保险
    for f in s.get("files", []):
        assert not f.startswith("/"), f"{s['name']} 出现绝对路径 {f}"
print("OK", len(skills))
```

## 期望结果

- `files[]` 全是 `/` 分隔的相对路径；
- 每条都有可读的 `description`（无 `name:` 前缀、无乱码）；
- 发布侧自检脚本通过，且发布产物与本仓库 `ai-video-skills-source/` 的目录结构一致。

## 追踪

- 该缺陷由 2026-10-20 的线上 Agent/站点审查发现（ans-platform 侧修复 PR 与治理账本见
  `docs/authority/ledger.json`）；本文只覆盖发布侧动作，修复后请在本文件补一行发布记录。
