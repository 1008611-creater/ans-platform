#!/usr/bin/env python3
"""
Prompt Vault Web - 提示词库可视化面板
双击 启动面板.bat 即可在浏览器打开，无需敲命令。
"""

import json
import os
import sys
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
from urllib.parse import urlparse, parse_qs, unquote

# 复用核心脚本的所有功能
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import prompt_vault as pv

PORT = 8765

# 评分等级
RATINGS = ["S+", "A", "B", "C"]

def api_list(query=""):
    """搜索/列出提示词"""
    index = pv.init_index()
    results = []
    q = query.lower()
    for path, data in index["prompts"].items():
        if not q:
            results.append(data)
        else:
            searchable = f"{data.get('title','')} {data.get('purpose','')} {data.get('model','')} {data.get('effect','')} {data.get('category','')} {path}"
            if q in searchable.lower():
                results.append(data)
    results.sort(key=lambda x: x.get("use_count", 0), reverse=True)
    return results

def api_stats():
    index = pv.init_index()
    total = len(index["prompts"])
    templates = index.get("templates", {})
    cats = {k: len(v) for k, v in index["categories"].items()}
    used = [(k, v) for k, v in index["prompts"].items() if v.get("use_count", 0) > 0]
    used.sort(key=lambda x: x[1].get("use_count", 0), reverse=True)
    rated = [(k, v) for k, v in index["prompts"].items() if v.get("rating")]
    candidates = [(k, v) for k, v in index["prompts"].items()
                  if v.get("use_count", 0) >= 3 and pv.rating_ge(v.get("rating", ""), "A")]
    return {
        "total": total,
        "template_count": len(templates),
        "categories": cats,
        "top_used": [{"path": k, **v} for k, v in used[:10]],
        "rated": [{"path": k, **v} for k, v in rated],
        "candidates": [{"path": k, **v} for k, v in candidates],
    }

def api_templates():
    index = pv.init_index()
    return sorted(index.get("templates", {}).values(), key=lambda x: x["path"])

def api_github():
    index = pv.init_index()
    return index.get("github_sources", [])

def api_use(path):
    index = pv.init_index()
    key = _match(index, path)
    if not key:
        return {"ok": False, "error": f"未找到 '{path}'"}
    index["prompts"][key]["use_count"] = index["prompts"][key].get("use_count", 0) + 1
    from datetime import datetime
    index["prompts"][key]["last_used"] = datetime.now().strftime("%Y-%m-%d %H:%M")
    pv.save_index(index)
    return {"ok": True, "path": key, "use_count": index["prompts"][key]["use_count"]}

def api_rate(path, rating):
    index = pv.init_index()
    key = _match(index, path)
    if not key:
        return {"ok": False, "error": f"未找到 '{path}'"}
    index["prompts"][key]["rating"] = rating
    pv.save_index(index)
    return {"ok": True, "path": key, "rating": rating}

def api_scan():
    index = pv.scan_and_index()
    return {"ok": True, "total": len(index["prompts"]), "templates": len(index.get("templates", {}))}

def _match(index, keyword):
    keyword = keyword.lower()
    for k in index["prompts"]:
        if keyword in k.lower():
            return k
    return None

def api_content(path):
    """读取提示词全文"""
    vault = pv.get_vault_root()
    full = vault / path
    if not full.exists():
        return {"ok": False, "error": "文件不存在"}
    with open(full, "r", encoding="utf-8") as f:
        return {"ok": True, "content": f.read()}


# ---------- HTML 页面 ----------
HTML = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>Prompt Vault - 提示词库</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:"Microsoft YaHei",sans-serif; background:#f5f6fa; color:#2d3436; }
  .header { background:#2d3436; color:#fff; padding:16px 24px; display:flex; align-items:center; gap:12px; }
  .header h1 { font-size:20px; }
  .header .badge { background:#6c5ce7; padding:2px 10px; border-radius:12px; font-size:12px; }
  .container { max-width:1100px; margin:24px auto; padding:0 16px; }
  .searchbar { display:flex; gap:8px; margin-bottom:20px; }
  .searchbar input { flex:1; padding:12px 16px; border:1px solid #dfe6e9; border-radius:8px; font-size:15px; }
  .searchbar button { padding:12px 20px; background:#6c5ce7; color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:14px; }
  .searchbar button:hover { background:#5f4dd0; }
  .searchbar button.secondary { background:#636e72; }
  .grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:20px; }
  .stat-card { background:#fff; border-radius:10px; padding:16px; box-shadow:0 1px 4px rgba(0,0,0,.06); }
  .stat-card .num { font-size:28px; font-weight:bold; color:#6c5ce7; }
  .stat-card .label { font-size:13px; color:#636e72; margin-top:4px; }
  .card { background:#fff; border-radius:10px; padding:16px 20px; margin-bottom:12px; box-shadow:0 1px 4px rgba(0,0,0,.06); }
  .card h3 { font-size:16px; margin-bottom:8px; display:flex; align-items:center; gap:8px; }
  .tag { display:inline-block; padding:2px 8px; border-radius:10px; font-size:11px; background:#e8e6ff; color:#6c5ce7; }
  .tag.rating { background:#ffeaa7; color:#b8860b; font-weight:bold; }
  .card .meta { font-size:13px; color:#636e72; margin:6px 0; }
  .card .actions { margin-top:10px; display:flex; gap:8px; }
  .card .actions button { padding:6px 14px; border:none; border-radius:6px; cursor:pointer; font-size:13px; }
  .btn-use { background:#00b894; color:#fff; }
  .btn-use:hover { background:#00a383; }
  .btn-rate { background:#fdcb6e; color:#2d3436; }
  .btn-view { background:#74b9ff; color:#fff; }
  .section-title { font-size:15px; font-weight:bold; margin:24px 0 12px; color:#2d3436; }
  .suggest { background:#fff3cd; border-left:4px solid #fdcb6e; padding:12px 16px; border-radius:6px; margin-bottom:12px; font-size:14px; }
  .modal { display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,.5); z-index:100; }
  .modal-content { background:#fff; max-width:700px; margin:60px auto; border-radius:10px; padding:24px; max-height:80vh; overflow:auto; }
  .modal-content pre { white-space:pre-wrap; font-size:13px; line-height:1.6; background:#f8f9fa; padding:12px; border-radius:6px; }
  .close-btn { float:right; cursor:pointer; font-size:20px; color:#636e72; }
  .toast { position:fixed; bottom:24px; right:24px; background:#2d3436; color:#fff; padding:12px 20px; border-radius:8px; display:none; z-index:200; }
  .empty { text-align:center; color:#b2bec3; padding:40px; }
</style>
</head>
<body>
<div class="header">
  <h1>⚡ Prompt Vault</h1>
  <span class="badge">提示词库</span>
</div>
<div class="container">
  <div class="searchbar">
    <input id="search" placeholder="搜索提示词（标题/用途/模型/分类）..." onkeyup="if(event.key==='Enter')loadList()">
    <button onclick="loadList()">搜索</button>
    <button class="secondary" onclick="loadList('')">全部</button>
    <button class="secondary" onclick="doScan()">重新扫描</button>
  </div>

  <div class="grid" id="statGrid"></div>

  <div id="suggestBox"></div>

  <div class="section-title">提示词列表</div>
  <div id="list"></div>

  <div class="section-title">模板（复制套用，减少重复劳动）</div>
  <div id="tpl"></div>

  <div class="section-title">GitHub 参考源</div>
  <div id="github"></div>
</div>

<div class="modal" id="modal" onclick="if(event.target===this)this.style.display='none'">
  <div class="modal-content">
    <span class="close-btn" onclick="document.getElementById('modal').style.display='none'">✕</span>
    <h3 id="modalTitle"></h3>
    <pre id="modalBody"></pre>
  </div>
</div>
<div class="toast" id="toast"></div>

<script>
function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.style.display='block';
  setTimeout(()=>t.style.display='none',2200);
}
async function api(path,method='GET',body=null){
  const opts={method,headers:{'Content-Type':'application/json'}};
  if(body)opts.body=JSON.stringify(body);
  const r=await fetch(path,opts);
  return r.json();
}
async function loadList(q=''){
  const data=await api('/api/list?q='+encodeURIComponent(q||document.getElementById('search').value));
  const box=document.getElementById('list');
  if(!data.length){box.innerHTML='<div class="empty">没有匹配的提示词</div>';return;}
  box.innerHTML=data.map(p=>`
    <div class="card">
      <h3>${p.title||p.path}
        <span class="tag">${p.category}</span>
        ${p.rating?`<span class="tag rating">${p.rating}</span>`:''}
      </h3>
      <div class="meta">用途：${(p.purpose||'—').slice(0,120)}</div>
      <div class="meta">模型：${p.model||'—'} ｜ 使用 ${p.use_count||0} 次 ｜ 最后：${p.last_used||'未使用'}</div>
      <div class="actions">
        <button class="btn-use" onclick="doUse('${p.path}')">✓ 用过一次</button>
        ${['S+','A','B','C'].map(r=>`<button class="btn-rate" onclick="doRate('${p.path}','${r}')">${r}</button>`).join('')}
        <button class="btn-view" onclick="viewContent('${p.path}','${(p.title||'').replace(/'/g,'')}')">查看全文</button>
      </div>
    </div>`).join('');
}
async function loadStats(){
  const s=await api('/api/stats');
  document.getElementById('statGrid').innerHTML=`
    <div class="stat-card"><div class="num">${s.total}</div><div class="label">提示词总数</div></div>
    <div class="stat-card"><div class="num">${s.template_count}</div><div class="label">模板数</div></div>
    <div class="stat-card"><div class="num">${s.candidates.length}</div><div class="label">待提炼为模板</div></div>`;
  const sb=document.getElementById('suggestBox');
  if(s.candidates.length){
    sb.innerHTML='<div class="section-title">⚡ 复利提醒：这些提示词建议提炼成模板</div>'+
      s.candidates.map(c=>`<div class="suggest">→ <b>${c.title}</b> [${c.rating}] 已用 ${c.use_count} 次 ｜ ${c.path}</div>`).join('');
  } else sb.innerHTML='';
}
async function loadTemplates(){
  const data=await api('/api/templates');
  document.getElementById('tpl').innerHTML=data.map(t=>`
    <div class="card">
      <h3>${t.title}<span class="tag">${t.required_fields} 个必填字段</span></h3>
      <div class="meta">适配规则：${t.rule||'—'}</div>
      <div class="actions"><button class="btn-view" onclick="viewContent('${t.path}','${t.title.replace(/'/g,'')}')">查看模板</button></div>
    </div>`).join('');
}
async function loadGithub(){
  const data=await api('/api/github');
  document.getElementById('github').innerHTML=data.map(g=>`
    <div class="card"><h3>${g.name}</h3><div class="meta">${g.desc}</div>
    <div class="meta"><a href="${g.url}" target="_blank">${g.url}</a></div></div>`).join('');
}
async function doUse(path){
  const r=await api('/api/use','POST',{path});
  toast(r.ok?`已记录，累计 ${r.use_count} 次`:'失败：'+r.error);
  loadList();loadStats();
}
async function doRate(path,rating){
  const r=await api('/api/rate','POST',{path,rating});
  toast(r.ok?`已评分 ${rating}`:'失败：'+r.error);
  loadList();loadStats();
}
async function viewContent(path,title){
  const r=await api('/api/content?path='+encodeURIComponent(path));
  if(r.ok){
    document.getElementById('modalTitle').textContent=title||path;
    document.getElementById('modalBody').textContent=r.content;
    document.getElementById('modal').style.display='block';
  } else toast('读取失败');
}
async function doScan(){
  const r=await api('/api/scan','POST',{});
  toast(r.ok?`扫描完成：${r.total} 条提示词，${r.templates} 个模板`:'扫描失败');
  loadAll();
}
function loadAll(){loadList('');loadStats();loadTemplates();loadGithub();}
loadAll();
</script>
</body>
</html>"""


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # 静默

    def _send_json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        try:
            self._handle_get()
        except Exception as e:
            try:
                self._send_json({"error": str(e)}, 500)
            except Exception:
                pass

    def _handle_get(self):
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)
        path = parsed.path

        if path == "/":
            body = HTML.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", len(body))
            self.end_headers()
            self.wfile.write(body)
        elif path == "/api/list":
            self._send_json(api_list(qs.get("q", [""])[0]))
        elif path == "/api/stats":
            self._send_json(api_stats())
        elif path == "/api/templates":
            self._send_json(api_templates())
        elif path == "/api/github":
            self._send_json(api_github())
        elif path == "/api/content":
            self._send_json(api_content(unquote(qs.get("path", [""])[0])))
        else:
            self._send_json({"error": "not found"}, 404)

    def do_POST(self):
        try:
            self._handle_post()
        except Exception as e:
            try:
                self._send_json({"ok": False, "error": str(e)}, 500)
            except Exception:
                pass

    def _handle_post(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length) or b"{}")
        path = urlparse(self.path).path

        if path == "/api/use":
            self._send_json(api_use(body.get("path", "")))
        elif path == "/api/rate":
            self._send_json(api_rate(body.get("path", ""), body.get("rating", "")))
        elif path == "/api/scan":
            self._send_json(api_scan())
        else:
            self._send_json({"error": "not found"}, 404)


class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


def main():
    # 切到项目目录，让 prompt_vault 找到正确的 prompts/
    os.chdir(os.environ.get("PROMPT_VAULT_CWD", os.getcwd()))
    print(f"Prompt Vault 面板启动中: http://localhost:{PORT}")
    try:
        webbrowser.open(f"http://localhost:{PORT}")
    except Exception:
        pass
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
