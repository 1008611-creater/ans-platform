(function(){
'use strict';

var DRILL_DOMAIN = window.KaogongDrillDomain;
if (!DRILL_DOMAIN){
  window.__APP_BOOTED__ = true;
  if (window.__BOOT_TIMER__) clearTimeout(window.__BOOT_TIMER__);
  var failedApp = document.getElementById('app');
  if (failedApp) failedApp.innerHTML = '<div class="wrap"><div class="empty"><p>训练规则没有加载成功，暂时无法开始训练。</p><p>请确认网络正常后重新打开；如果问题仍在，请联系维护者。</p></div></div>';
  return;
}

/* 应用已经成功加载：index.html 里的启动兜底计时器可以停了。
   如果这个文件本身没加载成功（404 / 语法错误），兜底提示会接管页面，避免一直停在「正在打开题本…」。 */
window.__APP_BOOTED__ = true;
if (window.__BOOT_TIMER__){ clearTimeout(window.__BOOT_TIMER__); }

/* ================= 基础工具 ================= */
var SS = 'kaogong.v1';
var $app = document.getElementById('app');
var $toast = document.getElementById('toast');
var toastTimer = null;

function E(tag, attrs, kids){
  var n = document.createElement(tag);
  if (attrs) for (var k in attrs){
    var v = attrs[k];
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'style') n.setAttribute('style', v);
    else if (k.slice(0,2) === 'on') n.addEventListener(k.slice(2).toLowerCase(), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  if (kids !== null && kids !== undefined){
    var arr = Array.isArray(kids) ? kids : [kids];
    for (var i=0;i<arr.length;i++){
      var c = arr[i];
      if (c === null || c === undefined || c === false) continue;
      n.appendChild((typeof c === 'string' || typeof c === 'number') ? document.createTextNode(String(c)) : c);
    }
  }
  return n;
}
function toast(msg){
  $toast.textContent = msg;
  $toast.classList.add('on');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ $toast.classList.remove('on'); }, 1900);
}
function pct(a,b){ return b > 0 ? Math.round(a/b*100) : 0; }
/* ================= 训练计划常量 ================= */
/* 计划口径来自 06-计划与追踪/01-全程总计划.md：26 周、五个阶段、行测与申论并行推进。
   起始日默认按文档的 2026-09-15 起算，用户可以一键改成「从今天起算」，改完只影响周次划分，
   不影响任何已保存的复盘记录（复盘按周次号存，不按日期存）。 */
var PLAN_WEEKS = 26;
var PLAN_ANCHOR = new Date(2026, 8, 15).getTime();
var EXAM_DAY = new Date(2027, 2, 14).getTime();
var PLAN_PHASES = [
  { id:'diag', name:'诊断期', from:1, to:2, goal:'拿到真实基线，知道自己的起点',
    tasks:['做 1 套完整行测（限时 120 分钟），拿到各模块基线', '做 1 套完整申论（限时 150 分钟）',
           '读考情情报，知道考什么、题量怎么分布', '建好错题本和背记卡，把工具跑通'] },
  { id:'xc', name:'行测专项', from:3, to:10, goal:'五大模块逐个突破，正确率达标',
    tasks:['资料分析：每天 1 篇（5 题），限时 7 分钟', '判断推理：每天 20 题，限时 20 分钟',
           '言语理解：每天 20 题，限时 15 分钟', '数量关系：每天 8 题，限时 10 分钟',
           '政治理论：每天 10—15 分钟，文件原文 → 题目辨析 → 错因回填',
           '每周固定：1 套完整行测 + 1 次错题复练'] },
  { id:'sl', name:'申论执法专项', from:3, to:14, goal:'要点命中率 75%，能写执法类规范表述',
    tasks:['归纳概括 + 审题：每天 1 道，限时 18 分钟', '综合分析：每天 1 道，限时 20 分钟',
           '提出对策 + 法律条文：每天 1 道，同时背法律要点', '应用文写作：每 2 天 1 篇',
           '申发论述：每周 1 篇，写完拆解范文', '每周固定：3 道小题（含批改）+ 1 次规范表述积累'] },
  { id:'set', name:'套卷强化', from:11, to:22, goal:'稳定输出，行测 ≥ 75%',
    tasks:['每周 2 套行测（限时）+ 1 套申论（限时）', '每套都走完整 SOP：批改 + 归因 + 回填',
           '每周日复盘：正确率曲线、错因结构、下周重点', '第 15 周起，行测每套目标正确率 ≥ 75%'] },
  { id:'sprint', name:'冲刺期', from:23, to:26, goal:'考场稳定发挥',
    tasks:['行测每周 3 套，保持手感 + 关闭剩余错因', '申论每周 2 套，重点练大作文和时间控制',
           '时政压缩成一页纸，反复过；法律条文库过 3 遍', '考前 7 天不做新题，只复盘错题和笔记'] }
];
/* 复制文本：优先用现代剪贴板，其次用老式方法，都不行就抛错交给调用方兜底 */
function copyText(text){
  return new Promise(function(resolve, reject){
    if (navigator.clipboard && window.isSecureContext !== false){
      navigator.clipboard.writeText(text).then(resolve, function(){ legacyCopy(text) ? resolve() : reject(); });
      return;
    }
    legacyCopy(text) ? resolve() : reject();
  });
}
function legacyCopy(text){
  try {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    var ok = document.execCommand && document.execCommand('copy');
    document.body.removeChild(ta);
    return !!ok;
  } catch(e){ return false; }
}

/* ================= 本地进度 ================= */
function blankState(){
  return { papers:{}, sl:{}, fav:{}, mock:{}, settings:{}, last:null, totalAnswered:0,
           days:{}, acts:{}, know:{}, mocks:[], plan:{ start:0, reviews:{} }, profile:null, training:null,
           drills:[], drill:null, modulePick:null };
}
function loadState(){
  try {
    var raw = localStorage.getItem(SS);
    if (!raw) return blankState();
    var s = JSON.parse(raw);
    if (!s || typeof s !== 'object') return blankState();
    s.papers = s.papers || {}; s.sl = s.sl || {};
    s.fav = s.fav || {}; s.mock = s.mock || {}; s.settings = s.settings || {};
    s.last = s.last || null; s.totalAnswered = s.totalAnswered || 0;
    s.days = s.days || {};
    s.know = s.know || {};
    s.mocks = Array.isArray(s.mocks) ? s.mocks : [];
    s.profile = (s.profile && typeof s.profile === 'object') ? s.profile : null;
    s.training = (s.training && typeof s.training === 'object') ? s.training : null;
    /* v13：模块专项。老进度没有这三个字段，按空补齐；已有作答记录一律不动。 */
    s.drills = Array.isArray(s.drills) ? s.drills : [];
    s.drill = (s.drill && typeof s.drill === 'object') ? normalizeDrill(s.drill) : null;
    s.modulePick = (s.modulePick && typeof s.modulePick === 'object') ? s.modulePick : null;
    /* v9：每日动作计数（周复盘的数据来源）与训练计划。老进度没有这两个字段，按空补齐。 */
    s.acts = s.acts || {};
    s.plan = (s.plan && typeof s.plan === 'object') ? s.plan : { start:0, reviews:{} };
    s.plan.start = s.plan.start || 0;
    s.plan.reviews = (s.plan.reviews && typeof s.plan.reviews === 'object') ? s.plan.reviews : {};
    // 老版本进度没有 reasons / review / skipped / days，这里统一补齐，避免升级后崩溃
    Object.keys(s.papers).forEach(function(k){ normalizePaperRec(s.papers[k]); });
    Object.keys(s.sl).forEach(function(k){ normalizeShenlunRec(s.sl[k]); });
    return s;
  } catch(e){ return blankState(); }
}
/* 补齐行测记录的新字段。老数据只有 answers / cur / updated。 */
function normalizePaperRec(rec){
  if (!rec || typeof rec !== 'object') return rec;
  rec.answers = rec.answers || {};
  rec.reasons = rec.reasons || {};
  rec.review = rec.review || {};
  rec.wrong = rec.wrong || {};
  rec.skipped = rec.skipped || {};
  if (typeof rec.cur !== 'number') rec.cur = 1;
  rec.updated = rec.updated || 0;
  return rec;
}
function normalizeShenlunRec(rec){
  if (!rec || typeof rec !== 'object') return rec;
  rec.revealed = rec.revealed || {};
  rec.read = rec.read || {};
  rec.drafts = rec.drafts || {};
  /* v10：申论批改记录。按题号存逐点命中标记、漏点原因、多余要点、C 卷四查与批改结论。
     老进度没有这个字段，按空补齐；有记录的也不动，批改结果不会被升级清掉。 */
  rec.grade = rec.grade || {};
  /* v11：复批历史。每道题的批改记录里可以带 history[]，存之前几轮的命中率快照。
     老数据没有这个字段，补空数组——没复批过就是没复批过，不编造历史。 */
  Object.keys(rec.grade).forEach(function(no){
    var g = rec.grade[no];
    if (g && !Array.isArray(g.history)) g.history = [];
  });
  if (typeof rec.cur !== 'number') rec.cur = 1;
  rec.updated = rec.updated || 0;
  return rec;
}
/* 补齐专项任务字段。缺字段按默认值补，任何旧结构都不至于把首页打成白屏。 */
function normalizeDrill(d){
  if (!d || typeof d !== 'object') return null;
  d.kind = d.kind === 'review' ? 'review' : 'module';
  d.moduleId = d.moduleId || (d.kind === 'review' ? 'review' : 'data');
  d.questionIds = Array.isArray(d.questionIds) ? d.questionIds.map(String) : [];
  d.reviewIds = Array.isArray(d.reviewIds) ? d.reviewIds.map(String) : [];
  d.sources = (d.sources && typeof d.sources === 'object') ? d.sources : {};
  d.answered = (d.answered && typeof d.answered === 'object') ? d.answered : {};
  d.overdue = (d.overdue && typeof d.overdue === 'object') ? d.overdue : {};
  d.size = Number(d.size) || d.questionIds.length;
  d.limitMs = Number(d.limitMs) || 0;
  d.startedAt = Number(d.startedAt) || 0;
  d.deadlineAt = Number(d.deadlineAt) || 0;
  d.index = Number(d.index) || 0;
  d.status = d.status === 'completed' ? 'completed' : 'active';
  d.completedAt = Number(d.completedAt) || 0;
  d.warned = !!d.warned;
  d.timedOut = !!d.timedOut;
  return d;
}
var ST = loadState();
var saveTimer = null;
function save(){
  /* 专项是跨多套卷的合成视图，合并记录里的改动在落盘前写回各卷的真实记录。 */
  if (typeof EX !== 'undefined' && EX && EX.mode === 'drill' && DRILL_VIEW) drillFlush();
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(function(){
    try { localStorage.setItem(SS, JSON.stringify(ST)); }
    catch(e){ toast('本地存储已满，进度可能无法保存'); }
  }, 120);
}
function pkey(type,id){ return type + ':' + id; }
function getPaperRec(type,id){
  var k = pkey(type,id);
  if (type === 'shenlun'){
    if (!ST.sl[k]) ST.sl[k] = { revealed:{}, read:{}, drafts:{}, grade:{}, cur:1, updated:0 };
    return normalizeShenlunRec(ST.sl[k]);
  }
  if (!ST.papers[k]) ST.papers[k] = { answers:{}, cur:1, updated:0 };
  return normalizePaperRec(ST.papers[k]);
}
function countAnswered(rec){ return rec && rec.answers ? Object.keys(rec.answers).length : 0; }
/* 错题集合：只靠 rec.answers 判断不了对错（要比对题目答案），而统计页、首页要的
   是「不看题目也能算出来」的口径，所以在答错的当下把结论落到本地。
   答对、重做、跳过都会把它清掉。 */
function markWrong(rec, no, isWrong){
  if (!rec) return;
  rec.wrong = rec.wrong || {};
  if (isWrong) rec.wrong[no] = 1;
  else delete rec.wrong[no];
}
function countCorrect(rec, paper){
  if (!rec || !rec.answers || !paper) return 0;
  var n = 0, qs = allQuestions(paper);
  for (var i=0;i<qs.length;i++){
    var q = qs[i], sel = rec.answers[q.no];
    if (sel && normAns(q.answer) === String(sel)) n++;
  }
  return n;
}
/* ---------- 收藏 ---------- */
function favKey(type,id){ return type + ':' + id; }
function favList(type,id){
  var k = favKey(type,id);
  if (!ST.fav[k]) ST.fav[k] = {};
  return ST.fav[k];
}
function isFav(type,id,no){ return !!favList(type,id)[no]; }
function toggleFav(type,id,no){
  var f = favList(type,id);
  if (f[no]){ delete f[no]; toast('已取消收藏'); }
  else { f[no] = Date.now(); toast('已收藏，可在「收藏」里集中复习'); }
  save();
  return !!f[no];
}
function countFav(type,id){
  var f = ST.fav[favKey(type,id)];
  return f ? Object.keys(f).length : 0;
}
function favPaperIds(){
  return Object.keys(ST.fav).filter(function(k){ return Object.keys(ST.fav[k]||{}).length > 0; });
}

/* ---------- 字号 ---------- */
function fontSize(){
  var n = ST.settings && ST.settings.font;
  return (n === 0 || n === 1 || n === 2) ? n : 1;
}
function applyFontSize(){
  try { document.documentElement.setAttribute('data-font', String(fontSize())); } catch(e){}
}
function cycleFont(){
  ST.settings.font = (fontSize() + 1) % 3;
  applyFontSize();
  save();
  toast(['字号：小', '字号：标准', '字号：大'][ST.settings.font]);
}

function isGraphQ(q){
  var o = q.options || [];
  if (!o.length) return true;
  for (var i=0;i<o.length;i++){ if (o[i].text && o[i].text.trim()) return false; }
  return true;
}
function countWords(s){
  if (!s) return 0;
  // 中文按字计，去掉空白与换行
  return String(s).replace(/\s+/g, '').length;
}
/* 申论字数要求：题干才是权威来源。上游数据只存了一个数字，且这个数字对
   「不少于1000字」和「1000~1200字」存的是下限，直接当上限用会显示成「≤1000字」，
   写到 1000 字以上反而标红——正好和真实要求相反。这里统一从题干解析。
   注意：题干里的空格在导入时已保留，先去掉空白再匹配，避免「1 000 字」这类断行。 */
var WL_RANGE = /(\d{2,4})\s*[~\uFF5E\u2014\u2013\uFF0D\-至到]{1,2}\s*(\d{2,4})\s*字/;
var WL_MIN   = /(?:不少于|不低于|至少|不得少于)\s*(\d{2,4})\s*字/;
var WL_MAX   = /(?:不超过|不多于|至多|最多|控制在)\s*(\d{2,4})\s*字/;
var WL_ABOUT = /(\d{2,4})\s*字(?:左右|上下|以内)/;
function wordRequirement(q){
  var s = String((q && q.stem) || '').replace(/\s+/g, '');
  var m;
  m = WL_RANGE.exec(s);
  if (m) return { kind:'range', min:Number(m[1]), max:Number(m[2]), label:m[1] + '~' + m[2] + ' 字' };
  m = WL_MIN.exec(s);
  if (m) return { kind:'min', min:Number(m[1]), max:0, label:'不少于 ' + m[1] + ' 字' };
  m = WL_MAX.exec(s);
  if (m) return { kind:'max', min:0, max:Number(m[1]), label:'不超过 ' + m[1] + ' 字' };
  m = WL_ABOUT.exec(s);
  if (m) return { kind:'about', min:0, max:0, target:Number(m[1]), label:m[1] + ' 字左右' };
  var wl = Number((q && q.wordLimit) || 0);
  if (wl > 0) return { kind:'max', min:0, max:wl, label:'不超过 ' + wl + ' 字' };
  return null;
}
/* 作答字数提示：低于下限提醒还差多少（黄），超过上限标红，区间题两头都管 */
function wordCounter(n, req){
  if (!req) return { text:n + ' 字', cls:'wcount' };
  var cls = 'wcount';
  if (req.max && n > req.max) cls = 'wcount over';
  else if (req.min && n < req.min) cls = 'wcount short';
  return { text:n + ' 字 / ' + req.label, cls:cls };
}
function normAns(a){ return String(a === null || a === undefined ? '' : a).trim().toUpperCase(); }
function allQuestions(paper){
  if (!paper) return [];
  if (paper.subject === '申论') return paper.questions || [];
  var out = [];
  (paper.sections||[]).forEach(function(s){ (s.questions||[]).forEach(function(q){
    q._sec = s.name;
    /* 图形题原图：按「卷 → 模块 → 题号」三级取，材料图按「卷 → 模块 → 材料号」取 */
    var im = secImgs(paper, s.name);
    q._secOrig = s.name;
    if (im){
      if (im.q && im.q[String(q.no)]) q._imgs = im.q[String(q.no)];
      if (im.m && q.materialNo !== null && q.materialNo !== undefined && im.m[String(q.materialNo)]) q._matImgs = im.m[String(q.materialNo)];
    }
    // 2026 河北行测的开源数据把前 30 题统一标为“常识判断”。公开回忆版将其拆为政治理论 20 题、常识 10 题；统一在应用层修正，避免模块统计和错题归因被错误标签污染。
    if (String(paper.paperId || paper.id) === '484'){
      if (q.no <= 20) q._sec = '政治理论（暂定）';
      else if (q.no <= 30) q._sec = '常识判断（暂定）';
    }
    q._mat = (s.materials||[]).filter(function(m){return m.no===q.materialNo;})[0] || null; out.push(q);
  }); });
  return out;
}

/* 图片渲染：统一走一个函数，方便点击放大和失败兜底 */
function imgSrc(rel){ return 'data/' + rel; }
function imgBox(rels, cls){
  if (!rels || !rels.length) return null;
  var box = E('div', {class:'qimg ' + (cls||'')});
  rels.forEach(function(rel, i){
    var im = E('img', {src:imgSrc(rel), alt:'第 ' + (i+1) + ' 张原图', loading:'lazy', decoding:'async'});
    im.addEventListener('error', function(){ im.classList.add('broken'); });
    im.addEventListener('click', function(){ openZoom(imgSrc(rel)); });
    box.appendChild(im);
  });
  return box;
}
function openZoom(src){
  var ov = E('div', {class:'zoomov', onclick:function(){ ov.remove(); }}, [
    E('img', {src:src, alt:'原图放大'}),
    E('div', {class:'zoomtip'}, '点任意位置关闭')
  ]);
  document.body.appendChild(ov);
}

/* ================= 错因与复练计划 ================= */
/* 错因来自错题复盘 SOP：先分清是知识没掌握，还是方法 / 审题 / 计算 / 时间的问题，
   再据此决定这道题什么时候复练。判断为「真不会」的题不排复练，避免打击信心。 */
var REASONS = [
  { k:'knowledge', label:'知识盲区', hint:'考点没掌握', stage:0 },
  { k:'method',    label:'方法不当', hint:'思路用错了', stage:0 },
  { k:'reading',   label:'审题失误', hint:'看漏或看错', stage:1 },
  { k:'calc',      label:'计算失误', hint:'算错或看错数', stage:1 },
  { k:'time',      label:'时间不足', hint:'没来得及做', stage:1 },
  { k:'never',     label:'真不会',   hint:'暂时先放着', stage:-1 }
];
/* 复练节奏：当天 -> 3 天后 -> 1 周后 -> 2 周后 -> 出师 */
var REVIEW_DAYS = [0, 3, 7, 14];
var DAY_MS = 86400000;

function reasonDef(k){
  for (var i=0;i<REASONS.length;i++){ if (REASONS[i].k === k) return REASONS[i]; }
  return null;
}
function reasonLabel(k){ var d = reasonDef(k); return d ? d.label : ''; }
function pad2(n){ return n < 10 ? '0' + n : String(n); }
function startOfDay(ts){
  var d = new Date(ts);
  d.setHours(0,0,0,0);
  return d.getTime();
}
function dayKey(ts){
  var d = new Date(ts);
  return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
}
function todayKey(){ return dayKey(Date.now()); }
function dayDiff(a, b){ return Math.round((startOfDay(a) - startOfDay(b)) / DAY_MS); }
function dueText(due, now){
  var d = dayDiff(due, now === undefined ? Date.now() : now);
  if (d <= 0) return '今天该复练';
  if (d === 1) return '明天复练';
  return d + ' 天后复练';
}
function isMastered(r){ return !!r && r.stage >= REVIEW_DAYS.length; }
/* 标记错因：首次答错时按错因排第一次复练；已有计划只更新错因文字，不覆盖节奏 */
function setReason(rec, no, reasonKey){
  var d = reasonDef(reasonKey);
  if (!rec || !d) return null;
  var now = Date.now();
  rec.reasons = rec.reasons || {};
  rec.review = rec.review || {};
  rec.reasons[no] = reasonKey;
  var r = rec.review[no];
  if (!r){
    r = { stage:d.stage, lapses:0, reason:reasonKey, created:now };
    r.due = d.stage < 0 ? 0 : startOfDay(now) + REVIEW_DAYS[d.stage]*DAY_MS;
  } else {
    r.reason = reasonKey;
    if (d.stage < 0){ r.stage = -1; r.due = 0; }
  }
  r.updated = now;
  rec.review[no] = r;
  rec.updated = now;
  return r;
}
/* 复练时又做错：回到起点，今天重新来过 */
function lapseReview(rec, no){
  var r = rec && rec.review ? rec.review[no] : null;
  if (!r) return null;
  var now = Date.now();
  r.stage = 0;
  r.lapses = (r.lapses || 0) + 1;
  r.due = startOfDay(now);
  r.updated = now;
  return r;
}
/* 复练做对：进入下一阶段，四个阶段走完算掌握 */
function advanceReview(rec, no, ok){
  var r = rec && rec.review ? rec.review[no] : null;
  if (!r) return null;
  if (!ok) return lapseReview(rec, no);
  if (r.stage < 0) return r;
  var now = Date.now();
  var next = (r.stage || 0) + 1;
  r.stage = next;
  r.updated = now;
  r.due = next >= REVIEW_DAYS.length ? 0 : startOfDay(now) + REVIEW_DAYS[next]*DAY_MS;
  return r;
}
/* 全部到期复练题，按到期时间从早到晚 */
function dueReviewItems(now){
  var t = now === undefined ? Date.now() : now;
  var out = [];
  Object.keys(ST.papers).forEach(function(k){
    var rec = ST.papers[k];
    if (!rec || !rec.review) return;
    var id = k.split(':')[1];
    var paper = findPaper('exam', id);
    if (!paper) return;
    Object.keys(rec.review).forEach(function(no){
      if (reviewStateOf(rec, no, t) !== 'due') return;
      out.push({ type:'exam', id:id, paper:paper, no:Number(no), rec:rec, review:rec.review[no] });
    });
  });
  out.sort(function(a,b){ return (a.review.due||0) - (b.review.due||0); });
  return out;
}
function reviewCounts(){
  var c = { due:0, waiting:0, mastered:0, later:0, unmarked:0 };
  Object.keys(ST.papers).forEach(function(k){
    var rec = ST.papers[k];
    if (!rec) return;
    var seen = {};
    /* 已排期的题：结论全在 rec.review 里，不需要题目数据就能分类 */
    if (rec.review) Object.keys(rec.review).forEach(function(no){
      seen[no] = 1;
      c[reviewStateOf(rec, no)]++;
    });
    /* 答错但还没标错因的：只认本地落下的错题集合，避免为统计去加载全部题库 */
    if (rec.wrong) Object.keys(rec.wrong).forEach(function(no){
      if (!seen[no]) c.unmarked++;
    });
  });
  return c;
}
/* 记录今天有学习行为，用于首页连续学习天数 */
function touchDay(){
  var k = todayKey();
  ST.days[k] = (ST.days[k] || 0) + 1;
  return ST.days[k];
}
/* 记录今天做了哪一类学习动作。周复盘要按周统计「做了多少题 / 背了多少卡 / 模考几次」，
   而 rec.updated 只保留最后一次时间，翻不出历史。所以动作发生的当下就按天计数落盘。
   只存计数，不存时间戳，体积可控（一天最多几条）。 */
function touchAct(kind){
  var k = todayKey();
  var d = ST.acts[k] || (ST.acts[k] = {});
  d[kind] = (d[kind] || 0) + 1;
  return d[kind];
}
/* 周统计用：取某天某个动作的次数。 */
function actOn(dayKeyStr, kind){
  var d = ST.acts[dayKeyStr];
  return (d && d[kind]) || 0;
}
/* 同一天同一个对象只计一次：申论草稿框每敲一个字都会触发 input，
   直接计数会把「写了 1 道题」记成几百次。用 key 去重，key 里带上题目编号，
   所以「今天写了第 1 题和第 2 题」仍然算 2 次。 */
function touchActOnce(kind, key){
  var k = todayKey();
  var d = ST.acts[k] || (ST.acts[k] = {});
  var seen = d['_' + kind] || (d['_' + kind] = {});
  if (seen[key]) return false;
  seen[key] = 1;
  d[kind] = (d[kind] || 0) + 1;
  return true;
}
/* 申论没有「答题」这个动作，只有写作和看答案。写草稿、看参考答案都算今天学过，
   否则只练申论的日子连续天数永远是 0，首页会谎报「今天没学」。 */
function touchDayIfNew(){
  if (!ST.days[todayKey()]) touchDay();
}
function streakDays(){
  var n = 0;
  var d = startOfDay(Date.now());
  if (!ST.days[dayKey(d)]) d -= DAY_MS;      // 今天还没学，就从昨天往前数
  while (ST.days[dayKey(d)]){ n++; d -= DAY_MS; }
  return n;
}
/* 把一道错题归类：待复练 / 未到期 / 已掌握 / 暂不排期 / 还没标错因 */
function reviewStateOf(rec, no, now){
  var r = rec && rec.review ? rec.review[no] : null;
  if (!rec || !rec.reasons || !rec.reasons[no]) return 'unmarked';
  if (!r) return 'unmarked';
  if (r.stage < 0) return 'later';
  if (isMastered(r)) return 'mastered';
  return r.due <= (now === undefined ? Date.now() : now) ? 'due' : 'waiting';
}

/* 按错因分布给一句人话建议：哪种错因占比最高，就先解决哪个 */
function reasonAdvice(tally, total){
  if (!total) return '';
  var top = null;
  REASONS.forEach(function(r){
    if (r.k === 'never') return;
    var n = tally[r.k] || 0;
    if (!top || n > top.n) top = { k:r.k, n:n, label:r.label };
  });
  if (!top || !top.n) return '';
  var share = pct(top.n, total);
  if (share < 30) return '错因比较分散，说明不是单一短板。按复练计划一题一题过就行。';
  var tip = {
    knowledge: '考点没记住。建议先把对应的知识模块过一遍，再回来刷题。',
    method: '思路用错了。做完题一定看解析，对照自己的思路差在哪一步。',
    reading: '看漏或看错题干。下次做题先圈出「不正确的是」这类关键词。',
    calc: '算错或看错数。资料分析和数量关系放慢一点，算完回头验一遍。',
    time: '来不及做。这是取舍问题，先保证会做的题全部拿到分。'
  }[top.k];
  return '你的错因里「' + top.label + '」占了 ' + share + '%，是最主要的问题。' + (tip || '');
}

/* 错因分布统计。首页「当前弱点」与进度页「错因分布」共用同一口径，
   避免两处各算一套、数字对不上。
   已掌握的题不算进来：它连着做对四轮，已经不该再影响「当前弱点」的判断，
   留在里面只会把百分比撑虚、把人往已经补好的地方引。 */
function reasonTally(){
  var tally = {}, total = 0, mastered = 0;
  Object.keys(ST.papers).forEach(function(k){
    var rec = ST.papers[k];
    if (!rec || !rec.reasons) return;
    Object.keys(rec.reasons).forEach(function(no){
      var key = rec.reasons[no];
      if (!reasonDef(key)) return;
      if (reviewStateOf(rec, no) === 'mastered'){ mastered++; return; }
      tally[key] = (tally[key] || 0) + 1;
      total++;
    });
  });
  return { tally:tally, total:total, mastered:mastered };
}
/* 最突出的错因（「真不会」不算弱点，那类题已经单独放着了） */
function topReason(tally){
  var top = null;
  REASONS.forEach(function(r){
    if (r.k === 'never') return;
    var n = tally[r.k] || 0;
    if (!top || n > top.n) top = { k:r.k, n:n, label:r.label, hint:r.hint };
  });
  return (top && top.n) ? top : null;
}
/* 每种错因对应一句「下一步该干什么」，首页直接给按钮，不用用户自己判断 */
var REASON_NEXT = {
  knowledge: { label:'把知识盲区的错题重做一遍', hash:'#/wrong' },
  method:    { label:'对照解析重做这类错题',     hash:'#/wrong' },
  reading:   { label:'重做错题，练审题圈关键词', hash:'#/wrong' },
  calc:      { label:'放慢速度重做，练验算',     hash:'#/wrong' },
  time:      { label:'重做错题，练做题取舍',     hash:'#/wrong' }
};

/* ================= 数据加载 ================= */
var CATALOG = null;
var CACHE = {};
/* 登录过期时，Nginx 会把请求重定向到登录页。这里识别出来并把用户送回登录页，
   而不是让他看到一个空白页或误以为题库坏了。 */
function guardSession(r){
  if (r && (r.redirected || r.status === 401)){
    var here = location.pathname + location.search + location.hash;
    location.replace('login.html?next=' + encodeURIComponent(here));
    throw new Error('需要重新登录');
  }
  return r;
}
function getJSON(url){
  return fetch(url, { cache:'force-cache' }).then(guardSession).then(function(r){
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}
function loadCatalog(){
  if (CATALOG) return Promise.resolve(CATALOG);
  return loadImageManifest().then(function(){
    return getJSON('data/catalog.json').then(function(c){ CATALOG = c; return c; }).catch(function(){
      return getJSON('demo-data/catalog.json').then(function(c){ CATALOG = c; CATALOG.demo = true; return c; });
    });
  });
}

/* 图形题原图清单。图片按内容哈希命名，由 tools/import-images.js 确定性生成；
   清单缺失时应用照常可用，只是回退到「请对照纸质原卷」的老提示。 */
var IMGMAN = null;
function loadImageManifest(){
  if (IMGMAN) return Promise.resolve(IMGMAN);
  /* 单文件离线版把题库内联进 HTML，30MB 的图没法一起内联，这里直接标成不可用，
     避免界面误报成「0 题配好原图」。 */
  if (window.__SINGLE__){
    IMGMAN = { papers:{}, unavailable:true, stats:{ imageQuestions:0, questionImages:0, materialImages:0, unresolved:0, papers:0 } };
    return Promise.resolve(IMGMAN);
  }
  return getJSON('data/images/manifest.json').then(function(m){ IMGMAN = m; return m; })
    .catch(function(){
      IMGMAN = { papers:{}, unavailable:true, stats:{ imageQuestions:0, questionImages:0, materialImages:0, unresolved:0, papers:0 } };
      return IMGMAN;
    });
}
function imgUnavailable(){ return !!(IMGMAN && IMGMAN.unavailable); }
function paperImg(paper){
  if (!paper) return null;
  if (paper._img !== undefined) return paper._img;
  if (IMGMAN && IMGMAN.papers) return IMGMAN.papers[String(paper.paperId || paper.id)] || null;
  return null;
}
function secImgs(paper, secName){
  var p = paperImg(paper);
  if (!p || !p.sections) return null;
  return p.sections[secName] || null;
}
/* 一套卷已配好的原图张数（按题去重计数），用于题库列表上的提示 */
function paperImgCount(id){
  if (!IMGMAN || !IMGMAN.papers) return 0;
  var p = IMGMAN.papers[String(id)];
  if (!p || !p.sections) return 0;
  var n = 0;
  Object.keys(p.sections).forEach(function(sn){
    var q = (p.sections[sn] || {}).q || {};
    Object.keys(q).forEach(function(no){ if ((q[no] || []).length) n++; });
  });
  return n;
}
function findPaper(type,id){
  if (!CATALOG) return null;
  var want = String(id);
  for (var i=0;i<CATALOG.groups.length;i++){
    var g = CATALOG.groups[i];
    for (var j=0;j<g.papers.length;j++){
      var p = g.papers[j];
      if (p.type === type && String(p.id) === want) return p;
    }
  }
  return null;
}
function loadPaper(type,id){
  var k = pkey(type,id);
  if (CACHE[k]) return Promise.resolve(CACHE[k]);
  var meta = findPaper(type,id);
  var url = meta ? meta.file : ('data/' + (type==='exam'?'exams':'shenlun') + '/' + id + '.json');
  return getJSON(url).then(function(d){ d.type = type; d.id = id; CACHE[k] = d; return d; });
}

/* ================= 模块题池（v13） ================= */
/* 题库里的 section 名有十几种变体（图形推理 / 科学推理 / 数学运算 …），
   这里统一收敛到五个模块，否则「判断推理」会被拆成好几块，统计和推荐都没法用。
   映射表同时登记在 docs/domain-model.md。 */
var MODULE_ORDER = DRILL_DOMAIN.MODULE_ORDER;
var MODULE_DEFS = DRILL_DOMAIN.MODULE_DEFS;
var moduleDef = DRILL_DOMAIN.moduleDef;
var normalizeModule = DRILL_DOMAIN.normalizeModule;

/* 核心九套卷：河北行测 4 套 + 国考行政执法 5 套。其他省卷只作降级池，不参与默认推荐。 */
var MODULE_POOL_PAPERS = DRILL_DOMAIN.MODULE_POOL_PAPERS;
var MODULE_POOL = null, MODULE_POOL_BUILD = null;
var DOWNGRADE_CACHE = {}, DOWNGRADE_DONE = {};

/* 按原始 section 名（_secOrig）聚合。484 卷前 30 题在展示层被拆成政治理论 + 常识判断，
   但模块归属统一算「常识判断」，既有作答记录的归属不变。 */
function buildModulePool(){
  if (MODULE_POOL) return Promise.resolve(MODULE_POOL);
  if (MODULE_POOL_BUILD) return MODULE_POOL_BUILD;
  MODULE_POOL_BUILD = Promise.all(MODULE_POOL_PAPERS.map(function(spec){
    return loadPaper('exam', spec.id).then(function(paper){ return { paper:paper, tier:spec.tier }; },
      function(){ return null; });
  })).then(function(list){
    var sources = list.filter(function(item){ return !!(item && item.paper); }).map(function(item){
      return { paperId:String(item.paper.id), tier:item.tier, questions:allQuestions(item.paper) };
    });
    MODULE_POOL = DRILL_DOMAIN.buildModulePool(sources);
    return MODULE_POOL;
  });
  return MODULE_POOL_BUILD;
}
function poolEntries(mid){ return (MODULE_POOL && MODULE_POOL[mid]) || []; }
function poolCounts(){
  var out = {};
  MODULE_ORDER.forEach(function(m){
    out[m] = poolEntries(m).filter(function(e){ return e.available; }).length;
  });
  return out;
}

/* 降级池：其他省卷 / 国考其他卷的同类模块题。只在核心题池不够时才用，
   而且按需逐卷读——为了补 3 道题把 57 套卷全拉下来不值当。 */
function downgradeCandidates(moduleId, need, exclude){
  exclude = exclude || {};
  var acc = DOWNGRADE_CACHE[moduleId] || (DOWNGRADE_CACHE[moduleId] = []);
  if (DOWNGRADE_DONE[moduleId] || acc.length >= need || !CATALOG) return Promise.resolve(acc);
  var ids = DRILL_DOMAIN.downgradePaperIds(CATALOG.groups);
  var i = 0;
  function step(){
    if (i >= ids.length){ DOWNGRADE_DONE[moduleId] = true; return acc; }
    if (acc.length >= need) return acc;
    var id = ids[i++];
    return loadPaper('exam', id).then(function(paper){
      var additions = DRILL_DOMAIN.downgradeEntries(moduleId, paper.id, allQuestions(paper), exclude, acc);
      additions.forEach(function(e){ acc.push(e); });
      return step();
    }, function(){ return step(); });
  }
  return Promise.resolve().then(step);
}

/* ================= 模块推荐与专项出题（v13） ================= */
/* 每个模块的样本量与正确率。只看核心九套卷的题池，不需要为了统计去加载别的卷。 */
function moduleStats(pool, records){ return DRILL_DOMAIN.moduleStats(pool, records, ST.moduleLast); }

/* 26 周计划当前阶段该练哪个模块。同阶段内按周轮换，不会整段只练一块。 */
function planModuleForWeek(week){
  return DRILL_DOMAIN.planModuleForWeek(week, planPhaseOfWeek(week));
}

/* 推荐规则（命中即停）：
   1. 正确率最低且样本 ≥ 20 的模块；
   2. 样本都不够时，取最久没练过的模块；
   3. 完全没有记录时，取 26 周计划当前阶段指定的模块。 */
function recommendModule(pool, records, week, exclude){
  return DRILL_DOMAIN.recommendModule(pool, records, week, exclude, ST.moduleLast, planPhaseOfWeek(week));
}
function recommendModuleNow(exclude){
  if (!MODULE_POOL) return null;
  return recommendModule(MODULE_POOL, ST.papers, planWeekAt(Date.now()), exclude || {});
}
/* 推荐结果当天固定：同一天多次打开首页都读到同一个模块，跨天重新算。 */
function todayModulePick(){
  var day = todayKey();
  if (ST.modulePick && ST.modulePick.day === day && MODULE_DEFS[ST.modulePick.moduleId]) return ST.modulePick.moduleId;
  if (!MODULE_POOL) return null;
  var mid = recommendModuleNow();
  if (!mid) return null;
  ST.modulePick = { day:day, moduleId:mid };
  save();
  return mid;
}
/* 结果页的「下一步」：优先换一个今天还没练过的模块 */
function nextModuleId(){
  var done = {};
  (ST.drills || []).forEach(function(d){
    if (d && d.date && dayKey(d.date) === todayKey() && d.moduleId) done[d.moduleId] = 1;
  });
  return recommendModuleNow(done);
}

/* 上一次专项出过的题：短期内不再重复出（错题复用与复练除外）。 */
function prevDrillIds(){
  var out = {}, last = ST.drills && ST.drills[0];
  if (last && Array.isArray(last.questionIds)) last.questionIds.forEach(function(q){ out[q] = 1; });
  return out;
}
/* 出题：正常题池 → 该模块错题复用 → 其他省卷降级。前两步是纯数据，第三步要读卷。 */
var buildDrillTask = DRILL_DOMAIN.buildDrillTask;
function fillWithDowngrade(task, pool){
  var def = moduleDef(task.moduleId);
  if (task.questionIds.length >= def.size) return Promise.resolve(task);
  var have = {};
  task.questionIds.forEach(function(qid){ have[qid] = 1; });
  return downgradeCandidates(task.moduleId, def.size - task.questionIds.length, have).then(function(list){
    list.forEach(function(e){
      if (task.questionIds.length >= def.size) return;
      var qid = e.paperId + ':' + e.no;
      if (have[qid]) return;
      have[qid] = 1;
      task.questionIds.push(qid);
      task.sources[qid] = 'downgrade';
    });
    return task;
  });
}

/* ================= 路由 ================= */
var scrollMemo = {};
function go(hash){ location.hash = hash; }
function parseHash(){
  var h = (location.hash || '').replace(/^#/,'');
  var p = h.split('/').filter(function(x){ return x !== ''; });
  return p;
}
window.addEventListener('hashchange', function(){ render(); });

/* ================= 顶栏 / 底栏 ================= */
function topbar(title, sub, onBack, rightNode){
  var kids = [];
  if (onBack) kids.push(E('button', {class:'iconbtn', onclick:onBack, 'aria-label':'返回'}, '\u2039'));
  else kids.push(E('div', {class:'spacer'}));
  kids.push(E('div', {class:'tb-title'}, [title, sub ? E('span',{class:'tb-sub'}, sub) : null]));
  kids.push(rightNode || E('div', {class:'spacer'}));
  return E('div', {class:'topbar'}, kids);
}
var NAVITEMS = [
  { k:'home', ic:'\uD83C\uDF1E', label:'今日', hash:'#/' },
  { k:'know', ic:'\uD83E\uDDE0', label:'背记', hash:'#/know' },
  { k:'wrong', ic:'\u274C', label:'错题本', hash:'#/wrong' },
  { k:'fav', ic:'\u2B50', label:'收藏', hash:'#/fav' },
  { k:'stats', ic:'\uD83D\uDCCA', label:'进度', hash:'#/stats' },
  { k:'about', ic:'\u2139\uFE0F', label:'说明', hash:'#/about' }
];
function navbar(active){
  return E('div', {class:'navbar'}, NAVITEMS.map(function(it){
    return E('button', {class: it.k===active?'on':'', onclick:function(){ go(it.hash); }}, [
      E('span', {class:'ic'}, it.ic), E('span', null, it.label)
    ]);
  }));
}
function footnote(){
  return E('div', {class:'footnote'}, [
    '题目数据来自网络公开整理的题库（GitHub: xianhua1/Huahuagongkao），',
    '图形题原图来自公开数据集（GitHub: ERRRC/xingcezhenti）。',
    E('br'),
    '两个来源都未附开源许可证，本应用仅供个人备考自用，请勿公开传播或商用。'
  ]);
}
/* ================= 每日会话：复练 + 限时专项 ================= */
/* 一次每日会话 = 到期复练（不计时，排在前面）+ 当天限时专项。
   两条路由（#/drill 与旧的 #/train）渲染同一份实现，不维护两套流程。
   专项题来自多套卷，题号会撞车，所以视图题号用 qid（如 484:12），
   合并记录里的作答在保存时写回各卷的真实记录。 */
var DRILL_KEEP = 30;
var DRILL_VIEW = null;
var DRILL_KEYS = ['answers', 'reasons', 'review', 'wrong', 'skipped'];

function drillQid(paperId, no){ return String(paperId) + ':' + no; }
function drillSplit(qid){
  var s = String(qid), i = s.indexOf(':');
  var no = Number(s.slice(i + 1));
  return { paperId:s.slice(0, i), no:no, realNo:no };
}
/* 只在确有内容要写时才建立卷记录，避免为没碰过的卷凭空建一条空记录。 */
function drillPaperRec(paperId, create){
  var k = 'exam:' + paperId;
  if (!ST.papers[k]){
    if (!create) return null;
    ST.papers[k] = { answers:{}, cur:1, updated:0 };
  }
  return normalizePaperRec(ST.papers[k]);
}
function drillSyncKey(src, dst, key){
  var a = src[key] || {}, b = dst[key] || {};
  Object.keys(a).forEach(function(k){
    if (a[k] === undefined) return;
    if (b[k] !== a[k]){ b[k] = a[k]; }
  });
  Object.keys(b).forEach(function(k){ if (a[k] === undefined) delete b[k]; });
  dst[key] = b;
}
/* 把合并视图里的改动写回各卷真实记录。src 里没有的键视为已删除（重做 / 跳过）。 */
function drillFlush(){
  if (!DRILL_VIEW || !EX.rec) return;
  var src = EX.rec;
  Object.keys(DRILL_VIEW.map).forEach(function(qid){
    var ref = DRILL_VIEW.map[qid], touched = false;
    DRILL_KEYS.forEach(function(key){ if (src[key] && src[key][qid] !== undefined) touched = true; });
    if (!touched && !DRILL_VIEW.seeded[qid]) return;
    var rec = drillPaperRec(ref.paperId, true);
    var no = ref.realNo;
    DRILL_KEYS.forEach(function(key){
      var v = src[key] ? src[key][qid] : undefined;
      if (v === undefined){ if (rec[key] && rec[key][no] !== undefined) delete rec[key][no]; }
      else rec[key][no] = v;
    });
    rec.updated = src.updated || rec.updated;
  });
}
/* 从各卷真实记录拼一份以 qid 为键的合并记录，供作答界面直接读写。 */
function drillViewRec(ids){
  var rec = { answers:{}, reasons:{}, review:{}, wrong:{}, skipped:{}, cur:0, updated:0 };
  var map = {}, seeded = {};
  (ids || []).forEach(function(qid){
    var ref = drillSplit(qid);
    map[qid] = ref;
    var real = drillPaperRec(ref.paperId, false);
    if (!real) return;
    DRILL_KEYS.forEach(function(key){
      if (real[key] && real[key][ref.realNo] !== undefined){
        rec[key][qid] = real[key][ref.realNo];
        seeded[qid] = 1;
      }
    });
    if (real.updated > rec.updated) rec.updated = real.updated;
  });
  DRILL_VIEW = { map:map, seeded:seeded };
  return rec;
}
/* 把专项题改造成视图题：题号换成 qid，另存显示用题号与所属卷。 */
function drillDecorate(q, qid, paper){
  var ref = drillSplit(qid);
  var view = {};
  Object.keys(q).forEach(function(k){ view[k] = q[k]; });
  view.no = qid;
  view._qid = qid;
  view._paperId = ref.paperId;
  view._realNo = ref.realNo;
  view._label = '第 ' + ref.realNo + ' 题';
  view._paperTitle = paper ? (paper.title || '') : '';
  return view;
}
function drillLoadQs(ids){
  var groups = {};
  (ids || []).forEach(function(qid){
    var ref = drillSplit(qid);
    (groups[ref.paperId] = groups[ref.paperId] || []).push(qid);
  });
  var pids = Object.keys(groups);
  return Promise.all(pids.map(function(pid){
    return loadPaper('exam', pid).then(function(paper){
      var byNo = {};
      allQuestions(paper).forEach(function(q){ byNo[q.no] = q; });
      return { paper:paper, byNo:byNo };
    }, function(){ return null; });
  })).then(function(list){
    var byPid = {};
    list.forEach(function(item, i){ if (item) byPid[pids[i]] = item; });
    var qs = [];
    (ids || []).forEach(function(qid){
      var ref = drillSplit(qid), item = byPid[ref.paperId];
      if (!item) return;
      var q = item.byNo[ref.realNo];
      if (!q) q = item.byNo[ref.no];
      if (!q) return;
      qs.push(drillDecorate(q, qid, item.paper));
    });
    return qs;
  });
}
/* 今天的专项还在进行中：同一天、同一模块、还没交卷。 */
function drillPending(moduleId){
  var t = ST.drill;
  if (!t || t.status === 'completed') return false;
  if (moduleId && t.moduleId !== moduleId) return false;
  if (t.startedAt && dayKey(t.startedAt) !== todayKey()) return false;
  return !!(t.questionIds && t.questionIds.length);
}
/* 开始今天的会话。force 为真时重开一套；否则有进行中的就直接接着做。 */
function startDailySession(force, moduleId){
  return buildModulePool().then(function(pool){
    var mid = moduleId || todayModulePick();
    if (!force && drillPending(mid)){ go('#/drill'); return; }
    var now = Date.now();
    var task = buildDrillTask(mid, pool, ST.papers, now, prevDrillIds());
    task.startedAt = 0;
    task.deadlineAt = 0;
    task.reviewIds = dueReviewItems(now).map(function(it){ return drillQid(it.id, it.no); });
    return fillWithDowngrade(task, pool).then(function(t){
      t = normalizeDrill(t);
      ST.drill = t;
      ST.moduleLast = ST.moduleLast || {};
      ST.moduleLast[mid] = now;
      save();
      go('#/drill');
    });
  });
}
function viewDrill(){
  var t = ST.drill;
  if (!t || !((t.questionIds && t.questionIds.length) || (t.reviewIds && t.reviewIds.length))){
    return startDailySession().then(function(){ return viewDrill(); });
  }
  t = normalizeDrill(t);
  var ids = (t.reviewIds || []).concat(t.questionIds || []);
  return drillLoadQs(ids).then(function(qs){
    if (!qs.length) return startDailySession(true).then(function(){ return viewDrill(); });
    var rec = drillViewRec(ids);
    var def = moduleDef(t.moduleId);
    var paper = { id:'drill', title:def.name + '专项', year:'', qCount:qs.length, sections:[] };
    EX.paper = paper; EX.all = qs; EX.qs = qs; EX.rec = rec;
    EX.filter = 'all'; EX.mode = 'drill'; EX.endAt = 0;
    EX.idx = Math.max(0, Math.min(qs.length - 1, Number(t.index) || 0));
    drillEnsureStarted();
    return renderExam(paper, qs, rec);
  });
}
function viewDrillResult(){
  var t = ST.drill, rec = (ST.drills && ST.drills[0]) || null;
  var def = moduleDef(t && t.moduleId);
  var frag = document.createDocumentFragment();
  frag.appendChild(topbar('本次专项完成', def.name, function(){ go('#/'); }, null));
  var answered = rec ? rec.answered : 0, right = rec ? rec.right : 0, size = rec ? rec.size : (t ? t.size : 0);
  var rate = pct(right, size || 1);
  var wrap = E('div', {class:'wrap'}, [
    E('div', {class:'train-result card'}, [
      E('div', {class:'setup-kicker'}, '一轮结束，马上知道下一步'),
      E('h2', null, right + ' / ' + size + ' 题答对'),
      E('p', null, '正确率 ' + rate + '%。' + (answered < size ? ('还有 ' + (size - answered) + ' 题没作答。') : '错题已进入错题本，标好错因会自动安排复练。')),
      E('div', {class:'stats'}, [
        E('div', {class:'stat'}, [E('b', null, String(answered)), E('span', null, '已作答')]),
        E('div', {class:'stat'}, [E('b', null, String(right)), E('span', null, '答对')]),
        E('div', {class:'stat'}, [E('b', null, rec ? fmtUsed(rec.usedMs) : '—'), E('span', null, '用时')])
      ])
    ])
  ]);
  var next = nextModuleId();
  var nd = moduleDef(next);
  wrap.appendChild(E('div', {class:'train-next'}, '下一步：' + nd.name + '专项 · ' + nd.size + ' 题 · ' + Math.round(nd.limitMs/60000) + ' 分钟'));
  wrap.appendChild(E('button', {class:'btn', onclick:function(){ startDailySession(true, next); }}, '接着做' + nd.short + '专项'));
  wrap.appendChild(E('button', {class:'btn ghost', onclick:function(){ go('#/wrong'); }}, '去看错题与复练'));
  wrap.appendChild(E('button', {class:'btn ghost', onclick:function(){ go('#/'); }}, '回到今天'));
  if (rec && rec.overdueAnswered){
    wrap.appendChild(E('p', {class:'footnote'}, '超时答对 ' + rec.overdueRight + ' 题，超时未答 ' + (rec.overdueAnswered - rec.overdueRight) + ' 题。超时题计入本次统计，但不计入错题本，建议按节奏重练一次。'));
  }
  var tally = rec && rec.tally || {}, unmarked = rec ? rec.unmarked : 0;
  var reasonKids = [E('h3', null, '这次错在哪'), E('p', null, '每道错题只选一个最主要的原因，系统会按原因安排下一次复练。')];
  var any = false;
  REASONS.forEach(function(r){
    if (!tally[r.k]) return;
    any = true;
    reasonKids.push(E('div', {class:'train-reason'}, r.label + ' · ' + tally[r.k] + ' 题'));
  });
  if (unmarked){ any = true; reasonKids.push(E('div', {class:'train-reason'}, '还没标错因 · ' + unmarked + ' 题')); }
  if (any) wrap.appendChild(E('section', {class:'train-reasons card'}, reasonKids));
  frag.appendChild(wrap); frag.appendChild(navbar('home')); return frag;
}
/* 复练段不计时：走到专项段第一题时才开始计时，离开应用时间照走。 */
function drillReviewLen(){ return (ST.drill && ST.drill.reviewIds) ? ST.drill.reviewIds.length : 0; }
function drillInReview(){ return EX.mode === 'drill' && EX.idx < drillReviewLen(); }
function drillEnsureStarted(){
  var t = ST.drill;
  if (!t || t.status === 'completed') return;
  if (drillInReview()) return;
  if (!t.startedAt){
    var clock = DRILL_DOMAIN.startDrillClock(t, Date.now());
    t.startedAt = clock.startedAt;
    t.deadlineAt = clock.deadlineAt;
    save();
  }
}
function drillLeft(){
  return DRILL_DOMAIN.drillTimeLeft(ST.drill, Date.now());
}
function drillShouldPrompt(t, now){
  return DRILL_DOMAIN.drillShouldPrompt(t, now, drillInReview());
}
function drillIsOverdue(){
  return DRILL_DOMAIN.drillIsOverdue(ST.drill, Date.now(), drillInReview());
}
function drillMarkOverdue(qid){
  var t = ST.drill;
  if (!t) return;
  var next = DRILL_DOMAIN.markDrillOverdue(t, qid);
  t.overdue = next.overdue;
}
/* 交卷归档。只统计专项段，复练段不进档案、不写模考档案。 */
function recordDrill(task, answers, finishedAt){
  if (!task) return null;
  var ids = task.questionIds || [], answerRules = {}, reasons = {}, answerValues = {};
  var entries = poolEntries(task.moduleId);
  ids.forEach(function(qid){
    var ref = drillSplit(qid);
    var rec = drillPaperRec(ref.paperId, false);
    var sel = answers ? answers[qid] : (rec && rec.answers ? rec.answers[ref.realNo] : null);
    if (sel){
      answerValues[qid] = sel;
      entries.some(function(e){
        if (String(e.paperId) === ref.paperId && String(e.no) === String(ref.realNo)){
          answerRules[qid] = { answer:e.answer };
          return true;
        }
        return false;
      });
    }
    var key = rec && rec.reasons ? rec.reasons[ref.realNo] : '';
    if (key && reasonDef(key)) reasons[qid] = key;
  });
  var summary = DRILL_DOMAIN.summarizeDrill(task, answerValues, answerRules, reasons, finishedAt);
  summary.id = 'd' + finishedAt + '-' + Math.random().toString(36).slice(2, 7);
  return summary;
}
function finishDrill(){
  var t = ST.drill;
  if (!t || t.status === 'completed') return;
  var now = Date.now();
  (t.questionIds || []).forEach(function(qid){
    if (t.deadlineAt && now >= t.deadlineAt && !(EX.rec && EX.rec.answers && EX.rec.answers[qid])) drillMarkOverdue(qid);
  });
  var rec = recordDrill(t, EX.rec && EX.rec.answers, now);
  t.status = 'completed';
  t.completedAt = now;
  t.timedOut = !!(t.deadlineAt && now >= t.deadlineAt);
  ST.drills = Array.isArray(ST.drills) ? ST.drills : [];
  ST.drills.unshift(rec);
  if (ST.drills.length > DRILL_KEEP) ST.drills = ST.drills.slice(0, DRILL_KEEP);
  save();
}
function viewTraining(){ return viewDrill(); }
function viewTrainingResult(){ return Promise.resolve(viewDrillResult()); }
function todayCard(){
  var due = dueReviewItems();
  var rc = reviewCounts();
  var streak = streakDays();
  var fresh = !Object.keys(ST.papers).length && !due.length;

  var acts = E('div', {class:'tacts'});
  var mid = todayModulePick();
  var def = mid ? moduleDef(mid) : null;
  var mins = def ? Math.round(def.limitMs / 60000) : 0;
  var main, sub, label;
  if (!def){
    main = '正在准备今天的专项';
    sub = '题库汇总完成后，这里会显示今天该练的模块、题量和限时。';
    label = '开始今天的专项';
  } else if (due.length){
    main = '今天先复练 ' + due.length + ' 题，再做专项';
    sub = '复练不计时。做完自动进入今天的专项：' + def.name + ' · ' + def.size + ' 题 · ' + mins + ' 分钟。';
    label = '先做复练';
  } else if (drillPending(mid)){
    main = '继续今天的' + def.name + '专项';
    sub = def.size + ' 题 · 限时 ' + mins + ' 分钟。进度已保存在本机，时间照走。';
    label = '继续今天的专项';
  } else {
    main = '今天练' + def.name;
    sub = def.name + ' · ' + def.size + ' 题 · 限时 ' + mins + ' 分钟。做完就能看到正确率、错在哪、下一步练什么。';
    label = '开始今天的专项';
  }
  acts.appendChild(E('button', {class:'tbtn training-start', onclick:function(){ startDailySession(false, mid); }}, label));
  acts.appendChild(modulePicker(mid));
  return E('div', {class:'today' + (fresh ? ' fresh' : '')}, [
    E('div', {class:'th'}, '今日任务'),
    E('div', {class:'tmain'}, main),
    E('div', {class:'tsub'}, sub),
    acts,
    weakBlock(rc, due),
    knowLine(),
    E('div', {class:'tstreak'}, [
      E('div', null, [E('b', null, String(streak)), '连续学习（天）']),
      E('div', null, [E('b', null, String(rc.due + rc.waiting)), '在复练计划里']),
      E('div', null, [E('b', null, String(rc.mastered)), '已掌握的错题'])
    ]),
  ]);
}

/* 「当前弱点 + 下一步行动」：把错因数据翻译成一句话和一个按钮，
   用户不用自己判断现在最该补哪块。数据不足时如实说明，不编造结论。 */
function weakBlock(rc, due){
  var rt = reasonTally();
  var top = topReason(rt.tally);
  var text, actLabel, act;

  if (top){
    var share = pct(top.n, rt.total);
    text = '「' + top.label + '」最多：' + top.n + ' 题，占已标错因题的 ' + share + '%。' +
           (rt.total < 10 ? '样本还少，先按这个方向做，标够 10 题以上再看更准。' : '');
    var nx = REASON_NEXT[top.k] || { label:'重做这类错题', hash:'#/wrong' };
    actLabel = nx.label;
    act = function(){ go(nx.hash); };
  } else if (rc.unmarked){
    text = '还有 ' + rc.unmarked + ' 道错题没标错因。标完才知道你真正弱在哪一块。';
    actLabel = '去标错因';
    act = function(){ go('#/wrong'); };
  } else if (rt.mastered){
    text = '已标错因的题都掌握了（' + rt.mastered + ' 题）。继续刷新题，错的题标上错因，这里会重新给结论。';
    actLabel = '继续上次';
    act = function(){ continueLast(); };
  } else {
    text = '还没有足够数据判断弱点。先做一套行测，错的题标上错因，这里就会自动给出结论。';
    actLabel = '先做 2026 河北行测';
    act = function(){ go('#/p/exam/484'); };
  }

  var kids = [
    E('div', {class:'twl'}, '当前弱点'),
    E('div', {class:'twt'}, text)
  ];
  /* 今天有到期复练时，「下一步」就是先复练，别的都往后排 */
  if (due && due.length){
    kids.push(E('button', {class:'tbtn next', onclick:function(){ startReviewSession(due); }}, '先复练今天的 ' + due.length + ' 题'));
  } else {
    kids.push(E('button', {class:'tbtn next', onclick:act}, actLabel));
  }
  return E('div', {class:'tweak'}, kids);
}

/* 自己选模块：主按钮下方的次要入口，展开后可任选五个模块之一。 */
function modulePicker(current){
  var box = E('div', {class:'drill-pick'});
  var open = false;
  var toggle = E('button', {class:'tbtn ghost drill-pick-toggle', onclick:function(){
    open = !open;
    list.style.display = open ? 'grid' : 'none';
  }}, '自己选模块');
  var list = E('div', {class:'drill-pick-list', style:'display:none'});
  MODULE_ORDER.forEach(function(m){
    var d = moduleDef(m);
    list.appendChild(E('button', {class:'tbtn ghost' + (m === current ? ' on' : ''), onclick:function(){
      startDailySession(true, m);
    }}, d.short + ' · ' + d.size + ' 题 · ' + Math.round(d.limitMs/60000) + ' 分钟'));
  });
  box.appendChild(toggle);
  box.appendChild(list);
  return box;
}

/* 继续上次：没做过就从第一套开始，做过就回到上次那道题 */
function continueLast(){
  var last = ST.last;
  if (last){
    var lp = findPaper(last.type, last.id);
    if (lp){ go('#/p/' + last.type + '/' + lp.id); return; }
  }
  go('#/p/shenlun/188');
}

/* 首次设置只收集生成今日任务真正需要的两个信息。
   不要求注册、不上传数据；用户可以跳过，之后仍可直接开始训练。 */
function setupCard(){
  if (ST.profile && ST.profile.onboardingVersion) return null;
  var date = E('input', {class:'setup-date', type:'date', value:'2027-03-14', 'aria-label':'目标考试日期'});
  var options = E('div', {class:'setup-options'});
  [15, 30, 60].forEach(function(minutes){
    options.appendChild(E('button', {class:'setup-option', onclick:function(){
      ST.profile = { examDate:date.value || '2027-03-14', dailyMinutes:minutes, onboardingVersion:1, updatedAt:Date.now() };
      save(); toast('已设置每天 ' + minutes + ' 分钟，今天就按这个节奏开始'); render();
    }}, minutes + ' 分钟'));
  });
  return E('section', {class:'setup-card'}, [
    E('div', {class:'setup-kicker'}, '第一次来，先定一个节奏'),
    E('h2', null, '每天准备花多少时间？'),
    E('p', null, '只用于安排今日任务，数据只保存在这台设备上。之后随时可以调整。'),
    E('label', {class:'setup-label'}, ['目标考试日期', date]),
    options,
    E('button', {class:'setup-skip', onclick:function(){
      ST.profile = { examDate:'2027-03-14', dailyMinutes:null, onboardingVersion:1, skipped:true, updatedAt:Date.now() };
      save(); render();
    }}, '先不设置，直接开始')
  ]);
}

function viewHome(){
  if (!MODULE_POOL){
    buildModulePool().then(function(){ if (!(parseHash()||[]).length) render(); });
  }
  var frag = document.createDocumentFragment();
  var totalQ = CATALOG.totals.questions, totalP = CATALOG.totals.papers;
  var done = 0;
  CATALOG.groups.forEach(function(g){ g.papers.forEach(function(p){
    if (p.type==='exam'){ var r = ST.papers[pkey('exam',p.id)]; if (r && countAnswered(r) >= p.qCount*0.9) done++; }
    else { var r2 = ST.sl[pkey('shenlun',p.id)]; if (r2 && r2.read && Object.keys(r2.read).length >= p.qCount) done++; }
  }); });

  frag.appendChild(topbar('今天练什么', '河北行政执法 · C 卷', null, null));
  var wrap = E('div', {class:'wrap'});

  var setup = setupCard();
  if (setup) wrap.appendChild(setup);
  wrap.appendChild(todayCard());
  var offlineBox = offlineCard();
  if (offlineBox) wrap.appendChild(offlineBox);

  /* 题库、背记、模考和计划是二级能力，不再和“今天该做什么”争首屏注意力。
     仍保留原 DOM 结构，旧数据和已有入口测试可以继续工作。 */
  var secondary = E('details', {class:'secondary-tools'}, [
    E('summary', null, [E('span', {class:'secondary-title'}, '更多训练工具'), E('span', {class:'secondary-hint'}, '题库 · 背记 · 模考 · 计划')])
  ]);
  var knowBox = knowEntryCard();
  if (knowBox) secondary.appendChild(knowBox);
  secondary.appendChild(diagEntryCard());
  secondary.appendChild(planEntryCard());
  secondary.appendChild(E('div', {class:'hero'}, [
    E('h1', null, '河北省考 C 卷 · 行政执法'),
    E('p', null, '行测逐题练习、申论材料精读、错题自动收集。进度存在本机，随时接着做。'),
    E('div', {class:'stats'}, [
      E('div', {class:'stat'}, [E('b', null, String(totalQ)), E('span', null, '道题')]),
      E('div', {class:'stat'}, [E('b', null, String(totalP)), E('span', null, '套卷')]),
      E('div', {class:'stat'}, [E('b', null, String(done)), E('span', null, '已完成')])
    ])
  ]));

  var last = ST.last;
  if (last){
    var lp = findPaper(last.type, last.id);
    if (lp){
      var r = last.type==='exam' ? getPaperRec('exam',lp.id) : getPaperRec('shenlun',lp.id);
      var info = last.type==='exam' ? (countAnswered(r)+' / '+lp.qCount+' 题') : (Object.keys(r.read||{}).length+' / '+lp.qCount+' 题');
      secondary.appendChild(E('div', {class:'section-title'}, '继续上次'));
      secondary.appendChild(E('div', {class:'group'}, E('div', {class:'plist'}, paperRow(lp, info))));
    }
  }

  secondary.appendChild(E('div', {class:'searchbox', style:'margin-bottom:12px'}, [
    E('input', {class:'sinput', type:'search', placeholder:'搜题干关键词…', onkeydown:function(ev){
      if (ev.key === 'Enter' || ev.keyCode === 13){
        var v = ev.target.value.trim();
        if (v) go('#/search/' + encodeURIComponent(v));
      }
    }}),
    E('button', {class:'btn', style:'flex:none;padding:12px 16px', onclick:function(ev){
      var inp = ev.target.parentNode.querySelector('input');
      var v = (inp.value || '').trim();
      if (!v){ toast('请输入关键词'); return; }
      go('#/search/' + encodeURIComponent(v));
    }}, '\uD83D\uDD0D 搜索')
  ]));

  secondary.appendChild(E('div', {class:'note'}, [
    E('b', null, '先做这两套：'), '河北申论 C 卷（2024 / 2025）就是行政执法用卷，优先精读；再刷河北行测真题保持题感。'
  ]));

  CATALOG.groups.forEach(function(g){
    secondary.appendChild(E('div', {class:'section-title'}, g.name));
    var box = E('div', {class:'group'}, [
      E('div', {class:'group-head'}, [E('h2', null, g.name), E('span', {class:'cnt'}, g.count + ' 套')]),
      g.desc ? E('p', {class:'group-desc'}, g.desc) : null
    ]);
    var list = E('div', {class:'plist'});
    g.papers.forEach(function(p){
      var r = p.type==='exam' ? ST.papers[pkey('exam',p.id)] : ST.sl[pkey('shenlun',p.id)];
      var info = '';
      if (p.type==='exam' && r && countAnswered(r) > 0){
        var a = countAnswered(r), c = countCorrect(r, CACHE[pkey('exam',p.id)]);
        info = a + '/' + p.qCount + ' 题' + (CACHE[pkey('exam',p.id)] ? (' · 对 ' + c) : '');
      } else if (p.type==='shenlun' && r && r.read && Object.keys(r.read).length > 0){
        info = '已读 ' + Object.keys(r.read).length + '/' + p.qCount + ' 题';
      }
      list.appendChild(paperRow(p, info));
    });
    box.appendChild(list);
    secondary.appendChild(box);
  });
  secondary.appendChild(footnote());
  wrap.appendChild(secondary);
  frag.appendChild(wrap);
  frag.appendChild(navbar('home'));
  return frag;
}

function paperRow(p, info){
  var isEx = p.type === 'exam';
  var tags = (p.tags||[]).map(function(t){
    var cls = t.indexOf('核心')>=0 ? 'badge hot' : (t.indexOf('行政执法')>=0 ? 'badge' : 'badge');
    return E('span', {class:cls}, t);
  });
  return E('button', {class:'pitem', onclick:function(){ go('#/p/' + p.type + '/' + p.id); }}, [
    E('div', {class:'yr'}, [String(p.year||''), E('small', null, isEx?'行测':'申论')]),
    E('div', {class:'meta'}, [
      E('div', {class:'t'}, p.title),
      E('div', {class:'s'}, [
        E('span', null, p.qCount + ' 题' + (isEx && p.imageCount ? ' · 含图 ' + p.imageCount + (paperImgCount(p.id) ? '（已配 ' + paperImgCount(p.id) + '）' : '') : '')),
        info ? E('span', {class:'badge done'}, info) : null
      ].concat(tags))
    ]),
    E('div', {class:'go'}, '\u203A')
  ]);
}
/* ================= 行测练习 ================= */
var EX = {
  paper:null, all:[], qs:[], idx:0, rec:null,
  filter:'all',      // all | todo | wrong | fav
  mode:'practice',   // practice | mock
  endAt:0, tick:null, paused:false, leftMs:0
};

function filterQuestions(paper, rec, filter){
  var all = allQuestions(paper);
  if (filter === 'todo') return all.filter(function(q){ return !rec.answers[q.no] && !(rec.skipped && rec.skipped[q.no]); });
  if (filter === 'wrong') return all.filter(function(q){ var a = rec.answers[q.no]; return a && a !== normAns(q.answer); });
  if (filter === 'fav') return all.filter(function(q){ return isFav('exam', paper.id, q.no); });
  if (filter === 'review') return all.filter(function(q){ return reviewStateOf(rec, q.no) === 'due'; });
  return all;
}

var FILTERS = [
  { k:'all',   label:'全部' },
  { k:'todo',  label:'未做' },
  { k:'wrong', label:'错题' },
  { k:'review',label:'待复练' },
  { k:'fav',   label:'收藏' }
];

function viewExamPractice(id, filter){
  return loadPaper('exam', id).then(function(paper){
    var rec = getPaperRec('exam', paper.id);
    if (EX.tick){ clearInterval(EX.tick); EX.tick = null; }
    var all = allQuestions(paper);
    var f = filter || 'all';
    var qs = filterQuestions(paper, rec, f);
    if (!qs.length && f !== 'all'){
      toast(f === 'review' ? '这套卷暂时没有到期的复练题' : '这个筛选下暂时没有题目');
      f = 'all'; qs = all;
    }
    EX.paper = paper; EX.all = all; EX.qs = qs; EX.rec = rec;
    EX.filter = f; EX.mode = 'practice'; EX.endAt = 0;
    var cur = rec.cur || 1;
    var at = qs.findIndex(function(q){ return q.no === cur; });
    EX.idx = at >= 0 ? at : 0;
    return renderExam(paper, qs, rec);
  });
}

/* 限时模考：按真实考场时长计时，做题时不立刻判对错，交卷后统一出分 */
function viewExamMock(id){
  return loadPaper('exam', id).then(function(paper){
    var rec = getPaperRec('exam', paper.id);
    var all = allQuestions(paper);
    // 同一套卷内翻页时保留当前题号，只有重新开始才回到第 1 题
    var sameRun = EX.mode === 'mock' && EX.paper && String(EX.paper.id) === String(paper.id);
    var keepIdx = sameRun ? EX.idx : 0;
    EX.paper = paper; EX.all = all; EX.qs = all; EX.rec = rec;
    EX.filter = 'all'; EX.mode = 'mock';
    if (EX.tick){ clearInterval(EX.tick); EX.tick = null; }
    var saved = ST.mock['exam:' + paper.id];
    if (saved && (saved.paused || saved.endAt > Date.now())){
      // 刷新 / 退出后再回来：接着上次的剩余时间走，暂停状态也一起恢复
      EX.paused = !!saved.paused;
      EX.leftMs = saved.leftMs || 0;
      EX.endAt = saved.paused ? 0 : saved.endAt;
    } else {
      var mins = mockMinutes(paper);
      EX.paused = false; EX.leftMs = 0;
      EX.endAt = Date.now() + mins*60*1000;
      ST.mock['exam:' + paper.id] = { endAt:EX.endAt, leftMs:mins*60*1000, paused:false, started:Date.now() };
      save();
    }
    EX.idx = Math.max(0, Math.min(all.length-1, keepIdx));
    return renderExam(paper, all, rec);
  });
}

function mockMinutes(paper){
  // 国考/河北省考行测 130 题，考场 120 分钟；题量不同按比例给
  var n = (paper && paper.qCount) || 130;
  return Math.max(20, Math.round(n / 130 * 120));
}

function fmtLeft(ms){
  if (ms < 0) ms = 0;
  var t = Math.floor(ms/1000);
  var m = Math.floor(t/60), sec = t%60;
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}

/* 模考剩余时间：暂停时直接返回冻结的剩余毫秒，否则按结束时刻实时算 */
function mockLeft(){
  if (EX.paused) return EX.leftMs || 0;
  return Math.max(0, EX.endAt - Date.now());
}
function saveMock(){
  if (!EX.paper) return;
  ST.mock['exam:' + EX.paper.id] = {
    endAt: EX.endAt,
    leftMs: mockLeft(),
    paused: !!EX.paused,
    started: (ST.mock['exam:' + EX.paper.id] || {}).started || Date.now()
  };
  save();
}
function toggleMockPause(){
  if (!EX.paper) return;
  if (EX.paused){
    EX.paused = false;
    EX.endAt = Date.now() + (EX.leftMs || 0);
    toast('继续计时');
  } else {
    EX.leftMs = mockLeft();
    EX.paused = true;
    toast('已暂停，时间不会走');
  }
  saveMock();
  render();
}

function stopMock(){
  if (EX.tick){ clearInterval(EX.tick); EX.tick = null; }
  EX.paused = false; EX.leftMs = 0;
  if (EX.paper) delete ST.mock['exam:' + EX.paper.id];
  save();
}

/* ================= 模考档案与诊断 ================= */
/* 模考只留最近 30 次：档案要能长期回看，但不能把 localStorage 撑爆。
   一条档案自带分模块表现、错因分布和弱项，诊断页只读档案、不再回头加载题库，
   这样「进度」页和诊断页都不会为了看一眼报告把 154 套卷子全拉一遍。 */
var MOCK_KEEP = 30;

function fmtUsed(ms){
  if (!ms || ms < 0) ms = 0;
  var t = Math.floor(ms/1000), m = Math.floor(t/60), s = t%60;
  return m + ' 分 ' + pad2(s) + ' 秒';
}
function fmtDay(ts){
  var d = new Date(ts);
  return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
}
function fmtDateTime(ts){
  var d = new Date(ts);
  return fmtDay(ts) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}
/* 交卷落档。leftMs 是交卷瞬间的剩余时间，用「总时长 - 剩余」算实际用时，
   这样中途暂停的时间不会被算进答题用时。 */
function recordMockAttempt(paper, rec, startedAt, leftMs){
  if (!paper || !rec) return null;
  var qs = allQuestions(paper);
  var answered = 0, right = 0, skipped = 0;
  var bySec = {}, order = [];
  qs.forEach(function(q){
    var name = q._sec || '其他';
    if (!bySec[name]){ bySec[name] = { name:name, n:0, done:0, ok:0 }; order.push(name); }
    var v = bySec[name];
    v.n++;
    var sel = rec.answers[q.no];
    if (sel){ answered++; v.done++; if (sel === normAns(q.answer)){ right++; v.ok++; } }
    if (rec.skipped && rec.skipped[q.no]) skipped++;
  });
  var totalMs = mockMinutes(paper) * 60 * 1000;
  var usedMs = (typeof leftMs === 'number' && leftMs >= 0 && leftMs <= totalMs) ? (totalMs - leftMs) : 0;
  /* 错因分布口径与全站一致：只认 REASONS 里定义过的错因，没标错因的单独计数 */
  var tally = {}, unmarked = 0;
  qs.forEach(function(q){
    var sel = rec.answers[q.no];
    if (!sel || sel === normAns(q.answer)) return;
    var key = rec.reasons ? rec.reasons[q.no] : '';
    if (key && reasonDef(key)) tally[key] = (tally[key] || 0) + 1;
    else unmarked++;
  });
  var bySecArr = order.map(function(n){ return bySec[n]; });
  var weak = bySecArr.filter(function(v){ return v.done > 0; })
    .map(function(v){ return { name:v.name, rate:pct(v.ok, v.done), ok:v.ok, done:v.done }; })
    .sort(function(a,b){ return a.rate - b.rate; })
    .filter(function(v){ return v.rate < 60; })
    .slice(0, 3);
  var item = {
    id: 'm' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    paperId: String(paper.id),
    title: paper.title,
    year: paper.year || '',
    date: Date.now(),
    startedAt: startedAt || 0,
    usedMs: usedMs,
    answered: answered, total: qs.length, right: right, skipped: skipped,
    bySec: bySecArr,
    tally: tally,
    unmarked: unmarked,
    weak: weak
  };
  ST.mocks = Array.isArray(ST.mocks) ? ST.mocks : [];
  ST.mocks.push(item);
  if (ST.mocks.length > MOCK_KEEP) ST.mocks = ST.mocks.slice(ST.mocks.length - MOCK_KEEP);
  save();
  return item;
}
/* 某套卷的历次模考，按时间从早到晚 */
function mockAttempts(paperId){
  var want = String(paperId);
  return (ST.mocks || []).filter(function(m){
    return m && String(m.paperId) === want;
  }).sort(function(a,b){ return (a.date || 0) - (b.date || 0); });
}
/* 最近一次模考（任意卷） */
function lastMockAttempt(){
  var list = (ST.mocks || []).slice().sort(function(a,b){ return (a.date || 0) - (b.date || 0); });
  return list.length ? list[list.length - 1] : null;
}
/* 两次模考的差值：总分、各模块正确率、错因变化。只有同一套卷比才有意义，
   调用方负责保证 a / b 是同一套卷的两次记录。 */
function mockCompare(a, b){
  if (!a || !b) return null;
  var out = {
    from: b, to: a,
    rate: pct(a.right, a.answered || a.total) - pct(b.right, b.answered || b.total),
    right: (a.right || 0) - (b.right || 0),
    answered: (a.answered || 0) - (b.answered || 0),
    usedMs: (a.usedMs || 0) - (b.usedMs || 0),
    secs: [],
    reasons: []
  };
  var bm = {};
  (b.bySec || []).forEach(function(v){ bm[v.name] = v; });
  (a.bySec || []).forEach(function(v){
    var o = bm[v.name];
    if (!o) return;
    var nowRate = pct(v.ok, v.done || v.n), oldRate = pct(o.ok, o.done || o.n);
    out.secs.push({ name:v.name, from:oldRate, to:nowRate, d:nowRate - oldRate });
  });
  var bt = b.tally || {}, at = a.tally || {};
  REASONS.forEach(function(r){
    var x = bt[r.k] || 0, y = at[r.k] || 0;
    if (!x && !y) return;
    out.reasons.push({ k:r.k, label:r.label, from:x, to:y, d:y - x });
  });
  return out;
}

function submitMock(){
  var paper = EX.paper;
  var rec = EX.rec;
  /* 先取 started 再 stopMock：stopMock 会删掉 ST.mock 里的计时记录 */
  var meta = ST.mock['exam:' + paper.id] || {};
  var leftMs = mockLeft();
  stopMock();
  var answered = countAnswered(rec);
  recordMockAttempt(paper, rec, meta.started, leftMs);
  toast('已交卷：' + answered + ' / ' + paper.qCount + ' 题');
  go('#/p/exam/' + paper.id + '/result');
}

function renderExam(paper, qs, rec){
  var frag = document.createDocumentFragment();
  var q = qs[EX.idx];
  if (!q){
    frag.appendChild(topbar(paper.title, paper.year || '', function(){ go('#/'); }));
    frag.appendChild(E('div', {class:'wrap'}, E('div', {class:'empty'}, [
      E('div', {class:'big'}, '\uD83D\uDCED'),
      E('p', null, '这里暂时没有题目。'),
      E('button', {class:'btn', style:'margin-top:16px', onclick:function(){ go('#/p/exam/'+paper.id); }}, '回到全部题目')
    ])));
    return frag;
  }
  var isMock = EX.mode === 'mock';
  var isDrill = EX.mode === 'drill';
  var answered = isDrill ? qs.filter(function(x){ return rec.answers[x.no]; }).length : countAnswered(rec);
  var right = isDrill ? qs.filter(function(x){ return rec.answers[x.no] && rec.answers[x.no] === normAns(x.answer); }).length : countCorrect(rec, paper);

  frag.appendChild(topbar(paper.title, (paper.year ? paper.year + ' · ' : '') + (q._sec||''),
    function(){ if (isMock && !confirm('离开会保留本次模考进度，确定返回吗？')) return; go('#/'); },
    E('div', {style:'display:flex;gap:8px;flex:none'}, [
      E('button', {class:'iconbtn', onclick:function(){ cycleFont(); }, 'aria-label':'字号'}, 'A'),
      E('button', {class:'iconbtn', onclick:function(){ go('#/p/exam/'+paper.id+'/list'); }, 'aria-label':'题目列表'}, '\u2630')
    ])
  ));

  var wrap = E('div', {class:'wrap'});

  if (isDrill){
    drillEnsureStarted();
    var reviewing = drillInReview();
    var left = drillLeft();
    var warn = !reviewing && left > 0 && left <= 60000;
    var over = !reviewing && ST.drill && ST.drill.deadlineAt && left <= 0;
    var dbox = E('div', {class:'drillbar' + (warn ? ' warn' : '') + (over ? ' over' : '')}, [
      E('span', {class:'mlbl'}, reviewing ? '复练中 · 不计时' : (over ? '已超时' : '专项计时')),
      E('b', {class:'mtime', id:'drilltime'}, reviewing ? '不计时' : (over ? ('超时 ' + fmtLeft(-left)) : fmtLeft(left))),
      E('span', {class:'mhint'}, (reviewing ? '复练 ' : '专项 ') + (EX.idx + 1) + '/' + qs.length),
      E('div', {class:'flex1'})
    ]);
    wrap.appendChild(dbox);
    if (EX.tick) clearInterval(EX.tick);
    function drillTick(){
      var node = document.getElementById('drilltime');
      var t = ST.drill;
      if (!t || t.status === 'completed'){ clearInterval(EX.tick); EX.tick = null; return; }
      if (drillInReview()){ if (node) node.textContent = '不计时'; return; }
      drillEnsureStarted();
      var ms = drillLeft();
      var now = Date.now();
      if (ms <= 60000 && ms > 0 && !t.warned){ t.warned = true; save(); toast('还剩不到 1 分钟'); }
      if (drillShouldPrompt(t, now) && !t.timedOut){
        t.timedOut = true; save();
        clearInterval(EX.tick); EX.tick = null;
        var goOn = (typeof confirm === 'function') ? confirm('时间到，是否交卷？') : true;
        if (goOn !== false){ finishDrill(); go('#/drill/result'); return; }
        EX.tick = setInterval(drillTick, 1000);
        toast('继续作答，超时部分会单独标注');
      }
      if (node) node.textContent = ms <= 0 ? ('超时 ' + fmtLeft(-ms)) : fmtLeft(ms);
    }
    EX.tick = setInterval(drillTick, 1000);
  } else if (isMock){
    var left = mockLeft();
    var tbox = E('div', {class:'mockbar' + (EX.paused ? ' paused' : '')}, [
      E('span', {class:'mlbl'}, EX.paused ? '\u23F8 已暂停' : '\u23F1 模考中'),
      E('b', {class:'mtime', id:'mocktime'}, fmtLeft(left)),
      E('span', {class:'mhint'}, '已答 ' + answered + '/' + qs.length),
      E('div', {class:'flex1'}),
      E('button', {class:'mpause', onclick:toggleMockPause}, EX.paused ? '\u25B6 继续' : '\u23F8 暂停')
    ]);
    wrap.appendChild(tbox);
    if (EX.tick) clearInterval(EX.tick);
    if (EX.paused){
      EX.tick = null;
    } else {
      EX.tick = setInterval(function(){
        var node = document.getElementById('mocktime');
        var ms = mockLeft();
        if (ms <= 0){
          clearInterval(EX.tick); EX.tick = null;
          if (node) node.textContent = '0:00';
          toast('时间到，自动交卷');
          submitMock();
          return;
        }
        if (node) node.textContent = fmtLeft(ms);
      }, 1000);
    }
  } else {
    var chips = E('div', {class:'fchips'});
    var counts = { all:EX.all.length, todo:0, wrong:0, review:0, fav:0 };
    EX.all.forEach(function(x){
      if (!rec.answers[x.no]) counts.todo++;
      else if (rec.answers[x.no] !== normAns(x.answer)) counts.wrong++;
      if (reviewStateOf(rec, x.no) === 'due') counts.review++;
      if (isFav('exam', paper.id, x.no)) counts.fav++;
    });
    FILTERS.forEach(function(f){
      chips.appendChild(E('button', {
        class: EX.filter === f.k ? 'fchip on' : 'fchip',
        onclick:function(){ go('#/p/exam/' + paper.id + '/f/' + f.k); }
      }, f.label + ' ' + counts[f.k]));
    });
    wrap.appendChild(chips);
  }

  if (q._mat && (q._mat.text || (q._matImgs && q._matImgs.length))){
    var matLabel = '\uD83D\uDCC4 查看材料' + q._mat.no + ((q._matImgs && q._matImgs.length) ? '（含图表）' : '');
    wrap.appendChild(E('button', {class:'matlink', onclick:function(){ go('#/p/exam/'+paper.id+'/mat/'+q._mat.no); }}, matLabel));
  } else if (q._mat && q._mat.missingImage){
    wrap.appendChild(E('div', {class:'imgwarn'}, '本题材料为图片版，本地题库未收录原图，请对照纸质原卷查看。'));
  }

  var card = E('div', {class:'card'});
  var favOn = isFav('exam', paper.id, q.no);
  var graphOnly = isGraphQ(q);
  var skipped = !!(rec.skipped && rec.skipped[q.no]);
  card.appendChild(E('div', {class:'qhead'}, [
    E('span', {class:'chip'}, q._label || ('第 ' + q.no + ' 题')),
    q._sec ? E('span', {class:'chip gray'}, q._sec) : null,
    graphOnly ? E('span', {class:'chip gray'}, '\uD83D\uDCCA 图形题') : null,
    E('div', {class:'flex1'}),
    E('button', {class:'fav' + (favOn?' on':''), onclick:function(ev){
      var now = toggleFav('exam', paper.id, q.no);
      ev.target.className = now ? 'fav on' : 'fav';
      ev.target.textContent = now ? '\u2605' : '\u2606';
    }, 'aria-label':'收藏'}, favOn ? '\u2605' : '\u2606'),
    E('span', {class:'chip gray'}, '对 ' + right + ' / 已做 ' + answered)
  ]));
  card.appendChild(E('div', {class:'stem', text:q.stem}));
  var stemImgs = imgBox(q._imgs, 'stemimg');
  if (stemImgs) card.appendChild(stemImgs);
  else if (q.hasImage && !graphOnly) card.appendChild(E('div', {class:'imgwarn'}, '本题含图形，本地题库未收录原图，请对照纸质原卷作答。'));

  var sel = rec.answers[q.no] || null;
  var answeredQ = !!sel;
  var revealNow = answeredQ && !isMock;
  var correct = normAns(q.answer);
  var opts = E('div', {class:'opts'});
  if (graphOnly){
    var optImgs = imgBox(q._imgs, 'optimg');
    if (optImgs) opts.appendChild(optImgs);
    else opts.appendChild(E('div', {class:'imgwarn'}, [
      E('b', null, '这道题是图形题。'),
      '本地题库没有收录原图，只靠文字做不了。请对照纸质原卷看清 A/B/C/D 四张图，再在下面选答案；手边没有原卷就点「跳过本题」，跳过不计入错题，也不会排复练。'
    ]));
  }
  (q.options||[]).forEach(function(o){
    var cls = 'opt';
    if (revealNow){
      if (o.label === correct) cls += ' right';
      else if (o.label === sel) cls += ' wrong';
    } else if (o.label === sel) cls += ' sel';
    var hasImg = !!(q._imgs && q._imgs.length);
    var btn = E('button', {class:cls, disabled:(revealNow || (isMock && EX.paused)), onclick:function(){ pickAnswer(paper, q, o.label); }}, [
      E('span', {class:'k'}, o.label), E('span', {class:'v', text:(o.text && o.text.trim()) ? o.text : (hasImg ? '（见上方原图）' : '（见原卷图表）')})
    ]);
    opts.appendChild(btn);
  });
  var missingImg = !(q._imgs && q._imgs.length);
  if ((graphOnly || q.hasImage) && missingImg && !isMock && (!answeredQ || skipped)){
    opts.appendChild(E('button', {
      class:'skipbtn' + (skipped ? ' on' : ''),
      onclick:function(){ toggleSkip(paper, q); }
    }, skipped ? '取消跳过，重新作答' : '跳过本题（等有原卷再做）'));
  }
  card.appendChild(opts);

  if (isMock){
    if (answeredQ){
      card.appendChild(E('div', {class:'verdict mock'}, [
        E('span', {class:'big'}, '\u270E'),
        E('span', {style:'flex:1'}, '已作答，模考中不显示对错，交卷后统一出分'),
        E('button', {class:'redo', onclick:function(){ redoQuestion(paper, q); }}, '重做')
      ]));
    }
  } else if (revealNow){
    var ok = sel === correct;
    card.appendChild(E('div', {class:'verdict ' + (ok?'ok':'no')}, [
      E('span', {class:'big'}, ok ? '\u2714' : '\u2716'),
      E('span', {style:'flex:1'}, ok ? '答对了' : ('答错了，正确答案是 ' + correct)),
      E('button', {class:'redo', onclick:function(){ redoQuestion(paper, q); }}, '重做')
    ]));
    /* 答错：先让用户选错因。选完才会写入复练计划，错题本也才知道这道题下次什么时候出现。 */
    if (!ok){
      var picked = rec.reasons[q.no] || '';
      var rbox = E('div', {class:'reasonbox'}, [
        E('div', {class:'rh'}, picked ? '错因（可改）' : '这道题错在哪？选一个，我安排复练'),
        E('div', {class:'rlist'}, REASONS.map(function(r){
          return E('button', {
            class:'rchip' + (picked === r.k ? ' on' : ''),
            onclick:function(ev){
              setReason(rec, q.no, r.k);
              touchDay();
              touchAct('reason');
              save();
              var next = dueText(rec.review[q.no].due);
              toast(r.k === 'never' ? '已记下，这题暂不排复练' : ('已记下：' + r.label + ' · ' + next));
              render();
            }
          }, [E('b', null, r.label), E('span', null, r.hint)]);
        }))
      ]);
      var st = reviewStateOf(rec, q.no);
      var rv = rec.review[q.no];
      if (picked && rv){
        rbox.appendChild(E('div', {class:'rstatus'}, [
          E('span', null, '错因：' + reasonLabel(picked) + ' · '),
          E('b', null, isMastered(rv) ? '已掌握' : (rv.stage < 0 ? '暂不排复练' : dueText(rv.due))),
          rv.lapses ? E('span', null, ' · 已重做错 ' + rv.lapses + ' 次') : null
        ]));
      }
      card.appendChild(rbox);
    }
    if (q.analysis){
      card.appendChild(E('div', {class:'explain'}, [
        E('div', {class:'eh'}, '解析'),
        E('div', {class:'ansline'}, ['正确答案 ', E('em', null, correct)]),
        E('div', {text:q.analysis})
      ]));
    }
  }
  wrap.appendChild(card);
  wrap.appendChild(E('div', {class:'footnote'}, '进度自动保存在本机浏览器中。'));
  frag.appendChild(wrap);

  var prev = E('button', {class:'btn ghost sm', onclick:function(){ navQ(-1); }, disabled:EX.idx===0}, '上一题');
  var nextLabel = EX.idx >= qs.length-1 ? (isMock ? '交卷' : '完成') : '下一题';
  var next = E('button', {class:'btn', onclick:function(){
    if (EX.idx >= qs.length-1){
      if (isDrill){ finishDrill(); go('#/drill/result'); return; }
      if (isMock){
        if (confirm('确定交卷吗？交卷后统一显示对错。')) submitMock();
      } else go('#/p/exam/'+paper.id+'/result');
    } else navQ(1);
  }}, nextLabel);
  var mid = E('button', {class:'btn ghost sm', onclick:function(){
    if (isDrill){ if (ST.drill){ ST.drill.index = EX.idx; save(); } go('#/'); }
    else if (isMock){ if (confirm('确定交卷吗？')) submitMock(); }
    else go('#/p/exam/'+paper.id+'/list');
  }}, isMock ? '交卷' : '列表');
  var bar = E('div', {class:'actionbar'}, [prev, mid, E('span', {class:'prog'}, (EX.idx+1)+'/'+qs.length), next]);
  frag.appendChild(bar);
  return frag;
}

function navQ(d){
  var n = EX.idx + d;
  if (n < 0 || n >= EX.qs.length) return;
  EX.idx = n;
  if (EX.mode === 'drill' && ST.drill) ST.drill.index = n;
  EX.rec.cur = EX.qs[n].no;
  EX.rec.updated = Date.now();
  ST.last = { type:'exam', id:EX.paper.id, at:Date.now() };
  save();
  render();
  window.scrollTo(0,0);
}

function pickAnswer(paper, q, label){
  var rec = EX.rec;
  if (EX.mode === 'mock' && EX.paused){ toast('模考已暂停，点「继续」后再作答'); return; }
  if (rec.answers[q.no] && EX.mode !== 'mock' && EX.mode !== 'drill') return;
  var hadReview = !!(rec.review && rec.review[q.no]);
  rec.answers[q.no] = label;
  rec.cur = q.no;
  rec.updated = Date.now();
  ST.totalAnswered = (ST.totalAnswered||0) + 1;
  ST.last = { type:'exam', id:paper.id, at:Date.now() };
  touchDay();
  touchAct('q');
  if (hadReview) touchAct('review');
  var correct = normAns(q.answer);
  var isRight = label === correct;
  /* 专项超时后的作答：计入本次统计，但不判错、不进复练计划。 */
  var overdue = EX.mode === 'drill' && drillIsOverdue();
  if (overdue) drillMarkOverdue(q.no);
  else markWrong(rec, q.no, !isRight);
  /* 复练中的题：做对推进一个阶段，做错回到起点；这一步决定它下次什么时候再出现。
     超时作答不推进，避免把「来不及」记成「没掌握」。 */
  if (hadReview && EX.mode !== 'mock' && !overdue){
    var before = rec.review[q.no].stage;
    var after = advanceReview(rec, q.no, isRight);
    if (after && after.stage !== before){
      if (after.stage >= REVIEW_DAYS.length) toast('这道题已掌握，出师了 \uD83C\uDF89');
      else if (!isRight) toast('没关系，这道题回到起点，今天再过一遍');
    }
  }
  save();
  if (EX.mode === 'mock'){
    toast('已选 ' + label);
    if (EX.idx < EX.qs.length-1){ navQ(1); } else { render(); }
    return;
  }
  if (!isRight && !hadReview) toast('答错了，正确答案 ' + correct);
  render();
  var ex = document.querySelector('.explain');
  if (ex) ex.scrollIntoView({behavior:'smooth', block:'center'});
}

function redoQuestion(paper, q){
  var rec = EX.rec || getPaperRec('exam', paper.id);
  delete rec.answers[q.no];
  markWrong(rec, q.no, false);
  rec.updated = Date.now();
  save();
  toast('已清除本题作答，可以重做了');
  render();
  window.scrollTo(0,0);
}

/* 图形题兜底：手边没有纸质原卷时跳过。跳过不计入错题、不进复练计划，随时可以取消。 */
function toggleSkip(paper, q){
  var rec = EX.rec || getPaperRec('exam', paper.id);
  rec.skipped = rec.skipped || {};
  if (rec.skipped[q.no]){
    delete rec.skipped[q.no];
    toast('已取消跳过，这题重新算未做');
  } else {
    delete rec.answers[q.no];
    markWrong(rec, q.no, false);
    rec.skipped[q.no] = Date.now();
    toast('已跳过，等有原卷再来做');
  }
  rec.updated = Date.now();
  ST.last = { type:'exam', id:paper.id, at:Date.now() };
  save();
  render();
}

/* ---------- 题目列表 ---------- */
function viewExamList(id){
  return loadPaper('exam', id).then(function(paper){
    var qs = allQuestions(paper);
    var rec = getPaperRec('exam', paper.id);
    var frag = document.createDocumentFragment();
    frag.appendChild(topbar('题目列表', paper.title, function(){ go('#/p/exam/'+paper.id); }));
    var wrap = E('div', {class:'wrap'});
    wrap.appendChild(E('div', {class:'section-title'}, '共 ' + qs.length + ' 题 · 已做 ' + countAnswered(rec)));
    var box = E('div', {class:'card'});
    var grid = E('div', {style:'display:grid;grid-template-columns:repeat(auto-fill,minmax(46px,1fr));gap:7px'});
    qs.forEach(function(q, i){
      var sel = rec.answers[q.no];
      var cls = '';
      var style = 'padding:9px 2px;border-radius:10px;font-size:13.5px;font-weight:650;text-align:center;border:1px solid var(--line);background:#fff;color:var(--ink-2)';
      if (sel){
        if (sel === normAns(q.answer)) style = style.replace('background:#fff','background:var(--ok-soft)').replace('color:var(--ink-2)','color:var(--ok)').replace('border:1px solid var(--line)','border:1px solid #9fdcc4');
        else style = style.replace('background:#fff','background:var(--bad-soft)').replace('color:var(--ink-2)','color:var(--bad)').replace('border:1px solid var(--line)','border:1px solid #f0b4b0');
      }
      grid.appendChild(E('button', {style:style, onclick:function(){ EX.paper = paper; EX.qs = qs; EX.rec = rec; EX.filter = null; EX.idx = i; EX.rec.cur = q.no; save(); go('#/p/exam/'+paper.id); }}, String(q.no)));
    });
    box.appendChild(grid);
    wrap.appendChild(box);
    wrap.appendChild(E('div', {class:'footnote'}, '绿色=答对，红色=答错，白色=未做。'));
    frag.appendChild(wrap);
    return frag;
  });
}
/* ---------- 材料页 ---------- */
function viewExamMaterial(id, no){
  return loadPaper('exam', id).then(function(paper){
    var mat = null;
    var matImgs = null;
    (paper.sections||[]).forEach(function(s){ (s.materials||[]).forEach(function(m){
      if (String(m.no)!==String(no)) return;
      mat = m;
      var im = secImgs(paper, s.name);
      if (im && im.m && im.m[String(m.no)]) matImgs = im.m[String(m.no)];
    }); });
    var frag = document.createDocumentFragment();
    frag.appendChild(topbar('材料 ' + no, paper.title, function(){ go('#/p/exam/'+paper.id); }));
    var wrap = E('div', {class:'wrap'});
    var card = E('div', {class:'card'});
    if (matImgs && matImgs.length){
      var mbox = imgBox(matImgs, 'matimg');
      if (mbox) card.appendChild(mbox);
    }
    if (mat && mat.text){
      card.appendChild(E('div', {class:'mat'}, [E('h4', null, '材料 ' + no), E('div', {text:mat.text})]));
    } else if (!matImgs || !matImgs.length){
      card.appendChild(E('div', {class:'imgwarn'}, '该材料为图片版，本地题库未收录原图，请对照纸质原卷查看。'));
    }
    wrap.appendChild(card);
    frag.appendChild(wrap);
    return frag;
  });
}

/* ---------- 交卷结果 ---------- */
function viewExamResult(id){
  return loadPaper('exam', id).then(function(paper){
    var qs = allQuestions(paper);
    var rec = getPaperRec('exam', paper.id);
    var answered = 0, right = 0;
    var bySec = {};
    qs.forEach(function(q){
      var s = q._sec || '其他';
      if (!bySec[s]) bySec[s] = { n:0, ok:0, done:0 };
      bySec[s].n++;
      var sel = rec.answers[q.no];
      if (sel){ answered++; bySec[s].done++; if (sel === normAns(q.answer)){ right++; bySec[s].ok++; } }
    });
    var frag = document.createDocumentFragment();
    frag.appendChild(topbar('练习结果', paper.title, function(){ go('#/p/exam/'+paper.id); }));
    var wrap = E('div', {class:'wrap'});
    var p = pct(right, answered || qs.length);
    wrap.appendChild(E('div', {class:'card bigscore'}, [
      E('div', {class:'pct', style:'color:' + (p>=70?'var(--ok)':p>=50?'var(--brand)':'var(--bad)')}, p + '%'),
      E('div', {class:'lbl'}, '已做 ' + answered + ' / ' + qs.length + ' 题 · 答对 ' + right + ' 题'),
      answered > 0 ? E('div', {class:'lbl'}, '正确率按已做题计算') : null
    ]));
    wrap.appendChild(E('div', {class:'section-title'}, '分模块表现'));
    var box = E('div', {class:'card'});
    Object.keys(bySec).forEach(function(k){
      var v = bySec[k];
      var r = pct(v.ok, v.done || v.n);
      box.appendChild(E('div', {style:'margin-bottom:14px'}, [
        E('div', {style:'display:flex;justify-content:space-between;font-size:14px;font-weight:650;margin-bottom:6px'}, [
          E('span', null, k),
          E('span', {style:'color:var(--ink-3);font-weight:600'}, v.done + '/' + v.n + ' 题 · 对 ' + r + '%')
        ]),
        E('div', {class:'pbar'}, E('i', {style:'width:' + r + '%'}))
      ]));
    });
    wrap.appendChild(box);

    var wrongs = qs.filter(function(q){ var s = rec.answers[q.no]; return s && s !== normAns(q.answer); });
    if (wrongs.length){
      wrap.appendChild(E('div', {class:'section-title'}, '本套错题 ' + wrongs.length + ' 题'));
      wrap.appendChild(E('div', {class:'note'}, '错题已自动进入错题本。点下面的按钮可以只刷这一套的错题。'));
      wrap.appendChild(E('button', {class:'btn ghost', onclick:function(){ go('#/p/exam/'+paper.id+'/f/wrong'); }}, '只刷这套的错题（' + wrongs.length + '）'));
    }
    wrap.appendChild(E('div', {class:'section-title'}, '操作'));
    var acts = E('div', {style:'display:flex;flex-direction:column;gap:9px'});
    acts.appendChild(E('button', {class:'btn', onclick:function(){ EX.idx = 0; EX.rec.cur = qs[0].no; save(); go('#/p/exam/'+paper.id); }}, '从头再看一遍'));
    var undone = qs.filter(function(q){ return !rec.answers[q.no]; });
    if (undone.length){
      acts.appendChild(E('button', {class:'btn ghost', onclick:function(){ go('#/p/exam/'+paper.id+'/f/todo'); }}, '继续做没做完的（' + undone.length + '）'));
    }
    acts.appendChild(E('button', {class:'btn ghost', onclick:function(){
      if (!confirm('重新开始一次限时模考吗？计时会重新计算。')) return;
      delete ST.mock['exam:' + paper.id]; save();
      go('#/p/exam/' + paper.id + '/mock');
    }}, '限时模考一次（' + mockMinutes(paper) + ' 分钟）'));
    acts.appendChild(E('button', {class:'btn ghost', onclick:function(){ go('#/diag'); }}, '看模考诊断报告'));
    acts.appendChild(E('button', {class:'btn ghost', onclick:function(){
      if (!confirm('确定清空这套卷的全部记录吗？作答、错因和复练计划都会一起清掉。')) return;
      /* 清空必须清干净：只清 answers 的话，reasons / review / wrong 会留下，
         首页仍提示「今天该复练 N 题」，错题本却因为没有答案显示空态，两处对不上。 */
      rec.answers = {}; rec.reasons = {}; rec.review = {}; rec.wrong = {}; rec.skipped = {};
      rec.cur = 1; rec.updated = Date.now();
      delete ST.mock['exam:'+paper.id]; save(); toast('已重置'); render();
    }}, '清空本套记录'));
    wrap.appendChild(acts);
    frag.appendChild(wrap);
    return frag;
  });
}
/* ================= 申论 ================= */
/* ---- v10：申论批改工作台 ----
   批改的依据是 05-训练工作流/01-申论批改SOP.md：先把参考答案拆成一条条采分点，
   再逐点标记「命中 / 部分命中 / 漏点」，算出要点命中率（目标 ≥ 75%）。
   拆点全部在本地做，不需要联网，也不猜——拆不出来就按段落兜底，并如实说明。 */

/* 采分点序号有三种写法，按可靠性依次尝试：中文序号 > 阿拉伯数字 > 圈号。
   前置的「。」「；」「：」「换行」都算分隔，避免把「2024年」里的数字当成序号。 */
var SL_POINT_RE = {
  cn: /(?:^|\n|。|；|;)\s*([一二三四五六七八九十]{1,3})\s*[、.．]/g,
  ar: /(?:^|\n|。|；|;|：|:)\s*(\d{1,2})\s*[、.．](?!\d)/g,
  ci: /[\u2460-\u246C]/g
};
function slMarks(re, s){
  var out = [], m;
  re.lastIndex = 0;
  while ((m = re.exec(s))) out.push({ at:m.index, len:m[0].length });
  return out;
}
/* 有的题给了两份参考答案，批改只对照第一份；「参考答案说明」是解释性文字，不是采分点。 */
function slFirstAnswer(answer){
  var s = String(answer === null || answer === undefined ? '' : answer).replace(/\r\n?/g, '\n').trim();
  if (!s) return '';
  s = s.replace(/^参考答案[一二三四五六七八九十]?\s*[：:]?\s*/, '');
  s = s.replace(/^(答案|参考要点|要点)[：:]\s*/, '');
  var m2 = /(?:^|\n)\s*参考答案[二三四五六七八九十]/.exec(s);
  if (m2) s = s.slice(0, m2.index);
  var note = s.search(/参考答案说明[：:（(]/);
  if (note >= 0) s = s.slice(0, note);
  return s.trim();
}
/* 把参考答案拆成采分点。返回 { mode, points }：
   mode = cn / ar / ci 表示按序号拆成功，para 表示按段落兜底，empty 表示这题没有参考答案。 */
function splitAnswerPoints(answer){
  var s = slFirstAnswer(answer);
  if (!s) return { mode:'empty', points:[] };
  var order = ['cn','ar','ci'];
  for (var k=0;k<order.length;k++){
    var key = order[k];
    var ms = slMarks(SL_POINT_RE[key], s);
    if (ms.length >= 2){
      var points = [];
      var head = s.slice(0, ms[0].at).trim();
      /* 序号之前的开头常常是总括句（「这句话是指……」「S市坚持……模式」），
         字数够多就算一个点，太短（比如只剩个冒号）就丢掉。 */
      if (head.length >= 10) points.push(head);
      for (var i=0;i<ms.length;i++){
        var from = ms[i].at + ms[i].len;
        var to = (i+1 < ms.length) ? ms[i+1].at : s.length;
        var body = s.slice(from, to).trim();
        if (body.length > 3) points.push(body);
      }
      return { mode:key, points:points };
    }
  }
  var paras = s.split(/\n\s*\n|\n/).map(function(x){ return x.trim(); }).filter(function(x){ return x.length > 8; });
  return { mode:'para', points:paras };
}
/* 大作文（申发论述）不做逐点命中率——40 分的大作文按要点扣分没有意义，
   走 SOP 里的五步自评。识别规则：40 分及以上一律算大作文；
   字数要求 800 字以上且题干出现议论文特征词也算。 */
var SL_ESSAY_KW = /(议论文章|议论文|写一篇文章|自拟题目|自选角度|联系实际|自选立意|以.{2,20}为题|为主题|为话题|为议题|写一篇)/;
function isEssayQuestion(q){
  if (!q) return false;
  if (Number(q.score || 0) >= 40) return true;
  var stem = String(q.stem || '').replace(/\s+/g, '');
  var req = wordRequirement(q);
  var need = req ? (req.min || req.max || req.target || 0) : 0;
  return need >= 800 && SL_ESSAY_KW.test(stem);
}
/* 批改记录：ST.sl['shenlun:188'].grade[题号] = { marks, extra, reasons, essay, checks, note, savedAt } */
function slGrade(rec, no){
  if (!rec) return null;
  rec.grade = rec.grade || {};
  var g = rec.grade[no];
  /* 只认「真的落过盘」的批改：要么当前这轮标过（savedAt > 0），要么封存过至少一轮（history 非空）。
     刚点进批改页、一个字都没标就退出的，不能算已批改——否则题目列表会显示 0%，
     入口按钮也会从「开始批改」变成「继续批改」。 */
  if (!g) return null;
  return (g.savedAt || (Array.isArray(g.history) && g.history.length)) ? g : null;
}
function slGradeNew(no){
  return { no:no, marks:{}, extra:'', reasons:{}, essay:{}, checks:{}, note:'', history:[], savedAt:0 };
}
/* 复批历史上限。存的是每一轮的命中率快照与逐点标记，用来回答
   「同一道题一周后重做，命中率有没有涨」。超过上限丢最早的一轮，不让本地存储无限膨胀。 */
var SL_HISTORY_MAX = 10;
/* 把当前这轮的批改结果压成一个可长期保存的快照。 */
function slSnap(g){
  var s = { savedAt: g.savedAt || 0, marks:{}, essay:{} };
  if (typeof g.rate === 'number'){ s.rate = g.rate; s.total = g.total || 0; s.marked = g.marked || 0; }
  Object.keys(g.marks || {}).forEach(function(i){ if (g.marks[i]) s.marks[i] = g.marks[i]; });
  Object.keys(g.essay || {}).forEach(function(k){ if (g.essay[k]) s.essay[k] = g.essay[k]; });
  if (g.note) s.note = g.note;
  return s;
}
/* 大作文五步自评折算成分数（每步满分 2）。用来做两轮之间的对比，
    也用来在没有命中率的场景下报一个可比的数字。 */
function slEssayScore(essay){
  var e = essay || {}, got = 0, answered = 0;
  SL_ESSAY_STEPS.forEach(function(st){
    if (e[st.k]) answered++;
    got += (SL_ESSAY_VALUE[e[st.k]] || 0);
  });
  return { score:got, max:SL_ESSAY_STEPS.length * 2, answered:answered };
}
/* 「最近一次已完成的批改」= 当前轮标过就用当前轮，否则用封存历史里的最后一轮。
    复批时当前轮会先清空（savedAt 归 0），在新一轮标完之前，对外一律报上一轮的数字，
    不会出现「重批到一半，列表上的命中率掉到 0%」这种假下跌。 */
function slGradeLast(g){
  if (!g) return null;
  var h = Array.isArray(g.history) ? g.history : [];
  if (g.savedAt){
    var cur = slEssayScore(g.essay);
    return { rate:(typeof g.rate === 'number' ? g.rate : null), total:g.total || 0,
             marked:g.marked || 0, savedAt:g.savedAt, round:h.length + 1,
             essayScore:cur.score, essayMax:cur.max, essayAnswered:cur.answered };
  }
  if (!h.length) return null;
  var p = h[h.length - 1];
  var prev = slEssayScore(p.essay);
  return { rate:(typeof p.rate === 'number' ? p.rate : null), total:p.total || 0,
           marked:p.marked || 0, savedAt:p.savedAt || 0, round:h.length,
           essayScore:prev.score, essayMax:prev.max, essayAnswered:prev.answered };
}
/* 「上一轮」这一项怎么用一句话报出来：小题报命中率，大作文报自评分数。 */
function slLastText(last){
  if (!last) return '还没有批改记录';
  if (typeof last.rate === 'number') return last.rate + '%';
  if (last.essayAnswered) return '自评 ' + last.essayScore + '/' + last.essayMax;
  return '已批改';
}
/* 「上一轮已封存、新一轮还没标完」的复批进行中状态。
   有封存历史但当前轮没有落盘，就说明新一轮开了头还没批完——
   这时候对外一律报上一轮的数字，不能把没标的新一轮算成一轮。 */
function slRechecking(g){
  return !!(g && !g.savedAt && Array.isArray(g.history) && g.history.length);
}
/* 已批改几轮。只数真正落过盘的轮次：封存过几轮 + 当前轮标完没有。
   刚点「再批一次」还没标的新一轮不算一轮，避免列表上出现虚高的「已批 2 轮」。 */
function slRoundCount(g){
  if (!g) return 0;
  var h = Array.isArray(g.history) ? g.history.length : 0;
  return h + (g.savedAt ? 1 : 0);
}
/* 复批对比：拿封存的上一轮和当前这轮比，算命中率涨跌，并逐点找出
   「上次漏这次补上」和「上次对这次丢了」的采分点。没有上一轮就返回 null，不编对比。 */
var SL_MARK_VALUE = { hit:1, part:0.5 };
var SL_ESSAY_VALUE = { ok:2, part:1, bad:0 };
function slCompare(g){
  if (!g) return null;
  var h = Array.isArray(g.history) ? g.history : [];
  if (!h.length || !g.savedAt) return null;
  var prev = h[h.length - 1], cur = slSnap(g);
  var out = { prev:prev, cur:cur, delta:null, gained:[], lost:[] };
  if (typeof prev.rate === 'number' && typeof cur.rate === 'number'){
    out.delta = cur.rate - prev.rate;
    var total = cur.total || 0;
    for (var i=0;i<total;i++){
      var a = SL_MARK_VALUE[prev.marks[i]] || 0;
      var b = SL_MARK_VALUE[cur.marks[i]] || 0;
      if (b > a) out.gained.push(i);
      else if (b < a) out.lost.push(i);
    }
  } else {
    /* 大作文：两轮五步自评折算成分数比。只要有一轮标过步骤就算，
       两轮都一个字没标的不给「0/10 → 0/10」这种没意义的对比。 */
    var pc = slEssayScore(prev.essay), cc = slEssayScore(cur.essay);
    if (!pc.answered && !cc.answered) return out;
    var ps = 0, cs = 0;
    SL_ESSAY_STEPS.forEach(function(st){
      var a = SL_ESSAY_VALUE[prev.essay[st.k]] || 0;
      var b = SL_ESSAY_VALUE[cur.essay[st.k]] || 0;
      ps += a; cs += b;
      if (b > a) out.gained.push(st.k);
      else if (b < a) out.lost.push(st.k);
    });
    out.prevScore = ps; out.curScore = cs;
    out.scoreMax = SL_ESSAY_STEPS.length * 2;
  }
  return out;
}
/* 再批一次：把当前这轮封存进 history，清空标记重新打，历史不动。
   返回 false 表示当前轮根本没标过，没什么可封存的，不做假存档。 */
function slRecheck(rec, no){
  if (!rec || !rec.grade) return false;
  var g = rec.grade[no];
  if (!g || !g.savedAt) return false;
  g.history = Array.isArray(g.history) ? g.history : [];
  g.history.push(slSnap(g));
  while (g.history.length > SL_HISTORY_MAX) g.history.shift();
  g.marks = {}; g.reasons = {}; g.extra = '';
  g.essay = {}; g.checks = {}; g.note = '';
  delete g.rate; delete g.total; delete g.marked;
  g.savedAt = 0;
  g.recheckAt = Date.now();
  rec.updated = Date.now();
  save();
  return true;
}
/* 命中率口径（写进说明页，验收也按这个口径）：
   命中率 = (命中数 + 部分命中数 × 0.5) ÷ 参考答案要点总数。
   没标记的点按「还没对上」处理，不算命中——这样不会因为懒得标就显示虚高的分数。 */
function slGradeStat(grade, total){
  var g = grade || {};
  var hit = 0, part = 0, miss = 0, unmarked = 0;
  for (var i=0;i<total;i++){
    var v = g.marks ? g.marks[i] : null;
    if (v === 'hit') hit++;
    else if (v === 'part') part++;
    else if (v === 'miss') miss++;
    else unmarked++;
  }
  var rate = total > 0 ? Math.round((hit + part * 0.5) / total * 100) : 0;
  return { hit:hit, part:part, miss:miss, unmarked:unmarked, total:total, rate:rate,
           marked:hit + part + miss };
}
/* 所有批改记录，按时间倒序。批改页 / 计划页里程碑 / 进度页都用这一份口径。 */
function slAllGrades(){
  var out = [];
  Object.keys(ST.sl || {}).forEach(function(k){
    var rec = ST.sl[k];
    if (!rec || !rec.grade) return;
    Object.keys(rec.grade).forEach(function(no){
      var g = rec.grade[no];
      var last = slGradeLast(g);
      if (!last) return;
      out.push({ key:k, paperId:k.split(':')[1], no:Number(no), grade:g, savedAt:last.savedAt,
                 last:last, rounds:slRoundCount(g), comparing:slRechecking(g) });
    });
  });
  return out.sort(function(a,b){ return b.savedAt - a.savedAt; });
}
/* 最近一次「小题」批改（带命中率的那些）。大作文没有命中率，不参与里程碑判定。
   复批进行中（新一轮还没标完）时报的是上一轮的命中率，不会因为重批掉成 0。 */
function slLastGraded(){
  var all = slAllGrades();
  for (var i=0;i<all.length;i++){ if (typeof all[i].last.rate === 'number') return all[i]; }
  return null;
}
/* 复批总览：哪些题复批过、平均涨跌多少、有没有退步的题。
   口径：只要封存过至少一轮就算「复批过」（新一轮可能还没标完）；
   涨跌只统计两轮都有数字的题，新一轮进行中的题不参与平均，不拿没标的一轮凑数。 */
function slRecheckSummary(){
  var items = [];
  slAllGrades().forEach(function(r){
    var h = Array.isArray(r.grade.history) ? r.grade.history : [];
    if (!h.length) return;
    var cmp = slCompare(r.grade);
    var prevRate = null;
    for (var i=h.length-1;i>=0;i--){ if (typeof h[i].rate === 'number'){ prevRate = h[i].rate; break; } }
    items.push({ paperId:r.paperId, no:r.no, rounds:r.rounds, prevRate:prevRate,
                 curRate:(r.comparing ? null : (typeof r.last.rate === 'number' ? r.last.rate : null)),
                 prevScore:(cmp && typeof cmp.prevScore === 'number') ? cmp.prevScore : null,
                 curScore:(cmp && typeof cmp.curScore === 'number') ? cmp.curScore : null,
                 scoreMax:(cmp && typeof cmp.scoreMax === 'number') ? cmp.scoreMax : null,
                 delta:cmp ? cmp.delta : null, savedAt:r.last.savedAt, comparing:r.comparing });
  });
  var deltas = [];
  items.forEach(function(x){ if (typeof x.delta === 'number') deltas.push(x.delta); });
  var sum = 0;
  deltas.forEach(function(d){ sum += d; });
  var avg = deltas.length ? Math.round(sum / deltas.length) : null;
  var up = 0, down = 0, flat = 0;
  deltas.forEach(function(d){ if (d > 0) up++; else if (d < 0) down++; else flat++; });
  return { items:items, n:items.length, avg:avg, up:up, down:down, flat:flat, compared:deltas.length };
}
/* 批改导出成纯文本：贴进 09-产出/申论答卷/ 或备忘录留档。 */
function slGradeText(paper, q, grade, points){
  var L = [];
  L.push('题目：' + paper.title + ' 第 ' + q.no + ' 题');
  L.push('分值：' + (q.score || '—') + ' 分' + (wordRequirement(q) ? '　字数：' + wordRequirement(q).label : ''));
  L.push('');
  if (isEssayQuestion(q)){
    L.push('【大作文五步自评】');
    SL_ESSAY_STEPS.forEach(function(st){
      var v = (grade.essay || {})[st.k];
      L.push(st.name + '：' + (v ? SL_ESSAY_LABEL[v] : '未评'));
    });
  } else {
    var st2 = slGradeStat(grade, points.length);
    L.push('【要点比对】（共 ' + points.length + ' 个采分点）');
    points.forEach(function(p, i){
      var v = (grade.marks || {})[i];
      var mark = v === 'hit' ? '✅ 命中' : (v === 'part' ? '🔺 部分命中' : (v === 'miss' ? '❌ 漏点' : '⬜ 未标'));
      var reason = v === 'miss' && (grade.reasons || {})[i] ? ('（漏点原因：' + SL_REASON_LABEL[(grade.reasons||{})[i]] + '）') : '';
      L.push(mark + ' 要点' + (i+1) + '：' + p.replace(/\s*\n\s*/g, ' ') + reason);
    });
    L.push('');
    L.push('【命中率】' + st2.hit + ' 命中 + ' + st2.part + ' 部分命中 × 0.5 = ' +
           st2.rate + '%（' + st2.marked + '/' + st2.total + ' 个点已标）');
    if (grade.extra) L.push('【多余要点】' + grade.extra);
  }
  L.push('');
  L.push('【C 卷四查】');
  SL_C_CHECKS.forEach(function(c){
    L.push(((grade.checks || {})[c.k] ? '✅ ' : '⬜ ') + c.name + '：' + c.hint);
  });
  if (grade.note) { L.push(''); L.push('【批改结论】'); L.push(grade.note); }
  /* v11：复批对比。有上一轮就写清楚涨跌，没有就如实写「第一轮」。 */
  var lastG = slGradeLast(grade);
  var cmpG = slCompare(grade);
  if (lastG && slRoundCount(grade) > 1){
    L.push('');
    /* 新一轮开了头还没标完时，轮次按「封存了几轮 + 1」报，并写明进行中，
       免得导出的文本把没标的这一轮说成已经批完。 */
    var roundNo = grade.savedAt ? slRoundCount(grade) : (slRoundCount(grade) + 1);
    L.push('【复批对比】第 ' + roundNo + ' 轮' + (grade.savedAt ? '' : '（进行中）'));
    if (cmpG && typeof cmpG.delta === 'number'){
      L.push('上次 ' + cmpG.prev.rate + '% → 这次 ' + cmpG.cur.rate + '%（' +
        (cmpG.delta > 0 ? '涨 ' + cmpG.delta : (cmpG.delta < 0 ? '跌 ' + (-cmpG.delta) : '持平')) + ' 个百分点）');
    } else if (cmpG && typeof cmpG.curScore === 'number'){
      L.push('上次自评 ' + cmpG.prevScore + '/' + cmpG.scoreMax + ' → 这次 ' + cmpG.curScore + '/' + cmpG.scoreMax);
    } else if (!grade.savedAt){
      L.push('新一轮进行中，上一轮 ' + slLastText(lastG));
    }
    if (cmpG && cmpG.gained.length) L.push('补上的点：' + cmpG.gained.map(function(x){
      return (typeof x === 'number') ? ('要点 ' + (x + 1)) : (SL_ESSAY_NAME[x] || x); }).join('、'));
    if (cmpG && cmpG.lost.length) L.push('丢掉的点：' + cmpG.lost.map(function(x){
      return (typeof x === 'number') ? ('要点 ' + (x + 1)) : (SL_ESSAY_NAME[x] || x); }).join('、'));
  }
  return L.join('\n');
}
var SL_MARK_LABEL = { hit:'✅ 命中', part:'🔺 部分命中', miss:'❌ 漏点' };
var SL_REASON_LABEL = {
  noSee:'材料里没看到', notExtract:'看到了没提炼', wrongDir:'提炼错方向', other:'其他'
};
var SL_REASON_ITEMS = [
  { k:'noSee', label:'材料里没看到' },
  { k:'notExtract', label:'看到了没提炼' },
  { k:'wrongDir', label:'提炼错方向' },
  { k:'other', label:'其他' }
];
/* 大作文五步自评（对应 SOP 第三节），每步三档。 */
var SL_ESSAY_STEPS = [
  { k:'topic', name:'审题', hint:'抓住核心主题，回应题干全部要求' },
  { k:'struct', name:'结构', hint:'总分总完整，分论点并列或递进、互不交叉' },
  { k:'proof', name:'论据', hint:'每个分论点都有具体论据，且真的支撑论点' },
  { k:'lang', name:'语言', hint:'政策语言、开头结尾点题、没有口语化表达' },
  { k:'words', name:'字数', hint:'不少于 800 字，不超过 1200 字' }
];
var SL_ESSAY_LABEL = { ok:'✅ 达标', part:'🔺 基本达标', bad:'❌ 不达标' };
/* 步骤代码 → 名称，复批对比里要把丢掉的步骤说成人话。 */
var SL_ESSAY_NAME = {};
SL_ESSAY_STEPS.forEach(function(st){ SL_ESSAY_NAME[st.k] = st.name; });
/* C 卷专属四查（对应 SOP 第七节）：这四项是行政执法卷的采分点。 */
var SL_C_CHECKS = [
  { k:'law', name:'依法', hint:'写出法律名称、制度名称或程序要求' },
  { k:'serve', name:'服务', hint:'体现群众感受、便民举措、服务理念' },
  { k:'way', name:'执法方式', hint:'首违不罚、柔性执法、说理式执法' },
  { k:'act', name:'对策可操作', hint:'有主体、有动作、有对象' }
];

var SL = { paper:null, idx:0, rec:null, showMat:false };
/* 卷内进度落在 rec.cur（题号），换卷时用它回到上次那道题。
   题号不保证从 1 连续（有的卷是 1/2/3/4，有的是 1/2/3），统一用题号查找。 */
function shenlunIndexOf(paper, no){
  var qs = paper.questions || [];
  for (var i=0;i<qs.length;i++){ if (qs[i].no === no) return i; }
  return -1;
}
/* 指定要打开的卷和题号。列表点题、搜索点题都走这里，
   先摆好 SL.paper，viewShenlun 才知道这是「同一套卷内的跳转」，不会当成换卷重置。 */
function openShenlunAt(paper, no){
  SL.paper = paper;
  var at = shenlunIndexOf(paper, no);
  SL.idx = at >= 0 ? at : 0;
  SL.showMat = false;
  go('#/p/shenlun/' + paper.id);
}

function viewShenlun(id){
  return loadPaper('shenlun', id).then(function(paper){
    var rec = getPaperRec('shenlun', paper.id);
    /* 换卷必须换题号。SL.idx 是全局单例，只在「卷内上一题 / 下一题」和「题目列表点某题」
       时被有意设置；从题库 / 首页点进另一套卷时，若不按卷回落到上次那道题，
       就会带着上一套卷的题号进来（例如 4 题的卷翻到第 4 题，再打开另一套 4 题卷仍是第 4 题）。 */
    if (!SL.paper || String(SL.paper.id) !== String(paper.id)){
      var back = shenlunIndexOf(paper, rec.cur);
      SL.idx = back >= 0 ? back : 0;
    }
    SL.paper = paper; SL.rec = rec;
    var total = (paper.questions||[]).length;
    if (!(SL.idx >= 0) || SL.idx >= total) SL.idx = 0;
    if (rec.cur !== paper.questions[SL.idx].no){
      rec.cur = paper.questions[SL.idx].no;
      rec.updated = Date.now();
      save();
    }
    var frag = document.createDocumentFragment();
    var q = paper.questions[SL.idx];
    frag.appendChild(topbar(paper.title, paper.year + ' · 申论', function(){ go('#/'); },
      E('button', {class:'iconbtn', onclick:function(){ go('#/p/shenlun/'+paper.id+'/list'); }}, '\u2630')));
    var wrap = E('div', {class:'wrap'});

    var seg = E('div', {class:'segmented'}, [
      E('button', {class: SL.showMat?'':'on', onclick:function(){ SL.showMat=false; render(); }}, '作答要求'),
      E('button', {class: SL.showMat?'on':'', onclick:function(){ SL.showMat=true; render(); }}, '给定资料')
    ]);
    wrap.appendChild(seg);

    if (SL.showMat){
      var mcard = E('div', {class:'card'});
      (paper.materials||[]).forEach(function(m){
        mcard.appendChild(E('div', {class:'mat'}, [E('h4', null, '给定资料 ' + m.no), E('div', {text:m.text})]));
      });
      wrap.appendChild(mcard);
    } else {
      var card = E('div', {class:'card'});
      card.appendChild(E('div', {class:'qhead'}, [
        E('span', {class:'chip'}, '第 ' + q.no + ' 题'),
        q.score ? E('span', {class:'chip gray'}, q.score + ' 分') : null,
        wordReq ? E('span', {class:'chip gray'}, wordReq.label) : null,
        E('div', {class:'flex1'}),
        E('span', {class:'chip gray'}, (SL.idx+1) + '/' + paper.questions.length)
      ]));
      card.appendChild(E('div', {class:'stem', text:q.stem}));

      // ---- 作答区：本地草稿 + 字数统计 ----
      rec.drafts = rec.drafts || {};
      var draft = rec.drafts[q.no] || '';
      var revealed = !!rec.revealed[q.no];
      var wordReq = wordRequirement(q);

      var c0 = wordCounter(countWords(draft), wordReq);
      var counter = E('span', {class:c0.cls}, c0.text);
      var draftBox = E('div', {class:'draftbox'}, [
        E('div', {class:'drafthead'}, [
          E('span', {class:'dl'}, '我的作答'),
          counter
        ]),
        E('textarea', {
          class:'draft',
          rows:'7',
          placeholder: '在这里写你的答案，会自动保存…',
          oninput: function(ev){
            var v = ev.target.value;
            rec.drafts[q.no] = v;
            rec.updated = Date.now();
            ST.last = {type:'shenlun', id:paper.id, at:Date.now()};
            touchDayIfNew();
            touchActOnce('sl', String(paper.id) + ':' + q.no);
            save();
            var c = wordCounter(countWords(v), wordReq);
            counter.textContent = c.text;
            counter.className = c.cls;
          }
        }, draft)
      ]);
      if (draft) draftBox.querySelector('textarea').value = draft;
      card.appendChild(draftBox);

      if (!revealed){
        card.appendChild(E('button', {class:'btn', style:'margin-top:14px', onclick:function(){
          rec.revealed[q.no] = true; rec.read = rec.read||{}; rec.read[q.no]=true;
          rec.updated = Date.now(); ST.last = {type:'shenlun', id:paper.id, at:Date.now()};
          touchDayIfNew(); touchActOnce('sl', String(paper.id) + ':' + q.no);
          save(); render();
        }}, '看参考答案'));
      } else {
        card.appendChild(E('div', {class:'explain'}, [
          E('div', {class:'eh'}, '参考答案'),
          E('div', {text:q.answer || '（暂无参考答案）'})
        ]));
        if (draft){
          card.appendChild(E('div', {class:'explain mine'}, [
            E('div', {class:'eh'}, '我的作答'),
            E('div', {text:draft})
          ]));
        }
        /* v10：看完答案直接进批改工作台，把「对答案」变成「逐点比对 + 归因」。
           v11：复批进行中（新一轮还没标完）时报的是上一轮的数字，不会出现假下跌。 */
        var gDone = slGrade(rec, q.no);
        var gPts = splitAnswerPoints(q.answer);
        var gLast = slGradeLast(gDone);
        var gStat = (gLast && typeof gLast.rate === 'number') ? gLast : null;
        var gRounds = slRoundCount(gDone);
        var gCmp = slCompare(gDone);
        card.appendChild(E('button', {class:'btn' + (gDone ? ' ghost' : ''), style:'margin-top:14px', onclick:function(){
          go('#/p/shenlun/' + paper.id + '/grade/' + q.no);
        }}, gDone
          ? (gDone.savedAt
              ? (gStat ? ('继续批改（当前命中率 ' + gStat.rate + '%）') : '继续批改（大作文五步自评）')
              : '继续批改（新一轮进行中）')
          : '开始批改（逐点比对）'));
        if (gDone && gStat){
          var gNote = '上次批改：命中率 ' + gStat.rate + '%，' +
            gStat.marked + '/' + gStat.total + ' 个采分点已标' + (gRounds > 1 ? '（已批 ' + gRounds + ' 轮）' : '') + '。';
          if (gCmp && typeof gCmp.delta === 'number') gNote += '比上一轮' + (gCmp.delta > 0 ? '涨了 ' + gCmp.delta : (gCmp.delta < 0 ? '跌了 ' + (-gCmp.delta) : '持平')) + ' 个百分点。';
          else gNote += '改完记得一周后重做同一道题，看命中率有没有涨。';
          card.appendChild(E('div', {class:'note'}, gNote));
        }
      }
      wrap.appendChild(card);
      if (!revealed) wrap.appendChild(E('div', {class:'note'}, '建议先写完整，再点「看参考答案」对照。写的字数是按实际字符算的。'));
    }

    var total = (paper.questions||[]).length;
    /* 翻题时把「上次做到哪」落到 rec.cur，下次从题库点进来（而不是「继续上次」）也能接上 */
    function setIdx(n){
      SL.idx = n;
      rec.cur = paper.questions[n].no;
      rec.updated = Date.now();
      ST.last = {type:'shenlun', id:paper.id, at:Date.now()};
      save();
      render();
      window.scrollTo(0,0);
    }
    var prev = E('button', {class:'btn ghost sm', disabled:SL.idx===0, onclick:function(){ setIdx(SL.idx-1); }}, '上一题');
    var next = E('button', {class:'btn', onclick:function(){
      if (SL.idx >= total-1){ go('#/p/shenlun/'+paper.id+'/list'); } else { setIdx(SL.idx+1); }
    }}, SL.idx >= total-1 ? '完成' : '下一题');
    frag.appendChild(wrap);
    frag.appendChild(E('div', {class:'actionbar'}, [prev, E('span', {class:'prog'}, (SL.idx+1)+'/'+total), next]));
    return frag;
  });
}

function viewShenlunList(id){
  return loadPaper('shenlun', id).then(function(paper){
    var rec = getPaperRec('shenlun', paper.id);
    var frag = document.createDocumentFragment();
    frag.appendChild(topbar('题目列表', paper.title, function(){ go('#/p/shenlun/'+paper.id); }));
    var wrap = E('div', {class:'wrap'});
    var list = E('div', {class:'reslist'});
    (paper.questions||[]).forEach(function(q, i){
      var done = rec.revealed && rec.revealed[q.no];
      /* v10：已批改的题在列表上直接显示命中率，一眼看出哪几道还没批。
         大作文没有命中率，显示「已批改」。 */
      var g = slGrade(rec, q.no);
      var gl = slGradeLast(g);
      var gRounds = slRoundCount(g);
      var tail;
      if (gl && typeof gl.rate === 'number') tail = gl.rate + '%';
      else if (gl) tail = '已批改';
      else tail = done ? '已看' : (q.score ? q.score + '分' : '');
      list.appendChild(E('button', {class:'resrow' + (done?' ok':'') + (g?' graded':''), onclick:function(){ openShenlunAt(paper, q.no); }}, [
        E('span', {class:'n'}, String(q.no)),
        E('span', {class:'col'}, [
          E('span', {class:'t'}, q.stem.slice(0, 40)),
          /* 新一轮开了头但还没标完：如实说「进行中」并带出上一轮数字，
             不把没标的新一轮算进「已批 N 轮」里。 */
          slRechecking(g)
            ? E('span', {class:'sub'}, '新一轮进行中 · 上一轮 ' + slLastText(gl))
            : (gRounds > 1 ? E('span', {class:'sub'}, '已批 ' + gRounds + ' 轮') : null)
        ]),
        E('span', {class:'a'}, tail)
      ]));
    });
    wrap.appendChild(list);
    var slGraded = 0, slRounds = 0;
    Object.keys(rec.grade || {}).forEach(function(no){
      if (slGrade(rec, no)) slGraded++;
      var gg = rec.grade[no];
      if (gg && Array.isArray(gg.history) && gg.history.length) slRounds++;
    });
    if (slGraded) wrap.appendChild(E('div', {class:'note'}, '这套卷已批改 ' + slGraded + ' 道' +
      (slRounds ? '，其中 ' + slRounds + ' 道复批过' : '') +
      '。命中率显示在右侧，点题号可以进去改标记' + (slRounds ? '，或点「再批一次」重做一轮。' : '。')));
    else wrap.appendChild(E('div', {class:'note'}, '批改比单纯对答案有用得多：看完参考答案后点「开始批改」，逐点标出命中 / 漏点，再填漏点原因。'));
    if (slRounds){
      var listSum = slRecheckSummary();
      wrap.appendChild(E('button', {class:'btn ghost', onclick:function(){ go('#/stats/recheck'); }},
        '看复批对比' + (listSum.n ? '（' + listSum.n + ' 道）' : '')));
    }
    frag.appendChild(wrap);
    return frag;
  });
}
/* ================= 申论复批对比（v11） ================= */
/* 命中率涨跌的显示口径：涨了标绿、跌了标红、持平如实写「持平」。
   没有可比数字（比如上一轮是大作文、这一轮是小题）就写「—」，不猜。 */
function slDeltaChip(delta){
  if (typeof delta !== 'number') return E('span', {class:'dchip flat'}, '—');
  if (delta > 0) return E('span', {class:'dchip up'}, '▲ +' + delta + '%');
  if (delta < 0) return E('span', {class:'dchip down'}, '▼ ' + delta + '%');
  return E('span', {class:'dchip flat'}, '＝ 持平');
}
/* 复批对比页：回答「同一道题一周后重做，到底有没有长进」。
   只列复批过两轮以上的题；一道都没复批时如实说明怎么开始。 */
function viewShenlunRecheck(){
  var frag = document.createDocumentFragment();
  frag.appendChild(topbar('申论复批对比', '同一道题重做，命中率有没有涨', function(){ go('#/stats'); }));
  var wrap = E('div', {class:'wrap'});
  var sum = slRecheckSummary();

  if (!sum.n){
    wrap.appendChild(E('div', {class:'card'}, [
      E('div', {class:'bigscore', style:'padding:22px 16px'}, [
        E('div', {class:'pct', style:'font-size:40px'}, '0'),
        E('div', {class:'lbl'}, '还没有复批过的题')
      ]),
      E('div', {class:'planhint'}, '复批是申论提分最关键的一步：同一道题隔一周重写一遍，再批一次，' +
        '系统会拿两轮的命中率做对比，告诉你哪几个采分点补上了、哪几个又丢了。')
    ]));
    wrap.appendChild(E('div', {class:'section-title'}, '怎么开始'));
    wrap.appendChild(E('div', {class:'card'}, [
      E('div', {class:'ptask'}, '1. 去申论批改工作台，把一道小题的采分点逐点标完，保存。'),
      E('div', {class:'ptask'}, '2. 一周后回来看同一道题，重写一遍，进批改页点「再批一次」。'),
      E('div', {class:'ptask'}, '3. 标完新一轮，这一页就会自动给出「上次 X% → 这次 Y%」的对比。')
    ]));
    wrap.appendChild(E('button', {class:'btn', onclick:function(){ go('#/p/shenlun/188/list'); }}, '去申论批改工作台'));
    wrap.appendChild(footnote());
    frag.appendChild(wrap);
    frag.appendChild(navbar('stats'));
    return frag;
  }

  wrap.appendChild(E('div', {class:'hero'}, [
    E('h1', null, '复批总览'),
    E('p', null, '统计口径：同一道题批过两轮以上才算复批，涨跌按命中率百分点算。'),
    E('div', {class:'stats'}, [
      E('div', {class:'stat'}, [E('b', null, String(sum.n)), E('span', null, '复批过的题')]),
      E('div', {class:'stat'}, [E('b', null, sum.avg === null ? '—' : (sum.avg > 0 ? '+' + sum.avg : String(sum.avg))), E('span', null, '平均涨跌（百分点）')]),
      E('div', {class:'stat'}, [E('b', null, String(sum.up)), E('span', null, '进步的题')]),
      E('div', {class:'stat'}, [E('b', null, String(sum.down)), E('span', null, '退步的题')])
    ])
  ]));

  if (sum.avg !== null){
    var advice = sum.down === 0 && sum.up > 0
      ? '复批过的题全部进步或持平，说明「批改 → 归因 → 重写」这条链路在你身上是有效的，继续保持一周一轮的节奏。'
      : (sum.down > sum.up
        ? '退步的题比进步的多。复批退步通常不是水平掉了，而是这一轮写得比上一轮急——重写时先列提纲再动笔，写完留 2 分钟检查分条和前置词。'
        : '有涨有跌是正常现象。点进退步的题看「丢了哪些点」，那几条就是还没真正记住的地方。');
    wrap.appendChild(E('div', {class:'note'}, advice));
  }

  wrap.appendChild(E('div', {class:'section-title'}, '逐题对比'));
  var list = E('div', {class:'reslist'});
  sum.items.forEach(function(it){
    var meta = findPaper('shenlun', it.paperId);
    var title = meta ? meta.title : ('申论 ' + it.paperId);
    var d = (typeof it.curRate === 'number' && typeof it.prevRate === 'number') ? (it.curRate - it.prevRate) : null;
    /* 新一轮还没标完的题只报上一轮，不拿没标的这一轮跟上一轮比。
       小题报命中率、大作文报五步自评分数，两种口径不混着比。 */
    var rateText;
    if (it.comparing) rateText = '上一轮 ' + slLastText({ rate:it.prevRate, essayScore:it.prevScore, essayMax:it.scoreMax });
    else if (typeof it.prevRate === 'number' && typeof it.curRate === 'number') rateText = it.prevRate + '% → ' + it.curRate + '%';
    else if (typeof it.curRate === 'number') rateText = it.curRate + '%';
    else if (typeof it.curScore === 'number' && typeof it.scoreMax === 'number') rateText = '自评 ' + it.prevScore + '/' + it.scoreMax + ' → ' + it.curScore + '/' + it.scoreMax;
    else rateText = '已批改';
    list.appendChild(E('button', {class:'resrow graded', onclick:function(){ go('#/p/shenlun/' + it.paperId + '/grade/' + it.no); }}, [
      E('span', {class:'n'}, String(it.no)),
      E('span', {class:'col'}, [
        E('span', {class:'t'}, title + ' · 第 ' + it.no + ' 题'),
        E('span', {class:'sub'}, (it.comparing ? '新一轮进行中 · ' : ('已批 ' + it.rounds + ' 轮 · ')) + rateText +
          ' · 最近 ' + fmtDay(it.savedAt))
      ]),
      slDeltaChip(d)
    ]));
  });
  wrap.appendChild(list);
  wrap.appendChild(E('div', {class:'note'}, '点任意一题可以进批改页，看到「上次漏 / 这次补上」和「上次对 / 这次丢了」的具体采分点。'));
  wrap.appendChild(footnote());
  frag.appendChild(wrap);
  frag.appendChild(navbar('stats'));
  return frag;
}
/* 申论批改工作台。这是 05-训练工作流/01-申论批改SOP.md 的应用内版本：
   逐点比对 → 漏点归因 → 逻辑与格式 → 字数与卷面 → C 卷四查。
   小题按采分点打标算命中率；大作文没有采分点，走五步自评。 */
function viewShenlunGrade(id, noArg){
  return loadPaper('shenlun', id).then(function(paper){
    var no = Number(noArg);
    var q = null;
    (paper.questions || []).forEach(function(x){ if (x.no === no) q = x; });
    var frag = document.createDocumentFragment();
    frag.appendChild(topbar('申论批改', paper.title.slice(0, 16) + ' · 第 ' + no + ' 题',
      function(){ openShenlunAt(paper, no); }));
    var wrap = E('div', {class:'wrap'});
    if (!q){
      wrap.appendChild(E('div', {class:'empty'}, E('p', null, '这道题不在本卷里。')));
      frag.appendChild(wrap);
      return frag;
    }

    var rec = getPaperRec('shenlun', paper.id);
    rec.grade = rec.grade || {};
    var g = rec.grade[q.no];
    /* 没批过就先在内存里建一份空记录，第一次落盘时才写进 rec.grade。
       这样「点进来看看又退出去」不会在题目列表上留下一条 0% 的假批改。 */
    if (!g){ g = slGradeNew(q.no); }
    g.marks = g.marks || {}; g.reasons = g.reasons || {}; g.essay = g.essay || {}; g.checks = g.checks || {};
    g.history = Array.isArray(g.history) ? g.history : [];
    var essay = isEssayQuestion(q);
    var split = splitAnswerPoints(q.answer);
    var pts = split.points;
    var draft = (rec.drafts || {})[q.no] || '';
    var wreq = wordRequirement(q);

    /* 每次改动立即落盘：批改过程会反复重渲染，不落盘就会丢标记。 */
    function persist(){
      rec.grade[q.no] = g;
      if (!essay){
        var st = slGradeStat(g, pts.length);
        g.rate = st.rate; g.total = st.total; g.marked = st.marked;
      }
      g.savedAt = Date.now();
      rec.updated = Date.now();
      ST.last = { type:'shenlun', id:paper.id, at:Date.now() };
      touchDayIfNew();
      save();
    }

    wrap.appendChild(E('div', {class:'card'}, [
      E('div', {class:'qhead'}, [
        E('span', {class:'chip'}, '第 ' + q.no + ' 题'),
        q.score ? E('span', {class:'chip gray'}, q.score + ' 分') : null,
        wreq ? E('span', {class:'chip gray'}, wreq.label) : null,
        E('div', {class:'flex1'}),
        E('span', {class:'chip gray'}, essay ? '大作文' : '小题')
      ]),
      E('div', {class:'stem', text:q.stem})
    ]));

    /* ---- 复批对比（v11）：这一轮和封存的上一轮比，涨跌 + 具体补上 / 丢掉的点 ----
       只有真的封存过至少一轮（history 非空）才显示。第一轮批改、或者老版本升级上来
       还没点过「再批一次」的，都不显示——没有上一轮就不该编出一个「对比」出来。 */
    var lastDone = slGradeLast(g);
    var cmp = slCompare(g);
    if (g.history.length){
      var cmpKids = [];
      if (cmp && (typeof cmp.delta === 'number' || typeof cmp.curScore === 'number')){
        var head;
        if (typeof cmp.delta === 'number'){
          head = '上次 ' + cmp.prev.rate + '% → 这次 ' + cmp.cur.rate + '%';
        } else {
          head = '上次自评 ' + cmp.prevScore + '/' + cmp.scoreMax + ' → 这次 ' + cmp.curScore + '/' + cmp.scoreMax;
        }
        cmpKids.push(E('div', {class:'dhead'}, [
          E('span', {class:'dt'}, head),
          typeof cmp.delta === 'number' ? slDeltaChip(cmp.delta) : null
        ]));
      } else if (g.savedAt){
        cmpKids.push(E('div', {class:'dhead'}, [E('span', {class:'dt'}, '这一轮还没标，标完自动出对比')]));
      } else {
        cmpKids.push(E('div', {class:'dhead'}, [
          E('span', {class:'dt'}, '上一轮 ' + slLastText(lastDone)),
          E('span', {class:'dchip flat'}, '这一轮还没标')
        ]));
      }
      if (cmp && cmp.gained.length){
        cmpKids.push(E('div', {class:'drow up'}, '✅ 这次补上的点：' + cmp.gained.map(function(x){
          return (typeof x === 'number') ? ('要点 ' + (x + 1)) : (SL_ESSAY_NAME[x] || x);
        }).join('、')));
      }
      if (cmp && cmp.lost.length){
        cmpKids.push(E('div', {class:'drow down'}, '❌ 这次丢掉的点：' + cmp.lost.map(function(x){
          return (typeof x === 'number') ? ('要点 ' + (x + 1)) : (SL_ESSAY_NAME[x] || x);
        }).join('、')));
      }
      if (cmp && !cmp.gained.length && !cmp.lost.length && typeof cmp.delta === 'number'){
        cmpKids.push(E('div', {class:'drow flat'}, '逐点标记和上一轮完全一样。'));
      }
      cmpKids.push(E('div', {class:'planhint'}, '已批 ' + slRoundCount(g) + ' 轮' +
        (slRechecking(g) ? '，新一轮进行中' : '') + '。复批对比只看「上一轮」和「这一轮」，' +
        '再批一次会把这一轮封存起来，历史最多保留 ' + SL_HISTORY_MAX + ' 轮。'));
      wrap.appendChild(E('div', {class:'section-title'}, '复批对比'));
      wrap.appendChild(E('div', {class:'card dcard'}, cmpKids));
    }

    /* ---- 前置检查：没有参考答案就没法批 ---- */
    if (!q.answer || !String(q.answer).trim()){
      wrap.appendChild(E('div', {class:'note'}, '这道题题库里没有收录参考答案，无法逐点比对。' +
        '可以先按 SOP 检查自己有没有分条、有没有前置词、字数是否合规，等补上参考答案后再批。'));
      wrap.appendChild(E('button', {class:'btn ghost', onclick:function(){ openShenlunAt(paper, q.no); }}, '回去看题'));
      frag.appendChild(wrap);
      return frag;
    }

    if (draft){
      wrap.appendChild(E('div', {class:'section-title'}, '我的作答（' + countWords(draft) + ' 字）'));
      wrap.appendChild(E('div', {class:'explain mine'}, E('div', {text:draft})));
    } else {
      wrap.appendChild(E('div', {class:'note'}, '这道题还没写草稿。没写就批不出真实问题——先回去写完再批。'));
      wrap.appendChild(E('button', {class:'btn ghost', onclick:function(){ openShenlunAt(paper, q.no); }}, '回去写'));
    }

    if (essay){
      /* ---- 大作文：五步自评 ---- */
      wrap.appendChild(E('div', {class:'section-title'}, '大作文五步自评'));
      var ecard = E('div', {class:'card'});
      ecard.appendChild(E('div', {class:'planhint'}, '40 分的大作文不按采分点扣分，按这五步自查。每步选一档，别自我宽容。'));
      SL_ESSAY_STEPS.forEach(function(st){
        var row = E('div', {class:'gpoint'}, [
          E('div', {class:'gpt'}, [E('b', null, st.name), E('span', null, ' · ' + st.hint)]),
          E('div', {class:'gmarks'}, ['ok','part','bad'].map(function(k){
            return E('button', {class:'gmark' + (g.essay[st.k] === k ? ' on' : ''), onclick:function(){
              g.essay[st.k] = (g.essay[st.k] === k) ? null : k;
              persist(); render();
            }}, SL_ESSAY_LABEL[k]);
          }))
        ]);
        ecard.appendChild(row);
      });
      wrap.appendChild(ecard);
    } else {
      /* ---- 小题：逐点比对 ---- */
      var stat = slGradeStat(g, pts.length);
      wrap.appendChild(E('div', {class:'section-title'}, '逐点比对（共 ' + pts.length + ' 个采分点）'));
      wrap.appendChild(E('div', {class:'card'}, [
        E('div', {class:'bigscore', style:'padding:6px 0 2px'}, [
          E('div', {class:'pct', style:'font-size:38px'}, stat.rate + '%'),
          E('div', {class:'lbl'}, '要点命中率 · 目标 ≥ 75%' + (stat.unmarked ? ('　还有 ' + stat.unmarked + ' 个点没标') : ''))
        ]),
        E('div', {class:'pbar'}, E('i', {style:'width:' + Math.min(100, stat.rate) + '%'})),
        E('div', {class:'diagrow'}, [
          E('span', {class:'dn'}, '✅ 命中 ' + stat.hit + ' · 🔺 部分命中 ' + stat.part + ' · ❌ 漏点 ' + stat.miss),
          E('span', {class:'dv'}, stat.marked + ' / ' + stat.total + ' 已标')
        ]),
        E('div', {class:'planhint'}, '命中率 =（命中数 + 部分命中数 × 0.5）÷ 参考答案要点总数。没标的点不算命中。')
      ]));
      if (split.mode === 'para'){
        wrap.appendChild(E('div', {class:'note'}, '这份参考答案没有可识别的序号，已按段落拆成 ' + pts.length +
          ' 段来比对。段落不等同于采分点，命中率只作参考。'));
      }
      var pcard = E('div', {class:'card'});
      pts.forEach(function(p, i){
        var v = g.marks[i];
        var kids = [
          E('div', {class:'gpt'}, [E('b', null, '要点 ' + (i+1)), E('span', null, ' ' + p.replace(/\s*\n\s*/g, ' '))]),
          E('div', {class:'gmarks'}, ['hit','part','miss'].map(function(k){
            return E('button', {class:'gmark ' + k + (v === k ? ' on' : ''), onclick:function(){
              g.marks[i] = (g.marks[i] === k) ? null : k;
              persist(); render();
            }}, SL_MARK_LABEL[k]);
          }))
        ];
        if (v === 'miss'){
          kids.push(E('div', {class:'greason'}, [
            E('span', {class:'grl'}, '漏点原因：'),
            E('span', {class:'gmarks'}, SL_REASON_ITEMS.map(function(r){
              return E('button', {class:'gmark sm' + (g.reasons[i] === r.k ? ' on' : ''), onclick:function(){
                g.reasons[i] = (g.reasons[i] === r.k) ? null : r.k;
                persist(); render();
              }}, r.label);
            }))
          ]));
        }
        pcard.appendChild(E('div', {class:'gpoint'}, kids));
      });
      wrap.appendChild(pcard);

      wrap.appendChild(E('div', {class:'section-title'}, '我写了但答案没有的'));
      wrap.appendChild(E('div', {class:'planfield'}, E('textarea', {
        class:'draft', rows:'3', value: g.extra || '',
        placeholder:'写上多余的点（可不填）。多余要点会挤占字数，也是丢分项…',
        oninput:function(ev){ g.extra = ev.target.value; persist(); }
      })));
    }

    /* ---- C 卷四查 ---- */
    wrap.appendChild(E('div', {class:'section-title'}, 'C 卷四查（行政执法专属采分点）'));
    var ccard = E('div', {class:'card'});
    ccard.appendChild(E('div', {class:'planhint'}, '这四项是行政执法卷区别于普通申论的地方，普通批改不会提醒你。'));
    SL_C_CHECKS.forEach(function(c){
      ccard.appendChild(E('button', {class:'gcheck' + (g.checks[c.k] ? ' on' : ''), onclick:function(){
        g.checks[c.k] = !g.checks[c.k]; persist(); render();
      }}, [ E('span', {class:'gcbox'}, g.checks[c.k] ? '✅' : '⬜'),
           E('span', {class:'gct'}, [E('b', null, c.name), E('span', null, ' · ' + c.hint)]) ]));
    });
    wrap.appendChild(ccard);

    /* ---- 批改结论 ---- */
    wrap.appendChild(E('div', {class:'section-title'}, '批改结论'));
    wrap.appendChild(E('div', {class:'planfield'}, E('textarea', {
      class:'draft', rows:'4', value: g.note || '',
      placeholder:'主要问题是什么？下次改哪一个动作？例如「漏了依法类要点，下次答题前先列依法/服务两个维度」…',
      oninput:function(ev){ g.note = ev.target.value; persist(); }
    })));

    /* ---- 操作区 ---- */
    wrap.appendChild(E('div', {class:'section-title'}, '操作'));
    var acts = E('div', {style:'display:flex;flex-direction:column;gap:9px'});
    acts.appendChild(E('button', {class:'btn', onclick:function(){
      persist();
      toast(g.savedAt ? '批改已保存' : '已保存');
    }}, '保存批改'));
    acts.appendChild(E('button', {class:'btn ghost', onclick:function(){
      var txt = slGradeText(paper, q, g, pts);
      copyText(txt).then(function(){ toast('批改记录已复制，粘贴到备忘录留档'); },
        function(){ window.prompt('长按全选复制：', txt); });
    }}, '导出批改记录（复制文本）'));
    /* v11：把这一轮封存进历史，清空标记重新批，用来做「一周后重做」的对比。
       当前这轮一个字都没标时不做假存档——先批完这一轮再说。 */
    acts.appendChild(E('button', {class:'btn ghost', onclick:function(){
      if (!g.savedAt){ toast('这一轮还没标，先批完再开新一轮'); return; }
      if (!confirm('把这一轮封存为历史，清空标记重新批一遍？\n（历史最多保留 ' + SL_HISTORY_MAX + ' 轮，题目列表上的命中率不会掉）')) return;
      if (slRecheck(rec, q.no)){ toast('已开新一轮，标记清空，上一轮已存档'); render(); }
    }}, '再批一次（封存这一轮）'));
    acts.appendChild(E('button', {class:'btn ghost', onclick:function(){
      if (!confirm('清空这道题的批改标记吗？')) return;
      delete rec.grade[q.no];
      save(); toast('已清空本题批改'); render();
    }}, '清空本题批改'));
    acts.appendChild(E('button', {class:'btn ghost', onclick:function(){ openShenlunAt(paper, q.no); }}, '回到题目'));
    wrap.appendChild(acts);
    wrap.appendChild(E('div', {class:'note'}, '批完记得做两件事：把漏掉的规范表述抄进 03-知识库/申论/06，一周后重做同一道题看命中率有没有涨。'));
    wrap.appendChild(footnote());
    frag.appendChild(wrap);
    return frag;
  });
}
/* ================= 错题本 ================= */
/* 从错题本 / 收藏 / 搜索点进某一道题：统一走这里，保证筛选态和题号对得上 */
function openQuestion(paper, qs, rec, q, filter){
  EX.paper = paper; EX.all = allQuestions(paper); EX.qs = qs; EX.rec = rec;
  EX.filter = filter || 'all'; EX.mode = 'practice'; EX.endAt = 0;
  if (EX.tick){ clearInterval(EX.tick); EX.tick = null; }
  var at = qs.indexOf(q);
  EX.idx = at >= 0 ? at : 0;
  rec.cur = q.no;
  save();
  go('#/p/exam/' + paper.id);
}
/* 开始复练：一次只进一套卷，只显示这套卷里今天到期的题，做完再回错题本 */
function startReviewSession(items){
  if (!items || !items.length) return;
  /* 复练并进当天的每日会话：复练段在前、不计时，做完自动进入限时专项。 */
  startDailySession(false);
  return;
  var best = null, bestN = 0, seen = {};
  items.forEach(function(it){
    var k = String(it.paper.id);
    seen[k] = (seen[k] || 0) + 1;
    if (seen[k] > bestN){ bestN = seen[k]; best = it; }
  });
  var first = best || items[0];
  var n = seen[String(first.paper.id)];
  EX.filter = 'review';
  toast('复练 ' + first.paper.title.slice(0, 12) + ' 的 ' + n + ' 道到期题');
  go('#/p/exam/' + first.paper.id + '/f/review');
}
function wrongPaperIds(){
  var out = [];
  Object.keys(ST.papers).forEach(function(k){
    var id = k.split(':')[1];
    var rec = ST.papers[k];
    if (!rec) return;
    /* 有错题结论的卷才需要加载：已排期的看 rec.review，答错没标错因的看 rec.wrong。
       不能再用「有作答记录」当门槛——复练答对或点过「重做」之后 answers 可能是空的，
       而这道题还在复练计划里，错题本必须照样把它列出来。 */
    var n = (rec.review ? Object.keys(rec.review).length : 0) + (rec.wrong ? Object.keys(rec.wrong).length : 0);
    if (n) out.push(id);
  });
  return out;
}
/* 做过的卷：行测至少做过一题，或申论至少看过一题的参考答案。
   这个口径和「有错题的卷」是两回事，所以单独算，不共用 wrongPaperIds()。 */
function donePaperCount(){
  var n = 0;
  Object.keys(ST.papers).forEach(function(k){ if (countAnswered(ST.papers[k])) n++; });
  Object.keys(ST.sl).forEach(function(k){
    var rec = ST.sl[k] || {};
    if (Object.keys(rec.read || {}).length) n++;
  });
  return n;
}
function viewWrong(){
  var ids = wrongPaperIds();
  var frag = document.createDocumentFragment();
  frag.appendChild(topbar('错题本', '自动收集答错的题', null));
  var wrap = E('div', {class:'wrap'});
  if (!ids.length){
    wrap.appendChild(E('div', {class:'empty'}, [
      E('div', {class:'big'}, '\uD83C\uDFAF'),
      E('p', null, '还没有错题记录。'),
      E('p', null, '去行测里做几套题，答错的会自动收进这里。')
    ]));
    frag.appendChild(wrap);
    frag.appendChild(navbar('wrong'));
    return Promise.resolve(frag);
  }
  var loading = E('div', {class:'empty'}, E('p', null, '正在整理错题…'));
  wrap.appendChild(loading);
  frag.appendChild(wrap);
  frag.appendChild(navbar('wrong'));

  Promise.all(ids.map(function(id){ return loadPaper('exam', id).catch(function(){ return null; }); })).then(function(papers){
    var box = E('div', {class:'wrap'});
    var now = Date.now();
    /* 四类：今天该复练 / 排好期还没到 / 已掌握 / 暂不排期；没标错因的单独提醒一次 */
    var buckets = { due:[], waiting:[], mastered:[], later:[], unmarked:[] };
    papers.forEach(function(paper){
      if (!paper) return;
      var rec = getPaperRec('exam', paper.id);
      var qs = allQuestions(paper);
      var byNo = {};
      qs.forEach(function(q){ byNo[q.no] = q; });
      var seen = {};
      function put(no){
        var q = byNo[no];
        if (!q) return;
        seen[no] = 1;
        buckets[reviewStateOf(rec, no, now)].push({ paper:paper, qs:qs, rec:rec, q:q });
      }
      /* 归属口径必须和进度页 reviewCounts() 完全一致：只认本地落下的结论
         （rec.review 已排期 / rec.wrong 答错未标错因），不拿「这道题当前选对没有」当门槛。
         否则复练答对或点「重做」之后，题还在复练计划里，错题本却把它藏起来，
         首页 / 进度页 / 错题本三处各说一套；「已掌握」「已排期」两个分组也会永远空着。 */
      if (rec.review) Object.keys(rec.review).forEach(function(no){ put(Number(no)); });
      if (rec.wrong) Object.keys(rec.wrong).forEach(function(no){ if (!seen[no]) put(Number(no)); });
    });
    var totalWrong = buckets.due.length + buckets.waiting.length + buckets.mastered.length + buckets.later.length + buckets.unmarked.length;

    function rowFor(item){
      var q = item.q, rec = item.rec;
      var st = reviewStateOf(rec, q.no, now);
      var rv = rec.review[q.no];
      var tagCls = st === 'due' ? 'due' : st === 'waiting' ? 'wait' : st === 'mastered' ? 'mastered' : st === 'later' ? 'later' : '';
      var tagTxt = st === 'due' ? '今天复练' : st === 'waiting' ? dueText(rv.due, now) :
                   st === 'mastered' ? '已掌握' : st === 'later' ? '暂不排期' : '待标错因';
      var sub = reasonLabel(rec.reasons[q.no]) || '还没选错因';
      if (rv && rv.stage > 0 && !isMastered(rv)) sub += ' · 第 ' + (rv.stage + 1) + ' 轮';
      if (rv && rv.lapses) sub += ' · 重做错过 ' + rv.lapses + ' 次';
      /* 副标题说明这道题当前的状态。复练答对 / 点过「重做」之后 rec.answers 可能是空的，
         直接拼会显示「你选 undefined」；已掌握和暂不排期的题也不必再报上次选了什么。 */
      var picked = rec.answers ? rec.answers[q.no] : null;
      if (st === 'mastered') sub += ' · 已经连着做对';
      else if (st === 'later') sub += ' · 想练时随时点开';
      else if (picked) sub += ' · 上次选 ' + picked + ' · 对 ' + normAns(q.answer);
      else sub += ' · 当前没有作答记录';
      return E('button', {class:'resrow' + (st === 'mastered' ? ' ok' : ' no'), onclick:function(){
        openQuestion(item.paper, item.qs, item.rec, q);
      }}, [
        E('span', {class:'n'}, String(q.no)),
        E('span', {class:'col'}, [
          E('span', {class:'t'}, q.stem.replace(/\s+/g,' ').slice(0, 30)),
          E('span', {class:'sub'}, sub)
        ]),
        E('span', {class:'tag ' + tagCls}, tagTxt)
      ]);
    }

    if (!totalWrong){
      box.appendChild(E('div', {class:'empty'}, [E('div', {class:'big'}, '\uD83C\uDF89'), E('p', null, '目前没有错题，继续保持！')]));
      box.appendChild(footnote());
      $app.replaceChild(box, $app.querySelector('.wrap'));
      return;
    }

    if (buckets.due.length){
      box.appendChild(E('div', {class:'revhead'}, [
        E('h3', null, '\u23F0 今天该复练'), E('span', {class:'rcnt'}, String(buckets.due.length)), E('span', {class:'flex1'})
      ]));
      box.appendChild(E('div', {class:'note'}, '这些题按你的错因已经到期。趁印象还在，重做一遍最省力。'));
      var dl = E('div', {class:'reslist'});
      buckets.due.forEach(function(it){ dl.appendChild(rowFor(it)); });
      box.appendChild(dl);
      box.appendChild(E('button', {class:'btn', style:'margin-top:12px', onclick:function(){
        startReviewSession(buckets.due);
      }}, '开始复练（' + buckets.due.length + ' 题）'));
    }

    if (buckets.unmarked.length){
      box.appendChild(E('div', {class:'revhead'}, [
        E('h3', null, '\u2753 还没标错因'), E('span', {class:'rcnt gray'}, String(buckets.unmarked.length)), E('span', {class:'flex1'})
      ]));
      box.appendChild(E('div', {class:'note'}, '标了错因才会进复练计划。点开任意一题，选一下错在哪就行。'));
      var ul = E('div', {class:'reslist'});
      buckets.unmarked.slice(0, 30).forEach(function(it){ ul.appendChild(rowFor(it)); });
      box.appendChild(ul);
    }

    if (buckets.waiting.length){
      box.appendChild(E('div', {class:'revhead'}, [
        E('h3', null, '\uD83D\uDCC5 已排期'), E('span', {class:'rcnt gray'}, String(buckets.waiting.length)), E('span', {class:'flex1'})
      ]));
      var wl = E('div', {class:'reslist'});
      buckets.waiting.forEach(function(it){ wl.appendChild(rowFor(it)); });
      box.appendChild(wl);
    }

    if (buckets.mastered.length){
      box.appendChild(E('div', {class:'revhead'}, [
        E('h3', null, '\u2705 已掌握'), E('span', {class:'rcnt ok'}, String(buckets.mastered.length)), E('span', {class:'flex1'})
      ]));
      var ml = E('div', {class:'reslist'});
      buckets.mastered.forEach(function(it){ ml.appendChild(rowFor(it)); });
      box.appendChild(ml);
    }

    if (buckets.later.length){
      box.appendChild(E('div', {class:'revhead'}, [
        E('h3', null, '\uD83D\uDDD3 暂不排期'), E('span', {class:'rcnt gray'}, String(buckets.later.length)), E('span', {class:'flex1'})
      ]));
      box.appendChild(E('div', {class:'note'}, '这些题你标了「真不会」。先把基础补上，想练的时候随时点进来。'));
      var ll = E('div', {class:'reslist'});
      buckets.later.slice(0, 30).forEach(function(it){ ll.appendChild(rowFor(it)); });
      box.appendChild(ll);
    }

    box.appendChild(footnote());
    $app.replaceChild(box, $app.querySelector('.wrap'));
  });
  return Promise.resolve(frag);
}

/* ================= 收藏 ================= */
function viewFav(){
  var frag = document.createDocumentFragment();
  frag.appendChild(topbar('我的收藏', '标星的题目集中在这里', null));
  var ids = favPaperIds();
  var wrap = E('div', {class:'wrap'});
  if (!ids.length){
    wrap.appendChild(E('div', {class:'empty'}, [
      E('div', {class:'big'}, '\u2B50'),
      E('p', null, '还没有收藏的题目。'),
      E('p', null, '刷题时点右上角的星星，就能把好题、易错题收进来。')
    ]));
    frag.appendChild(wrap);
    frag.appendChild(navbar('fav'));
    return Promise.resolve(frag);
  }
  wrap.appendChild(E('div', {class:'empty'}, E('p', null, '正在整理收藏…')));
  frag.appendChild(wrap);
  frag.appendChild(navbar('fav'));

  Promise.all(ids.map(function(k){
    var parts = k.split(':');
    return loadPaper(parts[0], parts[1]).catch(function(){ return null; });
  })).then(function(papers){
    var box = E('div', {class:'wrap'});
    var total = 0;
    papers.forEach(function(paper){
      if (!paper) return;
      var rec = getPaperRec('exam', paper.id);
      var qs = allQuestions(paper);
      var f = ST.fav[favKey('exam', paper.id)] || {};
      var picked = qs.filter(function(q){ return f[q.no]; });
      if (!picked.length) return;
      total += picked.length;
      var list = E('div', {class:'reslist'});
      picked.forEach(function(q){
        var a = rec.answers[q.no];
        var tag = a ? (a === normAns(q.answer) ? '已答对' : '答错过') : '未做';
        list.appendChild(E('button', {class:'resrow' + (a ? (a === normAns(q.answer) ? ' ok' : ' no') : ''), onclick:function(){
          EX.paper = paper; EX.all = qs; EX.qs = qs; EX.rec = rec;
          EX.filter = 'all'; EX.mode = 'practice';
          EX.idx = qs.indexOf(q);
          go('#/p/exam/'+paper.id);
        }}, [
          E('span', {class:'n'}, String(q.no)),
          E('span', {class:'t'}, q.stem.replace(/\s+/g,' ').slice(0, 34)),
          E('span', {class:'a'}, tag)
        ]));
      });
      box.appendChild(E('div', {class:'section-title'}, paper.title + ' · ' + picked.length + ' 题'));
      box.appendChild(list);
    });
    if (!total) box.appendChild(E('div', {class:'empty'}, E('p', null, '收藏夹是空的。')));
    box.appendChild(footnote());
    $app.replaceChild(box, $app.querySelector('.wrap'));
  });
  return Promise.resolve(frag);
}

/* ================= 背记卡 ================= */
/* 卡片数据由 tools/build-knowledge.js 从 03-知识库 / 04-时政素材 的 Markdown 编译成
   web/knowledge.json，规则可复现、不调模型。复习节奏用「盒式」排期：
   每答对一次进一盒，间隔 0 / 1 / 3 / 7 / 16 / 35 天，答错回到第一盒。
   进度和刷题共用同一份本地状态，只存在用户这台设备上。 */
var KNOW = null;
var KNOW_BOX_DAYS = [0, 1, 3, 7, 16, 35];

function loadKnowledge(){
  if (KNOW) return Promise.resolve(KNOW);
  return getJSON('knowledge.json').then(function(d){
    KNOW = (d && d.decks) ? d : { totals:{ decks:0, cards:0 }, decks:[] };
    return KNOW;
  }).catch(function(){
    KNOW = { totals:{ decks:0, cards:0 }, decks:[] };
    return KNOW;
  });
}
function knowDeckById(id){
  if (!KNOW || !KNOW.decks) return null;
  for (var i=0;i<KNOW.decks.length;i++){ if (KNOW.decks[i].id === id) return KNOW.decks[i]; }
  return null;
}
function knowRec(deckId){
  if (!ST.know[deckId]) ST.know[deckId] = { cards:{}, updated:0 };
  var r = ST.know[deckId];
  r.cards = r.cards || {};
  return r;
}
function knowMastered(c){ return !!c && (c.box || 0) >= KNOW_BOX_DAYS.length - 1; }
/* 标一张卡：会了进一盒，不会回到第一盒。due 一律取「当天零点 + 间隔」，
   同一天反复背不会把间隔算成半天，跨天打开时结论也稳定。 */
function markKnow(deckId, cardId, ok){
  var r = knowRec(deckId);
  var c = r.cards[cardId];
  if (!c){ c = r.cards[cardId] = { box:0, due:0, ok:0, bad:0, updated:0 }; }
  var now = Date.now();
  if (ok){
    c.box = Math.min((c.box || 0) + 1, KNOW_BOX_DAYS.length - 1);
    c.ok = (c.ok || 0) + 1;
  } else {
    c.box = 0;
    c.bad = (c.bad || 0) + 1;
  }
  c.due = startOfDay(now) + KNOW_BOX_DAYS[c.box] * DAY_MS;
  c.updated = now;
  r.updated = now;
  touchDayIfNew();
  touchAct('know');
  save();
  return c;
}
/* 一个卡组的进度。seen 背过、mastered 背熟、due 今天该背（含还没背过的新卡）。 */
function knowStat(deck){
  var rec = deck ? ST.know[deck.id] : null;
  var now = Date.now();
  var s = { total: deck ? deck.cards.length : 0, seen:0, mastered:0, due:0 };
  if (!deck) return s;
  deck.cards.forEach(function(c){
    var r = rec && rec.cards ? rec.cards[c.id] : null;
    if (!r){ s.due++; return; }
    s.seen++;
    if (knowMastered(r)) s.mastered++;
    else if ((r.due || 0) <= now) s.due++;
  });
  return s;
}
function knowOverall(){
  var s = { total:0, seen:0, mastered:0, due:0, decks:0, started:0 };
  if (!KNOW || !KNOW.decks) return s;
  KNOW.decks.forEach(function(d){
    var x = knowStat(d);
    s.total += x.total; s.seen += x.seen; s.mastered += x.mastered; s.due += x.due;
    s.decks++;
    if (x.seen) s.started++;
  });
  return s;
}

/* 本次背卡的队列。默认先背「到期 + 新卡」，掌握的不再排队；
   模式 all 用于「再背一遍全部」。队列存在内存里，翻面、跳转都不会丢。 */
var KS = { deck:null, mode:'due', queue:[], idx:0, total0:0, good:0, bad:0, flipped:false, requeued:{}, finished:false };
function knowQueue(deck, mode){
  var rec = ST.know[deck.id];
  var now = Date.now();
  var due = [], fresh = [], later = [];
  deck.cards.forEach(function(c){
    var r = rec && rec.cards ? rec.cards[c.id] : null;
    if (mode === 'all'){ (r ? due : fresh).push(c); return; }
    if (!r){ fresh.push(c); return; }
    if (knowMastered(r)){ later.push(c); return; }
    if ((r.due || 0) <= now) due.push(c);
    else later.push(c);
  });
  due.sort(function(a, b){
    var ra = (rec.cards[a.id] || {}), rb = (rec.cards[b.id] || {});
    return (ra.due || 0) - (rb.due || 0);
  });
  return due.concat(fresh);
}
function startKnowSession(deck, mode){
  KS.deck = deck.id;
  KS.mode = mode || 'due';
  KS.queue = knowQueue(deck, KS.mode);
  KS.idx = 0; KS.total0 = KS.queue.length;
  KS.good = 0; KS.bad = 0;
  KS.flipped = false; KS.requeued = {}; KS.finished = false;
  return KS;
}
/* 答完一张。不会的卡不立刻重复，而是挪到队尾，同一轮里最多再出现一次，
   避免「一直点不会 → 同一张卡反复出现」的死循环。 */
function knowAnswer(ok){
  var deck = knowDeckById(KS.deck);
  var card = KS.queue[KS.idx];
  if (!deck || !card) return;
  markKnow(deck.id, card.id, ok);
  if (ok){
    KS.good++;
  } else {
    KS.bad++;
    if (!KS.requeued[card.id]){ KS.requeued[card.id] = 1; KS.queue.push(card); }
  }
  KS.idx++;
  KS.flipped = false;
  if (KS.idx >= KS.queue.length) KS.finished = true;
  render();
}
function knowSkip(){
  var card = KS.queue[KS.idx];
  if (!card) return;
  if (!KS.requeued[card.id]){ KS.requeued[card.id] = 1; KS.queue.push(card); }
  KS.idx++;
  KS.flipped = false;
  if (KS.idx >= KS.queue.length) KS.finished = true;
  render();
}

/* 卡组列表：按法律 / 申论 / 行测 / 时政分组，每组显示今天该背多少张 */
function viewKnowledge(){
  var frag = document.createDocumentFragment();
  frag.appendChild(topbar('背记卡', '法律条文 · 申论金句 · 时政提法', null));
  var wrap = E('div', {class:'wrap'});
  return loadKnowledge().then(function(){
    var ov = knowOverall();
    wrap.appendChild(E('div', {class:'hero'}, [
      E('h1', null, '背记卡'),
      E('p', null, '把该背的东西做成卡片：正面是问题，点开看答案，会了就过、不会就再排一次。'),
      E('div', {class:'stats'}, [
        E('div', {class:'stat'}, [E('b', null, String(ov.total)), E('span', null, '张卡片')]),
        E('div', {class:'stat'}, [E('b', null, String(ov.seen)), E('span', null, '已背过')]),
        E('div', {class:'stat'}, [E('b', null, String(ov.due)), E('span', null, '今天该背')])
      ])
    ]));

    if (!KNOW.decks.length){
      wrap.appendChild(E('div', {class:'card'}, E('div', {class:'empty'}, [
        E('div', {class:'big'}, '\uD83E\uDDE0'),
        E('p', null, '没有读到卡片数据。'),
        E('p', null, '请确认 knowledge.json 存在后重新加载。')
      ])));
    } else {
      wrap.appendChild(E('div', {class:'note'}, [
        E('b', null, '怎么用：'), '先背「法律」和「时政」——这两块是 C 卷常识与申论最直接的采分点。',
        '每张卡会了往后排 1 / 3 / 7 / 16 / 35 天，不会的当天再出现一次，背到不用想为止。'
      ]));
      var groups = [], seen = {};
      KNOW.decks.forEach(function(d){
        if (!seen[d.group]){ seen[d.group] = { name:d.group, decks:[] }; groups.push(seen[d.group]); }
        seen[d.group].decks.push(d);
      });
      groups.forEach(function(g){
        var st = { seen:0, total:0 };
        g.decks.forEach(function(d){ var x = knowStat(d); st.seen += x.seen; st.total += x.total; });
        var list = E('div', {class:'plist'});
        g.decks.forEach(function(d){
          var x = knowStat(d);
          list.appendChild(E('button', {class:'pitem', onclick:function(){
            KS.deck = null;               // 从列表进来就是新的一轮
            go('#/know/' + d.id);
          }}, [
            E('div', {class:'yr'}, [String(d.cards.length), E('small', null, '张')]),
            E('div', {class:'meta'}, [
              E('div', {class:'t'}, d.title),
              E('div', {class:'s'}, [
                E('span', null, '已背 ' + x.seen + ' / ' + x.total + ' · 背熟 ' + x.mastered),
                x.due > 0 ? E('span', {class:'badge hot'}, '待背 ' + x.due) : E('span', {class:'badge done'}, '今天背完')
              ]),
              E('div', {class:'pbar'}, E('i', {style:'width:' + pct(x.seen, x.total) + '%'}))
            ]),
            E('div', {class:'go'}, '\u203A')
          ]));
        });
        wrap.appendChild(E('div', {class:'section-title'}, g.name + ' · 已背 ' + st.seen + ' / ' + st.total));
        wrap.appendChild(E('div', {class:'group'}, list));
      });
    }
    wrap.appendChild(footnote());
    frag.appendChild(wrap);
    frag.appendChild(navbar('know'));
    return frag;
  });
}

/* 背卡页：正面 → 看答案 → 会了 / 不会。队列跑完给本轮小结。 */
function viewKnowledgeDeck(deckId){
  return loadKnowledge().then(function(){
    var deck = knowDeckById(deckId);
    var frag = document.createDocumentFragment();
    if (!deck){
      frag.appendChild(topbar('背记卡', '', function(){ KS.deck = null; go('#/know'); }));
      frag.appendChild(E('div', {class:'wrap'}, E('div', {class:'empty'}, [
        E('div', {class:'big'}, '\uD83D\uDE36'),
        E('p', null, '找不到这个卡组。'),
        E('button', {class:'btn', style:'margin-top:14px', onclick:function(){ KS.deck = null; go('#/know'); }}, '回到卡组')
      ])));
      return frag;
    }
    if (KS.deck !== deck.id) startKnowSession(deck, 'due');

    var st = knowStat(deck);
    var left = Math.max(0, KS.queue.length - KS.idx);
    frag.appendChild(topbar(deck.title, '已背 ' + st.seen + ' / ' + st.total + ' 张 · 剩 ' + left + ' 张', function(){
      KS.deck = null; go('#/know');
    }));
    var wrap = E('div', {class:'wrap'});
    wrap.appendChild(E('div', {class:'kbar'}, [
      E('div', {class:'ktxt'}, '本轮 ' + Math.min(KS.idx, KS.total0) + ' / ' + KS.total0),
      E('div', {class:'pbar'}, E('i', {style:'width:' + pct(Math.min(KS.idx, KS.total0), KS.total0) + '%'}))
    ]));
    if (deck.desc) wrap.appendChild(E('div', {class:'kdesc'}, deck.desc));

    if (KS.finished || !KS.queue.length){
      wrap.appendChild(E('div', {class:'card'}, [
        E('div', {class:'ksum'}, [
          E('div', {class:'big'}, KS.queue.length ? '\uD83C\uDF89' : '\u2705'),
          E('h2', null, KS.queue.length ? '这一轮背完了' : '今天没有要背的卡'),
          E('p', null, KS.queue.length
            ? ('本轮记得 ' + KS.good + ' 张，需要重看 ' + KS.bad + ' 张。')
            : '这个卡组的卡都在排期里，到日子会自动出现。想提前过一遍也可以。'),
          E('p', null, '这个卡组共 ' + st.total + ' 张：背过 ' + st.seen + ' 张，背熟 ' + st.mastered + ' 张。')
        ]),
        E('div', {class:'kbtns'}, [
          E('button', {class:'btn', onclick:function(){ startKnowSession(deck, 'all'); render(); }}, '再背一遍全部'),
          E('button', {class:'btn ghost', onclick:function(){ KS.deck = null; go('#/know'); }}, '回到卡组')
        ])
      ]));
      if (KS.bad > 0) wrap.appendChild(E('div', {class:'note'}, '有 ' + KS.bad + ' 张这轮没记住。它们已经排到下一轮，明天打开会再出现一次。'));
    } else {
      var card = KS.queue[KS.idx];
      var face = E('div', {class:'kcard' + (KS.flipped ? ' flip' : '')}, [
        E('div', {class:'klabel'}, KS.flipped ? '答案' : '正面 · 想不起来就点下面'),
        E('div', {class:'kfront'}, card.front),
        KS.flipped ? E('div', {class:'kback', text: card.back}) : null,
        KS.flipped && card.note ? E('div', {class:'note', text: card.note}) : null
      ]);
      if (!KS.flipped){
        face.addEventListener('click', function(){ KS.flipped = true; render(); });
      }
      wrap.appendChild(face);

      var acts = E('div', {class:'actionbar'});
      if (KS.flipped){
        acts.appendChild(E('button', {class:'btn bad', onclick:function(){ knowAnswer(false); }}, '不会'));
        acts.appendChild(E('button', {class:'btn ok', onclick:function(){ knowAnswer(true); }}, '会了'));
      } else {
        acts.appendChild(E('button', {class:'btn ghost', onclick:function(){ knowSkip(); }}, '跳过这张'));
        acts.appendChild(E('button', {class:'btn', onclick:function(){ KS.flipped = true; render(); }}, '看答案'));
      }
      frag.appendChild(acts);
    }
    wrap.appendChild(footnote());
    frag.appendChild(wrap);
    return frag;
  });
}

/* 首页入口：一眼看到今天还有多少卡没背 */
function knowEntryCard(){
  var ov = knowOverall();
  if (!ov.total) return null;
  return E('div', {class:'kentry'}, [
    E('div', {class:'kh'}, [
      E('span', {class:'kic'}, '\uD83E\uDDE0'),
      E('span', {class:'kt'}, '背记卡'),
      E('span', {class:'kc'}, ov.due > 0 ? ('待背 ' + ov.due + ' 张') : '今天背完了')
    ]),
    E('div', {class:'ks'}, '法律条文、申论金句、时政提法，共 ' + ov.total + ' 张。已背 ' + ov.seen + ' 张，背熟 ' + ov.mastered + ' 张。'),
    E('div', {class:'pbar'}, E('i', {style:'width:' + pct(ov.seen, ov.total) + '%'})),
    E('button', {class:'btn', style:'margin-top:11px;width:100%', onclick:function(){ KS.deck = null; go('#/know'); }}, '去背卡')
  ]);
}

/* 今日任务里的一行背记卡提示。没有卡片数据时整行不出现。 */
function knowLine(){
  var ov = knowOverall();
  if (!ov.total) return null;
  var text = ov.due > 0
    ? ('背记卡还有 ' + ov.due + ' 张没背，' + (ov.due > 20 ? '先背 20 张再去做题。' : '顺手过一遍，几分钟的事。'))
    : '今天的背记卡已经背完了。';
  return E('div', {class:'tknow'}, [
    E('span', {class:'tk-l'}, '\uD83E\uDDE0 背记'),
    E('span', {class:'tk-t'}, text),
    E('button', {class:'tbtn mini', onclick:function(){ KS.deck = null; go('#/know'); }}, ov.due > 0 ? '去背' : '再看看')
  ]);
}

/* ================= 搜索 ================= */
var SEARCH_CACHE = null;
function loadSearchIndex(){
  if (SEARCH_CACHE) return Promise.resolve(SEARCH_CACHE);
  var items = [];
  var jobs = [];
  CATALOG.groups.forEach(function(g){
    g.papers.forEach(function(pm){
      jobs.push(loadPaper(pm.type, pm.id).then(function(paper){
        if (pm.type === 'exam'){
          allQuestions(paper).forEach(function(q){
            items.push({
              type:'exam', id:paper.id, title:paper.title, no:q.no,
              stem:q.stem, sec:q._sec || '', answer:normAns(q.answer)
            });
          });
        } else {
          (paper.questions||[]).forEach(function(q){
            items.push({ type:'shenlun', id:paper.id, title:paper.title, no:q.no, stem:q.stem, sec:'申论', answer:'' });
          });
        }
      }).catch(function(){}));
    });
  });
  return Promise.all(jobs).then(function(){ SEARCH_CACHE = items; return items; });
}

function viewSearch(kw){
  var frag = document.createDocumentFragment();
  var wrap = E('div', {class:'wrap'});
  var input = E('input', {class:'sinput', type:'search', placeholder:'搜题干关键词，比如：行政处罚、资料分析、基层治理', value: kw || ''});
  var form = E('div', {class:'searchbox'}, [
    input,
    E('button', {class:'btn', style:'flex:none;padding:12px 18px', onclick:function(){ runSearch(); }}, '搜索')
  ]);
  input.addEventListener('keydown', function(ev){ if (ev.key === 'Enter' || ev.keyCode === 13) runSearch(); });
  function runSearch(){
    var v = (input.value || '').trim();
    if (!v) { toast('请输入关键词'); return; }
    go('#/search/' + encodeURIComponent(v));
  }
  wrap.appendChild(form);
  frag.appendChild(topbar('搜索题目', '在全部 ' + CATALOG.totals.questions + ' 道题里找', function(){ go('#/'); }));
  var box = E('div', {class:'card', style:'margin-top:12px'});
  if (!kw){
    box.appendChild(E('div', {class:'empty'}, [
      E('div', {class:'big'}, '\uD83D\uDD0D'),
      E('p', null, '输入关键词，在所有真题里搜题干。'),
      E('p', null, '比如找「行政执法」相关的题目集中看一遍。')
    ]));
  } else {
    box.appendChild(E('div', {class:'empty'}, E('p', null, '正在搜索…')));
  }
  wrap.appendChild(box);
  frag.appendChild(wrap);
  frag.appendChild(navbar('home'));

  if (kw){
    loadSearchIndex().then(function(items){
      var k = kw.toLowerCase();
      var hits = items.filter(function(it){
        return (it.stem || '').toLowerCase().indexOf(k) >= 0 || (it.sec || '').toLowerCase().indexOf(k) >= 0;
      });
      var out = E('div', {class:'wrap'});
      var top = E('div', {class:'searchbox'}, [
        E('input', {class:'sinput', type:'search', value:kw, onkeydown:function(ev){ if (ev.key === 'Enter' || ev.keyCode === 13) go('#/search/' + encodeURIComponent(ev.target.value.trim())); }}),
        E('button', {class:'btn', style:'flex:none;padding:12px 18px', onclick:function(){ go('#/search/' + encodeURIComponent(top.querySelector('input').value.trim())); }}, '搜索')
      ]);
      out.appendChild(E('div', {class:'section-title'}, '找到 ' + hits.length + ' 道题 · ' + kw));
      out.appendChild(top);
      if (!hits.length){
        out.appendChild(E('div', {class:'card'}, E('div', {class:'empty'}, [
          E('div', {class:'big'}, '\uD83D\uDE36'),
          E('p', null, '没有找到包含这个关键词的题目。'),
          E('p', null, '换个短一点的词试试。')
        ])));
      } else {
        var list = E('div', {class:'reslist'});
        hits.slice(0, 300).forEach(function(it){
          list.appendChild(E('button', {class:'resrow', onclick:function(){
            if (it.type === 'exam'){
              loadPaper('exam', it.id).then(function(paper){
                var qs = allQuestions(paper);
                EX.paper = paper; EX.all = qs; EX.qs = qs;
                EX.rec = getPaperRec('exam', paper.id);
                EX.filter = 'all'; EX.mode = 'practice';
                var at = qs.findIndex(function(x){ return x.no === it.no; });
                EX.idx = at >= 0 ? at : 0;
                go('#/p/exam/' + paper.id);
              });
            } else {
              loadPaper('shenlun', it.id).then(function(paper){
                openShenlunAt(paper, it.no);
              });
            }
          }}, [
            E('span', {class:'n'}, String(it.no)),
            E('span', {class:'t'}, it.stem.replace(/\s+/g,' ').slice(0, 30)),
            E('span', {class:'a'}, it.title.replace(/^\d{4}年/,'').slice(0, 8))
          ]));
        });
        if (hits.length > 300) out.appendChild(E('div', {class:'note'}, '结果较多，只显示前 300 条。换个更具体的关键词能搜得更准。'));
        out.appendChild(list);
      }
      out.appendChild(footnote());
      $app.replaceChild(out, $app.querySelector('.wrap'));
    });
  }
  return Promise.resolve(frag);
}

/* ================= 训练计划（26 周） ================= */
/* 计划不新开一份平行账本，全部读本机已有记录：
   行测作答数 = ST.acts[天].q，复练题数 = ST.acts[天].review，申论小题 = ST.acts[天].sl，
   背记卡 = ST.acts[天].know，模考 = ST.mocks[].date。
   这样周复盘的「实际完成」和首页、进度页共用同一批数字，不会两处对不上。 */

function planStart(){
  var s = ST.plan ? ST.plan.start : 0;
  return s ? startOfDay(s) : PLAN_ANCHOR;
}
function planSetStart(ts){
  ST.plan = ST.plan || { start:0, reviews:{} };
  ST.plan.start = startOfDay(ts);
  save();
}
/* 周次从起始日当天算起，7 天一周。可能小于 1（还没到起始日）或大于 26（计划已走完）。 */
function planWeekAt(ts){
  var d = dayDiff(ts === undefined ? Date.now() : ts, planStart());
  return Math.floor(d / 7) + 1;
}
function planWeekRange(w){
  var s = planStart() + (w - 1) * 7 * DAY_MS;
  return { start:s, end:s + 7 * DAY_MS - 1 };
}
function planPhaseOfWeek(w){
  for (var i=0;i<PLAN_PHASES.length;i++){
    var p = PLAN_PHASES[i];
    if (w >= p.from && w <= p.to) return p;
  }
  return w < 1 ? PLAN_PHASES[0] : PLAN_PHASES[PLAN_PHASES.length - 1];
}
function planWeekStats(w){
  var r = planWeekRange(w);
  var out = { week:w, start:r.start, end:r.end, days:0, q:0, review:0, sl:0, know:0,
              reason:0, mocks:0, mockBest:0, mockLast:null };
  for (var t = startOfDay(r.start); t <= r.end; t += DAY_MS){
    var k = dayKey(t);
    if (ST.days[k]) out.days++;
    out.q += actOn(k, 'q');
    out.review += actOn(k, 'review');
    out.sl += actOn(k, 'sl');
    out.know += actOn(k, 'know');
    out.reason += actOn(k, 'reason');
  }
  (ST.drills || []).forEach(function(d){
    if (!d || !d.date || d.date < r.start || d.date > r.end) return;
    var n = Number(d.answered);
    if (!(n >= 0)) n = Number(d.size) || 0;
    out.q += n;
  });
  (ST.mocks || []).forEach(function(m){
    if (!m || !m.date || m.date < r.start || m.date > r.end) return;
    out.mocks++;
    var rate = pct(m.right, m.answered || m.total);
    if (rate > out.mockBest) out.mockBest = rate;
    if (!out.mockLast || m.date > out.mockLast.date) out.mockLast = m;
  });
  return out;
}
/* 本周新增的错因（按 r.created 判定，不会被后来的复练刷新时间污染） */
function planWeekReasons(w){
  var r = planWeekRange(w);
  var tally = {}, total = 0;
  Object.keys(ST.papers).forEach(function(k){
    var rec = ST.papers[k];
    if (!rec || !rec.reasons) return;
    Object.keys(rec.reasons).forEach(function(no){
      var key = rec.reasons[no];
      if (!reasonDef(key)) return;
      var rv = rec.review ? rec.review[no] : null;
      var at = (rv && rv.created) ? rv.created : (rec.updated || 0);
      if (!at || at < r.start || at > r.end) return;
      tally[key] = (tally[key] || 0) + 1; total++;
    });
  });
  return { tally:tally, total:total };
}
/* 本周出师的错题数：这一周里最后一次推进把 stage 走满的题 */
function planWeekClosed(w){
  var r = planWeekRange(w), n = 0;
  Object.keys(ST.papers).forEach(function(k){
    var rec = ST.papers[k];
    if (!rec || !rec.review) return;
    Object.keys(rec.review).forEach(function(no){
      var rv = rec.review[no];
      if (!isMastered(rv)) return;
      if (rv.updated >= r.start && rv.updated <= r.end) n++;
    });
  });
  return n;
}
/* 每周目标。按阶段给，数值与 01-全程总计划.md 的每日/每周任务量对齐。 */
var PLAN_TARGETS = {
  diag:   { q:130, sl:4, know:35, review:10, mocks:1, label:'1 套行测 + 1 套申论' },
  xc:     { q:250, sl:12, know:35, review:10, mocks:1, label:'每天 1 个模块专项 + 每周 1 套行测' },
  sl:     { q:250, sl:12, know:35, review:10, mocks:1, label:'每天 1 道申论小题 + 每周 1 套行测' },
  set:    { q:260, sl:16, know:35, review:10, mocks:2, label:'每周 2 套行测 + 1 套申论' },
  sprint: { q:390, sl:24, know:35, review:10, mocks:3, label:'每周 3 套行测 + 2 套申论' }
};
function planTargetOfWeek(w){ return PLAN_TARGETS[planPhaseOfWeek(w).id] || PLAN_TARGETS.xc; }
function planReviewKey(w){ return 'w' + w; }
function planReview(w){
  if (!ST.plan || !ST.plan.reviews) return null;
  return ST.plan.reviews[planReviewKey(w)] || null;
}
function planSaveReview(w, patch){
  ST.plan = ST.plan || { start:0, reviews:{} };
  ST.plan.reviews = ST.plan.reviews || {};
  var k = planReviewKey(w);
  var r = ST.plan.reviews[k] || { week:w, created:Date.now() };
  for (var f in patch){ if (Object.prototype.hasOwnProperty.call(patch, f)) r[f] = patch[f]; }
  r.savedAt = Date.now();
  ST.plan.reviews[k] = r;
  save();
  return r;
}
/* 距考试还有几天。考试日只是参考值（2027-03-14），公告出来后可以按实际改。 */
function planDaysToExam(){
  return Math.max(0, dayDiff(EXAM_DAY, Date.now()));
}
/* 里程碑检查点。能自动判的自动判，判不了的老实写「需人工判定」，不编结论。 */
function planMilestones(){
  var last = lastMockAttempt();
  var lastRate = last ? pct(last.right, last.answered || last.total) : null;
  function secRate(name){
    if (!last || !last.bySec) return null;
    var hit = null;
    last.bySec.forEach(function(v){ if (!hit && v.name.indexOf(name) >= 0) hit = v; });
    return hit ? pct(hit.ok, hit.done || hit.n) : null;
  }
  var exDone = 0;
  Object.keys(ST.papers).forEach(function(k){ exDone += countAnswered(ST.papers[k]); });
  var slDone = 0;
  Object.keys(ST.sl).forEach(function(k){ slDone += Object.keys(ST.sl[k].read || {}).length; });
  /* v10：第 14 周「申论要点命中率 ≥ 75%」不再靠人判。取最近一次「小题」批改的命中率，
     命中率在批改页每次打标时就算好落盘（grade.rate / grade.total）；大作文没有命中率，
     不参与判定。一道小题都没批过就如实写「还没有批改记录」，不编数。 */
  var lastG = slLastGraded();
  /* v11：复批过题的话，第 14 周里程碑里补一句复批进展，让「重做有没有用」在计划页也看得见。 */
  var reSum = slRecheckSummary();
  var reLine = reSum.n ? ('；复批 ' + reSum.n + ' 道' +
    (reSum.avg === null ? '，新一轮还没标完，暂时没有可比数字'
      : '，平均' + (reSum.avg > 0 ? '涨 ' + reSum.avg : (reSum.avg < 0 ? '跌 ' + (-reSum.avg) : '持平')) + ' 个百分点')) : '';
  return [
    { week:2,  text:'诊断完成，有完整基线', auto:true,
      done:(exDone >= 130 && slDone >= 4) || !!last,
      detail:'行测已做 ' + exDone + ' 题 / 申论已读 ' + slDone + ' 题' + (last ? ' / 已有模考记录' : '') },
    { week:6,  text:'资料分析 ≥ 80%', auto:true,
      done:(secRate('资料') || 0) >= 80,
      detail:secRate('资料') === null ? '还没有分模块模考数据' : ('最近一次模考资料分析 ' + secRate('资料') + '%') },
    { week:10, text:'行测专项结束，模块正确率达标', auto:true,
      done:lastRate !== null && lastRate >= 70,
      detail:lastRate === null ? '还没有模考数据' : ('最近一次模考整卷 ' + lastRate + '%') },
    { week:14, text:'申论要点命中率 ≥ 75%', auto:true,
      done: lastG ? lastG.last.rate >= 75 : false,
      detail: lastG
        ? ('最近一次批改：第 ' + lastG.no + ' 题 ' + lastG.last.rate + '%（' +
           (lastG.last.marked || 0) + '/' + (lastG.last.total || 0) + ' 个采分点已标）' + reLine)
        : '还没有批改记录，去申论批改工作台批一道小题' },
    { week:18, text:'套卷中期：行测 ≥ 75%，申论稳定', auto:true,
      done:lastRate !== null && lastRate >= 75,
      detail:lastRate === null ? '还没有模考数据' : ('最近一次模考整卷 ' + lastRate + '%') },
    { week:22, text:'强化结束：行测 ≥ 80%，无系统性弱点', auto:true,
      done:lastRate !== null && lastRate >= 80,
      detail:lastRate === null ? '还没有模考数据' : ('最近一次模考整卷 ' + lastRate + '%') },
    { week:26, text:'考前：状态稳定，错题已关闭', auto:false, done:null,
      detail:'考前状态自己最有数，看错题本还有没有到期题' }
  ];
}

/* ================= 进度总览 ================= */
function viewStats(){
  var frag = document.createDocumentFragment();
  frag.appendChild(topbar('我的进度', '数据只存在这台设备上', null));
  var wrap = E('div', {class:'wrap'});

  var exDone = 0;
  Object.keys(ST.papers).forEach(function(k){ exDone += countAnswered(ST.papers[k]); });
  var slDone = 0;
  Object.keys(ST.sl).forEach(function(k){ slDone += Object.keys(ST.sl[k].read||{}).length; });

  wrap.appendChild(E('div', {class:'hero'}, [
    E('h1', null, '练习总览'),
    E('div', {class:'stats'}, [
      E('div', {class:'stat'}, [E('b', null, String(exDone)), E('span', null, '行测已做')]),
      E('div', {class:'stat'}, [E('b', null, String(slDone)), E('span', null, '申论已读')]),
      E('div', {class:'stat'}, [E('b', null, String(donePaperCount())), E('span', null, '做过的卷')]),
      E('div', {class:'stat'}, [E('b', null, String(streakDays())), E('span', null, '连续天数')])
    ])
  ]));

  /* 错因分布：让「我到底为什么丢分」一眼可见，这决定下一步该补什么 */
  var rc = reviewCounts();
  var rt = reasonTally();
  var reasonTotal = rt.total;
  if (reasonTotal > 0){
    wrap.appendChild(E('div', {class:'section-title'}, '错因分布（共 ' + reasonTotal + ' 题）'));
    var rg = E('div', {class:'rgrid'});
    var maxN = 1;
    REASONS.forEach(function(r){ if ((rt.tally[r.k]||0) > maxN) maxN = rt.tally[r.k]; });
    REASONS.forEach(function(r){
      var n = rt.tally[r.k] || 0;
      rg.appendChild(E('div', {class:'rcard'}, [
        E('div', {class:'rn'}, String(n)),
        E('div', {class:'rl'}, r.label + ' · ' + r.hint),
        E('div', {class:'rb'}, E('i', {style:'width:' + pct(n, maxN) + '%'}))
      ]));
    });
    wrap.appendChild(rg);
    var advice = reasonAdvice(rt.tally, reasonTotal);
    if (advice) wrap.appendChild(E('div', {class:'note'}, advice));
  }

  /* 复练状态：只要答错过题就显示。哪怕还没标错因，「待标错因」也是要用户处理的信号。 */
  var rcTotal = rc.due + rc.waiting + rc.mastered + rc.later + rc.unmarked;
  if (rcTotal > 0){
    wrap.appendChild(E('div', {class:'section-title'}, '复练状态'));
    if (rc.unmarked && !reasonTotal){
      wrap.appendChild(E('div', {class:'note'}, '你有 ' + rc.unmarked + ' 道错题还没标错因。标完才会自动排复练计划。'));
    }
    var stat = E('div', {class:'rgrid'});
    [['due','今天该复练','到日子了，优先做'],['waiting','已排期','未来几天到期'],
     ['mastered','已掌握','连着做对，出师了'],['later','暂不排期','标了真不会'],
     ['unmarked','待标错因','还没说明错在哪'],['total','错题总数','累计答错']].forEach(function(x){
      var v = x[0] === 'total' ? rcTotal : rc[x[0]];
      stat.appendChild(E('div', {class:'rcard'}, [
        E('div', {class:'rn'}, String(v)),
        E('div', {class:'rl'}, x[1] + ' · ' + x[2])
      ]));
    });
    wrap.appendChild(stat);
  }

  /* 背记卡统计 */
  var ko = knowOverall();
  if (ko.total){
    wrap.appendChild(E('div', {class:'section-title'}, '背记卡'));
    var kg = E('div', {class:'rgrid'});
    /* 注意：这里的分块标签必须和「复练状态」区分开。
       复练状态里也有「已掌握」（题连着做对出师），背记卡里的「已背熟」是卡片进到最后一盒，
       两个口径不同，标签撞名会让人（和验收脚本）把两边的数字看混。 */
    [['total','卡片总数','法律 / 申论 / 行测 / 时政'],
     ['seen','已背过','点开看过的卡'],
     ['mastered','已背熟','连对到最后一盒'],
     ['due','今天该背','含还没背的新卡']].forEach(function(x){
      kg.appendChild(E('div', {class:'rcard'}, [
        E('div', {class:'rn'}, String(ko[x[0]])),
        E('div', {class:'rl'}, x[1] + ' · ' + x[2])
      ]));
    });
    wrap.appendChild(kg);
    wrap.appendChild(E('div', {class:'note'}, ko.due > 0
      ? ('还有 ' + ko.due + ' 张卡今天该背。背完的卡会按 1 / 3 / 7 / 16 / 35 天自动排下一轮。')
      : '今天的卡都背完了。没到期的卡到日子会自动出现在「背记」里。'));
  }

  /* 含图题统计：告诉用户有多少题需要纸质原卷配合 */
  var imgQ = 0, imgPapers = 0, doneImg = 0;
  CATALOG.groups.forEach(function(g){ g.papers.forEach(function(p){
    if (p.type !== 'exam' || !p.imageCount) return;
    imgPapers++; imgQ += p.imageCount;
    var r = ST.papers[pkey('exam',p.id)];
    if (r) doneImg += Object.keys(r.skipped || {}).length;
  }); });
  if (imgQ > 0){
    var mstat = (IMGMAN && IMGMAN.stats) || {};
    var got = mstat.questionImages || 0, left = mstat.unresolved || 0;
    wrap.appendChild(E('div', {class:'section-title'}, '图形题'));
    wrap.appendChild(E('div', {class:'card'}, [
      E('div', {class:'mat', text:
        imgUnavailable()
          ? ('题库里有 ' + imgQ + ' 道题带图形（分布在 ' + imgPapers + ' 套行测卷里）。单文件离线版为了体积没有内嵌原图，这类题需要对照纸质原卷做，或改用网页版 / 手机 App。\n' +
             '手边没有原卷可以直接点「跳过本题」。跳过不计入错题，也不会排复练计划，随时能取消。' +
             (doneImg ? '\n你目前跳过了 ' + doneImg + ' 道。' : ''))
          : ('题库里有 ' + imgQ + ' 道题带图形（分布在 ' + imgPapers + ' 套行测卷里）。其中 ' + got + ' 题已配好原图，做题时直接显示，点图可放大。\n' +
             '还剩 ' + left + ' 题的原始来源本身就没收录图片，遇到时会提示你对照纸质原卷；手边没有原卷可以直接点「跳过本题」。跳过不计入错题，也不会排复练计划，随时能取消。' +
             (doneImg ? '\n你目前跳过了 ' + doneImg + ' 道。' : ''))
      })
    ]));
  }

  wrap.appendChild(E('div', {class:'section-title'}, '各套卷进度'));
  var box = E('div', {class:'card'});
  var any = false;
  CATALOG.groups.forEach(function(g){ g.papers.forEach(function(p){
    var rec, n, t;
    if (p.type === 'exam'){ rec = ST.papers[pkey('exam',p.id)]; n = countAnswered(rec); t = p.qCount; }
    else { rec = ST.sl[pkey('shenlun',p.id)]; n = rec ? Object.keys(rec.read||{}).length : 0; t = p.qCount; }
    if (!n) return;
    any = true;
    var r = pct(n, t);
    box.appendChild(E('div', {style:'margin-bottom:14px'}, [
      E('div', {style:'display:flex;justify-content:space-between;font-size:13.5px;font-weight:650;margin-bottom:6px;gap:10px'}, [
        E('span', {style:'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'}, p.title),
        E('span', {style:'color:var(--ink-3);flex:none'}, n + '/' + t)
      ]),
      E('div', {class:'pbar'}, E('i', {style:'width:' + r + '%'}))
    ]));
  }); });
  if (!any) box.appendChild(E('div', {class:'empty'}, E('p', null, '还没有开始，去题库里选一套吧。')));
  wrap.appendChild(box);

  var favCount = 0;
  Object.keys(ST.fav).forEach(function(k){ favCount += Object.keys(ST.fav[k]||{}).length; });
  wrap.appendChild(E('div', {class:'section-title'}, '快捷入口'));
  var quick = E('div', {style:'display:flex;flex-direction:column;gap:9px'});
  quick.appendChild(E('button', {class:'btn ghost', onclick:function(){ go('#/search/'); }}, '🔍 搜索题目'));
  quick.appendChild(E('button', {class:'btn ghost', onclick:function(){ go('#/fav'); }}, '⭐ 我的收藏（' + favCount + ' 题）'));
  quick.appendChild(E('button', {class:'btn ghost', onclick:function(){ go('#/diag'); }}, '📈 模考诊断（' + (ST.mocks || []).length + ' 次记录）'));
  quick.appendChild(E('button', {class:'btn ghost', onclick:function(){ go('#/plan'); }}, '📅 训练计划（第 ' + Math.min(PLAN_WEEKS, Math.max(1, planWeekAt(Date.now()))) + ' 周）'));
  /* v10：申论批改入口。批过就带回最近一次批改的那道题，没批过落到河北 C 卷的题目列表。 */
  var gAll = slAllGrades();
  quick.appendChild(E('button', {class:'btn ghost', onclick:function(){
    if (gAll.length) go('#/p/shenlun/' + gAll[0].paperId + '/grade/' + gAll[0].no);
    else go('#/p/shenlun/188/list');
  }}, '✍️ 申论批改（' + (gAll.length ? '已批 ' + gAll.length + ' 道' : '还没有批改记录') + '）'));
  /* v11：复批对比入口。没复批过也放出来，点进去有「怎么开始」的引导，不然功能藏得太深没人发现。 */
  var gSum = slRecheckSummary();
  quick.appendChild(E('button', {class:'btn ghost', onclick:function(){ go('#/stats/recheck'); }},
    '🔁 复批对比（' + (gSum.n ? (gSum.n + ' 道 · 平均' + (gSum.avg === null ? '—' : (gSum.avg > 0 ? '+' + gSum.avg : String(gSum.avg))) + ' 个百分点') : '还没有复批记录') + '）'));
  quick.appendChild(E('button', {class:'btn ghost', onclick:function(){ cycleFont(); }}, '🔤 切换字号（当前：' + ['小','标准','大'][fontSize()] + '）'));
  wrap.appendChild(quick);

  wrap.appendChild(E('div', {class:'section-title'}, '数据管理'));
  var acts = E('div', {style:'display:flex;flex-direction:column;gap:9px'});
  acts.appendChild(E('button', {class:'btn ghost', onclick:function(){
    var data = JSON.stringify(ST);
    copyText(data).then(function(){
      toast('进度已复制，粘贴到备忘录保存好');
    }, function(){
      // 复制不了就把内容显示出来，让人手动全选复制
      window.prompt('长按全选下面的内容，复制到备忘录保存：', data);
    });
  }}, '导出进度（复制）'));
  acts.appendChild(E('button', {class:'btn ghost', onclick:function(){
    var txt = prompt('把导出的进度粘贴到这里，然后确定：');
    if (!txt) return;
    try { var o = JSON.parse(txt); if (!o.papers) throw 0; ST = o; save(); toast('进度已导入'); render(); }
    catch(e){ toast('格式不对，导入失败'); }
  }}, '导入进度'));
  acts.appendChild(E('button', {class:'btn ghost', onclick:function(){
    if (!confirm('确定清空全部练习进度吗？此操作不可撤销。')) return;
    ST = blankState();
    try { localStorage.removeItem(SS); } catch(e){}
    save(); toast('已清空'); render();
  }}, '清空全部进度'));
  wrap.appendChild(acts);
  wrap.appendChild(footnote());
  frag.appendChild(wrap);
  frag.appendChild(navbar('stats'));
  return frag;
}

/* ================= 训练计划页 ================= */
function planBar(v, target){
  var r = target > 0 ? Math.min(100, Math.round(v / target * 100)) : 0;
  return E('div', {class:'pbar'}, E('i', {style:'width:' + r + '%'}));
}
/* 本周实际 vs 目标的一行。达标给绿标，没达标给灰色「还差多少」，不做假鼓励。 */
function planStatRow(label, v, target, unit){
  var done = v >= target;
  return E('div', {class:'planrow'}, [
    E('span', {class:'pn'}, label),
    E('span', {class:'pv' + (done ? ' ok' : '')}, String(v) + ' / ' + target + (unit || '')),
    E('span', {class:'pd'}, done ? '达标' : ('还差 ' + (target - v) + (unit || '')))
  ]);
}

function viewPlan(weekArg){
  var frag = document.createDocumentFragment();
  var now = Date.now();
  var cur = planWeekAt(now);
  var w = weekArg ? Number(weekArg) : cur;
  if (!(w >= 1) || w > PLAN_WEEKS) w = Math.min(PLAN_WEEKS, Math.max(1, cur));

  frag.appendChild(topbar('训练计划', '26 周 · 目标 2027 年 3 月笔试', null));
  var wrap = E('div', {class:'wrap'});

  var phase = planPhaseOfWeek(w);
  var stats = planWeekStats(w);
  var target = planTargetOfWeek(w);
  var rng = planWeekRange(w);
  var toExam = planDaysToExam();
  var weekProgress = pct(Math.min(Math.max(cur, 0), PLAN_WEEKS), PLAN_WEEKS);

  wrap.appendChild(E('div', {class:'hero'}, [
    E('h1', null, '第 ' + w + ' 周 · ' + phase.name),
    E('p', null, fmtDay(rng.start) + ' — ' + fmtDay(rng.end) + ' · ' + phase.goal),
    E('div', {class:'stats'}, [
      E('div', {class:'stat'}, [E('b', null, String(cur >= 1 && cur <= PLAN_WEEKS ? cur : (cur < 1 ? 0 : PLAN_WEEKS))), E('span', null, '当前周次')]),
      E('div', {class:'stat'}, [E('b', null, String(toExam)), E('span', null, '距笔试天数')]),
      E('div', {class:'stat'}, [E('b', null, String(stats.days)), E('span', null, '本周学习天数')]),
      E('div', {class:'stat'}, [E('b', null, String(stats.q)), E('span', null, '本周行测作答')])
    ]),
    E('div', {class:'planprog'}, [E('span', null, '总进度 ' + weekProgress + '%'), planBar(Math.min(cur, PLAN_WEEKS), PLAN_WEEKS)])
  ]));

  if (w !== cur){
    wrap.appendChild(E('div', {class:'note'}, '你正在看第 ' + w + ' 周（当前是第 ' + (cur < 1 ? 1 : Math.min(cur, PLAN_WEEKS)) + ' 周）。'));
  }

  /* 本周目标与完成情况 */
  wrap.appendChild(E('div', {class:'section-title'}, '本周完成情况'));
  var tbox = E('div', {class:'card'});
  tbox.appendChild(E('div', {class:'planhint'}, '本周安排：' + target.label));
  tbox.appendChild(planStatRow('行测作答', stats.q, target.q, ' 题'));
  tbox.appendChild(planStatRow('申论小题', stats.sl, target.sl, ' 题'));
  tbox.appendChild(planStatRow('背记卡', stats.know, target.know, ' 张'));
  tbox.appendChild(planStatRow('错题复练', stats.review, target.review, ' 题'));
  tbox.appendChild(planStatRow('限时模考', stats.mocks, target.mocks, ' 次'));
  if (!stats.q && !stats.sl && !stats.know && !stats.mocks){
    tbox.appendChild(E('div', {class:'note', style:'margin-top:8px'}, '这一周还没有记录。数据是从你实际做题、背卡、模考里自动汇总的，不用手填。'));
  }
  wrap.appendChild(tbox);

  /* 本阶段任务清单 */
  wrap.appendChild(E('div', {class:'section-title'}, '阶段任务（第 ' + phase.from + '—' + phase.to + ' 周）'));
  var taskBox = E('div', {class:'card'});
  phase.tasks.forEach(function(t){ taskBox.appendChild(E('div', {class:'ptask'}, '· ' + t)); });
  wrap.appendChild(taskBox);

  /* 成绩与错因（本周） */
  if (stats.mocks || stats.reason || stats.q){
    wrap.appendChild(E('div', {class:'section-title'}, '本周成绩与错因'));
    var gbox = E('div', {class:'card'});
    if (stats.mockLast){
      var rate = pct(stats.mockLast.right, stats.mockLast.answered || stats.mockLast.total);
      gbox.appendChild(E('div', {class:'diagrow'}, [
        E('span', {class:'dn'}, '最近一次模考 · ' + stats.mockLast.title),
        E('span', {class:'dv'}, rate + '%')
      ]));
      gbox.appendChild(E('div', {class:'diagrow'}, [
        E('span', {class:'dn'}, '本周模考次数 / 最好成绩'),
        E('span', {class:'dv'}, stats.mocks + ' 次 / ' + stats.mockBest + '%')
      ]));
    } else {
      gbox.appendChild(E('div', {class:'note'}, '本周还没做限时模考。模考是唯一能给出整卷正确率的动作，建议每周至少一次。'));
    }
    var wr = planWeekReasons(w);
    if (wr.total){
      var top = topReason(wr.tally);
      if (top) gbox.appendChild(E('div', {class:'note'}, '本周新增错因 ' + wr.total + ' 条，最突出的是「' + top.label + '」' + top.n + ' 条。'));
      else gbox.appendChild(E('div', {class:'note'}, '本周新增错因 ' + wr.total + ' 条。'));
    }
    var closed = planWeekClosed(w);
    gbox.appendChild(E('div', {class:'diagrow'}, [
      E('span', {class:'dn'}, '本周出师（连着做对 4 轮）的错题'),
      E('span', {class:'dv'}, closed + ' 题')
    ]));
    wrap.appendChild(gbox);
  }

  /* 周复盘入口 */
  var rev = planReview(w);
  wrap.appendChild(E('div', {class:'section-title'}, '周复盘'));
  var rbox = E('div', {class:'card'});
  rbox.appendChild(E('div', {class:'planhint'}, rev
    ? ('这一周的复盘已保存（' + fmtDateTime(rev.savedAt) + '）。数据部分会自动刷新，三个问题和下周计划是你写的，随时可以改。')
    : '每周日花 20—30 分钟做一次。没有复盘的训练，只是重复劳动。完成情况、成绩、错因、错误关闭率会自动算好，你只需要回答三个问题和写下周计划。'));
  rbox.appendChild(E('button', {class:'btn', style:'margin-top:11px;width:100%', onclick:function(){ go('#/plan/rev/' + w); }}, rev ? '查看 / 修改本周复盘' : '做本周复盘'));
  wrap.appendChild(rbox);

  /* 历史复盘 */
  var doneWeeks = Object.keys((ST.plan && ST.plan.reviews) || {}).map(function(k){
    return (ST.plan.reviews[k] || {}).week;
  }).filter(function(n){ return typeof n === 'number' && n >= 1; }).sort(function(a,b){ return b - a; });
  if (doneWeeks.length){
    wrap.appendChild(E('div', {class:'section-title'}, '已保存的复盘（' + doneWeeks.length + ' 周）'));
    var hbox = E('div', {class:'card'});
    doneWeeks.slice(0, 10).forEach(function(n){
      var rr = planReview(n);
      var s = planWeekStats(n);
      hbox.appendChild(E('div', {class:'diagrow'}, [
        E('span', {class:'dn'}, '第 ' + n + ' 周 · ' + fmtDay(planWeekRange(n).start) + ' · 行测 ' + s.q + ' 题 / 模考 ' + s.mocks + ' 次'),
        E('span', {class:'dv'}, fmtDay(rr && rr.savedAt ? rr.savedAt : Date.now()))
      ]));
    });
    wrap.appendChild(hbox);
  }

  /* 里程碑 */
  wrap.appendChild(E('div', {class:'section-title'}, '里程碑检查点'));
  var mbox = E('div', {class:'card'});
  planMilestones().forEach(function(m){
    var mark = m.auto ? (m.done ? '✅' : '⬜') : '🟡';
    mbox.appendChild(E('div', {class:'diagrow'}, [
      E('span', {class:'dn'}, mark + ' 第 ' + m.week + ' 周 · ' + m.text),
      E('span', {class:'dv', style:'font-weight:600;color:var(--ink-3);max-width:52%;text-align:right'}, m.detail)
    ]));
  });
  wrap.appendChild(mbox);

  /* 阶段总览 */
  wrap.appendChild(E('div', {class:'section-title'}, '五个阶段'));
  var pbox = E('div', {class:'card'});
  PLAN_PHASES.forEach(function(p){
    var state = (cur >= p.from && cur <= p.to) ? '进行中' : (cur > p.to ? '已完成' : '未开始');
    pbox.appendChild(E('div', {class:'diagrow'}, [
      E('span', {class:'dn'}, p.name + ' · 第 ' + p.from + '—' + p.to + ' 周'),
      E('span', {class:'dv', style:state === '进行中' ? 'color:var(--brand)' : 'font-weight:600;color:var(--ink-3)'}, state)
    ]));
  });
  wrap.appendChild(pbox);

  /* 周次切换与起始日 */
  wrap.appendChild(E('div', {class:'section-title'}, '周次与起始日'));
  var nav = E('div', {style:'display:flex;gap:9px'});
  nav.appendChild(E('button', {class:'btn ghost', disabled:w <= 1, onclick:function(){ go('#/plan/' + (w-1)); }}, '上一周'));
  nav.appendChild(E('button', {class:'btn ghost', disabled:w >= PLAN_WEEKS, onclick:function(){ go('#/plan/' + (w+1)); }}, '下一周'));
  wrap.appendChild(nav);
  var sbox = E('div', {class:'card', style:'margin-top:10px'}, [
    E('div', {class:'planhint'}, '计划起始日：' + fmtDay(planStart()) + '。默认按总计划的 2026-09-15 起算；如果你实际是从别的日子开始的，改成你的真实起点，周次会自动重算（已保存的复盘不受影响）。'),
    E('div', {style:'display:flex;gap:9px;margin-top:11px'}, [
      E('button', {class:'btn ghost', onclick:function(){
        if (!confirm('把计划起始日改成今天吗？周次会按今天重新起算。')) return;
        planSetStart(Date.now()); toast('已按今天起算'); render();
      }}, '从今天起算'),
      E('button', {class:'btn ghost', onclick:function(){
        var v = prompt('输入计划起始日（格式 2026-09-15）：', fmtDay(planStart()));
        if (!v) return;
        var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(v).trim());
        if (!m){ toast('日期格式不对，要写成 2026-09-15'); return; }
        var d = new Date(Number(m[1]), Number(m[2])-1, Number(m[3]));
        if (isNaN(d.getTime())){ toast('日期不存在，请检查'); return; }
        planSetStart(d.getTime()); toast('起始日已更新'); render();
      }}, '自定义起始日')
    ])
  ]);
  wrap.appendChild(sbox);

  wrap.appendChild(footnote());
  frag.appendChild(wrap);
  frag.appendChild(navbar('stats'));
  return frag;
}

/* 周复盘页：四个数据板块自动算好，用户只回答三个问题 + 写下周计划。
   这是 06-计划与追踪/02-周复盘模板.md 的应用内版本，口径与模板一一对应。 */
function viewPlanReview(weekArg){
  var w = Number(weekArg);
  if (!(w >= 1) || w > PLAN_WEEKS) w = Math.max(1, Math.min(PLAN_WEEKS, planWeekAt()));
  var frag = document.createDocumentFragment();
  frag.appendChild(topbar('第 ' + w + ' 周复盘', fmtDay(planWeekRange(w).start) + ' — ' + fmtDay(planWeekRange(w).end), function(){ go('#/plan/' + w); }));
  var wrap = E('div', {class:'wrap'});

  var stats = planWeekStats(w);
  var target = planTargetOfWeek(w);
  var phase = planPhaseOfWeek(w);
  var saved = planReview(w) || {};
  var prev = w > 1 ? planWeekStats(w - 1) : null;

  wrap.appendChild(E('div', {class:'hero'}, [
    E('h1', null, '第 ' + w + ' 周复盘'),
    E('p', null, phase.name + ' · ' + phase.goal)
  ]));

  /* 一、本周完成情况 */
  wrap.appendChild(E('div', {class:'section-title'}, '一、本周完成情况'));
  var cbox = E('div', {class:'card'});
  cbox.appendChild(E('div', {class:'planhint'}, '目标按「' + target.label + '」折算，数据来自你的实际操作，不用手填。'));
  cbox.appendChild(planStatRow('行测作答', stats.q, target.q, ' 题'));
  cbox.appendChild(planStatRow('申论小题', stats.sl, target.sl, ' 题'));
  cbox.appendChild(planStatRow('背记卡', stats.know, target.know, ' 张'));
  cbox.appendChild(planStatRow('错题复练', stats.review, target.review, ' 题'));
  cbox.appendChild(planStatRow('限时模考', stats.mocks, target.mocks, ' 次'));
  cbox.appendChild(E('div', {class:'diagrow'}, [
    E('span', {class:'dn'}, '本周学习天数'),
    E('span', {class:'dv'}, stats.days + ' / 7 天')
  ]));
  wrap.appendChild(cbox);

  /* 二、成绩数据 */
  wrap.appendChild(E('div', {class:'section-title'}, '二、成绩数据'));
  var sbox = E('div', {class:'card'});
  if (stats.mockLast){
    var rate = pct(stats.mockLast.right, stats.mockLast.answered || stats.mockLast.total);
    sbox.appendChild(E('div', {class:'bigscore', style:'padding:6px 0'}, [
      E('div', {class:'pct'}, rate + '%'),
      E('div', {class:'lbl'}, stats.mockLast.title)
    ]));
    sbox.appendChild(diagSectionBars(stats.mockLast));
    sbox.appendChild(E('div', {class:'diagrow'}, [
      E('span', {class:'dn'}, '本周模考 ' + stats.mocks + ' 次 · 最好 ' + stats.mockBest + '%'),
      E('span', {class:'dv'}, '最近一次 ' + fmtDay(stats.mockLast.date))
    ]));
    var same = mockAttempts(stats.mockLast.paperId).filter(function(m){
      return m.date < stats.mockLast.date;
    });
    if (same.length){
      var cmp = mockCompare(stats.mockLast, same[same.length - 1]);
      sbox.appendChild(E('div', {class:'note'}, '同一套卷与上次相比：' +
        (cmp.rate > 0 ? ('进步 ' + cmp.rate + ' 个百分点') :
         (cmp.rate < 0 ? ('退了 ' + Math.abs(cmp.rate) + ' 个百分点') : '持平')) + '。'));
    }
  } else {
    sbox.appendChild(E('div', {class:'note'}, '本周没有限时模考记录，拿不到整卷正确率。成绩数据这一栏空着不是没写，是真的没测。'));
    sbox.appendChild(E('button', {class:'btn ghost', style:'margin-top:10px', onclick:function(){ go('#/p/exam/484/mock'); }}, '去模考一次（2026 河北行测）'));
  }
  if (prev){
    sbox.appendChild(E('div', {class:'diagrow'}, [
      E('span', {class:'dn'}, '与上周对比：行测作答 / 复练 / 模考'),
      E('span', {class:'dv'}, stats.q + '（' + (stats.q - prev.q >= 0 ? '+' : '') + (stats.q - prev.q) + '） / ' +
        stats.review + '（' + (stats.review - prev.review >= 0 ? '+' : '') + (stats.review - prev.review) + '） / ' +
        stats.mocks + '（' + (stats.mocks - prev.mocks >= 0 ? '+' : '') + (stats.mocks - prev.mocks) + '）')
    ]));
  }
  wrap.appendChild(sbox);

  /* 三、错因分析 */
  wrap.appendChild(E('div', {class:'section-title'}, '三、错因分析'));
  var rbox = E('div', {class:'card'});
  var wr = planWeekReasons(w);
  if (wr.total){
    var maxN = 1;
    REASONS.forEach(function(r){ if ((wr.tally[r.k]||0) > maxN) maxN = wr.tally[r.k]; });
    REASONS.forEach(function(r){
      var n = wr.tally[r.k] || 0;
      if (!n) return;
      rbox.appendChild(E('div', {class:'rcard'}, [
        E('div', {class:'rn'}, String(n)),
        E('div', {class:'rl'}, r.label + ' · ' + r.hint),
        E('div', {class:'rb'}, E('i', {style:'width:' + pct(n, maxN) + '%'}))
      ]));
    });
    var advice = reasonAdvice(wr.tally, wr.total);
    if (advice) rbox.appendChild(E('div', {class:'note'}, advice));
    var top = topReason(wr.tally);
    if (top) rbox.appendChild(E('div', {class:'note'}, '本周最突出的错因是「' + top.label + '」（' + top.n + ' 条）。'));
  } else {
    rbox.appendChild(E('div', {class:'note'}, '这一周没有新增错因记录。可能是没做题，也可能是做错的题还没标错因——去错题本标一下，这里才有东西可分析。'));
  }
  wrap.appendChild(rbox);

  /* 四、错误关闭情况 */
  wrap.appendChild(E('div', {class:'section-title'}, '四、错误关闭情况'));
  var kbox = E('div', {class:'card'});
  var closed = planWeekClosed(w);
  var rc = reviewCounts();
  var openedTotal = wr.total;
  var closeRate = openedTotal > 0 ? pct(closed, openedTotal) : null;
  kbox.appendChild(E('div', {class:'diagrow'}, [
    E('span', {class:'dn'}, '本周新增错因'),
    E('span', {class:'dv'}, openedTotal + ' 题')
  ]));
  kbox.appendChild(E('div', {class:'diagrow'}, [
    E('span', {class:'dn'}, '本周出师（连着做对 4 轮）'),
    E('span', {class:'dv'}, closed + ' 题')
  ]));
  kbox.appendChild(E('div', {class:'diagrow'}, [
    E('span', {class:'dn'}, '错误关闭率（目标 ≥ 80%）'),
    E('span', {class:'dv', style:closeRate === null ? '' : (closeRate >= 80 ? 'color:var(--ok)' : 'color:var(--bad)')},
      closeRate === null ? '本周没有新增错题' : (closeRate + '%'))
  ]));
  kbox.appendChild(E('div', {class:'diagrow'}, [
    E('span', {class:'dn'}, '当前仍在复练计划里 / 今天该复练'),
    E('span', {class:'dv'}, (rc.due + rc.waiting) + ' 题 / ' + rc.due + ' 题')
  ]));
  if (rc.unmarked) kbox.appendChild(E('div', {class:'note'}, '还有 ' + rc.unmarked + ' 道错题没标错因，它们现在不参与关闭率计算。'));
  wrap.appendChild(kbox);

  /* 五、三个问题 + 六、下周计划：用户手写 */
  var f = saved.fields || {};
  function field(label, key, hint, rows){
    var ta = E('textarea', {class:'draft', rows:String(rows || 3), placeholder:hint || ''});
    ta.value = f[key] || '';
    var box = E('div', {class:'planfield'}, [E('div', {class:'dl'}, label), ta]);
    return { box:box, ta:ta };
  }
  wrap.appendChild(E('div', {class:'section-title'}, '五、三个问题'));
  var qbox = E('div', {class:'card'});
  var f1 = field('1. 本周最大的收获是什么？', 'gain', '写具体的事，比如「资料分析终于能在 7 分钟内做完 5 题」', 3);
  var f2 = field('2. 本周最大的问题是什么？', 'problem', '数据难看也要如实写，难看的数据才有诊断价值', 3);
  var f3 = field('3. 下周要改变的一个具体行为是什么？', 'change', '必须是可执行的动作，例如「答题前先圈出依法 / 服务两个维度」，不能写「更努力」', 3);
  qbox.appendChild(f1.box); qbox.appendChild(f2.box); qbox.appendChild(f3.box);
  wrap.appendChild(qbox);

  wrap.appendChild(E('div', {class:'section-title'}, '六、下周计划'));
  var nbox = E('div', {class:'card'});
  var f4 = field('下周安排', 'next', '例如：周一至周五每天资料分析 1 篇；周六 1 套行测限时；周日复盘 + 背法律卡 20 张', 4);
  nbox.appendChild(f4.box);
  wrap.appendChild(nbox);

  /* 保存 / 导出 */
  wrap.appendChild(E('div', {class:'section-title'}, '保存与导出'));
  var acts = E('div', {style:'display:flex;flex-direction:column;gap:9px'});
  acts.appendChild(E('button', {class:'btn', onclick:function(){
    planSaveReview(w, { fields:{ gain:f1.ta.value, problem:f2.ta.value, change:f3.ta.value, next:f4.ta.value } });
    toast('第 ' + w + ' 周复盘已保存');
    render();
  }}, '保存本周复盘'));
  acts.appendChild(E('button', {class:'btn ghost', onclick:function(){
    var txt = planReviewText(w);
    copyText(txt).then(function(){ toast('复盘已复制，粘贴到备忘录就行'); }, function(){
      window.prompt('长按全选下面的内容复制：', txt);
    });
  }}, '导出复盘（复制文本）'));
  acts.appendChild(E('button', {class:'btn ghost', onclick:function(){ go('#/plan/' + w); }}, '回到训练计划'));
  wrap.appendChild(acts);
  if (saved.savedAt){
    wrap.appendChild(E('div', {class:'footnote'}, '上次保存：' + fmtDateTime(saved.savedAt) + '。数据板块每次打开都会重新算，手写内容以最后保存的为准。'));
  }

  wrap.appendChild(footnote());
  frag.appendChild(wrap);
  frag.appendChild(navbar('stats'));
  return frag;
}

/* 把一周复盘导出成纯文本，格式对齐 06-计划与追踪/02-周复盘模板.md，方便贴进备忘录或打印。 */
function planReviewText(w){
  var s = planWeekStats(w);
  var t = planTargetOfWeek(w);
  var phase = planPhaseOfWeek(w);
  var wr = planWeekReasons(w);
  var closed = planWeekClosed(w);
  var saved = planReview(w) || {};
  var f = saved.fields || {};
  var rng = planWeekRange(w);
  var L = [];
  L.push('第 ' + w + ' 周复盘（' + fmtDay(rng.start) + ' — ' + fmtDay(rng.end) + '）');
  L.push('阶段：' + phase.name);
  L.push('');
  L.push('一、本周完成情况');
  L.push('行测作答 ' + s.q + ' / ' + t.q + ' 题');
  L.push('申论小题 ' + s.sl + ' / ' + t.sl + ' 题');
  L.push('背记卡 ' + s.know + ' / ' + t.know + ' 张');
  L.push('错题复练 ' + s.review + ' / ' + t.review + ' 题');
  L.push('限时模考 ' + s.mocks + ' / ' + t.mocks + ' 次');
  L.push('学习天数 ' + s.days + ' / 7 天');
  L.push('');
  L.push('二、成绩数据');
  if (s.mockLast){
    L.push('最近一次模考：' + s.mockLast.title + '，正确率 ' + pct(s.mockLast.right, s.mockLast.answered || s.mockLast.total) + '%');
    (s.mockLast.bySec || []).forEach(function(v){
      L.push('  ' + v.name + '：' + pct(v.ok, v.done || v.n) + '%（' + v.ok + '/' + v.done + '）');
    });
    L.push('本周模考 ' + s.mocks + ' 次，最好 ' + s.mockBest + '%');
  } else {
    L.push('本周没有限时模考记录。');
  }
  L.push('');
  L.push('三、错因分析（本周新增 ' + wr.total + ' 条）');
  REASONS.forEach(function(r){
    var n = wr.tally[r.k] || 0;
    if (n) L.push('  ' + r.label + '：' + n + ' 条');
  });
  if (!wr.total) L.push('  （无）');
  var top = topReason(wr.tally);
  if (top) L.push('本周最突出的错因是「' + top.label + '」。');
  L.push('');
  L.push('四、错误关闭情况');
  L.push('本周新增错因 ' + wr.total + ' 题；本周出师 ' + closed + ' 题；关闭率 ' +
    (wr.total > 0 ? pct(closed, wr.total) + '%' : '本周无新增错题'));
  L.push('');
  L.push('五、三个问题');
  L.push('1. 本周最大的收获是什么？');
  L.push(f.gain || '（未填）');
  L.push('2. 本周最大的问题是什么？');
  L.push(f.problem || '（未填）');
  L.push('3. 下周要改变的一个具体行为是什么？');
  L.push(f.change || '（未填）');
  L.push('');
  L.push('六、下周计划');
  L.push(f.next || '（未填）');
  L.push('');
  L.push('—— 由备考题本自动生成，数据来自本机练习记录。');
  return L.join('\n');
}

/* ================= 模考诊断 ================= */
/* 诊断报告的职责：把「这次考了多少、哪块丢分、为什么丢、下次改什么」一次讲完。
   报告只读模考档案，不重新加载题库，所以打开很快、断网也能看。 */
function diagEntryCard(){
  var last = lastMockAttempt();
  var n = (ST.mocks || []).length;
  var sub = last
    ? ('最近一次：' + last.title + ' · 正确率 ' + pct(last.right, last.answered || last.total) + '% · ' + fmtDay(last.date))
    : '做完一次限时模考，这里会自动出成绩、弱项和下一步该练什么。';
  return E('div', {class:'kentry'}, [
    E('div', {class:'kh'}, [
      E('span', {class:'kic'}, '\uD83D\uDCC8'),
      E('span', {class:'kt'}, '模考诊断'),
      E('span', {class:'kc'}, n ? (n + ' 次记录') : '还没有记录')
    ]),
    E('div', {class:'ks'}, sub),
    E('button', {class:'btn', style:'margin-top:11px;width:100%', onclick:function(){ go('#/diag'); }}, last ? '看诊断报告' : '去模考一次')
  ]);
}

/* 首页入口：把「现在第几周、离笔试还有几天、本周做了多少」摆在最前面 */
function planEntryCard(){
  var cur = planWeekAt(Date.now());
  var ph = planPhaseOfWeek(cur);
  var st = planWeekStats(Math.min(PLAN_WEEKS, Math.max(1, cur)));
  var t = planTargetOfWeek(cur);
  var sub = '第 ' + (cur < 1 ? 1 : (cur > PLAN_WEEKS ? PLAN_WEEKS : cur)) + ' 周 · ' + ph.name +
    ' · 距笔试 ' + planDaysToExam() + ' 天 · 本周已作答 ' + st.q + ' 题（目标 ' + t.q + '）';
  return E('div', {class:'kentry'}, [
    E('div', {class:'kh'}, [
      E('span', {class:'kic'}, '\uD83D\uDCC5'),
      E('span', {class:'kt'}, '训练计划'),
      E('span', {class:'kc'}, planReview(cur) ? '本周已复盘' : '本周待复盘')
    ]),
    E('div', {class:'ks'}, sub),
    planBar(st.q, t.q),
    E('button', {class:'btn', style:'margin-top:11px;width:100%', onclick:function(){ go('#/plan'); }}, '看训练计划')
  ]);
}

function diagSectionBars(item){
  var box = E('div', {class:'card'});
  (item.bySec || []).forEach(function(v){
    var rate = pct(v.ok, v.done || v.n);
    var color = rate >= 70 ? 'var(--ok)' : (rate >= 50 ? 'var(--brand)' : 'var(--bad)');
    box.appendChild(E('div', {style:'margin-bottom:14px'}, [
      E('div', {style:'display:flex;justify-content:space-between;font-size:14px;font-weight:650;margin-bottom:6px'}, [
        E('span', null, v.name),
        E('span', {style:'color:' + color + ';font-weight:700'}, '对 ' + rate + '%'),
        E('span', {style:'color:var(--ink-3);font-weight:600'}, v.done + '/' + v.n + ' 题')
      ]),
      E('div', {class:'pbar'}, E('i', {style:'width:' + rate + '%'}))
    ]));
  });
  return box;
}

function diagCompareBox(cmp){
  var kids = [];
  var cls = cmp.rate > 0 ? 'delta-up' : (cmp.rate < 0 ? 'delta-down' : 'delta-flat');
  kids.push(E('div', {class:'rcard'}, [
    E('div', {class:'rn ' + cls}, (cmp.rate > 0 ? '+' : '') + cmp.rate + '%'),
    E('div', {class:'rl'}, '正确率变化 · 上次 ' + pct(cmp.from.right, cmp.from.answered || cmp.from.total) + '% → 这次 ' + pct(cmp.to.right, cmp.to.answered || cmp.to.total) + '%')
  ]));
  kids.push(E('div', {class:'rcard'}, [
    E('div', {class:'rn'}, (cmp.right > 0 ? '+' : '') + cmp.right),
    E('div', {class:'rl'}, '答对题数变化 · 上次 ' + cmp.from.right + ' → 这次 ' + cmp.to.right)
  ]));
  var grid = E('div', {class:'rgrid'}, kids);
  var out = [grid];
  var secs = (cmp.secs || []).filter(function(x){ return x.d !== 0; });
  if (secs.length){
    var box = E('div', {class:'card', style:'margin-top:9px'});
    secs.forEach(function(x){
      var c = x.d > 0 ? 'delta-up' : 'delta-down';
      box.appendChild(E('div', {class:'diagrow'}, [
        E('span', {class:'dn'}, x.name),
        E('span', {class:'dv ' + c}, (x.d > 0 ? '+' : '') + x.d + '%'),
        E('span', {class:'dv'}, x.from + '% → ' + x.to + '%')
      ]));
    });
    out.push(E('div', {class:'section-title'}, '分模块变化'));
    out.push(box);
  }
  var rs = (cmp.reasons || []).filter(function(x){ return x.d !== 0; });
  if (rs.length){
    var rb = E('div', {class:'card'});
    rs.forEach(function(x){
      var c = x.d > 0 ? 'delta-down' : 'delta-up';
      rb.appendChild(E('div', {class:'diagrow'}, [
        E('span', {class:'dn'}, x.label),
        E('span', {class:'dv ' + c}, (x.d > 0 ? '+' : '') + x.d + ' 题'),
        E('span', {class:'dv'}, x.from + ' → ' + x.to)
      ]));
    });
    out.push(E('div', {class:'section-title'}, '错因变化'));
    out.push(rb);
  }
  return out;
}

function viewDiagnosis(){
  var frag = document.createDocumentFragment();
  frag.appendChild(topbar('模考诊断', '交卷后自动生成', function(){ go('#/stats'); }));
  var wrap = E('div', {class:'wrap'});
  var all = (ST.mocks || []).slice().sort(function(a,b){ return (a.date || 0) - (b.date || 0); });

  if (!all.length){
    wrap.appendChild(E('div', {class:'empty'}, [
      E('div', {class:'big'}, '\uD83D\uDCC8'),
      E('p', null, '还没有模考记录。'),
      E('p', null, '限时模考交卷后，这里会自动生成诊断报告：成绩、各模块正确率、错因结论和下一次的改进方向。'),
      E('button', {class:'btn', style:'margin-top:16px', onclick:function(){ go('#/p/exam/484/mock'); }}, '开始一次模考（2026 河北行测）')
    ]));
    wrap.appendChild(E('div', {class:'note'}, '模考按真实考场时长倒计时，中途不显示对错，交卷后统一出分。报告和复测对比都留在这台设备上。'));
    wrap.appendChild(footnote());
    frag.appendChild(wrap);
    frag.appendChild(navbar('stats'));
    return frag;
  }

  var last = all[all.length - 1];
  var same = mockAttempts(last.paperId);
  var prev = same.length >= 2 ? same[same.length - 2] : null;
  var rate = pct(last.right, last.answered || last.total);
  var color = rate >= 70 ? 'var(--ok)' : (rate >= 50 ? 'var(--brand)' : 'var(--bad)');

  wrap.appendChild(E('div', {class:'card bigscore'}, [
    E('div', {class:'pct', style:'color:' + color}, rate + '%'),
    E('div', {class:'lbl'}, last.title),
    E('div', {class:'lbl'}, '答对 ' + last.right + ' / 共 ' + last.total + ' 题 · 已答 ' + last.answered + ' 题' + (last.skipped ? ' · 跳过 ' + last.skipped + ' 题' : '')),
    E('div', {class:'lbl'}, fmtDateTime(last.date) + ' 交卷' + (last.usedMs ? ' · 用时 ' + fmtUsed(last.usedMs) : ''))
  ]));

  wrap.appendChild(E('div', {class:'section-title'}, '分模块表现'));
  wrap.appendChild(diagSectionBars(last));

  var reasonTotal = 0;
  REASONS.forEach(function(r){ reasonTotal += (last.tally && last.tally[r.k]) || 0; });
  if (reasonTotal || last.unmarked){
    wrap.appendChild(E('div', {class:'section-title'}, '错因结论'));
    if (reasonTotal){
      var rg = E('div', {class:'rgrid'});
      var maxN = 1;
      REASONS.forEach(function(r){ if (((last.tally||{})[r.k]||0) > maxN) maxN = (last.tally||{})[r.k]; });
      REASONS.forEach(function(r){
        var n = (last.tally || {})[r.k] || 0;
        if (!n) return;
        rg.appendChild(E('div', {class:'rcard'}, [
          E('div', {class:'rn'}, String(n)),
          E('div', {class:'rl'}, r.label + ' · ' + r.hint),
          E('div', {class:'rb'}, E('i', {style:'width:' + pct(n, maxN) + '%'}))
        ]));
      });
      wrap.appendChild(rg);
      var advice = reasonAdvice(last.tally || {}, reasonTotal);
      if (advice) wrap.appendChild(E('div', {class:'note'}, advice));
    }
    if (last.unmarked){
      wrap.appendChild(E('div', {class:'note'}, '这次有 ' + last.unmarked + ' 道错题还没标错因。去错题本标一下，下次诊断才能分清是知识问题还是方法问题。'));
    }
  } else if (last.answered){
    wrap.appendChild(E('div', {class:'section-title'}, '错因结论'));
    wrap.appendChild(E('div', {class:'note'}, '这次已答的题全对，没有错因可分析。下次可以挑题量更大的卷子，或者把限时再压紧一点。'));
  }

  if (prev){
    var cmp = mockCompare(last, prev);
    wrap.appendChild(E('div', {class:'section-title'}, '与上一次对比（同一套卷）'));
    diagCompareBox(cmp).forEach(function(n){ wrap.appendChild(n); });
    var verdict = cmp.rate > 0
      ? ('比上次进步 ' + cmp.rate + ' 个百分点，方向是对的，保持这套节奏。')
      : (cmp.rate < 0
        ? ('比上次退了 ' + Math.abs(cmp.rate) + ' 个百分点。先看下面的弱项和错因，别急着加题量。')
        : '正确率和上次持平。想再往上走，得从最弱的那一块开刀。');
    wrap.appendChild(E('div', {class:'note'}, verdict));
  } else {
    wrap.appendChild(E('div', {class:'section-title'}, '复测对比'));
    wrap.appendChild(E('div', {class:'note'}, '这是这套卷的第一次模考。隔一周再模考同一套，这里会自动给出进步 / 退步对比和分模块变化。'));
  }

  wrap.appendChild(E('div', {class:'section-title'}, '下一步该练什么'));
  var acts = E('div', {style:'display:flex;flex-direction:column;gap:9px'});
  var weakest = (last.weak && last.weak.length) ? last.weak[0] : null;
  var top = topReason(last.tally || {});
  if (weakest){
    wrap.appendChild(E('div', {class:'note'}, '最弱模块是「' + weakest.name + '」，这次正确率只有 ' + weakest.rate + '%（' + weakest.ok + '/' + weakest.done + ' 题）。'));
    acts.appendChild(E('button', {class:'btn', onclick:function(){ go('#/p/exam/' + last.paperId + '/f/wrong'); }}, '只刷这套卷的错题（' + (last.answered - last.right) + '）'));
  } else {
    acts.appendChild(E('button', {class:'btn', onclick:function(){ go('#/p/exam/' + last.paperId + '/f/wrong'); }}, '只刷这套卷的错题（' + (last.answered - last.right) + '）'));
  }
  if (top){
    var nx = REASON_NEXT[top.k] || { label:'重做这类错题', hash:'#/wrong' };
    acts.appendChild(E('button', {class:'btn ghost', onclick:function(){ go(nx.hash); }}, '首要错因：' + top.label + ' → ' + nx.label));
  }
  acts.appendChild(E('button', {class:'btn ghost', onclick:function(){
    if (!confirm('重新模考这套卷吗？新的一次成绩会追加到档案里。')) return;
    delete ST.mock['exam:' + last.paperId]; save();
    go('#/p/exam/' + last.paperId + '/mock');
  }}, '再模考一次这套卷'));
  acts.appendChild(E('button', {class:'btn ghost', onclick:function(){ go('#/p/exam/' + last.paperId + '/result'); }}, '看这套卷的逐题结果'));
  wrap.appendChild(acts);

  wrap.appendChild(E('div', {class:'section-title'}, '模考档案（最近 ' + Math.min(all.length, MOCK_KEEP) + ' 次）'));
  var hist = E('div', {class:'card'});
  all.slice().reverse().slice(0, 10).forEach(function(m){
    var r = pct(m.right, m.answered || m.total);
    hist.appendChild(E('div', {class:'diagrow'}, [
      E('span', {class:'dn'}, fmtDateTime(m.date) + ' · ' + m.title),
      E('span', {class:'dv', style:'color:' + (r >= 70 ? 'var(--ok)' : (r >= 50 ? 'var(--brand)' : 'var(--bad)'))}, r + '%'),
      E('span', {class:'dv'}, m.right + '/' + m.total)
    ]));
  });
  wrap.appendChild(hist);
  if (all.length > 10) wrap.appendChild(E('div', {class:'footnote'}, '只显示最近 10 次，档案里最多保留 ' + MOCK_KEEP + ' 次。'));

  wrap.appendChild(E('div', {class:'section-title'}, '档案管理'));
  var mg = E('div', {style:'display:flex;flex-direction:column;gap:9px'});
  mg.appendChild(E('button', {class:'btn ghost', onclick:function(){
    var data = JSON.stringify(ST.mocks || []);
    copyText(data).then(function(){ toast('模考档案已复制'); }, function(){
      window.prompt('长按全选下面的内容，复制到备忘录保存：', data);
    });
  }}, '导出模考档案'));
  mg.appendChild(E('button', {class:'btn ghost', onclick:function(){
    if (!confirm('确定清空全部模考档案吗？答题进度不受影响。')) return;
    ST.mocks = []; save(); toast('模考档案已清空'); render();
  }}, '清空模考档案'));
  wrap.appendChild(mg);
  wrap.appendChild(footnote());
  frag.appendChild(wrap);
  frag.appendChild(navbar('stats'));
  return frag;
}

/* ================= 说明 ================= */
function viewAbout(){
  var frag = document.createDocumentFragment();
  frag.appendChild(topbar('使用说明', '怎么用最省时间', null));
  var wrap = E('div', {class:'wrap'});
  wrap.appendChild(E('div', {class:'card'}, [
    E('div', {class:'eh', style:'font-size:12.5px;font-weight:800;color:var(--brand);letter-spacing:.06em;margin-bottom:8px'}, '建议顺序'),
    E('div', {class:'mat', text:[
      '1. 先精读「河北申论 C 卷」2024 / 2025 两套，这是行政执法岗位真正的用卷。',
      '2. 再刷「河北行测真题」2023—2026 四套，熟悉河北省考行测的题量与节奏。',
      '3. 用「国考行测·行政执法卷」做高强度模拟，2022—2026 共五套。',
      '4. 申论题感不够时，从「各省行政执法申论」里挑同类型题目补练。',
      '5. 每天抽 10 分钟刷「背记卡」：法律条文、申论金句、时政提法，这是最容易漏的送分块。',
      '6. 每套做完都去「错题本」重做一遍，这是提分最快的一步。'
    ].join('\n')})
  ]));
  wrap.appendChild(E('div', {class:'card'}, [
    E('div', {class:'eh', style:'font-size:12.5px;font-weight:800;color:var(--brand);letter-spacing:.06em;margin-bottom:8px'}, '新功能怎么用'),
    E('div', {class:'mat', text:[
      '训练计划：底部「进度」→「训练计划」，或首页的「训练计划」卡片。按 26 周排好五个阶段，自动算出你现在第几周、离笔试还有几天、本周各项目标完成多少，还能翻看任意一周。',
      '申论批改：申论看完参考答案后点「开始批改」，系统会把参考答案拆成一条条采分点，你逐点标「命中 / 部分命中 / 漏点」，漏点再选原因，最后自动算出要点命中率（目标 ≥ 75%）。大作文走五步自评，另附行政执法卷专属的「C 卷四查」。批改记录存在本机，题目列表右侧会直接显示命中率，第 14 周里程碑也用这个数字自动判定。',
      '复批对比：同一道申论题隔一周重写一遍，进批改页点「再批一次」，系统会把上一轮封存起来、清空标记让你重批。标完新一轮后，批改页顶部会给出「上次 36% → 这次 71%」，并逐条列出「这次补上的点」和「这次丢掉的点」。底部「进度」→「复批对比」汇总所有复批过的题、平均涨跌多少、哪几道退步了。',
      '周复盘：计划页点「本周复盘」，前四块（完成情况、成绩数据、错因分析、错误关闭情况）自动从练习记录里算，你只填三个问题和下周计划，填完可以导出成文本。',
      '限时模考：进入一套行测，在「练习结果」页点「限时模考一次」，会按考场节奏倒计时，中途不显示对错，交卷后统一出分。',
      '模考诊断：交卷后自动生成诊断报告（底部「进度」→「模考诊断」）。报告会给出正确率、各模块丢分、错因结论和下一步该练什么；同一套卷再考一次，会自动给出与上次的进步 / 退步对比。',
      '模考档案：每次模考都会留档（最多 30 次），可以在诊断页回看历史成绩，也可以导出成文本存到备忘录。',
      '只刷错题 / 未做：练习页顶部有「全部 / 未做 / 错题 / 收藏」四个筛选，可以只刷没做完的，或者只重做错题。',
      '收藏好题：每题右上角有个星星，点亮就收进底部「收藏」，考前集中看。',
      '搜索：首页或「进度」页可以搜题干关键词，在全部 ' + CATALOG.totals.questions + ' 道题里找同类题。',
      '字号：练习页右上角的 A 键可以在小 / 标准 / 大之间切换。',
      '背记卡：底部「背记」里把法律条文、申论金句、时政提法做成卡片。点卡片看答案，「会了」往后排 1/3/7/16/35 天，「不会」当天再来一次。'
    ].join('\n')})
  ]));
  var ist = (IMGMAN && IMGMAN.stats) || {};
  wrap.appendChild(E('div', {class:'note'}, [
    E('b', null, '关于图片题：'),
    imgUnavailable()
      ? '单文件离线版为了体积没有内嵌图形题原图，遇到带图的题需要对照纸质原卷，或改用网页版 / 手机 App。'
      : ('题库里有 ' + (ist.imageQuestions || 0) + ' 道题带图形。其中 ' + (ist.questionImages || 0) + ' 道已配好原图，打开题目直接显示，点图可以放大看细节；材料里带图表的也已补上。' +
         '还剩 ' + (ist.unresolved || 0) + ' 道的原始来源本身就没收录图片，遇到时应用会提示你对照纸质原卷，也可以直接点「跳过本题」。')
  ]));
  wrap.appendChild(E('div', {class:'card'}, [
    E('div', {class:'eh', style:'font-size:12.5px;font-weight:800;color:var(--brand);letter-spacing:.06em;margin-bottom:8px'}, '数据与版权'),
    E('div', {class:'mat', text:[
      '题库内容来自 GitHub 上公开整理的数据集 xianhua1/Huahuagongkao。',
      '图形题原图来自另一个公开数据集 ERRRC/xingcezhenti，两个数据集之间没有稳定的题目编号，',
      '是靠题干文字逐题比对配上的，比对时还用答案做了交叉校验。',
      '两个数据集都没有附带开源许可证，因此这些真题内容与图片仅可用于个人备考学习。',
      '请不要把本应用或题库内容公开部署、分享到公开网站，也不要用于商业用途。',
      '所有答题进度只保存在你自己的手机 / 电脑浏览器里，不会上传到任何服务器。'
    ].join('\n')})
  ]));
  var offlineBox2 = offlineCard();
  if (offlineBox2) wrap.appendChild(offlineBox2);
  wrap.appendChild(E('div', {class:'card'}, [
    E('div', {class:'eh', style:'font-size:12.5px;font-weight:800;color:var(--brand);letter-spacing:.06em;margin-bottom:8px'}, '装到手机上'),
    E('div', {class:'mat', text:[
      'iPhone：用 Safari 打开，点底部「分享」→「添加到主屏幕」。',
      '安卓：用 Chrome / 夸克 / 微信内置浏览器打开，菜单里选「添加到主屏幕」或「安装应用」。',
      '添加后就有独立图标，打开即全屏，和 App 一样用。'
    ].join('\n')})
  ]));
  wrap.appendChild(footnote());
  frag.appendChild(wrap);
  frag.appendChild(navbar('about'));
  return frag;
}

/* ================= 离线题库 ================= */
var OFFLINE = {
  supported: !window.__NO_SW__ && ('serviceWorker' in navigator) && location.protocol.indexOf('http') === 0,
  phase: 'unknown',   // unknown | idle | running | done | partial
  done: 0, total: 0, failed: 0
};

function offlineTotal(){ return (CATALOG && CATALOG.totals && CATALOG.totals.papers) || 0; }

function offlineCacheName(){
  if (!('caches' in window)) return Promise.resolve(null);
  return caches.keys().then(function(keys){
    var hit = null;
    keys.forEach(function(k){ if (k.indexOf('kaogong-') === 0 && (!hit || k > hit)) hit = k; });
    return hit;
  }).catch(function(){ return null; });
}

function offlineCount(){
  return offlineCacheName().then(function(name){
    if (!name) return 0;
    return caches.open(name).then(function(c){ return c.keys(); }).then(function(reqs){
      var n = 0;
      reqs.forEach(function(r){
        if (r.url.indexOf('/data/exams/') >= 0 || r.url.indexOf('/data/shenlun/') >= 0) n++;
      });
      return n;
    });
  }).catch(function(){ return 0; });
}

function offlineText(){
  var total = OFFLINE.total || offlineTotal();
  if (!OFFLINE.supported) return '当前环境不支持离线缓存，请用手机浏览器打开后「添加到主屏幕」。';
  if (OFFLINE.phase === 'running') return '正在下载题库… ' + OFFLINE.done + ' / ' + total + ' 套。可以继续用，别关页面。';
  if (OFFLINE.phase === 'done') return '整套题已存到本机：' + OFFLINE.done + ' / ' + total + ' 套。断网也能刷。';
  if (OFFLINE.phase === 'partial') return '已存 ' + OFFLINE.done + ' / ' + total + ' 套，还有 ' + OFFLINE.failed + ' 套没下来，点下面按钮补齐。';
  if (OFFLINE.done >= total && total > 0) return '整套题已存到本机：' + OFFLINE.done + ' / ' + total + ' 套。断网也能刷。';
  if (OFFLINE.done > 0) return '已存 ' + OFFLINE.done + ' / ' + total + ' 套。点下面按钮把剩下的也存下来。';
  return '还没把题库存到本机。点下面按钮，一次存完，之后断网也能刷。';
}

function offlineRefreshUI(){
  var el = document.getElementById('offline-text');
  var btn = document.getElementById('offline-btn');
  if (!el) return;
  if (OFFLINE.phase === 'unknown'){
    offlineCount().then(function(n){
      OFFLINE.done = n; OFFLINE.phase = 'idle';
      offlineRefreshUI();
    });
    return;
  }
  el.textContent = offlineText();
  if (btn){
    var busy = OFFLINE.phase === 'running';
    btn.textContent = busy ? '正在下载…' : '下载全部题库到本机';
    btn.disabled = busy;
    btn.style.opacity = busy ? '.6' : '';
  }
}

function offlineStart(){
  if (!OFFLINE.supported){ toast('当前环境不支持离线缓存'); return; }
  OFFLINE.phase = 'running'; OFFLINE.failed = 0;
  offlineRefreshUI();
  navigator.serviceWorker.ready.then(function(reg){
    (reg.active || navigator.serviceWorker.controller).postMessage({type:'precache-all'});
    toast('开始下载，保持页面打开即可');
  }).catch(function(){ toast('离线功能暂时不可用'); OFFLINE.phase = 'idle'; offlineRefreshUI(); });
}

if (OFFLINE.supported){
  navigator.serviceWorker.addEventListener('message', function(e){
    var d = e.data || {};
    if (d.type !== 'precache-progress') return;
    OFFLINE.done = d.done; OFFLINE.total = d.total; OFFLINE.failed = (d.failed || []).length;
    OFFLINE.phase = OFFLINE.failed > 0 ? 'partial' : (d.done >= d.total ? 'done' : 'running');
    offlineRefreshUI();
  });
}

function offlineCard(){
  if (!OFFLINE.supported) return null;   // 安卓 App 已内嵌题库，不需要这张卡
  var card = E('div', {class:'card'}, [
    E('div', {class:'eh', style:'font-size:12.5px;font-weight:800;color:var(--brand);letter-spacing:.06em;margin-bottom:8px'}, '离线题库'),
    E('div', {class:'mat', id:'offline-text', text:'正在检查…'}),
    E('button', {class:'btn', id:'offline-btn', style:'margin-top:12px', onclick:offlineStart}, '下载全部题库到本机')
  ]);
  setTimeout(offlineRefreshUI, 0);
  return card;
}

/* ================= 渲染 ================= */

/* ================= 错误边界与离线提示 ================= */
/* 应用是纯前端单页，任何一处未捕获的异常都可能把页面留成白屏。
   这里做三件事：崩溃兜底屏、离线横幅、恢复后自动重试一次。 */
var CRASH = { count:0, lastAt:0 };

function crashScreen(err){
  var msg = (err && err.message) ? String(err.message) : '未知错误';
  var frag = document.createDocumentFragment();
  frag.appendChild(topbar('出了点问题', '进度已保存在本机，不会丢', null));
  frag.appendChild(E('div', {class:'wrap'}, E('div', {class:'empty'}, [
    E('div', {class:'big'}, '\u26A0\uFE0F'),
    E('p', null, '这一页没能打开：' + msg),
    E('p', null, '你的练习进度都存在这台设备上，不会因为出错而丢失。'),
    E('button', {class:'btn', style:'margin-top:16px', onclick:function(){ location.hash = '#/'; location.reload(); }}, '回到首页'),
    E('button', {class:'btn ghost', style:'margin-top:9px', onclick:function(){ location.reload(); }}, '重新加载')
  ])));
  $app.innerHTML = '';
  $app.appendChild(frag);
}

window.addEventListener('error', function(ev){
  /* 图片加载失败交给 imgBox 自己兜底，不触发整页崩溃屏 */
  if (ev && ev.target && ev.target.tagName === 'IMG') return;
  var now = Date.now();
  if (now - CRASH.lastAt < 400) return;   // 同一次崩溃只处理一次
  CRASH.lastAt = now; CRASH.count++;
  crashScreen(ev && (ev.error || ev.message));
});
window.addEventListener('unhandledrejection', function(ev){
  var now = Date.now();
  if (now - CRASH.lastAt < 400) return;
  CRASH.lastAt = now; CRASH.count++;
  crashScreen(ev && ev.reason);
});

/* 离线横幅：断网时明确告诉用户「现在能用哪些、不能做哪些」，
   而不是让他点了半天没反应还以为题本坏了。 */
var NET = { banner:null, wasOffline:false };
function isOffline(){ return navigator.onLine === false; }
function netBanner(show){
  if (show && !NET.banner){
    var cached = (OFFLINE && OFFLINE.done > 0);
    NET.banner = E('div', {class:'netbar'}, [
      E('span', {class:'nb-ic'}, '\u26A0\uFE0F'),
      E('span', {style:'flex:1'}, cached
        ? '当前没有网络。已下载的题库可以照常做，进度也照常保存。'
        : '当前没有网络。如果这套题还没下载到本机，可能打不开；连上网后重试即可。')
    ]);
    document.body.appendChild(NET.banner);
    document.documentElement.classList.add('has-netbar');
  } else if (!show && NET.banner){
    if (NET.banner.parentNode) NET.banner.parentNode.removeChild(NET.banner);
    NET.banner = null;
    document.documentElement.classList.remove('has-netbar');
  }
}
window.addEventListener('online', function(){
  netBanner(false);
  if (NET.wasOffline){ NET.wasOffline = false; toast('网络已恢复'); }
});
window.addEventListener('offline', function(){
  NET.wasOffline = true;
  netBanner(true);
});
/* 打开时就已经断网的情况 */
if (isOffline()){ NET.wasOffline = true; netBanner(true); }

function render(){
  var p = parseHash();
  var out;
  // 离开练习页就停掉计时器，避免后台空转；专项页自己保留计时
  var keepTick = (p[0] === 'p' && p[1] === 'exam' && p[3] !== 'list' && p[3] !== 'mat' && p[3] !== 'result')
              || (p[0] === 'drill' && p[1] !== 'result')
              || (p[0] === 'train' && p[1] !== 'result');
  if (EX.tick && !keepTick){
    clearInterval(EX.tick); EX.tick = null;
  }
  // 离开模考页时把剩余时间写回本地，下次回来能接着计时
  if (EX.paper && EX.mode === 'mock' && !(p[0] === 'p' && p[1] === 'exam' && p[3] === 'mock') && ST.mock['exam:' + EX.paper.id]){
    saveMock();
  }
  if (!p.length){
    out = Promise.resolve(viewHome());
  } else if (p[0] === 'train'){
    out = p[1] === 'result' ? viewTrainingResult() : viewTraining();
  } else if (p[0] === 'drill'){
    out = p[1] === 'result' ? Promise.resolve(viewDrillResult()) : viewDrill();
  } else if (p[0] === 'wrong'){
    out = viewWrong();
  } else if (p[0] === 'stats'){
    if (p[1] === 'recheck') out = Promise.resolve(viewShenlunRecheck());
    else out = Promise.resolve(viewStats());
  } else if (p[0] === 'about'){
    out = Promise.resolve(viewAbout());
  } else if (p[0] === 'diag'){
    out = Promise.resolve(viewDiagnosis());
  } else if (p[0] === 'plan'){
    if (p[1] === 'rev') out = Promise.resolve(viewPlanReview(p[2]));
    else out = Promise.resolve(viewPlan(p[1]));
  } else if (p[0] === 'fav'){
    out = viewFav();
  } else if (p[0] === 'search'){
    out = viewSearch(decodeURIComponent(p[1] || ''));
  } else if (p[0] === 'know'){
    out = p[1] ? viewKnowledgeDeck(decodeURIComponent(p[1])) : viewKnowledge();
  } else if (p[0] === 'p' && p[1] === 'exam'){
    if (p[3] === 'list') out = viewExamList(p[2]);
    else if (p[3] === 'mat') out = viewExamMaterial(p[2], p[4]);
    else if (p[3] === 'result') out = viewExamResult(p[2]);
    else if (p[3] === 'mock') out = viewExamMock(p[2]);
    else if (p[3] === 'f') out = viewExamPractice(p[2], p[4] || 'all');
    else out = viewExamPractice(p[2]);
  } else if (p[0] === 'p' && p[1] === 'shenlun'){
    if (p[3] === 'list') out = viewShenlunList(p[2]);
    else if (p[3] === 'grade') out = viewShenlunGrade(p[2], p[4]);
    else out = viewShenlun(p[2]);
  } else {
    out = Promise.resolve(viewHome());
  }
  Promise.resolve(out).then(function(frag){
    $app.innerHTML = '';
    $app.appendChild(frag);
    if (p[0] !== 'p' || (!p[3] && !(p[1]==='shenlun'))) window.scrollTo(0,0);
  }).catch(function(err){
    $app.innerHTML = '';
    $app.appendChild(E('div', {class:'wrap'}, E('div', {class:'empty'}, [
      E('div', {class:'big'}, '\u26A0\uFE0F'),
      E('p', null, '加载失败：' + (err && err.message ? err.message : '未知错误')),
      E('p', null, '如果是第一次打开，请确认网络正常后重试。'),
      E('button', {class:'btn', style:'margin-top:16px', onclick:function(){ location.reload(); }}, '重新加载')
    ])));
  });
}

applyFontSize();
loadCatalog().then(loadKnowledge).then(function(){ render(); }).catch(function(err){
  var isFile = location.protocol === 'file:';
  $app.innerHTML = '';
  $app.appendChild(E('div', {class:'wrap'}, E('div', {class:'empty'}, [
    E('div', {class:'big'}, '\uD83D\uDCD6'),
    E('p', null, isFile ? '请改用「备考题本-单文件版.html」' : '题库目录读取失败'),
    isFile
      ? E('p', null, '当前页面需要配合本地服务器运行。同一个文件夹里有一个单文件版，直接打开那个就能用。')
      : E('p', null, '请确认 data/catalog.json 存在。'),
    isFile ? null : E('button', {class:'btn', style:'margin-top:16px', onclick:function(){ location.reload(); }}, '重新加载')
  ])));
});

/* 注册离线缓存 */
if (!window.__NO_SW__ && 'serviceWorker' in navigator && location.protocol.indexOf('http') === 0){
  window.addEventListener('load', function(){ navigator.serviceWorker.register('sw.js').catch(function(){}); });
}
/* 调试出口：测试直接调用领域函数，不经过界面。线上页面不受影响。 */
window.__KG__ = {
  normalizeModule:normalizeModule, buildModulePool:buildModulePool, poolCounts:poolCounts,
  recommendModule:recommendModule, buildDrillTask:buildDrillTask, fillWithDowngrade:fillWithDowngrade,
  recordDrill:recordDrill, summarizeDrill:DRILL_DOMAIN.summarizeDrill,
  moduleStats:moduleStats, planModuleForWeek:planModuleForWeek,
  MODULE_DEFS:MODULE_DEFS, MODULE_ORDER:MODULE_ORDER, state:function(){ return ST; }
};
})();
