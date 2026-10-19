"use client";

import {
  Bot,
  CheckCircle2,
  ChevronRight,
  Code2,
  Crosshair,
  ExternalLink,
  FileJson,
  Globe2,
  Keyboard,
  Loader2,
  MousePointer2,
  MousePointerClick,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TerminalSquare
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toUserFacingError } from "@/lib/user-facing-error";

type AnyObject = Record<string, any>;

type ApiState = {
  localAvailable: boolean;
  lastClick: AnyObject | null;
  lastWebClick: AnyObject | null;
  lastWebAction: AnyObject | null;
  result?: AnyObject;
  error?: string;
};

type RankedCandidate = {
  item: AnyObject;
  index: number;
  score: number;
  reason: string;
};

type JinaResult = {
  title: string;
  url: string;
  description: string;
  date?: string;
};

type JinaState = {
  ok?: boolean;
  mode?: string;
  query?: string;
  hasKey?: boolean;
  source?: string;
  advice?: string[];
  results?: JinaResult[];
  read?: {
    title: string;
    url: string;
    description?: string;
    content: string;
  };
  rawText?: string;
  error?: string;
};

const actionLabels: Record<string, string> = {
  "inspect-click": "捕捉点击",
  "inspect-web": "网页反查",
  "dry-run-click": "预演点击",
  "click-nearby": "执行点击",
  "click-selector": "选择器点击",
  "fill-selector": "选择器输入"
};

function elementTitle(element: AnyObject | null | undefined) {
  if (!element) return "未识别";
  const text = element.innerText || element.text || element.ariaLabel || element.placeholder || element.name || element.selector;
  const tag = element.tag ? String(element.tag).toUpperCase() : "DOM";
  return `${tag} · ${String(text || "未命名").slice(0, 72)}`;
}

function describeClick(click: AnyObject | null) {
  if (!click) return "还没有捕捉点击";
  return click.description || `${click.x}, ${click.y}`;
}

function shorten(value: string, size = 88) {
  if (!value) return "";
  return value.length > size ? `${value.slice(0, size)}...` : value;
}

function elementSearchText(element: AnyObject | null | undefined) {
  if (!element) return "";
  return [
    element.tag,
    element.role,
    element.type,
    element.name,
    element.placeholder,
    element.ariaLabel,
    element.text,
    element.innerText,
    element.selector
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

const intentSynonyms = [
  ["登录", "登陆", "login", "log in", "sign in"],
  ["注册", "sign up", "signup", "register"],
  ["继续", "continue", "next", "下一步"],
  ["谷歌", "google"],
  ["密码", "password"],
  ["邮箱", "email", "mail"],
  ["验证码", "code", "verify", "verification"],
  ["上传", "upload", "file", "media"],
  ["生成", "create", "generate"],
  ["下载", "download"],
  ["关闭", "close", "cancel"]
];

function scoreCandidate(item: AnyObject, index: number, intent: string): RankedCandidate {
  const element = item.element as AnyObject;
  const haystack = elementSearchText(element);
  const query = intent.trim().toLowerCase();
  let score = Math.max(0, 40 - Number(item.distance ?? 0) / 8);
  const reasons: string[] = [];

  if (!query) {
    return { item, index, score: Math.round(score), reason: "按距离排序" };
  }

  const terms = query.split(/[\s,，。；;、]+/).filter(Boolean);
  for (const term of terms) {
    if (haystack.includes(term)) {
      score += 34;
      reasons.push(`命中 ${term}`);
    }
  }

  for (const group of intentSynonyms) {
    const queryHit = group.some((term) => query.includes(term));
    if (!queryHit) continue;
    const elementHit = group.some((term) => haystack.includes(term));
    if (elementHit) {
      score += 46;
      reasons.push(group[0]);
    }
  }

  if (["button", "a", "input", "textarea", "select"].includes(String(element.tag ?? "").toLowerCase())) {
    score += 10;
  }
  if (String(element.type ?? "").toLowerCase() === "password" && /密码|password/.test(query)) {
    score += 28;
  }

  return {
    item,
    index,
    score: Math.round(score),
    reason: reasons.slice(0, 2).join(" / ") || "语义接近"
  };
}

const defaultJinaQueries = [
  "Jina Reader API s.jina.ai 搜索模式 用法",
  "web automation CSS selector button input best practices",
  "GUI agent human in the loop UX approval preview",
  "Playwright click selector input fill troubleshooting"
];

export function LocalAutomationConsole() {
  const [state, setState] = useState<ApiState | null>(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [nearbyIndex, setNearbyIndex] = useState(0);
  const [selector, setSelector] = useState("");
  const [text, setText] = useState("");
  const [showJson, setShowJson] = useState(false);
  const [intent, setIntent] = useState("");
  const [jinaQuery, setJinaQuery] = useState("web automation CSS selector button input best practices");
  const [jina, setJina] = useState<JinaState | null>(null);

  const nearby = useMemo(() => {
    return (state?.lastWebClick?.nearbyInteractive ?? []) as AnyObject[];
  }, [state]);

  const rankedNearby = useMemo(() => {
    const ranked = nearby.map((item, index) => scoreCandidate(item, index, intent));
    return ranked.sort((left, right) => {
      if (intent.trim()) return right.score - left.score;
      return Number(left.item.distance ?? 0) - Number(right.item.distance ?? 0);
    });
  }, [nearby, intent]);

  const selectedNearby = nearby[nearbyIndex]?.element ?? null;
  const topCandidate = rankedNearby[0];
  const pageTitle = state?.lastWebClick?.title ?? "等待网页反查";
  const pageUrl = state?.lastWebClick?.url ?? "";

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setBusy("refresh");
    try {
      const response = await fetch("/api/local-automation", { cache: "no-store" });
      const json = (await response.json()) as ApiState;
      setState(json);
      setNotice(null);
    } catch (error) {
      setNotice({ tone: "error", text: toUserFacingError(error instanceof Error ? error.message : error, "状态读取失败") });
    } finally {
      setBusy("");
    }
  }

  async function run(action: string, payload: AnyObject = {}) {
    setBusy(action);
    setNotice({
      tone: "ok",
      text:
        action === "inspect-click"
          ? "已开始监听下一次鼠标点击。请切到目标窗口，点一下要识别的位置。"
          : `正在执行：${actionLabels[action] ?? action}`
    });
    try {
      const response = await fetch("/api/local-automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload })
      });
      const json = (await response.json()) as ApiState;
      if (!response.ok) throw new Error(json.error ?? "执行失败");
      setState(json);
      setNotice({ tone: "ok", text: `${actionLabels[action] ?? action}完成。` });
    } catch (error) {
      setNotice({ tone: "error", text: toUserFacingError(error instanceof Error ? error.message : error, "执行失败") });
    } finally {
      setBusy("");
    }
  }

  function selectCandidate(candidate: RankedCandidate) {
    const element = candidate.item.element as AnyObject;
    setNearbyIndex(candidate.index);
    setSelector(element.selector ?? "");
  }

  async function runJinaSearch(nextQuery = jinaQuery) {
    const query = nextQuery.trim();
    if (!query) {
      setNotice({ tone: "error", text: "先输入要检索的问题。" });
      return;
    }
    setBusy("jina-search");
    setNotice({ tone: "ok", text: "Jina 正在检索外部资料。" });
    try {
      const response = await fetch("/api/local-automation/jina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });
      const json = (await response.json()) as JinaState;
      if (!response.ok) throw new Error(json.error ?? "Jina 检索失败");
      setJina(json);
      setJinaQuery(query);
      setNotice({ tone: "ok", text: `Jina 找到 ${json.results?.length ?? 0} 条参考。` });
    } catch (error) {
      setNotice({ tone: "error", text: toUserFacingError(error instanceof Error ? error.message : error, "Jina 检索失败") });
    } finally {
      setBusy("");
    }
  }

  async function runJinaRead(url: string) {
    if (!url) return;
    setBusy("jina-read");
    setNotice({ tone: "ok", text: "Jina Reader 正在读取网页正文。" });
    try {
      const response = await fetch("/api/local-automation/jina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "read", url })
      });
      const json = (await response.json()) as JinaState;
      if (!response.ok) throw new Error(json.error ?? "Jina Reader 失败");
      setJina((current) => ({ ...(current ?? {}), ...json, results: current?.results }));
      setNotice({ tone: "ok", text: "网页正文已读取。" });
    } catch (error) {
      setNotice({ tone: "error", text: toUserFacingError(error instanceof Error ? error.message : error, "Jina Reader 失败") });
    } finally {
      setBusy("");
    }
  }

  const isBusy = Boolean(busy);

  return (
    <main className="automation-shell">
      <section className="automation-hero">
        <div>
          <span className="automation-eyebrow">
            <Bot />
            本地 GUI 自动化控制台
          </span>
          <h1>点一下，剩下的交给面板</h1>
          <p>
            把命令行封装成三个动作：捕捉你点的位置、反查网页元素、预演或执行点击。遇到人机验证和安全验证时，只做提示与暂停，不做绕过。
          </p>
        </div>
        <button className="automation-icon-button" onClick={refresh} disabled={isBusy} title="刷新状态">
          {busy === "refresh" ? <Loader2 className="spin" /> : <RefreshCw />}
        </button>
      </section>

      {notice && <div className={`automation-notice ${notice.tone === "error" ? "error" : ""}`}>{notice.text}</div>}

      <section className="automation-status-band">
        <div>
          <span>本地脚本</span>
          <strong>{state?.localAvailable ? "已就绪" : "不可用"}</strong>
        </div>
        <div>
          <span>最近点击</span>
          <strong>{state?.lastClick ? `${state.lastClick.x}, ${state.lastClick.y}` : "暂无"}</strong>
        </div>
        <div>
          <span>网页页面</span>
          <strong>{shorten(pageTitle, 34)}</strong>
        </div>
        <div>
          <span>候选元素</span>
          <strong>{nearby.length ? `${nearby.length} 个` : "待识别"}</strong>
        </div>
      </section>

      <section className="automation-grid">
        <div className="automation-main">
          <div className="automation-panel automation-step">
            <div className="automation-step-index">1</div>
            <div className="automation-step-body">
              <div className="automation-panel-head">
                <div>
                  <h2>捕捉一次点击</h2>
                  <p>点按钮后，去任意窗口点一下目标位置。这里会读取窗口、控件和坐标。</p>
                </div>
                <button className="automation-primary" onClick={() => run("inspect-click")} disabled={isBusy}>
                  {busy === "inspect-click" ? <Loader2 className="spin" /> : <Crosshair />}
                  开始捕捉
                </button>
              </div>
              <div className="automation-result-line">
                <MousePointer2 />
                <span>{describeClick(state?.lastClick ?? null)}</span>
              </div>
            </div>
          </div>

          <div className="automation-panel automation-step">
            <div className="automation-step-index">2</div>
            <div className="automation-step-body">
              <div className="automation-panel-head">
                <div>
                  <h2>反查网页内部元素</h2>
                  <p>如果第 1 步只识别到浏览器外壳，就用这一步连接比特浏览器，找到真正的 DOM 按钮或输入框。</p>
                </div>
                <button className="automation-secondary" onClick={() => run("inspect-web")} disabled={isBusy}>
                  {busy === "inspect-web" ? <Loader2 className="spin" /> : <Code2 />}
                  网页反查
                </button>
              </div>

              <div className="automation-page-card">
                <span>{shorten(pageUrl || "等待识别网页地址", 100)}</span>
                <strong>{state?.lastWebClick?.summary?.direct ?? "还没有网页识别结果"}</strong>
              </div>

              <div className="automation-intent-box">
                <div>
                  <Sparkles />
                  <label>
                    用一句话告诉我你想操作什么
                    <input
                      value={intent}
                      onChange={(event) => setIntent(event.target.value)}
                      placeholder="例如：点登录、找密码框、点 Continue with Google、输入邮箱"
                    />
                  </label>
                </div>
                {topCandidate && (
                  <button className="automation-secondary" onClick={() => selectCandidate(topCandidate)} disabled={isBusy}>
                    选推荐 #{topCandidate.index + 1}
                  </button>
                )}
              </div>

              <div className="automation-candidates">
                {nearby.length === 0 ? (
                  <div className="automation-empty">识别后，这里会列出最近的按钮、输入框和链接。</div>
                ) : (
                  rankedNearby.map((candidate) => {
                    const item = candidate.item;
                    const index = candidate.index;
                    const element = item.element as AnyObject;
                    const active = index === nearbyIndex;
                    return (
                      <button
                        className={`automation-candidate ${active ? "active" : ""}`}
                        key={`${element.selector}-${index}`}
                        onClick={() => selectCandidate(candidate)}
                      >
                        <span>{index + 1}</span>
                        <div>
                          <strong>{elementTitle(element)}</strong>
                          <small>{intent.trim() ? `${candidate.reason} · 评分 ${candidate.score}` : shorten(element.selector ?? "", 96)}</small>
                        </div>
                        <em>{item.distance}px</em>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="automation-panel automation-step">
            <div className="automation-step-index">3</div>
            <div className="automation-step-body">
              <div className="automation-panel-head">
                <div>
                  <h2>预演和执行</h2>
                  <p>先预演，确认它准备操作哪个元素；确认后再执行点击。</p>
                </div>
                <div className="automation-actions">
                  <button
                    className="automation-secondary"
                    onClick={() => run("dry-run-click", { nearbyIndex })}
                    disabled={isBusy || nearby.length === 0}
                  >
                    {busy === "dry-run-click" ? <Loader2 className="spin" /> : <Play />}
                    预演
                  </button>
                  <button
                    className="automation-primary"
                    onClick={() => run("click-nearby", { nearbyIndex })}
                    disabled={isBusy || nearby.length === 0}
                  >
                    {busy === "click-nearby" ? <Loader2 className="spin" /> : <MousePointerClick />}
                    点击选中元素
                  </button>
                </div>
              </div>

              <div className="automation-selected">
                <CheckCircle2 />
                <div>
                  <span>当前选中</span>
                  <strong>{elementTitle(selectedNearby)}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="automation-panel">
            <div className="automation-panel-head">
              <div>
                <h2>高级选择器操作</h2>
                <p>当你已经知道 CSS 选择器时，可以直接点击或填值。</p>
              </div>
              <Keyboard />
            </div>
            <div className="automation-form-grid">
              <label>
                CSS 选择器
                <input value={selector} onChange={(event) => setSelector(event.target.value)} placeholder="例如 input[name='password']" />
              </label>
              <label>
                要输入的内容
                <input value={text} onChange={(event) => setText(event.target.value)} placeholder="只在输入动作时使用" />
              </label>
            </div>
            <div className="automation-actions left">
              <button className="automation-secondary" onClick={() => run("click-selector", { selector })} disabled={isBusy || !selector}>
                <MousePointerClick />
                点击选择器
              </button>
              <button className="automation-primary" onClick={() => run("fill-selector", { selector, text })} disabled={isBusy || !selector}>
                <Keyboard />
                输入文本
              </button>
            </div>
          </div>

          <div className="automation-panel">
            <div className="automation-panel-head">
              <div>
                <h2>Jina 联网检索助手</h2>
                <p>查网页自动化、选择器、错误处理和工具用法。Jina 会返回可读结果，方便你边做边学。</p>
              </div>
              <Globe2 />
            </div>

            <div className="automation-search-row">
              <div className="automation-search-input">
                <Search />
                <input
                  value={jinaQuery}
                  onChange={(event) => setJinaQuery(event.target.value)}
                  placeholder="输入想查的问题"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void runJinaSearch();
                  }}
                />
              </div>
              <button className="automation-primary" onClick={() => runJinaSearch()} disabled={isBusy || !jinaQuery.trim()}>
                {busy === "jina-search" ? <Loader2 className="spin" /> : <Search />}
                检索
              </button>
            </div>

            <div className="automation-query-chips">
              {defaultJinaQueries.map((query) => (
                <button
                  key={query}
                  onClick={() => {
                    setJinaQuery(query);
                    void runJinaSearch(query);
                  }}
                  disabled={isBusy}
                >
                  {query}
                </button>
              ))}
            </div>

            {jina?.advice && (
              <div className="automation-advice">
                {jina.advice.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            )}

            <div className="automation-search-results">
              {!jina ? (
                <div className="automation-empty">这里会展示 Jina Search 返回的资料和链接。</div>
              ) : jina.results?.length ? (
                jina.results.map((result, index) => (
                  <div key={`${result.url}-${index}`} className="automation-search-result">
                    <span>{index + 1}</span>
                    <div>
                      <a href={result.url} target="_blank" rel="noreferrer">
                        <strong>{shorten(result.title, 92)}</strong>
                      </a>
                      <small>{shorten(result.description || result.url, 170)}</small>
                    </div>
                    <button onClick={() => runJinaRead(result.url)} disabled={isBusy} title="用 Jina Reader 读取">
                      {busy === "jina-read" ? <Loader2 className="spin" /> : <ExternalLink />}
                    </button>
                  </div>
                ))
              ) : (
                <pre className="automation-raw-result">{jina.rawText || jina.error || "没有解析到结果。"}</pre>
              )}
            </div>

            {jina?.read && (
              <div className="automation-reader-card">
                <div>
                  <strong>{shorten(jina.read.title, 120)}</strong>
                  <span>{shorten(jina.read.url, 120)}</span>
                </div>
                <p>{shorten(jina.read.content.replace(/\s+/g, " "), 820)}</p>
              </div>
            )}
          </div>
        </div>

        <aside className="automation-side">
          <div className="automation-panel automation-model-card">
            <Sparkles />
            <h2>体验升级</h2>
            <p>候选元素现在会按你的自然语言意图重排。说“找密码框”“点登录”“点谷歌继续”，面板会把最像的元素推到前面。</p>
          </div>

          <div className="automation-panel automation-safety">
            <ShieldCheck />
            <h2>安全边界</h2>
            <p>这个面板负责“识别、预演、点击、输入”。验证码、人机验证、平台额度限制等需要你自己按规则处理，面板不会尝试绕过。</p>
          </div>

          <div className="automation-panel">
            <div className="automation-panel-head compact">
              <h2>最近输出</h2>
              <button className="automation-link-button" onClick={() => setShowJson((value) => !value)}>
                <FileJson />
                {showJson ? "收起" : "查看 JSON"}
              </button>
            </div>
            <div className="automation-output">
              <p>
                <TerminalSquare />
                {state?.lastWebAction?.description || state?.result?.description || "等待执行动作"}
              </p>
              {state?.lastWebAction?.selector && <code>{state.lastWebAction.selector}</code>}
              {showJson && <pre>{JSON.stringify(state?.result ?? state ?? {}, null, 2)}</pre>}
            </div>
          </div>

          <div className="automation-panel automation-guide">
            <h2>推荐流程</h2>
            <ol>
              <li>
                <span>捕捉</span>
                <ChevronRight />
                点目标窗口
              </li>
              <li>
                <span>网页反查</span>
                <ChevronRight />
                选择候选元素
              </li>
              <li>
                <span>预演</span>
                <ChevronRight />
                确认后执行
              </li>
            </ol>
          </div>
        </aside>
      </section>
    </main>
  );
}
