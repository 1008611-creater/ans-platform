const app = document.querySelector("#app");
const dialog = document.querySelector("#overlay");
const toast = document.querySelector("#toast");

const seed = {
  ideas: [
    {
      id: "idea-voice",
      title: "让每个人都有一支 AI 纪录片小队",
      body: "把采访、分镜、剪辑和发布拆成可接力的公开协作。先从一个真实的人开始。",
      author: "Lin",
      color: "butter",
      contact: "hello@ans.network",
      openContact: true,
      date: "今天",
    },
    {
      id: "idea-map",
      title: "为城市留下一张 AI 能力地图",
      body: "标出愿意分享方法、工具和时间的人。不是通讯录，是正在发生的连接。",
      author: "Mina",
      color: "sky",
      contact: "微信：ans-mina",
      openContact: false,
      date: "昨天",
    },
    {
      id: "idea-archive",
      title: "把失败的提示词也整理出来",
      body: "失败案例常常比漂亮结果更有用。想做一个可检索的实验档案。",
      author: "Cody",
      color: "rose",
      contact: "archive@ans.network",
      openContact: true,
      date: "2 天前",
    },
  ],
  projects: [
    {
      id: "project-studio",
      title: "一人 AI 内容工作室",
      summary: "把选题、视觉草图、短片和分发串成一套可复用的个人生产线。",
      progress: "完成第一版内容生产看板，正在收集真实工作流。",
      status: "推进中",
      recruiting: true,
      offer: "开源一套项目看板和复盘模板",
      author: "North Studio",
      contact: "studio@ans.network",
      openContact: true,
    },
    {
      id: "project-access",
      title: "让工具说明真正能被新手用起来",
      summary: "把复杂的 AI 工具配置转换成一条条可以照着走的行动手册。",
      progress: "已完成首批三篇新手手册与可用性测试。",
      status: "推进中",
      recruiting: false,
      offer: "持续公开测试与改写过程",
      author: "Relay",
      contact: "relay@ans.network",
      openContact: true,
    },
    {
      id: "project-civic",
      title: "公共议题的 AI 资料协作",
      summary: "为小型公共议题建立可信、可查、可更新的资料协作空间。",
      progress: "正在验证一条从采访到资料卡的协作路径。",
      status: "刚开始",
      recruiting: true,
      offer: "一套可复制的资料卡规范",
      author: "Horizon",
      contact: "horizon@ans.network",
      openContact: false,
    },
  ],
  help: [
    {
      id: "help-corpus",
      title: "想找人一起测试中文提示词语料",
      need: "需要 3 到 5 位愿意用真实任务测试提示词的人。",
      give: "共同整理一份可公开复用的语料与对比记录。",
      author: "Ava",
      contact: "ava@ans.network",
      openContact: true,
      profile: true,
    },
    {
      id: "help-motion",
      title: "需要一位动效设计师给开源工具做 30 秒演示",
      need: "一个已完成的浏览器工具需要更清楚的上手演示。",
      give: "可以交换产品策略复盘，或按阶段付费。",
      author: "Kite",
      contact: "kite@ans.network",
      openContact: false,
      profile: true,
    },
  ],
  tutorials: [
    {
      id: "tutorial-start",
      title: "从一个真实问题开始搭建 AI 工作流",
      summary:
        "用问题、输入、验证和复盘四个步骤，把 AI 的一次性尝试沉淀为可复用流程。",
      author: "ANS 编辑部",
      dependencies: 3,
      tests: 4,
      content: [
        "先选一个会重复发生的问题",
        "列出输入、期望输出与不可接受的结果",
        "为每一次执行留下可比较的记录",
        "把有效部分整理成下一位可以接手的步骤",
      ],
    },
    {
      id: "tutorial-research",
      title: "把公开研究做成一张可更新的资料卡",
      summary: "从来源记录、观点标记到更新日志，建立一条别人能复查的研究路径。",
      author: "Yuki",
      dependencies: 4,
      tests: 3,
      content: [
        "先定义资料卡要回答的一个问题",
        "为每一个结论保留来源和日期",
        "区分事实、推测和待验证内容",
        "每次更新都留下变化原因",
      ],
    },
    {
      id: "tutorial-ship",
      title: "从草图到公开测试：小工具发布清单",
      summary: "用最小公开页、真实用户任务和反馈记录完成一次有边界的发布。",
      author: "North Studio",
      dependencies: 5,
      tests: 5,
      content: [
        "明确这次发布不解决什么",
        "准备一个可完成的真实任务",
        "邀请少量用户观察完成过程",
        "根据反馈写下下一版的唯一重点",
      ],
    },
  ],
  submissions: [],
  drafts: [
    {
      id: "draft-observe",
      title: "如何记录一次 AI 协作实验",
      summary: "一篇还在整理的实验记录。",
      steps: "写下问题\n记录输入和输出\n保留失败的地方\n复盘下一次修改",
      status: "草稿",
      updated: "刚刚",
    },
  ],
  key: "",
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
let store = clone(seed);
let session = null;
let setupRequired = false;
let authNotice = "";
let ui = {
  projectFilter: "全部",
  tutorialFilter: "公开",
  tutorialQuery: "",
  draftFilter: "全部",
  adminFilter: "全部",
};
async function api(pathname, options = {}) {
  const response = await fetch(pathname, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-ANS-Request": "browser",
      ...(options.headers || {}),
    },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "请求失败");
  return payload;
}
async function refreshData() {
  const payload = await api("/api/bootstrap");
  session = payload.user;
  setupRequired = payload.setupRequired;
  authNotice = payload.authNotice || "";
  store = {
    ...payload.data,
    capabilities: payload.capabilities || {},
    account: payload.me
      ? {
          email: payload.me.email,
          emailVerified: payload.me.emailVerified,
          profile: payload.me.profile || null,
        }
      : null,
    submissions: payload.me?.submissions || [],
    adminQueue: payload.admin?.submissions || [],
    adminTopicResponses: payload.admin?.topicResponses || [],
    adminCreatorStories: payload.admin?.creatorStories || [],
    adminPublishedCreatorStories: payload.admin?.publishedCreatorStories || [],
    adminHiddenCreatorStories: payload.admin?.hiddenCreatorStories || [],
    adminReports: payload.admin?.reports || [],
    adminAudit: payload.admin?.audit || [],
    adminAnalytics: payload.admin?.analytics || { days: 7, events: {} },
    drafts: payload.me?.drafts || [],
    apiKeys: payload.me?.apiKeys || [],
    codexfast: payload.codexfast || {
      enabled: true,
      invited: false,
      projects: [],
    },
    key: store.key || "",
  };
}
let lastTrackedRoute = "";
function trackAnalytics(event, campaign = "") {
  if (!store.capabilities?.analytics) return;
  fetch("/api/analytics/events", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-ANS-Request": "browser",
    },
    body: JSON.stringify({ event, ...(campaign ? { campaign } : {}) }),
    keepalive: true,
  }).catch(() => {});
}
const reportedClientErrors = new Set();
function reportClientError(type, error) {
  const message = String(error?.message || error || "Unknown browser error")
    .trim()
    .slice(0, 1000);
  if (!message) return;
  const fingerprint = `${type}:${message.slice(0, 300)}`;
  if (reportedClientErrors.has(fingerprint)) return;
  reportedClientErrors.add(fingerprint);
  if (reportedClientErrors.size > 100) reportedClientErrors.clear();
  fetch("/api/client-errors", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-ANS-Request": "browser",
    },
    body: JSON.stringify({
      type,
      message,
      stack: String(error?.stack || "").slice(0, 7000),
      pathname: location.pathname,
    }),
    keepalive: true,
  }).catch(() => {});
}
window.addEventListener("error", (event) => {
  if (event.target !== window) return;
  reportClientError("error", event.error || event.message);
});
window.addEventListener("unhandledrejection", (event) =>
  reportClientError("unhandledrejection", event.reason),
);
function esc(value = "") {
  return String(value).replace(
    /[&<>"]/g,
    (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m],
  );
}
function id(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
}
function shortDate() {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
  }).format(new Date());
}
function notify(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(notify.timer);
  notify.timer = window.setTimeout(
    () => toast.classList.remove("is-visible"),
    2400,
  );
}
function route(path) {
  history.pushState({}, "", path);
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
}
function path() {
  return location.pathname.replace(/\/+$/, "") || "/";
}
function countPending() {
  return store.submissions.filter((item) => item.status === "待审核").length;
}
function allMyItems() {
  return [...store.submissions].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}
function setMeta(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.setAttribute("content", value);
}
function pageMetadata(current, segments) {
  const defaultMetadata = {
    title: "ANS · AI Never Stop",
    description:
      "AI 不会停下，我们别走散。ANS 给被 AI 时代推着往前的人，一个找到同路人、交换真实经验、一起做点东西，也允许暂时喘口气的地方。",
    indexable: true,
    type: "website",
  };
  const pages = {
    "/wall": {
      title: "有人在这里",
      description:
        "看看同路人正在经历什么、试过什么，也许有人正走在和你一样的这段路上。",
    },
    "/projects": {
      title: "一起做点什么",
      description: "不必一个人把事情做完。看看这里还有哪些位置，和谁可以一起试一次。",
    },
    "/help": {
      title: "搭把手",
      description: "把眼下的具体卡点说出来，也写下你可以怎样回应另一位同路人。",
    },
    "/tutorials": {
      title: "走过的路",
      description: "不要求把所有工具都学会。看看别人走过这段时，留下了哪些方法和失败。",
    },
    "/about": {
      title: "关于 ANS",
      description:
        "AI 不会停下是现实，不是对人的命令。了解 ANS 为什么希望我们在变化中别走散。",
    },
    "/privacy": {
      title: "隐私说明",
      description:
        "了解 ANS 如何以最小化方式处理账号、公开内容与聚合访问统计。",
    },
    "/codexfast": {
      title: "ANS CodexFast",
      description:
        "从真实需求到可验证预览：规格、受控实现、测试与人工验收进入同一条项目交付链。",
    },
    "/codexfast/apply": {
      title: "申请 ANS CodexFast 内测",
      description: "提交一个真实的获客官网项目，获得有边界的项目诊断。",
    },
  };
  if (pages[current]) return { ...defaultMetadata, ...pages[current] };
  if (segments[0] === "ideas" && segments[1]) {
    const item = store.ideas.find((entry) => entry.id === segments[1]);
    return item
      ? {
          title: item.title,
          description: item.body,
          indexable: true,
          type: "article",
        }
      : { ...defaultMetadata, indexable: false };
  }
  if (segments[0] === "projects" && segments[1]) {
    const item = store.projects.find((entry) => entry.id === segments[1]);
    return item
      ? {
          title: item.title,
          description: item.summary,
          indexable: true,
          type: "article",
        }
      : { ...defaultMetadata, indexable: false };
  }
  if (segments[0] === "tutorials" && segments[1]) {
    const item = store.tutorials.find((entry) => entry.id === segments[1]);
    return item
      ? {
          title: item.title,
          description: item.summary,
          indexable: true,
          type: "article",
        }
      : { ...defaultMetadata, indexable: false };
  }
  if (segments[0] === "topics" && segments[1]) {
    const item = (store.topics || []).find(
      (entry) => entry.slug === segments[1],
    );
    return item
      ? {
          title: item.title,
          description: item.statement,
          indexable: true,
          type: "article",
        }
      : { ...defaultMetadata, indexable: false };
  }
  if (segments[0] === "stories" && segments[1]) {
    const item = storyById(segments[1]);
    return item
      ? {
          title: item.hook,
          description: item.problem,
          indexable: true,
          type: "article",
        }
      : { ...defaultMetadata, indexable: false };
  }
  if (segments[0] === "people" && segments[1]) {
    const item = profileBySlug(segments[1]);
    return item
      ? {
          title: item.displayName,
          description: item.bio || defaultMetadata.description,
          indexable: true,
          type: "profile",
        }
      : { ...defaultMetadata, indexable: false };
  }
  const privatePages = {
    "/auth": "登录或注册",
    "/me": "我的空间",
    "/admin": "审核台",
    "/skill-distribution": "工具连接协议",
    "/codexfast/studio": "CodexFast 工作台",
    "/codexfast/studio/new": "新建 CodexFast 项目",
    "/admin/codexfast": "CodexFast 控制台",
  };
  if (privatePages[current])
    return {
      title: privatePages[current],
      description: defaultMetadata.description,
      indexable: false,
      type: "website",
    };
  if (segments[0] === "submit")
    return {
      title: "说说最近的处境",
      description: defaultMetadata.description,
      indexable: false,
      type: "website",
    };
  if (segments[0] === "from")
    return {
      title: "AI 不会停下，我们别走散",
      description: defaultMetadata.description,
      indexable: false,
      type: "website",
    };
  if (segments[0] === "codexfast" && segments[1] === "studio")
    return {
      title: "CodexFast 项目工作台",
      description: defaultMetadata.description,
      indexable: false,
      type: "website",
    };
  return defaultMetadata;
}
function updateDocumentMetadata(current, segments) {
  const metadata = pageMetadata(current, segments);
  const title =
    metadata.title === "ANS · AI Never Stop"
      ? metadata.title
      : `${metadata.title} | ANS`;
  const canonical = `${location.origin}${current}`;
  document.title = title;
  setMeta('meta[name="description"]', metadata.description);
  setMeta(
    'meta[name="robots"]',
    metadata.indexable ? "index,follow" : "noindex,nofollow",
  );
  setMeta('meta[property="og:title"]', title);
  setMeta('meta[property="og:description"]', metadata.description);
  setMeta('meta[property="og:url"]', canonical);
  setMeta('meta[property="og:type"]', metadata.type);
  setMeta('meta[name="twitter:title"]', title);
  setMeta('meta[name="twitter:description"]', metadata.description);
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  if (canonicalLink) canonicalLink.setAttribute("href", canonical);
}

function header() {
  const current = path();
  const nav = [
    ["/wall", "有人在这里"],
    ["/projects", "一起做点什么"],
    ["/help", "搭把手"],
    ["/tutorials", "走过的路"],
    ["/codexfast", "CodexFast"],
  ];
  return `<header class="site-header warm-header"><a class="brand" href="/" data-route><img src="/ans-logo-light.svg" alt="ANS" class="brand-logo" /><span>ANS</span><small>AI NEVER STOP</small></a><nav class="desktop-nav" aria-label="主导航">${nav.map(([href, label]) => `<a href="${href}" data-route class="${current === href ? "active" : ""}">${label}</a>`).join("")}</nav><div class="header-actions"><a class="plain-action" href="/me" data-route>我的位置</a><a class="dark-action" href="/submit/idea" data-route>说说我最近的处境 <span aria-hidden="true">&rarr;</span></a><button class="menu-button" type="button" data-action="menu" aria-label="打开导航" aria-expanded="false"><i></i><i></i></button></div></header><nav class="mobile-nav" id="mobile-nav" hidden aria-label="移动导航"><a href="/wall" data-route>有人在这里</a><a href="/projects" data-route>一起做点什么</a><a href="/help" data-route>搭把手</a><a href="/tutorials" data-route>走过的路</a><a href="/codexfast" data-route>CodexFast 工作台</a><a href="/me" data-route>我的位置</a><a href="/admin" data-route>审核台${countPending() ? ` <b>${countPending()}</b>` : ""}</a></nav>`;
}
function footer() {
  return `<footer class="section-frame site-footer warm-footer"><a class="brand" href="/" data-route><img src="/ans-logo-light.svg" alt="ANS" class="brand-logo" /><span>ANS</span></a><p>AI 不会停下。我们别走散。</p><a class="plain-action" href="/about" data-route>为什么有 ANS</a><a class="plain-action" href="/privacy" data-route>隐私说明</a></footer>`;
}
function shell(content) {
  const safeContent = String(content).replace(/\uFFFD+/g, "灯");
  return `<div class="page-noise"></div>${header()}<main>${safeContent}</main>${footer()}`;
}
function pageIntro(kicker, title, copy, action = "") {
  return `<section class="section-frame page-intro"><p class="eyebrow">${esc(kicker)}</p><h1>${esc(title)}</h1><p>${esc(copy)}</p>${action}</section>`;
}
function empty(title, copy, action) {
  return `<section class="empty-state"><span class="tiny-rule"></span><strong>${esc(title)}</strong><p>${esc(copy)}</p>${action || ""}</section>`;
}
function actionLink(label, href, style = "dark-action") {
  return `<a class="${style}" href="${href}" data-route>${label} <span aria-hidden="true">&rarr;</span></a>`;
}
function attachmentLinks(item) {
  const attachments = item.attachments || [];
  if (!attachments.length) return "";
  return `<div class="attachment-links">${attachments.map((attachment) => `<a href="${esc(attachment.url)}" target="_blank" rel="noopener">附件：${esc(attachment.name)}</a>`).join("")}</div>`;
}
function reportButton(type, targetId) {
  return session
    ? `<button class="plain-action report-action" data-action="report" data-type="${esc(type)}" data-id="${esc(targetId)}">举报内容</button>`
    : "";
}

function home() {
  const ideas = store.ideas.slice(0, 3);
  return shell(
    `<section class="section-frame hero"><div><p class="eyebrow">AI NEVER STOP / OPEN NETWORK</p><h1>让想法不止于<br />一次发亮。</h1><p class="hero-intro">ANS 是一个面向公域的 AI 共创网络。把还没成形的信号、正在推进的项目、需要的帮助和验证过的方法，留在一个可以被继续使用的地方。</p><div class="hero-actions">${actionLink("加入公开网络", "/submit/idea")}${actionLink("先看行动手册", "/tutorials", "plain-action")}</div></div><div class="hero-object" aria-label="ANS 信号纸条"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="paper-shadow"></div><article class="paper-note"><span class="paper-tape"></span><a class="paper-link" href="/wall" data-route>open signal</a><span class="paper-label">IDEA / 001</span><p>一个想法在被完成前，也值得先被看见。</p><span class="paper-rule"></span><small>ANS public network</small></article></div></section><section class="section-frame starter-strip"><div><p class="accent-label">START HERE</p><h2>从一个真实问题开始。</h2><p>不需要完整项目。写下你正在琢磨什么，或者先沿着别人的方法走一遍。</p></div><div class="starter-actions">${actionLink("发布一个信号", "/submit/idea", "outline-action")}${actionLink("阅读入门手册", "/tutorials/tutorial-start", "plain-action")}</div></section><section class="section-frame entry-section"><div class="section-heading"><h2>四个入口</h2><p>在需要的时候，找到下一步。</p></div><div class="entry-grid"><a class="entry-card card-peach" href="/wall" data-route><span class="card-icon">01 / SIGNAL</span><strong>想象力墙</strong><span>把一个还没成形的念头先放出来，等下一位愿意回应的人。</span><em>进入 &rarr;</em></a><a class="entry-card card-mint" href="/projects" data-route><span class="card-icon">02 / PROJECT</span><strong>共创项目</strong><span>记录正在推进的东西。进展、卡点和招募都可以被接住。</span><em>进入 &rarr;</em></a><a class="entry-card card-blue" href="/help" data-route><span class="card-icon">03 / EXCHANGE</span><strong>能力交换</strong><span>讲清楚需要什么、能提供什么，让合作从边界清楚开始。</span><em>进入 &rarr;</em></a><a class="entry-card card-yellow" href="/tutorials" data-route><span class="card-icon">04 / PLAYBOOK</span><strong>行动手册</strong><span>把走通的方法、验证和失败一起留给下一个人。</span><em>进入 &rarr;</em></a></div></section><section class="section-frame signal-section"><div class="section-heading split-heading"><div><p class="eyebrow">OPEN SIGNALS</p><h2>正在发生</h2></div><p>不完整的想法也可以公开出现。它们会成为下一次连接的起点。</p></div><div class="signal-list">${ideas.map((idea, index) => `<article><span class="signal-index">0${index + 1}</span><div><p class="signal-meta">${esc(idea.author)} / ${esc(idea.date)}</p><h3>${esc(idea.title)}</h3><p>${esc(idea.body)}</p></div><a class="signal-link" href="/ideas/${idea.id}" data-route>打开 &rarr;</a></article>`).join("")}</div><div class="section-bottom">${actionLink("查看全部信号", "/wall", "plain-action")}</div></section><section class="section-frame project-section"><div class="project-copy"><p class="eyebrow">PUBLIC PROJECTS</p><h2>把项目留在路上。</h2><p>不是只有完成的项目才有价值。版本、卡点、协作邀请和小小的推进，都可以变成可继续的公开记录。</p>${actionLink("查看共创项目", "/projects", "outline-action")}</div><article class="project-ledger"><div class="ledger-heading"><span>ANS / PUBLIC LEDGER</span><span>ACTIVE</span></div><div class="ledger-title"><p>正在推进</p><h3>${esc(store.projects[0].title)}</h3></div><div class="ledger-progress"><span class="progress-68"></span></div><div class="ledger-footer"><span>阶段 02 / 测试与协作</span><a href="/projects/${store.projects[0].id}" data-route>打开记录 &rarr;</a></div></article></section><section class="section-frame exchange-section"><div class="section-heading"><p class="eyebrow">SKILL EXCHANGE</p><h2>把连接变得具体。</h2></div><div class="exchange-grid"><article><span>NEED</span><strong>我正在找什么</strong><p>把问题和期望的协作方式写清楚。</p></article><article><span>OFFER</span><strong>我能提供什么</strong><p>时间、能力、工具、报酬或一个明确的回报。</p></article><article><span>OUTCOME</span><strong>我们想抵达哪里</strong><p>留下一次连接的边界和下一步。</p></article></div>${actionLink("进入能力交换", "/help", "outline-action")}</section><section class="section-frame playbook-section"><div class="section-heading"><div><p class="eyebrow">PLAYBOOKS</p><h2>可以复用的行动。</h2></div><p>不只展示结果，也留下过程。</p></div><div class="playbook-list">${store.tutorials
      .slice(0, 3)
      .map(
        (item, index) =>
          `<a href="/tutorials/${item.id}" data-route><span>0${index + 1}</span><strong>${esc(item.title)}</strong><em>打开手册 &rarr;</em></a>`,
      )
      .join("")}</div></section>`,
  );
}

function currentTopic() {
  return (
    (store.topics || []).find((item) => item.status === "公开") ||
    (store.topics || [])[0] ||
    null
  );
}
function storyById(id) {
  return (store.creatorStories || []).find((item) => item.id === id);
}
function profileBySlug(slug) {
  return (store.publicProfiles || []).find((item) => item.slug === slug);
}
function responseCount(topic) {
  return (store.topicResponses || []).filter(
    (item) => item.topicSlug === topic?.slug,
  ).length;
}
function attachmentVisual(item) {
  const attachment = (item?.attachments || []).find((file) =>
    String(file.contentType || "").startsWith("image/"),
  );
  return attachment
    ? `<figure class="record-visual"><img src="${esc(attachment.url)}" alt="${esc(item.hook || item.title || "公开记录")}的过程附件" loading="lazy" /></figure>`
    : "";
}
function storyPreview(story) {
  if (!story)
    return `<article class="story-empty"><span>首批创作者实录 / 招募中</span><h3>不要求你成功，只要求过程是真的。</h3><p>ANS 正在寻找第一批 8 位 AI 创作者。带上正在做的东西、一次失败或一个还没解决的卡点。</p><a class="outline-action" href="/submit/project" data-route>申请成为首批实录 <span aria-hidden="true">&rarr;</span></a></article>`;
  return `<a class="story-preview ${attachmentVisual(story) ? "has-visual" : ""}" href="/stories/${esc(story.id)}" data-route>${attachmentVisual(story)}<div class="story-preview-copy"><span>${esc(story.authorName)} / ${esc(story.role)}</span><h3>${esc(story.hook)}</h3><p>${esc(story.problem)}</p><footer><span>已授权公开</span><strong>看完整过程 &rarr;</strong></footer></div></a>`;
}
function redesignedHome() {
  const topic = currentTopic();
  const featuredStory = (store.creatorStories || [])[0];
  const projects = store.projects.filter((item) => item.recruiting).slice(0, 2);
  return shell(
    `<section class="section-frame creator-hero"><div><p class="signal-kicker">ANS / AI CREATOR NETWORK</p><h1>AI 不缺教程。<br />缺的是你真正做出来的东西。</h1><p>ANS 记录 AI 创作者正在做什么、卡在哪里、下一步需要谁。看真实过程，也把你的进展放进来。</p><div class="hero-actions">${actionLink("看今天做出了什么", "/wall")}${actionLink("公开我的进展", "/submit/idea", "plain-action")}</div></div><aside class="hero-proof"><span>THIS WEEK / 本周现场</span><strong>${featuredStory ? "一位创作者的真实过程" : "寻找第一批 8 位创作者"}</strong><p>${featuredStory ? esc(featuredStory.hook) : "不要求你成功，只要求你带来正在做的东西。"}</p><div><i>01</i><span>${featuredStory ? "已取得公开授权" : "作品、失败和卡点都可以"}</span></div><a href="${featuredStory ? `/stories/${esc(featuredStory.id)}` : "/submit/project"}" data-route>${featuredStory ? "看完整过程" : "申请成为首批实录"} &rarr;</a></aside></section>${topic ? `<section class="section-frame weekly-topic"><div><span>本周问题</span><h2>${esc(topic.title)}</h2><p>${esc(topic.statement)}</p></div><div class="weekly-topic-actions"><strong>${responseCount(topic) ? `${responseCount(topic)} 条公开回应` : "等你留下第一种答案"}</strong>${actionLink("说说我的答案", `/topics/${topic.slug}`, "outline-action")}</div></section>` : ""}<section class="section-frame record-section"><header><div><span>CREATOR RECORDS</span><h2>结果很耀眼。<br />但判断更值得留下。</h2></div><a class="plain-action" href="/wall" data-route>看全部记录 &rarr;</a></header><div class="record-grid">${storyPreview(featuredStory)}<article class="record-manifesto"><span>ANS 只收这些</span><p>一件在做的东西。一个真实卡点。一次自己的选择。</p><a href="/about" data-route>看看公开标准 &rarr;</a></article></div></section><section class="section-frame active-projects"><header><div><span>MAKE IT TOGETHER</span><h2>还没做完，<br />正好可以找人一起。</h2></div>${actionLink("查看全部项目", "/projects", "outline-action")}</header><div>${projects.length ? projects.map((project) => `<a href="/projects/${esc(project.id)}" data-route><span>${esc(project.status)} / ${project.recruiting ? "正在找人" : "持续更新"}</span><h3>${esc(project.title)}</h3><p>${esc(project.progress)}</p><strong>看看我能做什么 &rarr;</strong></a>`).join("") : `<p class="quiet-copy">还没有公开招募。先把一条具体需要写出来。</p>`}</div></section><section class="section-frame method-strip"><div><span>METHODS THAT SURVIVE</span><h2>不晒工具组合。<br />只留下走通过的路径。</h2><p>每份方法都写清输入、判断和验证，让下一位创作者能直接开始。</p></div>${actionLink("去方法库找一条路", "/tutorials", "outline-action")}</section><section class="section-frame public-entry"><span>START BEFORE IT IS PERFECT</span><h2>还没做完，也值得先被看见。</h2><p>写下你做到了哪一步、卡在哪里、正在找谁。</p>${actionLink("发布我的进展", "/submit/idea")}</section>`,
  );
}
function redesignedWall() {
  const topic = currentTopic();
  const stories = store.creatorStories || [];
  const ideas = store.ideas || [];
  const storyArea = stories.length
    ? `<section class="story-stream"><header><span>创作者实录</span><strong>${stories.length} 篇</strong></header>${stories.map((story) => storyPreview(story)).join("")}</section>`
    : `<section class="first-record-invite"><div><span>首批创作者实录</span><h2>寻找第一批 8 位 AI 创作者。</h2><p>不要求你成功。带上正在做的东西、一次失败或一个还没解决的卡点。</p></div>${actionLink("申请成为首批实录", "/submit/project", "outline-action")}</section>`;
  return shell(
    `<section class="section-frame wall-hero"><span>ANS / LIVE CREATOR LOG</span><h1>今天，有人在用 AI 做什么？</h1><p>从刚完成的作品，到还没解决的卡点。不刷工具新闻，只看创作者的真实进展。</p>${actionLink("公开我的进展", "/submit/idea")}</section>${topic ? `<section class="section-frame wall-topic"><span>本周问题</span><h2>${esc(topic.title)}</h2><p>${esc(topic.statement)}</p><a href="/topics/${esc(topic.slug)}" data-route>留下我的答案 &rarr;</a></section>` : ""}<section class="section-frame happening-grid ${stories.length ? "has-stories" : "no-stories"}">${storyArea}<section class="progress-stream"><header><span>公开想法与进展</span><strong>${ideas.length} 条</strong></header><div class="progress-grid">${ideas.map((idea) => `<a class="progress-note ${esc(idea.color)} ${attachmentVisual(idea) ? "has-visual" : ""}" href="/ideas/${esc(idea.id)}" data-route>${attachmentVisual(idea)}<div class="progress-note-copy"><small><span>${esc(idea.author)}</span><b>${esc(idea.date)}</b></small><h2>${esc(idea.title)}</h2><p>${esc(idea.body)}</p><footer><span>公开想法 / 等待回应</span><strong>打开并回应 &rarr;</strong></footer></div></a>`).join("")}</div></section></section><section class="section-frame wall-collab"><span>NEED SOMEONE?</span><h2>一个人卡住的地方，<br />可能正好是另一个人的能力。</h2><p>把需要什么、能提供什么写清楚，合作才有机会真正开始。</p>${actionLink("看看谁正在找人", "/help", "outline-action")}</section>`,
  );
}

function socialTopicCard(topic, index, featured = false) {
  if (!topic) return "";
  const labels = ["作品焦虑", "审美判断", "公开未完成", "工作流起点"];
  const isOpen = topic.status === "公开";
  const href = isOpen ? `/topics/${esc(topic.slug)}` : "/wall#weekly-topic";
  return `<a class="social-topic-card topic-tone-${index + 1} ${featured ? "is-featured" : ""}" href="${href}" data-route><span><b>${isOpen ? "本周开放站队" : `0${index + 1}`}</b><em>#${labels[index] || "AI创作"}</em></span><h2>${esc(topic.title)}</h2><p>${esc(topic.statement)}</p><footer><strong>${isOpen ? "三种回答，没有标准答案" : "下一期开放"}</strong><i aria-hidden="true">↗</i></footer></a>`;
}

function socialHome() {
  const topics = (store.topics || []).slice(0, 3);
  const featuredStory = (store.creatorStories || [])[0];
  const projects = store.projects.filter((item) => item.recruiting).slice(0, 2);
  return shell(
    `<section class="section-frame ans-ip-hero"><div class="ans-hero-copy"><p class="ans-live-label"><i></i> 不熄���的公开创作现场</p><h1>AI 每天都在更新。<br /><mark>你的作品，别停在收藏夹里。</mark></h1><p class="ans-hero-lead">ANS 不是另一个 AI 工具站。这里公开半成品、翻车、卡点和下一步——让一件值得做的东西，继续发生。</p><div class="hero-actions">${actionLink("进入今天的现场", "/wall")}${actionLink("把作品往前推一步", "/submit/idea", "plain-action")}</div><div class="ans-hero-foot"><span>AI NEVER STOP</span><p><strong>不是催你一直卷。</strong>是让每个未完成，都有下一步。</p></div></div><div class="topic-stack" aria-label="今天值得讨论的三个问题">${topics.map((topic, index) => socialTopicCard(topic, index, index === 0)).join("")}</div></section><div class="social-marquee" aria-label="ANS 热议标签"><div><span>#别把收藏夹当作品集</span><span>#未完成也能发</span><span>#AI作品焦虑</span><span>#找AI搭子</span><span>#AI翻车现场</span><span aria-hidden="true">#别把收藏夹当作品集</span><span aria-hidden="true">#未完成也能发</span><span aria-hidden="true">#AI作品焦虑</span></div></div><section class="section-frame never-stop-story"><div class="story-number">01</div><div><p class="section-punch">WHY ANS</p><h2><span>灵感会停。</span><span>工具会过期。</span><strong>但作品可以被另一个人接着推。</strong></h2></div><div class="story-explainer"><p>我们相信，创作最可惜的不是失败，而是停在“等准备好”。所以 ANS 把创作拆成三个可以继续的动作：</p><ol><li><b>发出信号</b><span>把正在做的东西放出来</span></li><li><b>留下判断</b><span>说清你为什么这样做</span></li><li><b>连接下一棒</b><span>找到能把它继续推的人</span></li></ol></div></section><section class="section-frame social-topic-stage"><header><p><span>02</span> 今天先聊这个</p><h2>不刷工具新闻。<br />先回答一个真问题。</h2></header><div class="topic-stage-grid">${topics.map((topic, index) => socialTopicCard(topic, index, index === 0)).join("")}</div><a class="stage-more" href="/wall" data-route>去「今天热议」看所有现场 <span aria-hidden="true">→</span></a></section><section class="section-frame creator-open-call"><div class="open-call-stamp"><span>OPEN CALL</span><strong>8</strong><small>位首发创作者</small></div><div><p>03 / 别等成功再发</p><h2>${featuredStory ? esc(featuredStory.hook) : "我们不找大神。我们找愿意公开过程的人。"}</h2><p>${featuredStory ? esc(featuredStory.problem) : "带上一件正在做的东西、一次真实翻车，或一个还没想通的判断。ANS 帮你把过程变成一篇有人愿意读、也有人能接住的创作者实录。"}</p></div><a class="open-call-action" href="${featuredStory ? `/stories/${esc(featuredStory.id)}` : "/submit/project"}" data-route>${featuredStory ? "看这篇真实过程" : "成为首批实录"}<span aria-hidden="true">↗</span></a></section><section class="section-frame social-projects"><header><p><span>04</span> 今天谁在找搭子</p><h2>一个人做不完，<br />不是停下来的理由。</h2></header><div>${projects.length ? projects.map((project, index) => `<a class="social-project project-${index + 1}" href="/projects/${esc(project.id)}" data-route><span>${esc(project.status)} · 正在找人</span><h3>${esc(project.title)}</h3><p>${esc(project.progress)}</p><footer><b>我能从哪一步加入？</b><i aria-hidden="true">→</i></footer></a>`).join("") : `<p class="quiet-copy">今天还没有公开招募。先发出第一个具体需要。</p>`}</div></section><section class="section-frame ans-final-call"><p>ANS / AI NEVER STOP</p><h2>你现在卡在哪一步？</h2><h3>发出来。看看谁能接住。</h3>${actionLink("发一条，不等准备好", "/submit/idea")}</section>`,
  );
}

function socialWall() {
  const topics = (store.topics || []).slice(0, 4);
  const ideas = store.ideas || [];
  const stories = store.creatorStories || [];
  return shell(
    `<section class="section-frame social-wall-head"><p><i></i> ANS 创作现场 / 实时开放</p><div><h1>今天，<br /><mark>别只围观。</mark></h1><aside><strong>作品、翻车、卡点、找搭子。</strong><span>没做完也能发。说具体一点，就可能有人接住。</span>${actionLink("发一条进展", "/submit/idea")}</aside></div></section><nav class="section-frame wall-jump" aria-label="页面内容入口"><a href="#weekly-topic">本周站队</a><a href="#creator-progress">真实进展</a><a href="/help" data-route>找搭子</a></nav><section class="section-frame wall-topic-board" id="weekly-topic"><header><p>本周站队题</p><span>有立场，但不吵架</span></header><div>${topics.map((topic, index) => socialTopicCard(topic, index, index === 0)).join("")}</div></section><section class="section-frame wall-progress-board" id="creator-progress"><header><div><p>真实进展</p><h2>别只晒结果。<br />把中间那段也留下。</h2></div><span>${ideas.length ? `${ideas.length} 条公开记录` : "等待第一条真实记录"}</span></header><div class="wall-progress-grid">${ideas.map((idea, index) => `<a class="social-progress-note note-${(index % 3) + 1} ${attachmentVisual(idea) ? "has-visual" : ""}" href="/ideas/${esc(idea.id)}" data-route>${attachmentVisual(idea)}<div><small><b>${esc(idea.author)}</b><span>${esc(idea.date)}</span></small><em>#${index === 0 ? "正在做" : index === 1 ? "找搭子" : "真实翻车"}</em><h3>${esc(idea.title)}</h3><p>${esc(idea.body)}</p><footer>打开这条进展 <i aria-hidden="true">↗</i></footer></div></a>`).join("")}</div></section>${stories.length ? `<section class="section-frame social-story-list"><header><p>创作者实录</p><h2>把人类判断留在作品里。</h2></header>${stories.map((story) => storyPreview(story)).join("")}</section>` : `<section class="section-frame wall-open-call"><span>CREATOR LOG / 001</span><h2>第一批 8 位创作者，<br />可能就从一件半成品开始。</h2><p>不要求成功。只要求过程是真的。</p>${actionLink("带着半成品来", "/submit/project", "outline-action")}</section>`}<section class="section-frame ans-final-call wall-final"><p>NEVER STOP ≠ 一直加速</p><h2>停下收藏。开始发生。</h2>${actionLink("发出我的下一步", "/submit/idea")}</section>`,
  );
}

function upcomingTopicRows(topics) {
  if (!topics.length) return "";
  return `<div class="ans2-next-topics">${topics
    .map(
      (topic, index) =>
        `<div><span>下期 0${index + 1}</span><strong>${esc(topic.title)}</strong><em>${index === 0 ? "审美判断" : index === 1 ? "公开未完成" : "工作流起点"}</em></div>`,
    )
    .join("")}</div>`;
}

function liveDebate(topic, nextTopics = []) {
  if (!topic) return "";
  return `<section class="section-frame ans2-debate"><header><span>现在先回答这一题</span><p>不聊工具排行，只说你正在做的那件东西。</p></header><div class="ans2-debate-main"><div><small>#作品焦虑 / 本周开放</small><h2>${esc(topic.title)}</h2><p>${esc(topic.statement)}</p></div><nav aria-label="回应这个话题"><a href="/topics/${esc(topic.slug)}" data-route><b>01</b><span>我也卡在这里</span><i>说出具体卡点</i></a><a href="/topics/${esc(topic.slug)}" data-route><b>02</b><span>我已经开始做了</span><i>留下真实进展</i></a><a href="/topics/${esc(topic.slug)}" data-route><b>03</b><span>我有不同答案</span><i>讲讲你的做法</i></a></nav></div>${upcomingTopicRows(nextTopics)}</section>`;
}

function creatorCallout(story) {
  if (story)
    return `<section class="section-frame ans2-creator-call"><div class="ans2-call-word">真的</div><div><span>一篇已授权的创作者实录</span><h2>${esc(story.hook)}</h2><p>${esc(story.problem)}</p></div><a href="/stories/${esc(story.id)}" data-route>看他怎么卡住，又怎么继续 <i>↗</i></a></section>`;
  return `<section class="section-frame ans2-creator-call"><div class="ans2-call-word">未完</div><div><span>首批创作者实录正在征集</span><h2>别把成功包装给我们。<br />把那次没做成的带来。</h2><ul><li>一件正在做的东西</li><li>一个反复出现的卡点</li><li>一次你没有听 AI 的决定</li></ul></div><a href="/submit/project" data-route>带着半成品来 <i>↗</i></a></section>`;
}

function projectWorkshop(projects) {
  return `<section class="ans2-workshop"><div class="section-frame"><header><span>今天的开工单</span><h2>有人缺的那一块，<br />也许刚好是你。</h2></header><div class="ans2-project-rows">${projects.length ? projects.map((project, index) => `<a href="/projects/${esc(project.id)}" data-route><b>0${index + 1}</b><div><span>${esc(project.status)} / 正在找人</span><h3>${esc(project.title)}</h3></div><p>${esc(project.progress)}</p><strong>我从哪一步加入？ <i>↗</i></strong></a>`).join("") : `<p class="quiet-copy">今天还没有人贴出开工单。你可以先写下一个具体需要。</p>`}</div><a class="ans2-workshop-more" href="/projects" data-route>翻完所有开工单 <span>→</span></a></div></section>`;
}

function unfinishedComposer() {
  return `<section class="section-frame ans2-composer"><p>别写个人简介。先写这一句。</p><div><span>我正在做</span><strong>一件还没做完的东西</strong><span>现在卡在</span><strong>一个说不清的问题</strong></div><a href="/submit/idea" data-route>把这句话发出去 <i>→</i></a><small>没做完也能发。公开前会先经过审核。</small></section>`;
}

function socialHomeV2() {
  const topic = currentTopic();
  const topics = (store.topics || []).slice(0, 3);
  const nextTopics = (store.topics || [])
    .filter((item) => item.slug !== topic?.slug)
    .slice(0, 3);
  const featuredStory = (store.creatorStories || [])[0];
  const projects = store.projects.filter((item) => item.recruiting).slice(0, 3);
  return shell(
    `<section class="section-frame ans-ip-hero ans2-hero"><div class="ans-hero-copy"><p class="ans-live-label"><i></i> ANS 正在营业 / 创作不打烊</p><h1>AI 每天都在更新。<br /><mark>你的作品，别停在收藏夹里。</mark></h1><p class="ans-hero-lead">这里不搬运工具，也不等成功案例。把真正做的、做砸的、做不下去的发出来，让下一步找到你。</p><div class="hero-actions">${actionLink("看看今天卡住了谁", "/wall")}${actionLink("发出我的下一步", "/submit/idea", "plain-action")}</div><div class="ans-hero-foot"><span>AI NEVER STOP</span><p><strong>不是一直工作。</strong>是不让值得做的东西，无声停下。</p></div></div><div class="topic-stack" aria-label="今天值得讨论的三个问题">${topics.map((item, index) => socialTopicCard(item, index, index === 0)).join("")}</div></section><div class="social-marquee" aria-label="ANS 热议标签"><div><span>#教程收藏家停止营业</span><span>#半成品请上桌</span><span>#AI替不了你的判断</span><span>#今天找个搭子</span><span>#这次真的做出来</span><span aria-hidden="true">#教程收藏家停止营业</span><span aria-hidden="true">#半成品请上桌</span></div></div><section class="ans2-manifesto"><div class="section-frame"><div class="ans2-never">NEVER</div><div class="ans2-stop">STOP</div><p><b>不是把人变成永动机。</b><span>是让一个好问题、一件半成品、一次不甘心，继续找到下一步。</span></p></div></section>${liveDebate(topic, nextTopics)}${creatorCallout(featuredStory)}${projectWorkshop(projects)}${unfinishedComposer()}`,
  );
}

function socialWallV2() {
  const topic = currentTopic();
  const nextTopics = (store.topics || [])
    .filter((item) => item.slug !== topic?.slug)
    .slice(0, 3);
  const ideas = store.ideas || [];
  const stories = store.creatorStories || [];
  const firstIdea = ideas[0];
  const laterIdeas = ideas.slice(1);
  return shell(
    `<section class="section-frame social-wall-head ans2-wall-head"><p><i></i> 今天的 ANS 没有旁观席</p><div><h1>看见卡点。<br /><mark>接住下一步。</mark></h1><aside><strong>作品、翻车、判断、找搭子。</strong><span>这里没有“等我准备好”。只有“我先发出来”。</span>${actionLink("发出我的现场", "/submit/idea")}</aside></div></section><nav class="section-frame wall-jump" aria-label="页面内容入口"><a href="#weekly-topic">现在站队</a><a href="#creator-progress">今天的进展</a><a href="/help" data-route>谁在找人</a></nav><div id="weekly-topic">${liveDebate(topic, nextTopics)}</div><section class="section-frame ans2-dispatch" id="creator-progress"><header><span>今天的进展，不按完成度排序</span><h2>先看见它，<br />再判断能不能接。</h2></header>${firstIdea ? `<a class="ans2-lead-dispatch" href="/ideas/${esc(firstIdea.id)}" data-route><div><small>${esc(firstIdea.author)} / ${esc(firstIdea.date)}</small><em>#正在做</em><h3>${esc(firstIdea.title)}</h3><p>${esc(firstIdea.body)}</p></div><strong>打开这条进展 <i>↗</i></strong></a>` : empty("今天还没人先发", "不需要完整项目。写清你做到哪一步、卡在哪里。", actionLink("发第一条", "/submit/idea"))}<div class="ans2-dispatch-list">${laterIdeas.map((idea, index) => `<a href="/ideas/${esc(idea.id)}" data-route><b>0${index + 2}</b><div><span>${esc(idea.author)} / ${esc(idea.date)}</span><h3>${esc(idea.title)}</h3></div><p>${esc(idea.body)}</p><i>↗</i></a>`).join("")}</div></section>${stories.length ? `<section class="section-frame social-story-list"><header><p>有授权的真实过程</p><h2>AI 做了什么，人留下了什么。</h2></header>${stories.map((story) => storyPreview(story)).join("")}</section>` : creatorCallout(null)}${unfinishedComposer()}`,
  );
}
function topicDetail(topic) {
  if (!topic) return notFound();
  const responses = (store.topicResponses || []).filter(
    (item) => item.topicSlug === topic.slug,
  );
  const relatedProjects = store.projects
    .filter((item) => item.recruiting)
    .slice(0, 2);
  return shell(
    `<section class="section-frame detail-back"><a href="/wall" data-route>&larr; 返回正在发生</a></section><article class="section-frame topic-detail"><span>本周问题 / ANS</span><h1>${esc(topic.title)}</h1><p class="topic-statement">${esc(topic.statement)}</p><div class="topic-challenge"><strong>先别列工具</strong><p>${esc(topic.challenge)}</p></div><section class="topic-response-form"><h2>你的答案是什么？</h2><p>从正在做的一件东西说起，不超过 280 字。公开前会先经过审核。</p>${session ? `<form data-form="topic-response" data-topic="${esc(topic.slug)}"><fieldset><legend>选一个最接近你的状态</legend>${["我也卡在这里", "我已经开始做了", "我有不同答案"].map((stance, index) => `<label class="stance-option"><input type="radio" name="stance" value="${stance}" ${index === 0 ? "checked" : ""}/><span>${stance}</span></label>`).join("")}</fieldset>${formField("具体说说", "body", { type: "textarea", required: true, placeholder: "我正在做……现在卡在……下一步准备……" })}${attachmentField()}<button class="dark-action" type="submit">提交我的答案 <span aria-hidden="true">&rarr;</span></button></form>` : `<a class="dark-action" href="/auth" data-route>登录后留下答案 <span aria-hidden="true">&rarr;</span></a>`}</section></article><section class="section-frame response-list"><header><span>已经有人这样回答</span><strong>${responses.length ? `${responses.length} 条` : "等待第一条"}</strong></header>${responses.length ? responses.map((response) => `<article><span>${esc(response.stance)}</span><h2>${esc(response.author)}</h2><p>${esc(response.body)}</p>${attachmentLinks(response)}</article>`).join("") : empty("还没有人先说", "你不需要给出标准答案，只需要说清自己正在做什么。")}</section><section class="section-frame related-projects"><span>把讨论变成一起做</span>${relatedProjects.map((project) => `<a href="/projects/${esc(project.id)}" data-route>${esc(project.title)} <strong>&rarr;</strong></a>`).join("")}</section>`,
  );
}
function storyDetail(story) {
  if (!story) return notFound();
  const section = (title, value) =>
    `<section><span>${title}</span><p>${esc(value)}</p></section>`;
  return shell(
    `<section class="section-frame detail-back"><a href="/wall" data-route>&larr; 返回正在发生</a></section><article class="section-frame creator-story-detail"><header><span>REAL CREATOR RECORD</span><h1>${esc(story.hook)}</h1><p>${esc(story.authorName)} / ${esc(story.role)}</p>${story.profileSlug ? `<a href="/people/${esc(story.profileSlug)}" data-route>查看公开主页 &rarr;</a>` : ""}</header><div class="story-body">${section("真实卡点", story.problem)}${section("AI 参与的步骤", story.aiSteps)}${section("人类判断留下在哪里", story.humanJudgement)}${section("可验证结果", story.outcome)}${section("此刻需要什么", story.nextStep)}</div>${attachmentLinks(story)}<footer><a class="outline-action" href="/submit/project" data-route>我也想公开进展 <span aria-hidden="true">&rarr;</span></a></footer></article>`,
  );
}
function personPage(profile) {
  if (!profile) return notFound();
  const stories = (store.creatorStories || []).filter(
    (story) => story.profileSlug === profile.slug,
  );
  return shell(
    `<section class="section-frame person-page"><span>ANS CREATOR</span><h1>${esc(profile.displayName)}</h1><p>${esc(profile.bio || "这个创作者还没有写公开简介。")}</p><div class="profile-tags">${(profile.tags || []).map((tag) => `<span>${esc(tag)}</span>`).join("")}</div><section><h2>公开记录</h2>${stories.length ? stories.map((story) => storyPreview(story)).join("") : empty("暂时没有公开记录", "创作者会在取得授权后，把真实过程放在这里。")}</section></section>`,
  );
}
function campaignLanding(channel, series) {
  const topic = currentTopic();
  return shell(
    `<section class="section-frame campaign-landing"><span>ANS / FROM ${esc(channel.toUpperCase())}</span><h1>把 AI 做成作品，<br />不只做成一次展示。</h1><p>这里记录真实创作者如何把问题、判断和协作机会放进公开网络。</p>${topic ? actionLink("回应本周问题", `/topics/${topic.slug}`) : actionLink("看看正在发生", "/wall")}</section>`,
  );
}
function profileEditor() {
  const profile = store.account?.profile || {
    slug: "",
    bio: "",
    tags: [],
    isPublic: false,
  };
  return shell(
    `<section class="section-frame detail-back"><a href="/me" data-route>&larr; 返回我的空间</a></section><section class="section-frame profile-editor"><span>PUBLIC CREATOR PROFILE</span><h1>让别人先看见你在做什么。</h1><p>公开主页只展示你主动填写的名称、简介、方向标签和已发布记录，不展示邮箱或联系方式。</p><form class="submit-form" data-form="profile">${formField("公开主页地址", "slug", { required: true, placeholder: "例如：ans-maker", value: profile.slug })}${formField("一句简介", "bio", { type: "textarea", required: true, placeholder: "你正在用 AI 做什么？", value: profile.bio })}<fieldset class="tag-field"><legend>创作方向（最多 3 个）</legend><div>${["图文", "视频", "设计", "开发", "研究", "策划"].map((tag) => `<label><input type="checkbox" name="tags" value="${tag}" ${(profile.tags || []).includes(tag) ? "checked" : ""}/><span>${tag}</span></label>`).join("")}</div></fieldset>${switchField("公开这个创作者主页", "isPublic", profile.isPublic)}<div class="form-submit"><p>关闭后，主页不会出现在公开网络中。</p><button class="dark-action" type="submit">保存公开资料 <span aria-hidden="true">&rarr;</span></button></div></form></section>`,
  );
}
function adminContent() {
  const responses = store.adminTopicResponses || [];
  const stories = store.adminCreatorStories || [];
  const publishedStories = store.adminPublishedCreatorStories || [];
  const hiddenStories = store.adminHiddenCreatorStories || [];
  const reviewItem = (kind, item, title, copy) =>
    `<article><header><span>${kind} / 待审核</span><span>${esc(item.createdAt || "刚刚")}</span></header><h2>${esc(title)}</h2><p>${esc(copy)}</p><footer><button class="plain-action reject" data-action="content-review" data-kind="${kind}" data-id="${esc(item.id)}" data-result="reject">拒绝</button><button class="dark-action" data-action="content-review" data-kind="${kind}" data-id="${esc(item.id)}" data-result="approve">通过并公开 <span aria-hidden="true">&rarr;</span></button></footer></article>`;
  const visibilityItem = (item, action) =>
    `<article><header><span>创作者实录 / ${action === "hide" ? "已公开" : "已隐藏"}</span><span>${esc(item.updatedAt || item.createdAt || "刚刚")}</span></header><h2>${esc(item.hook)}</h2><p>${esc(item.authorName)} / ${esc(item.role)}</p><footer><button class="plain-action ${action === "hide" ? "reject" : ""}" data-action="content-visibility" data-id="${esc(item.id)}" data-result="${action}">${action === "hide" ? "隐藏这篇" : "恢复公开"}</button></footer></article>`;
  return shell(
    `${pageIntro("EDITORIAL REVIEW", "内容审核与实录", "只发布有授权、有真实场景、有下一步的内容。", actionLink("返回审核台", "/admin", "plain-action"))}<section class="section-frame editorial-create"><header><span>编辑实录</span><h2>创建一篇有授权的真实记录。</h2></header><form class="submit-form" data-form="creator-story">${formField("公开署名", "authorName", { required: true, placeholder: "创作者或项目名称" })}${formField("身份与正在做的事", "role", { required: true, placeholder: "例如：独立视频创作者" })}${formField("实录标题", "hook", { required: true, placeholder: "一句能说清真实冲突的标题" })}${formField("真实卡点", "problem", { type: "textarea", required: true })}${formField("AI 参与的步骤", "aiSteps", { type: "textarea", required: true })}${formField("人类判断留下在哪里", "humanJudgement", { type: "textarea", required: true })}${formField("可验证结果", "outcome", { type: "textarea", required: true })}${formField("此刻需要什么", "nextStep", { type: "textarea", required: true })}${attachmentField()}${switchField("我确认已取得文字、素材和公开署名的授权。", "consent", false)}<button class="dark-action" type="submit">提交实录审核 <span aria-hidden="true">&rarr;</span></button></form></section><section class="section-frame review-list editorial-review"><header><span>话题回应</span><strong>${responses.length} 条待审核</strong></header>${responses.length ? responses.map((item) => reviewItem("topic-response", item, `${item.author} / ${item.stance}`, item.body)).join("") : empty("没有待审核回应", "审核队列会在真实回应提交后出现。")}</section><section class="section-frame review-list editorial-review"><header><span>创作者实录</span><strong>${stories.length} 篇待审核</strong></header>${stories.length ? stories.map((item) => reviewItem("creator-story", item, item.hook, item.problem)).join("") : empty("没有待审核实录", "已授权实录会先停在这里，等待编辑确认。")}</section><section class="section-frame review-list editorial-review"><header><span>已公开实录</span><strong>${publishedStories.length} 篇</strong></header>${publishedStories.length ? publishedStories.map((item) => visibilityItem(item, "hide")).join("") : empty("没有已公开实录", "公开后的实录会显示在这里，方便进行可逆的编辑下线。")}</section><section class="section-frame review-list editorial-review"><header><span>已隐藏实录</span><strong>${hiddenStories.length} 篇</strong></header>${hiddenStories.length ? hiddenStories.map((item) => visibilityItem(item, "restore")).join("") : empty("没有已隐藏实录", "隐藏的实录不会出现在公共页面，可在这里恢复。")}</section>`,
  );
}

function wall() {
  return shell(
    `${pageIntro("IMAGINATION WALL", "想象力墙", "任何人的念头都可以先有一个位置。它不必完整，也不必马上证明什么。", actionLink("贴一张", "/submit/idea"))}<section class="section-frame wall-head"><p>点开一张纸条，看见想法；需要连接时，再翻开背面。</p><span>${store.ideas.length} 张公开纸条</span></section><section class="section-frame note-board" aria-label="想象力墙">${store.ideas.map((idea, index) => `<a href="/ideas/${idea.id}" data-route class="note-card ${esc(idea.color)} note-${index % 4}"><span class="note-no">${String(index + 1).padStart(2, "0")}</span><h2>${esc(idea.title)}</h2><p>${esc(idea.body)}</p><footer>${esc(idea.author)} <span>${esc(idea.date)}</span></footer></a>`).join("")}</section>`,
  );
}

function ideaDetail(item) {
  if (!item) return notFound();
  return shell(
    `<section class="section-frame detail-back"><a href="/wall" data-route>&larr; 返回想象力墙</a></section><article class="section-frame note-detail ${esc(item.color)}"><span class="note-no">OPEN SIGNAL</span><h1>${esc(item.title)}</h1><p>${esc(item.body)}</p>${attachmentLinks(item)}<footer><span>来自 ${esc(item.author)}</span><span>${esc(item.date)}</span></footer><div class="detail-actions"><button class="dark-action" data-action="contact" data-name="${esc(item.author)}" data-contact="${esc(item.contact)}" data-public="${item.openContact}">发起联系 <span aria-hidden="true">&rarr;</span></button><a class="plain-action" href="/submit/idea" data-route>我也想贴一张</a>${reportButton("idea", item.id)}</div></article><section class="section-frame continuation"><p class="eyebrow">KEEP GOING</p><h2>也许你的下一步，就是回应这张纸条。</h2></section>`,
  );
}

function projects() {
  const filters = ["全部", "招募中", "刚开始", "推进中", "已结束"];
  const projects = store.projects.filter(
    (item) =>
      ui.projectFilter === "全部" ||
      (ui.projectFilter === "招募中"
        ? item.recruiting
        : item.status === ui.projectFilter),
  );
  return shell(
    `${pageIntro("PUBLIC PROJECTS", "共创项目", "公开记录正在推进的东西。需要伙伴时，再把招募说明写出来。", actionLink("发起项目", "/submit/project"))}<section class="section-frame filter-bar" aria-label="项目筛选">${filters.map((label) => `<button class="filter-chip ${ui.projectFilter === label ? "selected" : ""}" data-action="project-filter" data-value="${label}">${label}</button>`).join("")}</section><section class="section-frame project-list">${projects.length ? projects.map((item) => `<article class="project-card"><div><span class="status-pill ${item.status === "推进中" ? "active" : ""}">${esc(item.status)}</span>${item.recruiting ? '<span class="recruit-pill">招募中</span>' : ""}</div><h2>${esc(item.title)}</h2><p>${esc(item.summary)}</p><div class="project-progress"><span>最近进展</span><strong>${esc(item.progress)}</strong></div><footer><span>${esc(item.author)}</span><a href="/projects/${item.id}" data-route>查看 &rarr;</a></footer></article>`).join("") : empty("这个筛选下还没有项目", "换一个标签，或者发起一个新的公开项目。", actionLink("发起项目", "/submit/project", "outline-action"))}</section>`,
  );
}

function projectDetail(item) {
  if (!item) return notFound();
  return shell(
    `<section class="section-frame detail-back"><a href="/projects" data-route>&larr; 返回共创项目</a></section><article class="section-frame project-detail"><div class="detail-topline"><span class="status-pill ${item.status === "推进中" ? "active" : ""}">${esc(item.status)}</span>${item.recruiting ? '<span class="recruit-pill">正在招募伙伴</span>' : ""}</div><h1>${esc(item.title)}</h1><p class="detail-summary">${esc(item.summary)}</p>${attachmentLinks(item)}<div class="detail-grid"><section><p class="eyebrow">LATEST NOTE</p><h2>最近进展</h2><p>${esc(item.progress)}</p></section><section><p class="eyebrow">WHAT REMAINS</p><h2>可能留下什么</h2><p>${esc(item.offer || "一条可以被下一个人继续使用的项目记录。")}</p></section></div><footer><span>项目发起人 / ${esc(item.author)}</span><button class="dark-action" data-action="contact" data-name="${esc(item.author)}" data-contact="${esc(item.contact)}" data-public="${item.openContact}">${item.recruiting ? "申请加入" : "联系项目"} <span aria-hidden="true">&rarr;</span></button>${reportButton("project", item.id)}</footer></article>`,
  );
}

function help() {
  return shell(
    `${pageIntro("SKILL EXCHANGE", "能力交换", "说清楚你需要什么，也说清楚你能给什么。其他的先不用复杂。", actionLink("发布互助", "/submit/help"))}<section class="section-frame exchange-head"><span>公开互助 ${store.help.length} 条</span><p>ANS 只展示协作意向，不代收款、不担保交易。</p></section><section class="section-frame help-list">${store.help.length ? store.help.map((item) => `<article class="help-card"><header><span>互助请求</span><span>${esc(item.author)}</span></header><h2>${esc(item.title)}</h2><div class="help-grid"><div><p>我需要什么</p><strong>${esc(item.need)}</strong></div><div><p>我能给什么</p><strong>${esc(item.give)}</strong></div></div><footer><button class="plain-action" data-action="contact" data-name="${esc(item.author)}" data-contact="${esc(item.contact)}" data-public="${item.openContact}">发起联系 &rarr;</button>${item.profile ? `<a href="/me" data-route>查看公开记录</a>` : ""}</footer></article>`).join("") : empty("这里还没有互助帖", "先发一条，把需要和回报写清楚就够了。", actionLink("发布互助", "/submit/help", "outline-action"))}</section>`,
  );
}

function tutorials() {
  const query = ui.tutorialQuery.trim().toLowerCase();
  const items = store.tutorials.filter(
    (item) =>
      !query ||
      `${item.title} ${item.summary} ${item.author}`
        .toLowerCase()
        .includes(query),
  );
  return shell(
    `${pageIntro("PLAYBOOKS", "行动手册", "把走通的方法、验证和失败一起留下。它们不是答案库，而是下一步能开始的地方。")}<section class="section-frame tutorial-feature"><div><span>新手从这里开始</span><h2>从一个真实问题开始搭建 AI 工作流</h2><p>不追求工具堆砌，先把问题、输入、验证和复盘写清楚。</p></div><div>${actionLink("打开入门手册", "/tutorials/tutorial-start", "outline-action")}</div></section><section class="section-frame library-head"><div><span>行动手册库</span><strong>${items.length} 篇</strong></div><label class="search-field"><span class="sr-only">搜索行动手册</span><input type="search" value="${esc(ui.tutorialQuery)}" placeholder="搜索标题、作者或能力" data-input="tutorial-search" /></label></section><section class="section-frame tutorial-list">${items.map((item) => `<a class="tutorial-card" href="/tutorials/${item.id}" data-route><div><p>${esc(item.author)} / 行动手册</p><h2>${esc(item.title)}</h2><span>${esc(item.summary)}</span></div><footer><span>依赖 ${item.dependencies}</span><span>验证 ${item.tests}</span><strong>打开阅读 &rarr;</strong></footer></a>`).join("") || empty("没有找到匹配手册", "换一个关键词试试。")}</section>`,
  );
}

function tutorialDetail(item) {
  if (!item) return notFound();
  const steps = Array.isArray(item.content)
    ? item.content
    : String(item.steps || "")
        .split("\n")
        .filter(Boolean);
  return shell(
    `<section class="section-frame detail-back"><a href="/tutorials" data-route>&larr; 返回行动手册</a></section><article class="section-frame tutorial-detail"><header><p>${esc(item.author)} / 行动手册</p><h1>${esc(item.title)}</h1><span>${esc(item.summary)}</span>${attachmentLinks(item)}<div class="detail-stat-row"><span>依赖 ${item.dependencies || 3}</span><span>验证 ${item.tests || 2}</span><span>引用积木 0</span></div></header><section class="article-body"><p class="eyebrow">正文</p><h2>这份手册解决什么</h2><p>${esc(item.summary)}</p><h2>实现流程</h2><ol class="steps">${steps.map((step) => `<li>${esc(step)}</li>`).join("")}</ol><h2>测试跑通</h2><p>完成每一步后，都用自己的真实任务检查输出是否达到预期。没有通过的部分也要保留原因，下一次才有可调整的依据。</p><h2>Review</h2><p>手册会随实践更新。发现更短的路径、条件变化或失败案例，可以把它变成下一版。</p></section><footer class="article-footer"><a class="outline-action" href="/me/tutorial-drafts/new" data-route>写一份手册 <span aria-hidden="true">&rarr;</span></a><a class="plain-action" href="/tutorials" data-route>继续浏览 &rarr;</a>${reportButton("tutorial", item.id)}</footer></article>`,
  );
}

function formField(label, name, options = {}) {
  const type = options.type || "text";
  const input =
    type === "textarea"
      ? `<textarea id="field-${name}" name="${name}" ${options.required ? "required" : ""} placeholder="${esc(options.placeholder || "")}">${esc(options.value || "")}</textarea>`
      : type === "select"
        ? `<select id="field-${name}" name="${name}">${options.options.map((option) => `<option ${option === options.value ? "selected" : ""}>${esc(option)}</option>`).join("")}</select>`
        : `<input id="field-${name}" name="${name}" type="${type}" ${options.required ? "required" : ""} placeholder="${esc(options.placeholder || "")}" value="${esc(options.value || "")}" />`;
  return `<label class="form-field" for="field-${name}"><span>${esc(label)}</span>${input}</label>`;
}
function switchField(label, name, checked = false) {
  return `<label class="switch-field"><input type="checkbox" name="${name}" ${checked ? "checked" : ""} /><span class="switch-track" aria-hidden="true"></span><span>${esc(label)}</span></label>`;
}
function attachmentField() {
  if (!store.capabilities?.uploads) return "";
  return `<label class="form-field attachment-field" for="field-attachment"><span>附件（最多 4 个，每个不超过 8 MB）</span><input id="field-attachment" name="attachment" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" /></label>`;
}
function authPage() {
  const params = new URLSearchParams(location.search);
  const verifyToken = params.get("verify");
  const resetToken = params.get("reset");
  if (verifyToken)
    return shell(
      `${pageIntro("EMAIL VERIFICATION", "验证你的邮箱", "确认后，这个邮箱会成为你的 ANS 账号验证记录。 ")}<section class="section-frame submit-wrap"><form class="submit-form" data-form="auth-verify"><input type="hidden" name="token" value="${esc(verifyToken)}" /><div class="form-submit"><button class="dark-action" type="submit">完成验证 <span aria-hidden="true">&rarr;</span></button></div></form></section>`,
    );
  if (resetToken === "request")
    return shell(
      `${pageIntro("PASSWORD RESET", "重设密码", "输入账号邮箱后，我们会发送一封有效期 30 分钟的重设邮件。 ")}<section class="section-frame submit-wrap"><form class="submit-form" data-form="auth-reset-request">${formField("邮箱", "email", { type: "email", required: true, placeholder: "you@example.com" })}<div class="form-submit"><button class="dark-action" type="submit">发送重设邮件 <span aria-hidden="true">&rarr;</span></button></div></form></section>`,
    );
  if (resetToken)
    return shell(
      `${pageIntro("PASSWORD RESET", "设置新密码", "设置完成后，其他已登录设备会被退出。 ")}<section class="section-frame submit-wrap"><form class="submit-form" data-form="auth-reset-password"><input type="hidden" name="token" value="${esc(resetToken)}" />${formField("新密码", "password", { type: "password", required: true, placeholder: "至少 10 位" })}<div class="form-submit"><button class="dark-action" type="submit">更新密码 <span aria-hidden="true">&rarr;</span></button></div></form></section>`,
    );
  const resetLink = store.capabilities?.emailDelivery
    ? `<a class="plain-action auth-reset-link" href="/auth?reset=request" data-route>忘记密码</a>`
    : "";
  return shell(
    `${authNotice ? `<div class="auth-notice">${esc(authNotice)}</div>` : ""}${pageIntro("ACCOUNT", "登录或加入 ANS", "创建账号后，你可以保存草稿、发布公开记录、生成个人工具 Key，并追踪审核状态。")}<section class="section-frame auth-grid"><form class="submit-form" data-form="auth-login"><p class="eyebrow">LOGIN</p><h2>回到你的工作台</h2>${formField("邮箱", "email", { type: "email", required: true, placeholder: "you@example.com" })}${formField("密码", "password", { type: "password", required: true, placeholder: "输入密码" })}<div class="form-submit"><button class="dark-action" type="submit">登录 <span aria-hidden="true">&rarr;</span></button>${resetLink}</div></form><form class="submit-form" data-form="auth-register"><p class="eyebrow">REGISTER</p><h2>创建公开成员账号</h2>${formField("公开名称", "displayName", { required: true, placeholder: "你希望显示的名称" })}${formField("邮箱", "email", { type: "email", required: true, placeholder: "you@example.com" })}${formField("密码", "password", { type: "password", required: true, placeholder: "至少 10 位" })}<button class="outline-action" type="submit">注册并进入 <span aria-hidden="true">&rarr;</span></button></form></section>`,
  );
}
function submitPage(type) {
  const config = {
    idea: {
      kicker: "发布信号",
      title: "先让一个想法出现。",
      copy: "通过后，它会出现在想象力墙。",
      fields: `${formField("一句话", "title", { required: true, placeholder: "你的想法是什么？" })}${formField("展开说说", "body", { type: "textarea", required: true, placeholder: "它为什么值得被继续想一想？" })}${formField("联系方式", "contact", { required: true, placeholder: "微信、邮箱或其他联系方法" })}${switchField("公开联系方式。关闭后，别人只能发送固定联系话术。", "openContact", true)}<fieldset class="color-field"><legend>纸条颜色</legend><div>${["butter", "mint", "sky", "rose", "paper"].map((color, index) => `<label><input type="radio" name="color" value="${color}" ${index === 0 ? "checked" : ""}/><i class="swatch ${color}"></i><span class="sr-only">${color}</span></label>`).join("")}</div></fieldset>${attachmentField()}`,
    },
    project: {
      kicker: "发起项目",
      title: "公开记录你正在推进的东西。",
      copy: "它可以只是一条进展记录；如果需要伙伴，再打开招募。",
      fields: `${formField("项目名", "title", { required: true, placeholder: "给正在做的事一个名字" })}${formField("我在做什么", "summary", { type: "textarea", required: true, placeholder: "用一句清楚的话说明项目" })}${formField("最近进展", "progress", { type: "textarea", required: true, placeholder: "已经推进到哪里？" })}${formField("状态", "status", { type: "select", value: "刚开始", options: ["刚开始", "推进中", "已结束"] })}${switchField("正在招募伙伴", "recruiting", false)}${formField("可能留下什么", "offer", { placeholder: "可选，例如：一份模板、一个工具、一次复盘。" })}${formField("联系方式", "contact", { required: true, placeholder: "微信、邮箱或其他联系方法" })}${switchField("公开联系方式。关闭后，别人只能发送固定联系话术。", "openContact", true)}${attachmentField()}`,
    },
    help: {
      kicker: "发布互助",
      title: "写清楚需要什么，也写清楚能给什么。",
      copy: "免费、请一杯咖啡、付费、技能交换，或者暂时没有回报，都可以直接写。",
      fields: `${formField("标题", "title", { required: true, placeholder: "例如：想找人一起测试一个工作流" })}${formField("我需要什么", "need", { type: "textarea", required: true, placeholder: "写清楚你卡在哪里，希望别人怎么帮。" })}${formField("我能给什么", "give", { type: "textarea", required: true, placeholder: "例如：交换方法、按阶段付费或互相复盘" })}${formField("联系方式", "contact", { required: true, placeholder: "微信、邮箱或其他联系方法" })}${switchField("公开联系方式。关闭后，别人只能发送固定联系话术。", "openContact", true)}${switchField("允许别人从这条互助进入我的公开记录。", "profile", true)}${attachmentField()}`,
    },
  }[type];
  if (!config) return notFound();
  return shell(
    `${pageIntro(config.kicker, config.title, config.copy)}<section class="section-frame submit-wrap"><form class="submit-form" data-form="submit-${type}">${config.fields}<div class="form-submit"><p>提交后会进入审核队列。审核通过时，内容会进入公开页面。</p><button class="dark-action" type="submit">提交审核 <span aria-hidden="true">&rarr;</span></button></div></form></section>`,
  );
}

function apiKeyList() {
  if (!store.apiKeys.length) return "";
  return `<div class="api-key-list">${store.apiKeys.map((key) => `<div><span>${esc(key.label)}</span><small>${key.lastUsedAt ? `最近使用 ${esc(shortDate(new Date(key.lastUsedAt)))}` : "尚未使用"}</small><button class="plain-action reject" data-action="revoke-key" data-id="${esc(key.id)}">撤销</button></div>`).join("")}</div>`;
}
function workspace() {
  const pending = allMyItems();
  const published = pending.filter((item) => item.status === "已通过").length;
  const verification =
    store.capabilities?.emailDelivery &&
    store.account &&
    !store.account.emailVerified
      ? `<section class="work-section account-notice"><p class="eyebrow">EMAIL</p><h2>验证你的邮箱</h2><p>${esc(store.account.email)}</p><button class="outline-action" data-action="send-verification">发送验证邮件</button></section>`
      : "";
  return shell(
    `<section class="section-frame workspace"><aside class="workspace-nav"><a class="brand" href="/" data-route><img src="/ans-logo-light.svg" alt="ANS" class="brand-logo" /><span>ANS</span></a><nav><a href="#dashboard">首页</a><a href="#tool">连接工具</a><a href="#drafts">写手册</a><a href="#records">项目记录</a><a href="#submissions">审核状态</a><a href="/skill-distribution" data-route>协议分发</a></nav><div class="member-avatar">A</div><strong>@ans-maker</strong><p>Public member</p></aside><div class="workspace-content"><section id="dashboard" class="workspace-hero"><p class="eyebrow">我的空间</p><h1>这里是你的 ANS 工作台</h1><p>从一个动作继续，把实践变成公开可用的记录。</p><div>${actionLink("连接工具", "#tool", "outline-action")} ${actionLink("写行动手册", "/me/tutorial-drafts/new", "plain-action")}</div></section>${verification}<section class="stat-grid" aria-label="个人数据概览"><article><strong>${store.drafts.length}</strong><span>手册草稿</span></article><article><strong>${store.projects.filter((item) => item.author === "ANS Maker").length}</strong><span>项目记录</span></article><article><strong>${pending.length}</strong><span>提交记录</span></article><article><strong>${published}</strong><span>已公开内容</span></article></section><section id="tool" class="work-section tool-section"><p class="eyebrow">连接工具</p><h2>生成 Key，然后复制给你的工具。</h2><p>服务端只保存 Key 哈希；明文仅在创建时显示一次。</p><div class="key-row">${store.key ? `<code>${esc(store.key)}</code><button class="outline-action" data-action="copy-key">复制</button>` : `<button class="dark-action" data-action="generate-key">生成 Key</button>`}</div>${apiKeyList()}</section><section id="drafts" class="work-section"><header><div><p class="eyebrow">行动手册草稿</p><h2>打开继续写。</h2></div>${actionLink("新建手册", "/me/tutorial-drafts/new", "outline-action")}</header><div class="draft-list">${store.drafts.map((draft) => `<article><span>${esc(draft.status)} / ${esc(draft.updated || "刚刚")}</span><h3>${esc(draft.title)}</h3><p>${esc(draft.summary)}</p><a href="/me/tutorial-drafts/${draft.id}" data-route>继续编辑 &rarr;</a></article>`).join("")}</div></section><section id="records" class="work-section"><header><div><p class="eyebrow">项目记录</p><h2>点开继续写。</h2></div>${actionLink("新建项目", "/submit/project", "outline-action")}</header><p class="quiet-copy">项目提交通过审核后，会显示在这里和公开项目页。</p></section><section id="submissions" class="work-section"><header><div><p class="eyebrow">审核状态</p><h2>看提交有没有通过。</h2></div><div class="filter-compact">${["全部", "待审核", "已通过", "未通过"].map((item) => `<button class="filter-chip ${ui.draftFilter === item ? "selected" : ""}" data-action="draft-filter" data-value="${item}">${item}</button>`).join("")}</div></header><div class="submission-list">${
      pending
        .filter(
          (item) => ui.draftFilter === "全部" || item.status === ui.draftFilter,
        )
        .map(
          (item) =>
            `<article><div><span>${esc(item.typeLabel)} / ${esc(item.status)}</span><h3>${esc(item.title)}</h3><p>${esc(item.created)}${item.reviewNote ? ` / ${esc(item.reviewNote)}` : ""}</p></div><a href="${item.status === "已通过" ? item.publicUrl : "/admin"}" data-route>${item.status === "已通过" ? "打开公开页" : "查看审核台"} &rarr;</a></article>`,
        )
        .join("") ||
      empty("还没有提交记录", "发布一个信号、项目或互助，就会在这里留下状态。")
    }</div></section></div></section>`,
  );
}

function editor(draftId) {
  const existing = store.drafts.find((item) => item.id === draftId) || {
    id: "",
    title: "新的行动手册",
    summary: "",
    steps: "做了什么\n前置依赖\n实现流程\n测试跑通\n常见错误\nReview",
    status: "草稿",
  };
  return shell(
    `<section class="section-frame detail-back"><a href="/me" data-route>&larr; 返回我的空间</a></section><section class="section-frame editor"><h1 class="sr-only">编辑行动手册</h1><header><span>行动手册 / ${esc(existing.status)}</span><p>把一条可复现的路径先写下来。</p></header><form data-form="editor" data-draft="${esc(existing.id)}"><label class="editor-title"><span class="sr-only">手册标题</span><input name="title" value="${esc(existing.title)}" required placeholder="写一个清楚的手册标题" /></label>${formField("做了什么", "summary", { type: "textarea", required: true, placeholder: "说明这份手册解决什么问题。", value: existing.summary })}${formField("实现流程", "steps", { type: "textarea", required: true, placeholder: "每行一个步骤。", value: existing.steps })}<div class="editor-actions"><button class="outline-action" type="submit" data-editor-mode="save">保存草稿</button><button class="dark-action" type="submit" data-editor-mode="submit">提交审核 <span aria-hidden="true">&rarr;</span></button></div></form></section>`,
  );
}

function admin() {
  const items = store.submissions.filter(
    (item) =>
      item.status === "待审核" &&
      (ui.adminFilter === "全部" || item.type === ui.adminFilter),
  );
  const filters = [
    ["全部", "全部"],
    ["idea", "想象力墙"],
    ["project", "项目"],
    ["help", "能力交换"],
    ["tutorial", "行动手册"],
  ];
  const reports = store.adminReports || [];
  const metrics = store.adminAnalytics?.events || {};
  return shell(
    `${pageIntro("ADMIN", "审核台", "只做通过或拒绝，让公开内容先经过一层轻审核。")}<section class="section-frame admin-stats"><article><span>待审核</span><strong>${countPending()}</strong><p>所有公开内容的入口</p></article><article><span>待处理举报</span><strong>${reports.length}</strong><p>举报需要有处理记录。</p></article><article><span>近 7 日投稿</span><strong>${Number(metrics.submission_created || 0)}</strong><p>只记录聚合事件，不记录投稿正文。</p></article><article><span>近 7 日通过</span><strong>${Number(metrics.submission_approved || 0)}</strong><p>帮助判断公开协作是否真的发生。</p></article></section><section class="section-frame admin-board"><aside><p>审核类型</p>${filters.map(([value, label]) => `<button class="admin-filter ${ui.adminFilter === value ? "selected" : ""}" data-action="admin-filter" data-value="${value}">${label}<span>${value === "全部" ? countPending() : store.submissions.filter((item) => item.status === "待审核" && item.type === value).length}</span></button>`).join("")}</aside><div class="review-list">${items.length ? items.map((item) => `<article><header><span>${esc(item.typeLabel)} / 待审核</span><span>${esc(item.created)}</span></header><h2>${esc(item.title)}</h2><p>${esc(item.preview)}</p><footer><button class="plain-action reject" data-action="review" data-id="${item.id}" data-result="reject">拒绝</button><button class="dark-action" data-action="review" data-id="${item.id}" data-result="approve">通过并公开 <span aria-hidden="true">&rarr;</span></button></footer></article>`).join("") : empty("这个队列是空的", "没有待处理内容时，审核台就应该安静。")}</div></section>${reports.length ? `<section class="section-frame admin-board report-board"><aside><p>内容举报</p></aside><div class="review-list">${reports.map((report) => `<article><header><span>${esc(report.type)} / ${esc(report.reporter)}</span><span>${esc(shortDate(new Date(report.createdAt)))}</span></header><h2>${esc(report.targetTitle)}</h2><p>${esc(report.reason)}</p><footer><button class="outline-action" data-action="resolve-report" data-id="${esc(report.id)}">标记已处理</button></footer></article>`).join("")}</div></section>` : ""}`,
  );
}

function distribution() {
  return shell(
    `${pageIntro("PROTOCOL DISTRIBUTION", "工具连接协议", "把公开结果、行动手册和项目记录交给你的工具继续使用。")}<section class="section-frame protocol-grid"><article><span>01</span><h2>生成服务端 Key</h2><p>在我的空间生成。服务端只保存哈希，明文仅在创建时返回一次。</p><a href="/me#tool" data-route>打开我的空间 &rarr;</a></article><article><span>02</span><h2>读取公开协议</h2><p>工具可以获取结构化的手册、项目和公开结果。</p><code>GET /api/public/playbooks</code></article><article><span>03</span><h2>写回可验证结果</h2><p>工具可以用 Key 将结构化的实践记录写入草稿。</p><code>POST /api/integrations/tutorial-drafts</code></article></section><section class="section-frame protocol-note"><p class="eyebrow">SERVER API</p><h2>公开内容由 ANS 服务端 API 提供。</h2><p>账号、草稿、投稿、审核结果与 API Key 哈希由服务器持久化保存。</p></section>`,
  );
}

function about() {
  return shell(
    `${pageIntro("ABOUT ANS", "AI Never Stop，不是一直加速。", "创作总会卡住。ANS 做的是让它别悄无声息地停下：公开一件半成品、一次判断和一个具体的下一步，让另一个人有机会接住。")}<section class="section-frame principles"><article><span>01</span><h2>发出信号</h2><p>没做完也能发。先说清你正在做什么，以及它卡在了哪里。</p></article><article><span>02</span><h2>留下判断</h2><p>不只晒结果，也留下你为什么接受、推翻或重做一次 AI 输出。</p></article><article><span>03</span><h2>连接下一棒</h2><p>把需要谁、能交换什么写清楚，让值得继续的作品真的往前一步。</p></article></section>`,
  );
}

function privacy() {
  return shell(
    `${pageIntro("PRIVACY", "隐私说明", "ANS 只收集维持服务、安全与改进产品所需的最少信息。")}<section class="section-frame principles"><article><span>01</span><h2>账号与内容</h2><p>登录信息、投稿、草稿、审核记录和附件只用于提供 ANS 服务；密码只以安全哈希形式保存。</p></article><article><span>02</span><h2>访问统计</h2><p>本站使用 Cloudflare Web Analytics 了解聚合访问趋势。统计不用于读取你的投稿正文、联系方式、附件或密码。</p></article><article><span>03</span><h2>服务安全</h2><p>ANS 会保留必要的服务端安全记录以防止滥用，并将数据库、SMTP 与对象存储凭据保存在浏览器不可见的服务端环境中。</p></article></section><section class="section-frame continuation"><p class="eyebrow">YOUR CONTROL</p><h2>公开前，请确认你愿意让这条内容被继续使用。</h2><p>投稿只有在审核通过后才会进入公开页面；涉及账号或服务问题时，可通过 ANS 管理者提供的联系方式取得协助。</p></section>`,
  );
}

function notFound() {
  return shell(
    `<section class="section-frame not-found">${empty("这里还没有内容", "这个页面不存在，或者它还没有被公开。", actionLink("返回首页", "/", "outline-action"))}</section>`,
  );
}

function render() {
  const current = path();
  const segments = current.split("/").filter(Boolean);
  let output;
  if (current === "/") output = warmHome();
  else if (current === "/codexfast") output = window.AnsCodexFast.landing();
  else if (current === "/codexfast/apply")
    output = window.AnsCodexFast.applyPage();
  else if (current === "/codexfast/studio")
    output = window.AnsCodexFast.studio();
  else if (current === "/codexfast/studio/new")
    output = window.AnsCodexFast.newProject();
  else if (
    segments[0] === "codexfast" &&
    segments[1] === "studio" &&
    segments[2]
  )
    output = window.AnsCodexFast.projectDetail(segments[2]);
  else if (current === "/admin/codexfast") output = window.AnsCodexFast.admin();
  else if (current === "/wall") output = warmWall();
  else if (segments[0] === "topics" && segments[1])
    output = warmTopicDetail(
      (store.topics || []).find((item) => item.slug === segments[1]),
    );
  else if (segments[0] === "stories" && segments[1])
    output = warmStoryDetail(storyById(segments[1]));
  else if (segments[0] === "people" && segments[1])
    output = warmPersonPage(profileBySlug(segments[1]));
  else if (segments[0] === "from" && segments[1] && segments[2])
    output = warmCampaignLanding(segments[1], segments[2]);
  else if (segments[0] === "ideas" && segments[1])
    output = warmIdeaDetail(store.ideas.find((item) => item.id === segments[1]));
  else if (current === "/projects") output = warmProjects();
  else if (segments[0] === "projects" && segments[1])
    output = warmProjectDetail(
      store.projects.find((item) => item.id === segments[1]),
    );
  else if (current === "/help") output = warmHelp();
  else if (current === "/tutorials") output = warmTutorials();
  else if (segments[0] === "tutorials" && segments[1])
    output = warmTutorialDetail(
      store.tutorials.find((item) => item.id === segments[1]),
    );
  else if (segments[0] === "submit" && segments[1])
    output = warmSubmitPage(segments[1]);
  else if (current === "/auth") output = warmAuthPage();
  else if (current === "/me") output = session ? workspace() : authPage();
  else if (current === "/me/profile")
    output = session ? profileEditor() : authPage();
  else if (current === "/me/tutorial-drafts/new")
    output = session ? editor() : authPage();
  else if (
    segments[0] === "me" &&
    segments[1] === "tutorial-drafts" &&
    segments[2]
  )
    output = session ? editor(segments[2]) : authPage();
  else if (current === "/admin") {
    if (session?.role === "admin") {
      const personalSubmissions = store.submissions;
      store.submissions = store.adminQueue || [];
      output = admin();
      store.submissions = personalSubmissions;
    } else output = authPage();
  } else if (current === "/admin/content")
    output = session?.role === "admin" ? adminContent() : authPage();
  else if (current === "/skill-distribution") output = distribution();
  else if (current === "/about") output = warmAbout();
  else if (current === "/privacy") output = privacy();
  else output = notFound();
  updateDocumentMetadata(current, segments);
  if (current !== lastTrackedRoute) {
    lastTrackedRoute = current;
    if (segments[0] === "tutorials" && segments[1])
      trackAnalytics("playbook_opened");
    if (segments[0] === "topics" && segments[1]) trackAnalytics("topic_viewed");
    if (segments[0] === "stories" && segments[1])
      trackAnalytics("story_opened");
    if (segments[0] === "people" && segments[1])
      trackAnalytics("profile_opened");
    if (segments[0] === "from" && segments[1] && segments[2])
      trackAnalytics("campaign_landing", `${segments[1]}:${segments[2]}`);
  }
  app.innerHTML = output;
  if (typeof initWarmMotion === "function") initWarmMotion();
  const accountLink = app.querySelector(".header-actions .plain-action");
  if (accountLink && !session) {
    accountLink.textContent = "登录 / 注册";
    accountLink.setAttribute("href", "/auth");
  }
  if (accountLink && session)
    accountLink.insertAdjacentHTML(
      "afterend",
      '<button class="plain-action" type="button" data-action="logout">退出</button>',
    );
  if (current === "/me" && session) {
    const identity = app.querySelector(".workspace-nav strong");
    if (identity) identity.textContent = `@${session.displayName}`;
    const keyDescription = app.querySelector(".tool-section > p:not(.eyebrow)");
    if (keyDescription)
      keyDescription.textContent =
        "这个 Key 由服务端保存哈希；明文只会在生成时显示一次。";
    const projectCount = app.querySelector(
      ".stat-grid article:nth-child(2) strong",
    );
    if (projectCount)
      projectCount.textContent = String(
        store.projects.filter((item) => item.author === session.displayName)
          .length,
      );
    const workspaceHero = app.querySelector(".workspace-hero");
    if (workspaceHero)
      workspaceHero.insertAdjacentHTML(
        "beforeend",
        '<a class="plain-action" href="/me/profile" data-route>编辑公开主页 &rarr;</a>',
      );
  }
  if (current === "/admin" && session?.role === "admin") {
    const intro = app.querySelector(".page-intro");
    if (intro)
      intro.insertAdjacentHTML(
        "beforeend",
        '<a class="outline-action" href="/admin/content" data-route>审核话题与实录 &rarr;</a>',
      );
  }
}

function getFormValue(form, name) {
  return String(new FormData(form).get(name) || "").trim();
}
function showContact(button) {
  const name = button.dataset.name || "对方";
  const contact = button.dataset.contact || "";
  const publicContact = button.dataset.public === "true";
  dialog.innerHTML = `<button class="dialog-close" type="button" data-action="close-dialog" aria-label="关闭">&times;</button><p class="eyebrow">START A CONNECTION</p><h2>联系 ${esc(name)}</h2><p>${publicContact ? `对方公开的联系方式：<strong>${esc(contact)}</strong>` : "对方选择了不公开联系方式。你可以先复制一条固定联系话术，再通过你们约定的方式发送。"}</p><div class="dialog-actions">${publicContact ? `<button class="dark-action" data-action="copy-contact" data-contact="${esc(contact)}">复制联系方式</button>` : `<button class="dark-action" data-action="copy-contact" data-contact="你好，我在 ANS 看到你的公开记录，想和你聊聊：">复制联系话术</button>`}<button class="outline-action" data-action="close-dialog">返回</button></div>`;
  dialog.showModal();
  trackAnalytics("contact_opened");
}

document.addEventListener("click", (event) => {
  const routeLink = event.target.closest("a[data-route]");
  if (routeLink) {
    event.preventDefault();
    route(routeLink.getAttribute("href"));
    return;
  }
  const action = event.target.closest("[data-action]");
  if (!action) return;
  const type = action.dataset.action;
  if (type === "menu") {
    const nav = document.querySelector("#mobile-nav");
    nav.hidden = !nav.hidden;
    action.setAttribute("aria-expanded", String(!nav.hidden));
  }
  if (type === "project-filter") {
    ui.projectFilter = action.dataset.value;
    render();
  }
  if (type === "draft-filter") {
    ui.draftFilter = action.dataset.value;
    render();
  }
  if (type === "admin-filter") {
    ui.adminFilter = action.dataset.value;
    render();
  }
  if (type === "copy-key") {
    navigator.clipboard?.writeText(store.key);
    notify("Key 已复制到剪贴板。");
  }
  if (type === "contact") showContact(action);
  if (type === "copy-contact") {
    navigator.clipboard?.writeText(action.dataset.contact || "");
    dialog.close();
    notify("已复制到剪贴板。");
  }
  if (type === "close-dialog") dialog.close();
});
document.addEventListener("input", (event) => {
  if (event.target.dataset.input === "tutorial-search") {
    ui.tutorialQuery = event.target.value;
    render();
    const input = document.querySelector('[data-input="tutorial-search"]');
    if (input) {
      input.focus();
      input.setSelectionRange(ui.tutorialQuery.length, ui.tutorialQuery.length);
    }
  }
});
async function uploadAttachments(form) {
  const input = form.elements.attachment;
  const files = input ? [...input.files] : [];
  if (!files.length) return [];
  if (files.length > 4) throw new Error("最多上传 4 个附件");
  const uploads = [];
  for (const file of files) {
    if (file.size > 8 * 1024 * 1024)
      throw new Error(`附件 ${file.name} 超过 8 MB 限制`);
    const result = await api("/api/uploads", {
      method: "POST",
      headers: {
        "Content-Type": file.type,
        "X-ANS-Filename": encodeURIComponent(file.name),
      },
      body: file,
    });
    uploads.push(result.upload.id);
  }
  return uploads;
}
async function submitToServer(type, form) {
  if (!session) {
    notify("请先登录后再发布。");
    route("/auth");
    return;
  }
  const values = new FormData(form);
  const payload = {
    type,
    ...Object.fromEntries(
      [...values.entries()].filter(([name]) => name !== "attachment"),
    ),
  };
  payload.openContact = values.has("openContact");
  payload.recruiting = values.has("recruiting");
  payload.profile = values.has("profile");
  payload.uploadIds = await uploadAttachments(form);
  await api("/api/submissions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  await refreshData();
  notify("这段话正在确认，公开前先保护好彼此。");
  route("/me");
}
async function submitTopicResponse(form) {
  if (!session) {
    route("/auth");
    return;
  }
  const values = new FormData(form);
  const topic = form.dataset.topic;
  const payload = {
    stance: String(values.get("stance") || ""),
    body: String(values.get("body") || ""),
    uploadIds: await uploadAttachments(form),
  };
  await api(`/api/topics/${encodeURIComponent(topic)}/responses`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  await refreshData();
  notify("这段回应正在确认，公开前先保护好彼此。");
  route(`/topics/${topic}`);
}
async function savePublicProfile(form) {
  const values = new FormData(form);
  const payload = {
    slug: String(values.get("slug") || ""),
    bio: String(values.get("bio") || ""),
    tags: values.getAll("tags"),
    isPublic: values.has("isPublic"),
  };
  await api("/api/profiles/me", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  await refreshData();
  notify("公开主页已保存。");
  route("/me/profile");
}
async function submitCreatorStory(form) {
  const values = new FormData(form);
  const payload = {
    ...Object.fromEntries(
      [...values.entries()].filter(([name]) => name !== "attachment"),
    ),
    consent: values.has("consent"),
    uploadIds: await uploadAttachments(form),
  };
  await api("/api/admin/creator-stories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  await refreshData();
  notify("实录已进入审核队列。");
  render();
}
async function saveEditorToServer(form, mode) {
  if (!session) {
    notify("请先登录后再保存。");
    route("/auth");
    return;
  }
  const draftPayload = {
    id: form.dataset.draft || "",
    title: getFormValue(form, "title"),
    summary: getFormValue(form, "summary"),
    steps: getFormValue(form, "steps"),
  };
  const result = await api("/api/drafts", {
    method: "POST",
    body: JSON.stringify(draftPayload),
  });
  if (mode === "submit")
    await api("/api/submissions", {
      method: "POST",
      body: JSON.stringify({
        type: "tutorial",
        ...draftPayload,
        draftId: result.draft.id,
      }),
    });
  await refreshData();
  notify(mode === "submit" ? "手册已进入审核队列。" : "草稿已保存。");
  route("/me");
}
async function authenticate(form, action) {
  const payload = Object.fromEntries(new FormData(form).entries());
  await api(`/api/auth/${action}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  store.key = "";
  await refreshData();
  notify(
    action === "setup"
      ? "管理员已初始化。"
      : action === "login"
        ? "登录成功。"
        : "账号已创建。",
  );
  route(session?.role === "admin" ? "/admin" : "/me");
}
async function verifyEmail(form) {
  const payload = Object.fromEntries(new FormData(form).entries());
  await api("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  await refreshData();
  notify("邮箱已验证。");
  route(session?.role === "admin" ? "/admin" : "/me");
}
async function requestPasswordReset(form) {
  await api("/api/auth/request-password-reset", {
    method: "POST",
    body: JSON.stringify({ email: getFormValue(form, "email") }),
  });
  notify("如果该邮箱已注册，重设邮件已发送。");
  route("/auth");
}
async function resetPassword(form) {
  const payload = Object.fromEntries(new FormData(form).entries());
  await api("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  await refreshData();
  notify("密码已更新，其他设备已退出登录。");
  route(session?.role === "admin" ? "/admin" : "/me");
}
document.addEventListener(
  "click",
  async (event) => {
    const action = event.target.closest("[data-action]");
    if (
      !action ||
      ![
        "generate-key",
        "review",
        "logout",
        "revoke-key",
        "report",
        "resolve-report",
        "send-verification",
        "content-review",
        "content-visibility",
      ].includes(action.dataset.action)
    )
      return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      if (action.dataset.action === "generate-key") {
        const result = await api("/api/keys", {
          method: "POST",
          body: JSON.stringify({ label: "ANS browser tool" }),
        });
        store.key = result.key;
        render();
        notify("新的 API Key 已生成，仅显示这一次。");
      }
      if (action.dataset.action === "send-verification") {
        await api("/api/auth/request-email-verification", {
          method: "POST",
          body: "{}",
        });
        notify("验证邮件已发送。");
      }
      if (action.dataset.action === "review") {
        const payload = { result: action.dataset.result };
        if (payload.result === "reject") {
          const reason = window.prompt("请输入拒绝原因，将显示给提交者：");
          if (reason === null) return;
          payload.reason = reason;
        }
        await api(
          `/api/admin/submissions/${encodeURIComponent(action.dataset.id)}/review`,
          { method: "POST", body: JSON.stringify(payload) },
        );
        await refreshData();
        notify(
          action.dataset.result === "approve"
            ? "已经有人能看见这段内容了。"
            : "这段内容暂时没有公开，原因已留给提交者。",
        );
        render();
      }
      if (action.dataset.action === "revoke-key") {
        if (!window.confirm("撤销后，使用这个 Key 的工具将无法再写入。"))
          return;
        await api(`/api/keys/${encodeURIComponent(action.dataset.id)}`, {
          method: "DELETE",
        });
        if (store.key) store.key = "";
        await refreshData();
        notify("API Key 已撤销。");
        render();
      }
      if (action.dataset.action === "report") {
        const reason = window.prompt("请简要说明举报原因：");
        if (reason === null) return;
        await api("/api/reports", {
          method: "POST",
          body: JSON.stringify({
            type: action.dataset.type,
            targetId: action.dataset.id,
            reason,
          }),
        });
        notify("举报已提交，管理员会处理。");
      }
      if (action.dataset.action === "resolve-report") {
        await api(
          `/api/admin/reports/${encodeURIComponent(action.dataset.id)}/resolve`,
          { method: "POST", body: "{}" },
        );
        await refreshData();
        notify("举报已标记为已处理。");
        render();
      }
      if (action.dataset.action === "content-review") {
        const reason =
          action.dataset.result === "reject"
            ? window.prompt("请简要说明拒绝原因：")
            : "";
        if (reason === null) return;
        const endpoint =
          action.dataset.kind === "creator-story"
            ? `/api/admin/creator-stories/${encodeURIComponent(action.dataset.id)}/review`
            : `/api/admin/topic-responses/${encodeURIComponent(action.dataset.id)}/review`;
        await api(endpoint, {
          method: "POST",
          body: JSON.stringify({
            result: action.dataset.result,
            ...(reason ? { reason } : {}),
          }),
        });
        await refreshData();
        notify(
          action.dataset.result === "approve" ? "内容已公开。" : "内容已拒绝。",
        );
        render();
      }
      if (action.dataset.action === "content-visibility") {
        const visibilityAction = action.dataset.result;
        const verb = visibilityAction === "hide" ? "隐藏" : "恢复";
        if (!window.confirm(`${verb}这篇实录？隐藏后它不会出现在公共页面。`)) return;
        await api(`/api/admin/creator-stories/${encodeURIComponent(action.dataset.id)}/visibility`, {
          method: "POST",
          body: JSON.stringify({ action: visibilityAction }),
        });
        await refreshData();
        notify(visibilityAction === "hide" ? "实录已隐藏，可以在这里恢复。" : "实录已恢复公开。");
        render();
      }
      if (action.dataset.action === "logout") {
        await api("/api/auth/logout", { method: "POST", body: "{}" });
        store.key = "";
        await refreshData();
        notify("已退出登录。");
        route("/");
      }
    } catch (error) {
      notify(error.message);
    }
  },
  true,
);
document.addEventListener(
  "submit",
  async (event) => {
    const form = event.target;
    const formType = form.dataset.form;
    if (
      !formType ||
      (![
        "auth-setup",
        "auth-login",
        "auth-register",
        "auth-verify",
        "auth-reset-request",
        "auth-reset-password",
        "editor",
        "topic-response",
        "profile",
        "creator-story",
      ].includes(formType) &&
        !formType.startsWith("submit-"))
    )
      return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      if (formType === "auth-setup") await authenticate(form, "setup");
      if (formType === "auth-login") await authenticate(form, "login");
      if (formType === "auth-register") await authenticate(form, "register");
      if (formType === "auth-verify") await verifyEmail(form);
      if (formType === "auth-reset-request") await requestPasswordReset(form);
      if (formType === "auth-reset-password") await resetPassword(form);
      if (formType.startsWith("submit-"))
        await submitToServer(formType.replace("submit-", ""), form);
      if (formType === "editor")
        await saveEditorToServer(
          form,
          event.submitter?.dataset.editorMode || "save",
        );
      if (formType === "topic-response") await submitTopicResponse(form);
      if (formType === "profile") await savePublicProfile(form);
      if (formType === "creator-story") await submitCreatorStory(form);
    } catch (error) {
      notify(error.message);
    }
  },
  true,
);
window.addEventListener("popstate", render);
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
async function boot() {
  app.innerHTML =
    '<main class="section-frame loading-state">正在连接 ANS...</main>';
  try {
    await refreshData();
    render();
  } catch (error) {
    app.innerHTML = `<main class="section-frame loading-state"><h1>ANS 暂时无法连接</h1><p>${esc(error.message)}</p></main>`;
  }
}
boot();
