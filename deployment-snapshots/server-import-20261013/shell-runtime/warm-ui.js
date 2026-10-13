const warmSeedIds = new Set([
  "idea-voice",
  "idea-map",
  "idea-archive",
  "project-studio",
  "project-access",
  "project-civic",
  "help-corpus",
  "help-motion",
]);

function warmIsReal(item) {
  return item && !warmSeedIds.has(item.id);
}

function warmProjectStatus(item) {
  if (item?.recruiting) return "这里还留了位置";
  return (
    {
      刚开始: "刚刚出发",
      推进中: "正在一起做",
      已结束: "这段路已经留下",
    }[item?.status] || item?.status || "正在路上"
  );
}

function warmIntro(title, copy, action = "", note = "这里的灯还亮着") {
  return `<section class="section-frame warm-page-intro"><p><i aria-hidden="true"></i>${esc(note)}</p><h1>${esc(title)}</h1><div><span>${esc(copy)}</span>${action}</div></section>`;
}

function warmEmpty(title, copy, action = "") {
  return `<section class="warm-empty"><span aria-hidden="true">○</span><div><h2>${esc(title)}</h2><p>${esc(copy)}</p>${action}</div></section>`;
}

function warmTopicBlock(topic) {
  if (!topic) return "";
  return `<section class="section-frame warm-shared-question"><header><span>这周，我们别走散</span><p>不急着给答案，先确认你不是一个人。</p></header><div><article><small>本周共同问题</small><h2>${esc(topic.title)}</h2><p>${esc(topic.statement)}</p></article><nav aria-label="回应本周共同问题"><a href="/topics/${esc(topic.slug)}" data-route><b>我也在经历</b><span>说说最近发生了什么</span></a><a href="/topics/${esc(topic.slug)}" data-route><b>我走过这段</b><span>留下真实经验，不包装答案</span></a><a href="/topics/${esc(topic.slug)}" data-route><b>我愿意一起试</b><span>从一个小行动开始</span></a></nav></div></section>`;
}

function warmStoryRow(story) {
  return `<a class="warm-story-row ${attachmentVisual(story) ? "has-visual" : ""}" href="/stories/${esc(story.id)}" data-route>${attachmentVisual(story)}<div><span>${esc(story.authorName)} / ${esc(story.role)}</span><h3>${esc(story.hook)}</h3><p>${esc(story.problem)}</p><strong>看看这段真实经历 <i aria-hidden="true">→</i></strong></div></a>`;
}

function warmIdeaRow(item) {
  return `<a class="warm-experience-row" href="/ideas/${esc(item.id)}" data-route><span>${esc(item.author)} / ${esc(item.date)}</span><h3>${esc(item.title)}</h3><p>${esc(item.body)}</p></a>`;
}

function warmHome() {
  const topic = currentTopic();
  const stories = (store.creatorStories || []).filter(warmIsReal).slice(0, 2);
  const ideas = (store.ideas || []).filter(warmIsReal).slice(0, 3);
  const projects = (store.projects || [])
    .filter((item) => warmIsReal(item) && item.recruiting)
    .slice(0, 3);
  const methods = (store.tutorials || []).slice(0, 3);
  const peopleSection =
    stories.length || ideas.length
      ? `<section class="section-frame warm-people"><header><span>有人和你一样</span><h2>不一定有标准答案。<br />但有人愿意说实话。</h2></header><div>${stories.map(warmStoryRow).join("")}${ideas.map((item) => `<a class="warm-experience-row" href="/ideas/${esc(item.id)}" data-route><span>${esc(item.author)} / ${esc(item.date)}</span><h3>${esc(item.title)}</h3><p>${esc(item.body)}</p><strong>我也在这段路上 <i aria-hidden="true">→</i></strong></a>`).join("")}</div></section>`
      : `<section class="section-frame warm-people">${warmEmpty("这里还没有人先开口", "我们不会用虚构的人和热度填满这个位置。如果你愿意，可以留下第一段真实处境。", actionLink("说说我最近的处境", "/submit/idea", "outline-action"))}</section>`;
  return shell(
    `<section class="warm-night-hero"><div class="warm-outside-flow" aria-hidden="true"><span>模型继续更新</span><span>工具继续出现</span><span>规则仍在变化</span><span>模型继续更新</span><span>工具继续出现</span></div><div class="section-frame warm-hero-room"><div><p class="warm-presence"><i></i>ANS / 这里有人</p><h1>AI 不会停下。<br /><mark>我们别走散。</mark></h1><p>模型还会更新，工具还会出现，规则也会继续变化。ANS 不保证让你永远领先，只希望你往前走的时候，身边还有人。</p><div class="hero-actions">${actionLink("看看这里还有谁", "/wall")}${actionLink("说说我最近的处境", "/submit/idea", "plain-action")}</div></div><aside aria-label="ANS 的一盏灯"><div class="warm-window"><span></span><span></span><span></span><span></span><i></i></div><p>AI Never Stop 描述的是这个时代，<br />不是一道要求人永远奔跑的命令。</p></aside></div></section><section class="section-frame warm-feelings"><p>你最近是不是也有点跟不上？</p><div><span>刚弄懂一个工具，新的又来了。</span><span>看见别人不断发布成果，开始怀疑自己的速度。</span><span>收藏了很多教程，却越来越不知道真正该做什么。</span><span>有些担心，身边的人并不真的理解。</span></div><footer>这些感受不需要被包装成答案。先被看见，就已经不是一个人的事。</footer></section>${peopleSection}${warmTopicBlock(topic)}<section class="warm-together"><div class="section-frame"><header><span>一起做点什么</span><h2>不必一个人<br />把事情做完。</h2><p>有人缺的那一块，也许刚好是你。加入之后，先从一件具体的小事开始。</p></header>${projects.length ? `<div>${projects.map((item) => `<a href="/projects/${esc(item.id)}" data-route><span>${esc(warmProjectStatus(item))}</span><h3>${esc(item.title)}</h3><p>${esc(item.progress)}</p><strong>看看这里缺什么 <i aria-hidden="true">→</i></strong></a>`).join("")}</div>` : warmEmpty("这里暂时还没有真实招募", "等有人把需要说清楚，这里才会亮起一个位置。", actionLink("发起一件想一起做的事", "/submit/project", "outline-action"))}<a class="warm-section-link" href="/projects" data-route>看看所有正在路上的事 <span>→</span></a></div></section><section class="section-frame warm-routes"><header><span>别人走过的路</span><h2>不需要把所有工具都学会。</h2><p>先找到和你眼下处境有关的一段路。有效的步骤留下，失败的地方也留下。</p></header><div>${methods.map((item, index) => `<a href="/tutorials/${esc(item.id)}" data-route><b>0${index + 1}</b><span>${esc(item.author)}</span><h3>${esc(item.title)}</h3><p>${esc(item.summary)}</p><i aria-hidden="true">→</i></a>`).join("")}</div></section><section class="section-frame warm-closing"><div class="warm-window small"><span></span><span></span><span></span><span></span><i></i></div><div><p>AI 还会继续往前。</p><h2>累了可以停一下。<br />回来时，这里还有人。</h2>${actionLink("在这里留下一句话", "/submit/idea")}</div></section>`,
  );
}

let warmMotionCleanup = () => {};

function initWarmMotion() {
  warmMotionCleanup();
  warmMotionCleanup = () => {};
  const root = document.querySelector("#app main");
  if (
    !root ||
    !root.querySelector(
      ".warm-night-hero, .warm-page-intro, .warm-wall-stream, .warm-topic-detail, .warm-project-list, .warm-help-list, .warm-route-list, .warm-submit, .warm-auth, .warm-about-hero, .warm-person",
    )
  )
    return;

  const hero = root.querySelector(".warm-night-hero");
  if (hero) {
    const heading = hero.querySelector("h1");
    if (heading)
      heading.innerHTML =
        "<span>AI 不会停下。</span><br /><mark><span>我们别走散。</span></mark>";
    hero.querySelector(".warm-hero-room > aside")?.remove();
  }

  const addBackdrop = (element, source, eager = false) => {
    if (!element || element.querySelector(":scope > .warm-bg-media")) return;
    element.classList.add("warm-immersive");
    element.insertAdjacentHTML(
      "afterbegin",
      `<img class="warm-bg-media" ${eager ? `src="${source}" fetchpriority="high" data-warm-parallax width="1024" height="1024"` : `data-warm-src="${source}" width="1536" height="1024"`} alt="" aria-hidden="true" decoding="async" />`,
    );
  };
  if (path() === "/") {
    addBackdrop(hero, "/ans-night-lamp-hero-square-lite-v1.webp", true);
    addBackdrop(root.querySelector(".warm-feelings"), "/ans-bg-feelings-v1.webp");
    addBackdrop(root.querySelector(".warm-people"), "/ans-bg-people-v1.webp");
    addBackdrop(root.querySelector(".warm-shared-question"), "/ans-bg-topic-v1.webp");
    addBackdrop(root.querySelector(".warm-together"), "/ans-bg-together-v1.webp");
    addBackdrop(root.querySelector(".warm-routes"), "/ans-bg-routes-v1.webp");
    const closing = root.querySelector(".warm-closing");
    closing?.querySelector(".warm-window")?.remove();
    addBackdrop(closing, "/ans-bg-closing-v1.webp");
  }

  const backdropObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const image = entry.target;
        image.src = image.dataset.warmSrc;
        delete image.dataset.warmSrc;
        backdropObserver.unobserve(image);
      });
    },
    { rootMargin: "0px", threshold: 0.05 },
  );
  root
    .querySelectorAll(".warm-bg-media[data-warm-src]")
    .forEach((image) => backdropObserver.observe(image));

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.classList.add("warm-motion-root");
  if (reduced) {
    root.classList.add("warm-motion-reduced");
    warmMotionCleanup = () => backdropObserver.disconnect();
    return;
  }

  if (hero) requestAnimationFrame(() => hero.classList.add("warm-motion-start"));
  const revealTargets = [
    ...root.querySelectorAll(
      ":scope > section:not(.warm-night-hero):not(.warm-immersive), :scope > article:not(.warm-immersive)",
    ),
    ...root.querySelectorAll(
      ".warm-immersive:not(.warm-night-hero) > :not(.warm-bg-media)",
    ),
  ];
  revealTargets.forEach((element, index) => {
    element.dataset.warmReveal = "";
    element.style.setProperty("--warm-reveal-order", String(index % 3));
  });
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("warm-revealed");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );
  revealTargets.forEach((element) => observer.observe(element));

  const parallax = root.querySelector("[data-warm-parallax]");
  let frame = 0;
  const updateParallax = () => {
    frame = 0;
    if (!parallax || window.innerWidth < 769) return;
    const rect = parallax.getBoundingClientRect();
    const progress =
      (rect.top + rect.height / 2 - window.innerHeight / 2) /
      window.innerHeight;
    const offset = Math.max(-12, Math.min(12, progress * -10));
    parallax.style.setProperty("--warm-parallax", `${offset.toFixed(2)}px`);
  };
  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(updateParallax);
  };
  if (parallax) {
    updateParallax();
    window.addEventListener("scroll", onScroll, { passive: true });
  }
  warmMotionCleanup = () => {
    backdropObserver.disconnect();
    observer.disconnect();
    window.removeEventListener("scroll", onScroll);
    if (frame) cancelAnimationFrame(frame);
  };
}

function warmWall() {
  const topic = currentTopic();
  const stories = (store.creatorStories || []).filter(warmIsReal);
  const ideas = (store.ideas || []).filter(warmIsReal);
  return shell(
    `${warmIntro("有人在这里", "看看同路人正在经历什么、试过什么。也许有人正走在和你一样的这段路上。", actionLink("说说我最近的处境", "/submit/idea"), "不必证明自己跟得上")}${warmTopicBlock(topic)}<section class="section-frame warm-wall-stream"><header><span>我也在经历</span><h2>不是成果展。<br />只是一些真实的此刻。</h2></header>${stories.length || ideas.length ? `<div>${stories.map(warmStoryRow).join("")}${ideas.map((item) => `<a class="warm-experience-row" href="/ideas/${esc(item.id)}" data-route><span>${esc(item.author)} / ${esc(item.date)}</span><h3>${esc(item.title)}</h3><p>${esc(item.body)}</p><strong>打开这段经历 <i aria-hidden="true">→</i></strong></a>`).join("")}</div>` : warmEmpty("这里暂时还没人先开口", "我们不使用默认示例冒充真实同路人。第一段经历，会从一个愿意说实话的人开始。", actionLink("留下第一段真实处境", "/submit/idea", "outline-action"))}</section><section class="section-frame warm-wall-actions"><a href="/tutorials" data-route><span>我走过这段</span><h2>看看别人留下的方法与失败。</h2><i>→</i></a><a href="/projects" data-route><span>我愿意一起试</span><h2>找一件可以和别人一起做的小事。</h2><i>→</i></a></section>`,
  );
}

function warmTopicDetail(topic) {
  if (!topic) return notFound();
  const responses = (store.topicResponses || []).filter(
    (item) => item.topicSlug === topic.slug,
  );
  const relatedProjects = (store.projects || [])
    .filter((item) => warmIsReal(item) && item.recruiting)
    .slice(0, 3);
  const isOpen = topic.status === "公开";
  return shell(
    `<section class="section-frame warm-back"><a href="/wall" data-route>← 回到有人在这里</a></section><article class="section-frame warm-topic-detail"><header><p><i></i>这周，我们别走散</p><h1>${esc(topic.title)}</h1><span>${esc(topic.statement)}</span></header><section class="warm-topic-prompt"><strong>不用证明自己跟得上</strong><p>${esc(topic.challenge)}</p></section>${isOpen ? `<section class="warm-response-form"><h2>如果愿意，说说你的这段路。</h2><p>不超过 280 字。公开前会先确认内容，保护好说话的人和被提到的人。</p>${session ? `<form data-form="topic-response" data-topic="${esc(topic.slug)}"><fieldset><legend>哪一种更接近你现在的位置？</legend>${["我也在经历", "我走过这段", "我愿意一起试"].map((stance, index) => `<label class="stance-option"><input type="radio" name="stance" value="${stance}" ${index === 0 ? "checked" : ""}/><span>${stance}</span></label>`).join("")}</fieldset>${formField("具体说说", "body", { type: "textarea", required: true, placeholder: "最近发生了什么？你试过什么？希望遇见怎样的同路人？" })}${attachmentField()}<button class="dark-action" type="submit">把这段经历留下 <span aria-hidden="true">→</span></button></form>` : actionLink("登录后留下这段经历", "/auth")}</section>` : `<section class="warm-response-form">${warmEmpty("这道问题还没有开放回应", "你可以先读一读。等它亮起时，再回来留下自己的经历。")}</section>`}</article><section class="section-frame warm-response-list"><header><span>已经有人说起这件事</span><strong>${responses.length ? `${responses.length} 段真实回应` : "这里暂时还没人先开口"}</strong></header>${responses.length ? responses.map((item) => `<article><span>${esc(item.stance)}</span><h2>${esc(item.author)}</h2><p>${esc(item.body)}</p>${attachmentLinks(item)}</article>`).join("") : warmEmpty("第一段话还没有出现", "不需要给出标准答案，只需要从自己的真实处境说起。")}</section>${relatedProjects.length ? `<section class="section-frame warm-related-projects"><header><span>如果愿意，可以一起试</span><h2>这里还有可以加入的事。</h2></header><div>${relatedProjects.map((item) => `<a href="/projects/${esc(item.id)}" data-route><span>${esc(warmProjectStatus(item))}</span><strong>${esc(item.title)}</strong><i aria-hidden="true">→</i></a>`).join("")}</div></section>` : ""}`,
  );
}

function warmIdeaDetail(item) {
  if (!item || !warmIsReal(item)) return notFound();
  return shell(
    `<section class="section-frame warm-back"><a href="/wall" data-route>← 回到有人在这里</a></section><article class="section-frame warm-record-detail"><header><span>${esc(item.author)} / ${esc(item.date)}</span><h1>${esc(item.title)}</h1></header><p class="warm-record-body">${esc(item.body)}</p>${attachmentLinks(item)}<footer><p>如果你也在经历相似的事，可以温和地搭句话。</p><button class="dark-action" data-action="contact" data-name="${esc(item.author)}" data-contact="${esc(item.contact)}" data-public="${item.openContact}">我想和你聊聊 <span aria-hidden="true">→</span></button><a class="plain-action" href="/submit/idea" data-route>我也想留下一段</a>${reportButton("idea", item.id)}</footer></article>`,
  );
}

function warmStoryDetail(story) {
  if (!story) return notFound();
  const section = (title, value) =>
    `<section><h2>${title}</h2><p>${esc(value)}</p></section>`;
  return shell(
    `<section class="section-frame warm-back"><a href="/wall" data-route>← 回到有人在这里</a></section><article class="section-frame warm-story-detail"><header><p>一段已授权的真实经历</p><h1>${esc(story.hook)}</h1><span>${esc(story.authorName)} / ${esc(story.role)}</span>${story.profileSlug ? `<a href="/people/${esc(story.profileSlug)}" data-route>看看这位同路人最近在做什么 →</a>` : ""}</header>${attachmentVisual(story)}<div>${section("我当时在经历什么", story.role)}${section("真正让我不安或卡住的地方", story.problem)}${section("我试过什么，AI 帮到了哪里", story.aiSteps)}${section("哪个判断仍然属于我", story.humanJudgement)}${section("后来发生了什么", story.outcome)}${section("我现在希望遇见谁", story.nextStep)}</div>${attachmentLinks(story)}<footer>${actionLink("我也想说说最近的处境", "/submit/idea", "outline-action")}</footer></article>`,
  );
}

function warmPersonPage(profile) {
  if (!profile) return notFound();
  const stories = (store.creatorStories || []).filter(
    (story) => story.profileSlug === profile.slug || story.authorName === profile.displayName,
  );
  const ideas = (store.ideas || []).filter(
    (item) => warmIsReal(item) && item.author === profile.displayName,
  );
  return shell(
    `<section class="section-frame warm-person"><p><i></i>一位同路人</p><h1>${esc(profile.displayName)}</h1><span>${esc(profile.bio || "这位同路人还没有写下公开介绍。")}</span><div class="profile-tags">${(profile.tags || []).map((tag) => `<span>${esc(tag)}</span>`).join("")}</div><section><h2>最近在经历和尝试什么</h2>${stories.length || ideas.length ? `${stories.map(warmStoryRow).join("")}${ideas.map(warmIdeaRow).join("")}` : warmEmpty("暂时没有公开记录", "真实经历会在本人授权并通过确认后出现在这里。")}</section></section>`,
  );
}

function warmProjects() {
  const filters = ["全部", "招募中", "刚开始", "推进中", "已结束"];
  const items = store.projects.filter(
    (item) =>
      warmIsReal(item) &&
      (ui.projectFilter === "全部" ||
        (ui.projectFilter === "招募中"
          ? item.recruiting
          : item.status === ui.projectFilter)),
  );
  return shell(
    `${warmIntro("一起做点什么", "不必一个人把事情做完。看看这里还有哪些位置，和谁可以从一件小事开始。", actionLink("发起一件想一起做的事", "/submit/project"), "不保证结果，但可以一起试")}<section class="section-frame warm-filter" aria-label="项目筛选">${filters.map((label) => `<button class="filter-chip ${ui.projectFilter === label ? "selected" : ""}" data-action="project-filter" data-value="${label}">${label === "招募中" ? "这里还留了位置" : label}</button>`).join("")}</section><section class="section-frame warm-project-list">${items.length ? items.map((item) => `<a href="/projects/${esc(item.id)}" data-route><span>${esc(warmProjectStatus(item))}</span><div><h2>${esc(item.title)}</h2><p>${esc(item.summary)}</p></div><aside><small>最近发生</small><p>${esc(item.progress)}</p><strong>${item.recruiting ? "看看我能从哪里加入" : "看看这段路"} →</strong></aside></a>`).join("") : warmEmpty("这个位置暂时是空的", "我们不会用示例项目制造热闹。等一个真实的人把需要说清楚，这里才会出现新的同行邀请。", actionLink("先发起一件事", "/submit/project", "outline-action"))}</section>`,
  );
}

function warmProjectDetail(item) {
  if (!item || !warmIsReal(item)) return notFound();
  return shell(
    `<section class="section-frame warm-back"><a href="/projects" data-route>← 回到一起做点什么</a></section><article class="section-frame warm-project-detail"><header><span>${esc(warmProjectStatus(item))}</span><h1>${esc(item.title)}</h1><p>${esc(item.summary)}</p></header>${attachmentLinks(item)}<div><section><h2>最近走到这里</h2><p>${esc(item.progress)}</p></section><section><h2>如果你加入</h2><p>${esc(item.offer || "先和发起人确认一件具体、可完成的小事。")}</p></section></div><footer><span>发起这件事的人 / ${esc(item.author)}</span><button class="dark-action" data-action="contact" data-name="${esc(item.author)}" data-contact="${esc(item.contact)}" data-public="${item.openContact}">${item.recruiting ? "我想从一小步开始" : "我想和发起人聊聊"} <span aria-hidden="true">→</span></button>${reportButton("project", item.id)}</footer></article>`,
  );
}

function warmHelp() {
  const items = store.help.filter(warmIsReal);
  return shell(
    `${warmIntro("搭把手", "把眼下的具体卡点说出来，也写下你可以怎样回应另一位同路人。", actionLink("说说哪里需要搭把手", "/submit/help"), "求助不等于落后")}<section class="section-frame warm-help-note"><p>ANS 只帮助大家看见彼此的需要，不代收款、不担保交易。联系前，请先确认边界和回报。</p></section><section class="section-frame warm-help-list">${items.length ? items.map((item) => `<article><header><span>${esc(item.author)}</span><h2>${esc(item.title)}</h2></header><div><section><small>我现在卡在</small><p>${esc(item.need)}</p></section><section><small>我可以回给你</small><p>${esc(item.give)}</p></section></div><footer><button class="dark-action" data-action="contact" data-name="${esc(item.author)}" data-contact="${esc(item.contact)}" data-public="${item.openContact}">我也许能搭把手 <span aria-hidden="true">→</span></button></footer></article>`).join("") : warmEmpty("暂时还没有真实的求助", "我们不会用示例请求假装这里很热闹。你可以把第一个具体卡点说出来。", actionLink("留下第一个真实需要", "/submit/help", "outline-action"))}</section>`,
  );
}

function warmTutorials() {
  const query = ui.tutorialQuery.trim().toLowerCase();
  const items = store.tutorials.filter(
    (item) =>
      !query ||
      `${item.title} ${item.summary} ${item.author}`
        .toLowerCase()
        .includes(query),
  );
  return shell(
    `${warmIntro("走过的路", "不要求把所有工具都学会。先找一段和你眼下处境有关的路。", "", "有人把走通的步骤和失败都留了下来")}<section class="section-frame warm-library-head"><div><h2>你现在想走哪一段？</h2><p>输入一个问题、场景或正在做的事。</p></div><label class="search-field"><span class="sr-only">搜索走过的路</span><input type="search" value="${esc(ui.tutorialQuery)}" placeholder="例如：工作流、研究、公开测试" data-input="tutorial-search" /></label></section><section class="section-frame warm-route-list">${items.map((item, index) => `<a href="/tutorials/${esc(item.id)}" data-route><b>0${index + 1}</b><div><span>由 ${esc(item.author)} 留下</span><h2>${esc(item.title)}</h2><p>${esc(item.summary)}</p></div><strong>看看这段路 <i aria-hidden="true">→</i></strong></a>`).join("") || warmEmpty("没有找到这一段", "换一个更接近真实处境的关键词试试。")}</section>`,
  );
}

function warmTutorialDetail(item) {
  if (!item) return notFound();
  const steps = Array.isArray(item.content)
    ? item.content
    : String(item.steps || "")
        .split("\n")
        .filter(Boolean);
  return shell(
    `<section class="section-frame warm-back"><a href="/tutorials" data-route>← 回到走过的路</a></section><article class="section-frame warm-tutorial-detail"><header><span>由 ${esc(item.author)} 留下的一段路</span><h1>${esc(item.title)}</h1><p>${esc(item.summary)}</p>${attachmentLinks(item)}</header><div class="warm-route-context"><section><h2>什么时候适合走这段</h2><p>${esc(item.summary)}</p></section><section><h2>开始前先确认</h2><p>你有一个真实任务，也愿意记录没有通过的地方。工具不必完全相同。</p></section></div><section class="warm-route-steps"><h2>这段路怎么走</h2><ol>${steps.map((step) => `<li><span></span><p>${esc(step)}</p></li>`).join("")}</ol></section><section class="warm-route-review"><h2>失败也要留下</h2><p>每一步都用自己的真实任务检查。没有达到预期时，保留原因、条件和下一次准备怎样改。</p><dl><div><dt>技术参考</dt><dd>依赖 ${item.dependencies || 3}</dd></div><div><dt>已有验证</dt><dd>${item.tests || 2} 项</dd></div></dl></section><footer><a class="outline-action" href="/me/tutorial-drafts/new" data-route>我也想留下一段路 <span aria-hidden="true">→</span></a>${reportButton("tutorial", item.id)}</footer></article>`,
  );
}

function warmAuthPage() {
  const params = new URLSearchParams(location.search);
  if (params.get("verify") || params.get("reset") || setupRequired)
    return authPage();
  const resetLink = store.capabilities?.emailDelivery
    ? `<a class="plain-action auth-reset-link" href="/auth?reset=request" data-route>忘记密码</a>`
    : "";
  return shell(
    `${warmIntro("在这里留个位置", "不承诺让你永远领先。只是在你想回来时，这里还认得你。", "", "AI 继续变化，人可以彼此记得")}<section class="section-frame warm-auth"><form class="submit-form" data-form="auth-login"><p>已经来过</p><h2>回来坐坐</h2>${formField("邮箱", "email", { type: "email", required: true, placeholder: "you@example.com" })}${formField("密码", "password", { type: "password", required: true, placeholder: "输入密码" })}<div class="form-submit"><button class="dark-action" type="submit">回到我的位置 <span aria-hidden="true">→</span></button>${resetLink}</div></form><form class="submit-form" data-form="auth-register"><p>第一次来到这里</p><h2>在这里留个位置</h2>${formField("希望别人怎样称呼你", "displayName", { required: true, placeholder: "你的公开名称" })}${formField("邮箱", "email", { type: "email", required: true, placeholder: "you@example.com" })}${formField("密码", "password", { type: "password", required: true, placeholder: "至少 10 位" })}<button class="outline-action" type="submit">留下我的位置 <span aria-hidden="true">→</span></button></form></section>`,
  );
}

function warmSubmitPage(type) {
  const config = {
    idea: {
      title: "说说我最近的处境",
      copy: "不需要整理成经验，也不需要证明自己跟得上。先从真实发生的事说起。",
      note: "这段话会先经过确认，公开前保护好彼此",
      fields: `${formField("我最近在", "title", { required: true, placeholder: "例如：尝试用 AI 做一支短片，但越来越不知道自己的判断在哪里" })}${formField("真正让我卡住的是", "body", { type: "textarea", required: true, placeholder: "发生了什么？你试过什么？如果有人也在经历这个，你想和他聊什么？" })}${formField("别人怎样联系你", "contact", { required: true, placeholder: "微信、邮箱或其他联系方法" })}${switchField("公开联系方式。关闭后，别人只能发送固定联系话术。", "openContact", false)}${attachmentField()}`,
    },
    project: {
      title: "找人一起做点什么",
      copy: "不用先写宏大愿景。说清现在要做什么、缺什么，以及别人加入后能先做哪一步。",
      note: "先从一件具体的小事开始",
      fields: `${formField("我们想一起做", "title", { required: true, placeholder: "给这件事一个清楚的名字" })}${formField("这件事现在是什么", "summary", { type: "textarea", required: true, placeholder: "它从哪里开始，为什么值得一起试？" })}${formField("目前走到哪里", "progress", { type: "textarea", required: true, placeholder: "已经试过什么，现在缺哪一块？" })}${formField("状态", "status", { type: "select", value: "刚开始", options: ["刚开始", "推进中", "已结束"] })}${switchField("这里还留了位置", "recruiting", false)}${formField("别人加入后的第一步", "offer", { placeholder: "例如：先一起测试一次真实任务" })}${formField("怎样联系发起人", "contact", { required: true, placeholder: "微信、邮箱或其他联系方法" })}${switchField("公开联系方式。关闭后，别人只能发送固定联系话术。", "openContact", false)}${attachmentField()}`,
    },
    help: {
      title: "说说哪里需要搭把手",
      copy: "求助不等于落后。把具体卡点、希望怎样被帮助，以及你可以怎样回应对方写清楚。",
      note: "先把边界和回报说清楚",
      fields: `${formField("这次想请人搭把手", "title", { required: true, placeholder: "例如：想找人一起看一次失败的工作流" })}${formField("我现在卡在", "need", { type: "textarea", required: true, placeholder: "发生了什么？希望别人怎样帮？" })}${formField("我可以回给你", "give", { type: "textarea", required: true, placeholder: "交换经验、付费、互相复盘，或者暂时没有回报，都可以直接说" })}${formField("怎样联系我", "contact", { required: true, placeholder: "微信、邮箱或其他联系方法" })}${switchField("公开联系方式。关闭后，别人只能发送固定联系话术。", "openContact", false)}${switchField("允许别人从这条需要进入我的公开记录。", "profile", true)}${attachmentField()}`,
    },
  }[type];
  if (!config) return notFound();
  return shell(
    `${warmIntro(config.title, config.copy, "", config.note)}<section class="section-frame warm-submit"><form class="submit-form" data-form="submit-${type}">${config.fields}<div class="form-submit"><p>提交后会进入确认。通过后，才会出现在公共页面。</p><button class="dark-action" type="submit">把这段话留下 <span aria-hidden="true">→</span></button></div></form></section>`,
  );
}

function warmCampaignLanding(channel) {
  const topic = currentTopic();
  return shell(
    `<section class="warm-campaign"><div class="warm-outside-flow" aria-hidden="true"><span>模型继续更新</span><span>工具继续出现</span><span>规则仍在变化</span></div><div class="section-frame"><p>从 ${esc(channel.toUpperCase())} 来到 ANS</p><h1>AI 不会停下。<br />我们别走散。</h1><span>这里不卖追赶焦虑，也不要求你证明自己领先。看看同路人正在经历什么，或者留下你最近的真实处境。</span>${topic ? actionLink("看看这周大家在聊什么", `/topics/${topic.slug}`) : actionLink("看看这里还有谁", "/wall")}</div></section>`,
  );
}

function warmAbout() {
  return shell(
    `<section class="warm-about-hero"><div class="section-frame"><p>为什么有 ANS</p><h1>AI 不会停下。<br /><mark>我们别走散。</mark></h1><span>这不是一句要求人永远奔跑的口号，而是我们共同面对的现实。</span></div></section><section class="section-frame warm-manifesto"><p>模型会继续更新，工具会继续出现，规则也会继续变化。</p><p>我们可能兴奋，也会疲惫。有时收藏了很多教程，反而更不知道自己真正想做什么；看见别人不断展示成果，也会怀疑自己是不是已经落后。</p><h2>ANS 不保证让你永远领先。</h2><p>它只想给被这个时代推着往前的人，一个找到同路人、交换真实经验、一起做点东西，也可以暂时喘口气的地方。</p><blockquote>AI Never Stop 描述的是这个时代，<br />不是对人的命令。</blockquote><p>人可以休息，可以迷茫，可以重新选择。这里不卖焦虑，不装领先，也不要求任何人先把自己包装成成功案例。</p><footer><strong>AI 还会继续往前。</strong><span>希望我们仍然能够彼此看见。</span>${actionLink("看看这里还有谁", "/wall")}</footer></section>`,
  );
}
