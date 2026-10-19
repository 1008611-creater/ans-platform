/* 专项的纯领域规则：不访问 DOM、网络或浏览器存储。app.js 是唯一启动入口。 */
(function(root){
'use strict';

var MODULE_ORDER = ['common', 'verbal', 'quantity', 'judgment', 'data'];
var MODULE_DEFS = {
  common:   { id:'common',   name:'常识判断',       short:'常识', size:20, limitMs: 8*60000 },
  verbal:   { id:'verbal',   name:'言语理解与表达', short:'言语', size:40, limitMs:30*60000 },
  quantity: { id:'quantity', name:'数量关系',       short:'数量', size:15, limitMs:12*60000 },
  judgment: { id:'judgment', name:'判断推理',       short:'判断', size:35, limitMs:33*60000 },
  data:     { id:'data',     name:'资料分析',       short:'资料', size:20, limitMs:25*60000 }
};
var MODULE_ALIAS = {
  '常识判断':'common', '综合知识':'common', '综合分析':'common', '科学素养':'common', '政治理论':'common',
  '言语理解与表达':'verbal', '言语理解':'verbal',
  '数量关系':'quantity', '数学运算':'quantity', '数量分析':'quantity', '数理':'quantity', '数理能力':'quantity',
  '判断推理':'judgment', '图形推理':'judgment', '类比推理':'judgment', '逻辑判断':'judgment', '科学推理':'judgment',
  '资料分析':'data'
};
var MODULE_POOL_PAPERS = [
  { id:'484', tier:'hebei' }, { id:'159', tier:'hebei' }, { id:'450', tier:'hebei' }, { id:'161', tier:'hebei' },
  { id:'480', tier:'guokao' }, { id:'471', tier:'guokao' }, { id:'445', tier:'guokao' },
  { id:'431', tier:'guokao' }, { id:'426', tier:'guokao' }
];
var DOWNGRADE_GROUPS = ['shengkao-xingce', 'guokao-xingce-other'];
var PLAN_PHASE_MODULES = {
  diag:   ['data', 'verbal'],
  xc:     ['data', 'judgment', 'verbal', 'quantity', 'common'],
  sl:     ['verbal', 'judgment', 'common', 'quantity', 'data'],
  set:    ['judgment', 'data', 'verbal', 'common', 'quantity'],
  sprint: ['common', 'verbal', 'judgment', 'data', 'quantity']
};

function moduleDef(id){ return MODULE_DEFS[id] || MODULE_DEFS.data; }
function normalizeModule(name){
  var n = String(name === null || name === undefined ? '' : name).trim();
  if (!n) return null;
  if (MODULE_ALIAS[n]) return MODULE_ALIAS[n];
  if (n.indexOf('资料') >= 0) return 'data';
  if (n.indexOf('数量') >= 0 || n.indexOf('数理') >= 0 || n.indexOf('数学') >= 0) return 'quantity';
  if (n.indexOf('判断') >= 0 || n.indexOf('图形') >= 0 || n.indexOf('类比') >= 0 ||
      n.indexOf('逻辑') >= 0 || n.indexOf('科学推理') >= 0) return 'judgment';
  if (n.indexOf('言语') >= 0) return 'verbal';
  if (n.indexOf('常识') >= 0 || n.indexOf('综合') >= 0 || n.indexOf('政治') >= 0) return 'common';
  return null;
}
/* 选项有文字，或题目图/材料图至少一项存在；三样皆空的题不可作答。 */
function questionUsable(q){
  var opts = (q && q.options) || [];
  for (var i=0;i<opts.length;i++){
    if (opts[i] && opts[i].text && String(opts[i].text).trim()) return true;
  }
  if (q && q._imgs && q._imgs.length) return true;
  if (q && q._matImgs && q._matImgs.length) return true;
  return false;
}
function normalizeAnswer(a){ return String(a === null || a === undefined ? '' : a).trim().toUpperCase(); }
function buildModulePool(items){
  var index = {};
  MODULE_ORDER.forEach(function(m){ index[m] = []; });
  (items || []).forEach(function(item){
    if (!item) return;
    (item.questions || []).forEach(function(q){
      var mod = normalizeModule(q._secOrig || q._sec);
      if (!mod) return;
      index[mod].push({ paperId:String(item.paperId), no:q.no, tier:item.tier,
        available:questionUsable(q), answer:normalizeAnswer(q.answer) });
    });
  });
  return index;
}
function downgradePaperIds(groups){
  var ids = [];
  (groups || []).forEach(function(g){
    if (DOWNGRADE_GROUPS.indexOf(g.key) < 0) return;
    (g.papers || []).forEach(function(p){
      if (p.type !== 'exam') return;
      var core = MODULE_POOL_PAPERS.some(function(s){ return String(s.id) === String(p.id); });
      if (!core) ids.push(p.id);
    });
  });
  return ids;
}
function downgradeEntries(moduleId, paperId, questions, exclude, existing){
  exclude = exclude || {};
  existing = existing || [];
  var pid = String(paperId), additions = [], seen = {};
  existing.forEach(function(e){ seen[String(e.paperId) + ':' + e.no] = 1; });
  (questions || []).forEach(function(q){
    if (normalizeModule(q._secOrig || q._sec) !== moduleId || !questionUsable(q)) return;
    var qid = pid + ':' + q.no;
    if (exclude[qid] || seen[qid]) return;
    seen[qid] = 1;
    additions.push({ paperId:pid, no:q.no, tier:'other', available:true, answer:normalizeAnswer(q.answer) });
  });
  return additions;
}
function moduleStats(pool, records, moduleLast){
  var out = {};
  MODULE_ORDER.forEach(function(m){ out[m] = { answered:0, right:0, lastAt:0, total:0 }; });
  MODULE_ORDER.forEach(function(m){
    var entries = (pool && pool[m]) || [];
    out[m].total = entries.filter(function(e){ return e.available; }).length;
    entries.forEach(function(e){
      var rec = records['exam:' + e.paperId];
      if (!rec || !rec.answers) return;
      var a = rec.answers[e.no];
      if (a === undefined || a === null || a === '') return;
      out[m].answered++;
      if (normalizeAnswer(a) === e.answer) out[m].right++;
      var at = rec.updated || 0;
      if (at > out[m].lastAt) out[m].lastAt = at;
    });
    var explicit = moduleLast && moduleLast[m];
    if (explicit > out[m].lastAt) out[m].lastAt = explicit;
  });
  return out;
}
function planModuleForWeek(week, phase){
  var ph = phase || {};
  var list = PLAN_PHASE_MODULES[ph.id] || PLAN_PHASE_MODULES.xc;
  var w = Math.max(1, Number(week) || 1);
  var from = Number(ph.from) || 1;
  var idx = ((w - from) % list.length + list.length) % list.length;
  return list[idx];
}
function recommendModule(pool, records, week, exclude, moduleLast, phase){
  exclude = exclude || {};
  var stats = moduleStats(pool, records || {}, moduleLast);
  var cands = MODULE_ORDER.filter(function(m){ return !exclude[m]; });
  if (!cands.length) cands = MODULE_ORDER.slice();
  var enough = cands.filter(function(m){ return stats[m].answered >= 20; });
  if (enough.length){
    enough.sort(function(a, b){
      var ra = stats[a].right / stats[a].answered, rb = stats[b].right / stats[b].answered;
      if (ra !== rb) return ra - rb;
      return MODULE_ORDER.indexOf(a) - MODULE_ORDER.indexOf(b);
    });
    return enough[0];
  }
  var practiced = cands.filter(function(m){ return stats[m].lastAt > 0; });
  if (practiced.length){
    practiced.sort(function(a, b){
      if (stats[a].lastAt !== stats[b].lastAt) return stats[a].lastAt - stats[b].lastAt;
      return MODULE_ORDER.indexOf(a) - MODULE_ORDER.indexOf(b);
    });
    return practiced[0];
  }
  var fallback = planModuleForWeek(week, phase);
  if (exclude[fallback]){
    var alt = MODULE_ORDER.filter(function(m){ return !exclude[m]; });
    if (alt.length) fallback = alt[0];
  }
  return fallback;
}
function buildDrillTask(moduleId, pool, records, today, prevIds){
  records = records || {};
  var def = moduleDef(moduleId);
  var entries = ((pool && pool[moduleId]) || []).filter(function(e){ return e.available; });
  var prev = prevIds || {};
  var chosen = [], sources = {}, taken = {};
  function take(e, src){
    var qid = e.paperId + ':' + e.no;
    if (taken[qid] || chosen.length >= def.size) return false;
    taken[qid] = 1; sources[qid] = src; chosen.push(e);
    return true;
  }
  function isPrev(e){ return !!prev[e.paperId + ':' + e.no]; }
  function answerOf(e){
    var rec = records['exam:' + e.paperId];
    return (rec && rec.answers) ? rec.answers[e.no] : null;
  }
  function isRight(e){ var a = answerOf(e); return !!(a && normalizeAnswer(a) === e.answer); }
  function isWrong(e){ var a = answerOf(e); return !!(a && normalizeAnswer(a) !== e.answer); }
  var primary = entries.filter(function(e){ return e.tier !== 'other'; });
  primary.filter(function(e){ return !isPrev(e) && !isRight(e); }).forEach(function(e){ take(e, 'pool'); });
  primary.filter(function(e){ return !isPrev(e) && isRight(e); }).forEach(function(e){ take(e, 'pool'); });
  if (chosen.length < def.size) entries.filter(isWrong).forEach(function(e){ take(e, 'wrong'); });
  var task = { kind:'module', moduleId:moduleId, questionIds:[], sources:{}, size:def.size,
    limitMs:def.limitMs, startedAt:today, deadlineAt:today + def.limitMs, overdue:{}, answered:{},
    index:0, status:'active', completedAt:0, warned:false, timedOut:false };
  chosen.forEach(function(e){
    var qid = e.paperId + ':' + e.no;
    task.questionIds.push(qid); task.sources[qid] = sources[qid];
  });
  return task;
}
function startDrillClock(task, now){
  if (!task) return { startedAt:0, deadlineAt:0 };
  if (task.startedAt) return { startedAt:task.startedAt, deadlineAt:task.deadlineAt || 0 };
  return { startedAt:now, deadlineAt:now + (task.limitMs || 0) };
}
function drillTimeLeft(task, now){
  if (!task) return 0;
  if (!task.deadlineAt) return task.limitMs || 0;
  return task.deadlineAt - now;
}
function drillShouldPrompt(task, now, inReview){
  if (!task || task.status === 'completed' || inReview) return false;
  if (!task.deadlineAt || now < task.deadlineAt) return false;
  if (!task.startedAt || now - task.startedAt < 1000) return false;
  return true;
}
function drillIsOverdue(task, now, inReview){
  return !!(task && task.deadlineAt && now >= task.deadlineAt && !inReview);
}
function markDrillOverdue(task, qid){
  if (!task) return null;
  var overdue = {}, prior = task.overdue || {};
  Object.keys(prior).forEach(function(key){ overdue[key] = prior[key]; });
  overdue[qid] = 1;
  return { overdue:overdue };
}
function summarizeDrill(task, answers, answerRules, reasons, finishedAt){
  if (!task) return null;
  var ids = task.questionIds || [];
  var answered = 0, right = 0, overdueAnswered = 0, overdueRight = 0;
  var tally = {}, unmarked = 0, paperIds = {};
  answers = answers || {};
  answerRules = answerRules || {};
  reasons = reasons || {};
  ids.forEach(function(qid){
    var s = String(qid), colon = s.indexOf(':');
    var paperId = s.slice(0, colon);
    paperIds[paperId] = 1;
    var sel = answers[qid];
    var overdue = !!(task.overdue && task.overdue[qid]);
    if (!sel){
      if (overdue) overdueAnswered++;
      return;
    }
    answered++;
    var rule = answerRules[qid];
    var ok = !!(rule && normalizeAnswer(sel) === normalizeAnswer(rule.answer));
    if (ok) right++;
    if (overdue){
      overdueAnswered++;
      if (ok) overdueRight++;
    }
    if (!ok){
      var key = reasons[qid];
      if (key) tally[key] = (tally[key] || 0) + 1;
      else unmarked++;
    }
  });
  var usedMs = task.startedAt ? Math.max(0, finishedAt - task.startedAt) : 0;
  return {
    moduleId:task.moduleId, date:finishedAt, size:task.size || ids.length,
    answered:answered, right:right, usedMs:usedMs,
    overdueAnswered:overdueAnswered, overdueRight:overdueRight,
    tally:tally, unmarked:unmarked, paperIds:Object.keys(paperIds),
    questionIds:ids.slice()
  };
}

root.KaogongDrillDomain = {
  MODULE_ORDER:MODULE_ORDER, MODULE_DEFS:MODULE_DEFS, PLAN_PHASE_MODULES:PLAN_PHASE_MODULES,
  MODULE_POOL_PAPERS:MODULE_POOL_PAPERS, DOWNGRADE_GROUPS:DOWNGRADE_GROUPS,
  moduleDef:moduleDef, normalizeModule:normalizeModule, questionUsable:questionUsable,
  buildModulePool:buildModulePool, downgradePaperIds:downgradePaperIds, downgradeEntries:downgradeEntries,
  moduleStats:moduleStats,
  planModuleForWeek:planModuleForWeek, recommendModule:recommendModule, buildDrillTask:buildDrillTask,
  startDrillClock:startDrillClock, drillTimeLeft:drillTimeLeft, drillShouldPrompt:drillShouldPrompt,
  drillIsOverdue:drillIsOverdue, markDrillOverdue:markDrillOverdue, summarizeDrill:summarizeDrill
};
})(typeof window !== 'undefined' ? window : this);
