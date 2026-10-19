"use client";

import { type ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpenCheck,
  Check,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Database,
  Eye,
  FileClock,
  FolderTree,
  Gauge,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  PanelRightOpen,
  Search,
  ServerCrash,
  ShieldCheck,
  Tags,
  UsersRound,
  WalletCards,
  X
} from "lucide-react";
import type { Image2AdminCase, Image2AdminCatalog, Image2AdminReviewItem } from "@/lib/image2-admin-catalog";
import type { AdminResourceStatus, Image2AdminOverview } from "@/lib/image2-admin-overview";
import { AdminImage2CaseChanges } from "@/components/admin-image2-case-changes";
import styles from "./image2-admin-console.module.css";
import visualStyles from "./image2-admin-case-visuals.module.css";

type AdminView = "overview" | "catalog" | "taxonomy" | "members" | "wallet" | "review" | "audit";
type ReviewState = "all" | "queued" | "reviewed";

type Props = {
  catalog: Image2AdminCatalog;
  accessReason?: string;
};

const navigation: Array<{ id: AdminView; label: string; icon: typeof LayoutDashboard; note: string }> = [
  { id: "overview", label: "总览", icon: LayoutDashboard, note: "数据健康与待办" },
  { id: "catalog", label: "案例 / 提示词", icon: BookOpenCheck, note: "静态索引只读" },
  { id: "taxonomy", label: "分类与标签", icon: Tags, note: "目录治理" },
  { id: "members", label: "用户与会员", icon: UsersRound, note: "真实只读数据" },
  { id: "wallet", label: "兑换码 / 积分", icon: WalletCards, note: "安全聚合" },
  { id: "review", label: "内容审核", icon: ClipboardCheck, note: "本地 dry-run" },
  { id: "audit", label: "运营记录", icon: FileClock, note: "变更与权限" }
];

function resourceLabel(status: AdminResourceStatus) {
  if (status === "ready") return "已连接";
  if (status === "not_configured") return "未配置";
  return "暂不可用";
}

function formatCompactDate(value?: string) {
  if (!value) return "未记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return { error: "服务返回了无法识别的响应。" } as T;
  }
}

function formatDate(value?: string) {
  if (!value) return "索引未记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "索引未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function truncate(value: string, length = 144) {
  return value.length > length ? `${value.slice(0, length)}...` : value;
}

function accessStatus(label: string, status: "ready" | "contract" | "dry") {
  const text = status === "ready" ? "已读取" : status === "dry" ? "仅本地" : "未接通";
  return (
    <span className={`${styles.status} ${styles[status]}`}>
      <i aria-hidden="true" />
      {label} · {text}
    </span>
  );
}

function EmptyContract({ title, body, tables, endpoint }: { title: string; body: string; tables: string[]; endpoint: string }) {
  return (
    <section className={styles.contractPanel} aria-label={title}>
      <div className={styles.contractIcon}>
        <LockKeyhole aria-hidden="true" />
      </div>
      <div>
        <span className={styles.sectionKicker}>只读合同</span>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
      <div className={styles.contractGrid}>
        <div>
          <span>已发现表</span>
          <strong>{tables.join(" · ")}</strong>
        </div>
        <div>
          <span>需要的安全接口</span>
          <code>{endpoint}</code>
        </div>
        <div>
          <span>当前边界</span>
          <strong>不请求 Supabase，不展示用户或卡密数据</strong>
        </div>
      </div>
    </section>
  );
}

function CaseInspector({ item, onClose, onQueue }: { item: Image2AdminCase; onClose: () => void; onQueue: () => void }) {
  return (
    <aside className={styles.inspector} aria-label="案例检查器">
      <div className={styles.inspectorHead}>
        <div>
          <span className={styles.sectionKicker}>案例检查器</span>
          <h2>{item.title}</h2>
        </div>
        <button className={styles.iconButton} type="button" onClick={onClose} aria-label="关闭案例检查器" title="关闭">
          <X aria-hidden="true" />
        </button>
      </div>

      <div className={visualStyles.inspector}>
        <span>案例图像</span>
        <strong>候选后台不加载远程案例图</strong>
        <small>{item.caseKey}</small>
      </div>

      <dl className={styles.inspectorMeta}>
        <div><dt>案例键</dt><dd>{item.caseKey}</dd></div>
        <div><dt>来源</dt><dd>{item.sourceName}</dd></div>
        <div><dt>分类</dt><dd>{item.categoryLabel}</dd></div>
        <div><dt>价值</dt><dd>{item.valueScore} / {item.valueTier}</dd></div>
      </dl>

      <section className={styles.promptPreview}>
        <span>提示词摘要</span>
        <p>{item.promptPreview || "索引未提供提示词摘要。"}</p>
      </section>

      <div className={styles.inspectorActions}>
        <button className={styles.primaryButton} type="button" onClick={onQueue}>
          <ClipboardCheck aria-hidden="true" />
          创建本地审查任务
        </button>
        {item.sourceUrl ? (
          <a className={styles.secondaryButton} href={item.sourceUrl} target="_blank" rel="noreferrer">
            <ArrowUpRight aria-hidden="true" />
            打开原始来源
          </a>
        ) : null}
      </div>
    </aside>
  );
}

export function Image2AdminConsole({ catalog, accessReason }: Props) {
  const [activeView, setActiveView] = useState<AdminView>("overview");
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selectedCase, setSelectedCase] = useState<Image2AdminCase | null>(null);
  const [reviewState, setReviewState] = useState<ReviewState>("queued");
  const [reviewedKeys, setReviewedKeys] = useState<Set<string>>(() => new Set());
  const [localEvents, setLocalEvents] = useState<string[]>([]);
  const [notice, setNotice] = useState(accessReason || "管理员会话已验证；动态数据通过受保护接口读取。" );
  const [overview, setOverview] = useState<Image2AdminOverview | null>(null);
  const [overviewStatus, setOverviewStatus] = useState<"loading" | "ready" | "error">("loading");

  const loadOverview = useCallback(async () => {
    setOverviewStatus("loading");
    try {
      const response = await fetch("/api/admin/image2/overview", { cache: "no-store" });
      const data = await readJson<Image2AdminOverview & { error?: string }>(response);
      if (!response.ok) throw new Error(data.error || "运营总览读取失败。");
      setOverview(data);
      setOverviewStatus("ready");
      setNotice("真实运营摘要已更新；不可用资源会单独标注，不使用估算数据。" );
    } catch (error) {
      setOverview(null);
      setOverviewStatus("error");
      setNotice(error instanceof Error ? error.message : "运营总览读取失败。" );
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const filteredCases = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("zh-CN");
    return catalog.cases.filter((item) => {
      const bySource = sourceFilter === "all" || item.sourceId === sourceFilter;
      const haystack = [item.title, item.categoryLabel, item.sourceName, item.promptPreview, item.styles.join(" ")]
        .join(" ")
        .toLocaleLowerCase("zh-CN");
      return bySource && (!normalized || haystack.includes(normalized));
    });
  }, [catalog.cases, query, sourceFilter]);

  const filteredReviewItems = useMemo(() => {
    const items = catalog.reviewItems.filter((item) => sourceFilter === "all" || item.sourceId === sourceFilter);
    if (reviewState === "reviewed") return items.filter((item) => reviewedKeys.has(item.caseKey));
    if (reviewState === "queued") return items.filter((item) => !reviewedKeys.has(item.caseKey));
    return items;
  }, [catalog.reviewItems, reviewedKeys, reviewState, sourceFilter]);

  function queueReview(item: Image2AdminCase) {
    setReviewedKeys((current) => new Set(current).add(item.caseKey));
    setLocalEvents((current) => [`本地审查任务：${item.caseKey} · ${item.title}`, ...current].slice(0, 8));
    setNotice(`已在本地 dry-run 中登记 ${item.caseKey}；没有写入案例库或 Supabase。`);
  }

  async function copyCaseKey(item: Image2AdminCase) {
    try {
      await navigator.clipboard.writeText(item.caseKey);
      setNotice(`已复制案例键 ${item.caseKey}。`);
    } catch {
      setNotice("浏览器未授权剪贴板。案例键可从检查器中手动复制。");
    }
  }

  function renderOverview() {
    return (
      <>
        <section className={styles.metricGrid} aria-label="案例库摘要">
          <article><span>静态案例</span><strong>{catalog.totalCases.toLocaleString()}</strong><small>读取 `image2-case-library.index.json`</small></article>
          <article><span>真实账号</span><strong>{overview?.users.status === "ready" ? overview.users.total.toLocaleString() : "—"}</strong><small>{overview ? resourceLabel(overview.users.status) : "正在读取 Supabase"}</small></article>
          <article><span>有效会员</span><strong>{overview?.memberships.status === "ready" ? overview.memberships.active.toLocaleString() : "—"}</strong><small>{overview ? resourceLabel(overview.memberships.status) : "正在读取权益"}</small></article>
          <article><span>成功兑换</span><strong>{overview?.redemptions.status === "ready" ? overview.redemptions.succeeded.toLocaleString() : "—"}</strong><small>{overview ? resourceLabel(overview.redemptions.status) : "正在读取审计"}</small></article>
        </section>

        <section className={styles.liveStrip} aria-label="动态数据连接状态">
          <div>
            {overviewStatus === "loading" ? <Loader2 className={styles.spinning} aria-hidden="true" /> : overviewStatus === "error" ? <ServerCrash aria-hidden="true" /> : <Database aria-hidden="true" />}
            <span><strong>{overviewStatus === "ready" ? "真实数据已读取" : overviewStatus === "loading" ? "正在读取真实数据" : "动态数据暂不可用"}</strong><small>{overview?.storageMode || "不会回退为演示数字"}</small></span>
          </div>
          <button type="button" onClick={() => void loadOverview()} disabled={overviewStatus === "loading"}>刷新真实数据</button>
        </section>

        <section className={styles.twoColumn}>
          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <div><span className={styles.sectionKicker}>内容概况</span><h2>分类密度</h2></div>
              {accessStatus("案例索引", "ready")}
            </div>
            <div className={styles.barList}>
              {catalog.categories.slice(0, 8).map((item) => (
                <div key={item.value}>
                  <div><span>{item.label}</span><b>{item.count}</b></div>
                  <i><em style={{ width: `${Math.max(5, (item.count / Math.max(...catalog.categories.map((row) => row.count))) * 100)}%` }} /></i>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <div><span className={styles.sectionKicker}>运营待办</span><h2>无需写库的检查项</h2></div>
              {accessStatus("dry-run", "dry")}
            </div>
            <ol className={styles.taskList}>
              <li><span>01</span><div><strong>核查来源归属</strong><small>{catalog.integrity.withoutSourceRegistry.toLocaleString()} 条未映射到来源注册表；案例原始 URL 属于详情懒加载数据，不在本页判缺。</small></div></li>
              <li><span>02</span><div><strong>复核低分案例</strong><small>{catalog.integrity.belowReviewScore.toLocaleString()} 条低于本地阈值 60，适合先整理为灵感参考层。</small></div></li>
              <li><span>03</span><div><strong>检查动态资源状态</strong><small>{overview ? [overview.users, overview.memberships, overview.licenses, overview.redemptions].filter((item) => item.status !== "ready").length : 4} 个资源当前需要迁移或连接复核。</small></div></li>
            </ol>
          </article>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div><span className={styles.sectionKicker}>重点案例</span><h2>高价值案例抽样</h2></div>
            <button className={styles.textButton} type="button" onClick={() => setActiveView("catalog")}>进入案例管理 <ChevronRight aria-hidden="true" /></button>
          </div>
          <div className={styles.featuredGrid}>
            {catalog.featuredCases.slice(0, 6).map((item) => (
              <button className={styles.featuredCase} type="button" key={item.caseKey} onClick={() => setSelectedCase(item)}>
                <CaseVisual item={item} className={visualStyles.featured} />
                <div><span>{item.categoryLabel}</span><strong>{item.title}</strong><small>{item.sourceName} · {item.valueScore} 分</small></div>
              </button>
            ))}
          </div>
        </section>
      </>
    );
  }

  function renderCatalog() {
    return (
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div><span className={styles.sectionKicker}>案例 / 提示词</span><h2>静态索引检查</h2><p>搜索和筛选直接作用于现有的构建期案例索引；这里不提供修改、删除或发布动作。</p></div>
          {accessStatus("只读索引", "ready")}
        </div>
        <div className={styles.toolbar}>
          <label className={styles.searchField}>
            <Search aria-hidden="true" />
            <input aria-label="搜索案例、提示词、来源或标签" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索案例、提示词、来源或标签" />
          </label>
          <label className={styles.selectField}><span>来源</span><select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}><option value="all">全部来源</option>{catalog.sources.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}</select></label>
          <span className={styles.resultCount}>{filteredCases.length.toLocaleString()} 条</span>
        </div>
        <div className={styles.caseTable}>
          <div className={styles.caseTableHead}><span>案例</span><span>分类 / 标签</span><span>来源</span><span>价值</span><span>操作</span></div>
          {filteredCases.slice(0, 80).map((item) => (
            <article className={styles.caseRow} key={item.caseKey}>
              <button className={styles.caseMain} type="button" onClick={() => setSelectedCase(item)}><CaseVisual item={item} className={visualStyles.row} /><span><strong>{item.title}</strong><small>{truncate(item.promptPreview || "索引未提供提示词摘要", 94)}</small></span></button>
              <div className={styles.caseTags}><span>{item.categoryLabel}</span>{item.styleLabels.slice(0, 2).map((tag) => <small key={tag}>{tag}</small>)}</div>
              <div className={styles.caseSource}><strong>{item.sourceName}</strong><small>{item.sourceUrl ? "原始链接已记录" : "链接待复核"}</small></div>
              <div className={styles.caseScore}><b>{item.valueScore}</b><small>{item.valueTier}</small></div>
              <div className={styles.rowActions}><button type="button" className={styles.iconButton} title="复制案例键" aria-label={`复制 ${item.caseKey}`} onClick={() => void copyCaseKey(item)}><Copy aria-hidden="true" /></button><button type="button" className={styles.iconButton} title="打开检查器" aria-label={`检查 ${item.title}`} onClick={() => setSelectedCase(item)}><PanelRightOpen aria-hidden="true" /></button></div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  function renderTaxonomy() {
    return (
      <div className={styles.taxonomyGrid}>
        <section className={styles.panel}><div className={styles.panelHead}><div><span className={styles.sectionKicker}>分类</span><h2>案例分类</h2></div>{accessStatus("索引", "ready")}</div><div className={styles.rankList}>{catalog.categories.map((item, index) => <div key={item.value}><b>{String(index + 1).padStart(2, "0")}</b><span>{item.label}</span><strong>{item.count}</strong></div>)}</div></section>
        <section className={styles.panel}><div className={styles.panelHead}><div><span className={styles.sectionKicker}>标签</span><h2>高频风格标签</h2></div>{accessStatus("索引", "ready")}</div><div className={styles.tagCloud}>{catalog.styles.slice(0, 32).map((item) => <span key={item.value}>{item.label}<b>{item.count}</b></span>)}</div><div className={styles.taxonomyNote}><FolderTree aria-hidden="true" /><p>当前标签来自案例索引中的 `styles` 字段。别名合并、停用词、层级关系和人工治理表尚未接通。</p></div></section>
        <section className={styles.panel}><div className={styles.panelHead}><div><span className={styles.sectionKicker}>场景</span><h2>高频应用场景</h2></div>{accessStatus("索引", "ready")}</div><div className={styles.rankList}>{catalog.scenes.slice(0, 15).map((item, index) => <div key={item.value}><b>{String(index + 1).padStart(2, "0")}</b><span>{item.label}</span><strong>{item.count}</strong></div>)}</div></section>
      </div>
    );
  }

  function renderMembers() {
    if (!overview || overviewStatus !== "ready") {
      return <EmptyContract title="用户与会员数据正在连接" body="后台只会通过受保护的管理员接口读取真实数据；读取失败时不会显示演示账号。" tables={["profiles", "entitlements"]} endpoint="GET /api/admin/image2/overview" />;
    }

    return (
      <div className={styles.memberGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div><span className={styles.sectionKicker}>用户档案</span><h2>真实账号列表</h2><p>{overview.users.message}</p></div>
            <span className={`${styles.resourceState} ${styles[overview.users.status]}`}>{resourceLabel(overview.users.status)}</span>
          </div>
          {overview.users.status === "ready" ? (
            <div className={styles.userTable}>
              <div className={styles.userTableHead}><span>账号</span><span>角色</span><span>注册时间</span><span>标识</span></div>
              {overview.users.recent.map((user) => (
                <article key={user.id}>
                  <div><strong>{user.displayName}</strong><small>{user.email || "未记录邮箱"}</small></div>
                  <span className={user.role === "admin" ? styles.adminRole : styles.userRole}>{user.role === "admin" ? "管理员" : "用户"}</span>
                  <time>{formatCompactDate(user.createdAt)}</time>
                  <code>{user.id.slice(0, 8)}…</code>
                </article>
              ))}
              {!overview.users.recent.length ? <div className={styles.inlineEmpty}>数据库已连接，当前没有用户档案。</div> : null}
            </div>
          ) : <div className={styles.resourceUnavailable}><ServerCrash aria-hidden="true" /><p>{overview.users.message}</p></div>}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div><span className={styles.sectionKicker}>会员权益</span><h2>方案与有效期</h2><p>{overview.memberships.message}</p></div>
            <span className={`${styles.resourceState} ${styles[overview.memberships.status]}`}>{resourceLabel(overview.memberships.status)}</span>
          </div>
          <div className={styles.membershipMetrics}>
            <div><span>权益记录</span><strong>{overview.memberships.status === "ready" ? overview.memberships.total : "—"}</strong></div>
            <div><span>当前有效</span><strong>{overview.memberships.status === "ready" ? overview.memberships.active : "—"}</strong></div>
            <div><span>已过期</span><strong>{overview.memberships.status === "ready" ? overview.memberships.expired : "—"}</strong></div>
          </div>
          {overview.memberships.status === "ready" ? <div className={styles.planList}>{overview.memberships.byPlan.map((item) => <div key={item.plan}><span>{item.plan}</span><strong>{item.count}</strong></div>)}</div> : <div className={styles.resourceUnavailable}><p>{overview.memberships.message}</p></div>}
        </section>
      </div>
    );
  }

  function renderWallet() {
    if (!overview || overviewStatus !== "ready") {
      return <EmptyContract title="兑换数据正在连接" body="只读取状态聚合，不读取卡密哈希、请求哈希、IP 哈希或明文。" tables={["license_codes", "license_redemptions"]} endpoint="GET /api/admin/image2/overview" />;
    }

    return (
      <div className={styles.walletGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}><div><span className={styles.sectionKicker}>卡密库存</span><h2>状态聚合</h2><p>{overview.licenses.message}</p></div><span className={`${styles.resourceState} ${styles[overview.licenses.status]}`}>{resourceLabel(overview.licenses.status)}</span></div>
          <div className={styles.walletMetrics}>
            <div><span>全部</span><strong>{overview.licenses.status === "ready" ? overview.licenses.total : "—"}</strong></div>
            <div><span>有效</span><strong>{overview.licenses.status === "ready" ? overview.licenses.active : "—"}</strong></div>
            <div><span>已使用</span><strong>{overview.licenses.status === "ready" ? overview.licenses.used : "—"}</strong></div>
            <div><span>已过期</span><strong>{overview.licenses.status === "ready" ? overview.licenses.expired : "—"}</strong></div>
            <div><span>已禁用</span><strong>{overview.licenses.status === "ready" ? overview.licenses.disabled : "—"}</strong></div>
          </div>
        </section>
        <section className={styles.panel}>
          <div className={styles.panelHead}><div><span className={styles.sectionKicker}>兑换审计</span><h2>结果聚合</h2><p>{overview.redemptions.message}</p></div><span className={`${styles.resourceState} ${styles[overview.redemptions.status]}`}>{resourceLabel(overview.redemptions.status)}</span></div>
          <div className={styles.membershipMetrics}>
            <div><span>尝试次数</span><strong>{overview.redemptions.status === "ready" ? overview.redemptions.total : "—"}</strong></div>
            <div><span>成功</span><strong>{overview.redemptions.status === "ready" ? overview.redemptions.succeeded : "—"}</strong></div>
            <div><span>未成功</span><strong>{overview.redemptions.status === "ready" ? overview.redemptions.failed : "—"}</strong></div>
          </div>
          <div className={styles.safetyNote}><ShieldCheck aria-hidden="true" /><p>此页面没有卡密生成、作废、余额调整或权益修改入口；本切片保持只读。</p></div>
        </section>
      </div>
    );
  }

  function renderReview() {
    return (
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div><span className={styles.sectionKicker}>内容审核</span><h2>索引完整度复核队列</h2><p>队列由真实静态字段生成：来源未映射、缺提示词摘要或价值评分低于 60。案例原始链接属于详情懒加载数据，不在本页误判为缺失。操作仅记在本页内存。</p></div>
          {accessStatus("本地审查", "dry")}
        </div>
        <div className={styles.reviewToolbar}>
          <div className={styles.segmented} role="tablist" aria-label="审核队列筛选">{(["queued", "reviewed", "all"] as ReviewState[]).map((state) => <button key={state} className={reviewState === state ? styles.active : ""} type="button" onClick={() => setReviewState(state)}>{state === "queued" ? "待复核" : state === "reviewed" ? "本地已登记" : "全部"}</button>)}</div>
          <span className={styles.resultCount}>{filteredReviewItems.length} 条</span>
        </div>
        <div className={styles.reviewList}>{filteredReviewItems.slice(0, 80).map((item) => <ReviewRow key={item.caseKey} item={item} reviewed={reviewedKeys.has(item.caseKey)} onReview={() => queueReview(item)} onInspect={() => setSelectedCase(item)} />)}</div>
      </section>
    );
  }

  function renderAudit() {
    return (
      <div className={styles.auditStack}>
        <section className={styles.panel}>
          <div className={styles.panelHead}><div><span className={styles.sectionKicker}>权限矩阵</span><h2>管理接口保护状态</h2><p>页面门禁只负责体验；以下每个接口仍在服务端独立校验管理员身份。</p></div>{accessStatus("服务端角色", "ready")}</div>
          <div className={styles.permissionTable}>
            <div><strong>GET</strong><code>/api/admin/image2/overview</code><span>管理员角色</span><small>只读聚合</small></div>
            <div><strong>GET</strong><code>/api/admin/users</code><span>管理员角色</span><small>只读用户</small></div>
            <div><strong>GET</strong><code>/api/admin/image2-cases/changes</code><span>管理员角色</span><small>只读日志</small></div>
            <div><strong>POST</strong><code>/api/admin/image2-cases/changes</code><span>管理员 + CSRF</span><small>撤销资产</small></div>
            <div><strong>POST</strong><code>/api/admin/jobs</code><span>管理员 + CSRF</span><small>任务变更</small></div>
            <div><strong>DELETE</strong><code>/api/admin/session</code><span>同源 CSRF</span><small>退出会话</small></div>
          </div>
        </section>
        <AdminImage2CaseChanges />
        <section className={styles.panel}><div className={styles.panelHead}><div><span className={styles.sectionKicker}>本地 session</span><h2>本次 dry-run 记录</h2></div>{accessStatus("浏览器内存", "dry")}</div>{localEvents.length ? <ol className={styles.localEventList}>{localEvents.map((event) => <li key={event}><Check aria-hidden="true" />{event}</li>)}</ol> : <div className={styles.emptyState}><FileClock aria-hidden="true" /><strong>还没有本地操作</strong><p>从案例检查器创建审查任务后，会在这里出现，并在刷新页面后消失。</p></div>}</section>
      </div>
    );
  }

  const viewContent: Record<AdminView, () => ReactElement> = {
    overview: renderOverview,
    catalog: renderCatalog,
    taxonomy: renderTaxonomy,
    members: renderMembers,
    wallet: renderWallet,
    review: renderReview,
    audit: renderAudit
  };
  const activeNavigation = navigation.find((item) => item.id === activeView) ?? navigation[0];

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <a className={styles.brand} href="/image2-cases"><span><Gauge aria-hidden="true" /></span><div><strong>Image2</strong><small>运营后台</small></div></a>
        <nav aria-label="后台导航">{navigation.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" className={activeView === item.id ? styles.navActive : ""} onClick={() => setActiveView(item.id)}><Icon aria-hidden="true" /><span><strong>{item.label}</strong><small>{item.note}</small></span></button>; })}</nav>
        <div className={styles.sidebarFoot}>{accessStatus("管理员会话", "ready")}<small>真实数据按资源状态读取</small></div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div><span className={styles.breadcrumb}>后台 / Image2 案例库 / {activeNavigation.label}</span><h1>{activeNavigation.label}</h1></div>
          <div className={styles.topbarActions}><span className={styles.importedAt}><Database aria-hidden="true" />索引导入 {formatDate(catalog.importedAt)}</span><a className={styles.publicLink} href="/image2-cases"><Eye aria-hidden="true" />公开案例库</a></div>
        </header>

        <div className={styles.notice} role="status"><ShieldCheck aria-hidden="true" /><span>{notice}</span></div>
        <div className={styles.content}>{viewContent[activeView]()}</div>
      </section>

      {selectedCase ? <CaseInspector item={selectedCase} onClose={() => setSelectedCase(null)} onQueue={() => queueReview(selectedCase)} /> : null}
    </main>
  );
}

function ReviewRow({ item, reviewed, onReview, onInspect }: { item: Image2AdminReviewItem; reviewed: boolean; onReview: () => void; onInspect: () => void }) {
  return (
    <article className={styles.reviewRow}>
      <div className={styles.reviewCase}><button type="button" onClick={onInspect}><CaseVisual item={item} className={visualStyles.review} /></button><div><strong>{item.title}</strong><small>{item.caseKey} · {item.sourceName}</small></div></div>
      <div className={styles.reviewReasons}>{item.reasons.map((reason) => <span key={reason}><AlertTriangle aria-hidden="true" />{reason}</span>)}</div>
      <div className={styles.reviewScore}><b>{item.valueScore}</b><small>{item.valueTier}</small></div>
      <button className={reviewed ? styles.reviewedButton : styles.reviewButton} type="button" onClick={onReview}>{reviewed ? <Check aria-hidden="true" /> : <ClipboardCheck aria-hidden="true" />}{reviewed ? "已登记" : "本地登记"}</button>
    </article>
  );
}

function CaseVisual({ item, className }: { item: Image2AdminCase; className: string }) {
  return (
    <span className={className} aria-hidden="true">
      <small>{item.caseKey}</small>
      <b>{item.valueScore}</b>
    </span>
  );
}
