(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ExamAnalysisDomain = api;
}(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  var MAX_BYTES = 10 * 1024 * 1024;
  var STATUSES = ['running','succeeded','failed','cancelled','needs_review'];
  function must(ok, message) { if (!ok) throw new Error(message); }
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function text(value, label, max) { must(typeof value === 'string' && value.trim().length > 0 && value.length <= max, label + '不能为空或过长'); return value; }
  function id(value) { must(typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value), '编号格式不正确'); return value; }
  function instant(value) { must(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)), '时间格式不正确'); return value; }
  function material(value) {
    must(value && typeof value === 'object', '材料格式不正确');
    id(value.id); text(value.name, '材料名称', 240);
    must(['xingce','shenlun'].indexOf(value.subject) >= 0, '请选择行测或申论');
    must(['records','image','pdf'].indexOf(value.kind) >= 0, '材料类型不支持');
    must(Number.isInteger(value.size) && value.size >= 0 && value.size <= MAX_BYTES, '材料大小不能超过10MB');
    if (value.kind === 'records') must(typeof value.rawText === 'string' && value.rawText.length > 0 && value.rawText.length <= 500000, '记录文件大小或内容不正确');
    var result = {id:value.id,name:value.name,subject:value.subject,kind:value.kind,size:value.size,revision:value.revision || 1};
    must(Number.isInteger(result.revision) && result.revision >= 1, '材料修订号不正确');
    if (value.kind === 'records') result.rawText = value.rawText;
    return result;
  }
  function createState() { return {schemaVersion:1,materials:[],runs:[],reports:[],currentReportId:null,nextRunSequence:1}; }
  function findRun(state, runId) { var run = state.runs.find(function (r) { return r.id === runId; }); must(!!run, '分析运行不存在'); return run; }
  function currentReport(state) { return state.reports.find(function (r) { return r.id === state.currentReportId; }) || null; }
  function addMaterial(state, input) {
    must(state.materials.length < 100, '材料已达100份，请先整理清单');
    var added = material(input);
    must(!state.materials.some(function (m) { return m.id === added.id; }) && !state.runs.some(function (r) { return r.snapshot.materials.some(function (m) { return m.id === added.id; }); }), '材料编号重复');
    var next = copy(state); next.materials.push(added); return next;
  }
  function editMaterial(state, materialId, patch) {
    must(patch && Object.keys(patch).every(function (key) { return ['name','subject','rawText'].indexOf(key) >= 0; }), '材料修改含不支持的字段');
    var next = copy(state), index = next.materials.findIndex(function (m) { return m.id === materialId; });
    must(index >= 0, '材料不存在');
    var updated = Object.assign({}, next.materials[index], patch); updated.revision += 1;
    next.materials[index] = material(updated); return next;
  }
  function removeMaterial(state, materialId) {
    must(state.materials.some(function (m) { return m.id === materialId; }), '材料不存在');
    var next = copy(state); next.materials = next.materials.filter(function (m) { return m.id !== materialId; }); return next;
  }
  function selectMaterials(state, ids) {
    must(Array.isArray(ids), '请选择材料');
    must(new Set(ids).size === ids.length, '选择材料重复');
    return ids.map(function (materialId) {
      var item = state.materials.find(function (m) { return m.id === materialId; });
      must(!!item, '选择的材料不存在'); return {id:item.id,revision:item.revision};
    }).sort(function (a,b) { return a.id.localeCompare(b.id); });
  }
  function beginAnalysis(state, command) {
    must(command && command.confirmed === true, '请由用户确认开始分析');
    text(command.key, '启动确认编号', 160); id(command.runId); instant(command.at);
    must(Array.isArray(command.selection) && command.selection.length > 0 && command.selection.length <= 100, '请至少选择一份材料');
    var selection = command.selection.map(function (s) { id(s.id); must(Number.isInteger(s.revision) && s.revision >= 1, '材料版本不正确'); return {id:s.id,revision:s.revision}; }).sort(function (a,b) { return a.id.localeCompare(b.id); });
    must(new Set(selection.map(function (s) { return s.id; })).size === selection.length, '选择材料重复');
    var signature = JSON.stringify(selection), existing = state.runs.find(function (r) { return r.key === command.key; });
    if (existing) { must(existing.selectionSignature === signature, '确认编号不能重复使用于不同材料'); return {state:copy(state),runId:existing.id,shouldExecute:false}; }
    must(!state.runs.some(function (r) { return r.id === command.runId; }), '运行编号重复');
    must(state.runs.length < 50, '本地运行历史已达50次，请导出并整理档案');
    var snapshotMaterials = selection.map(function (s) {
      var item = state.materials.find(function (m) { return m.id === s.id; });
      must(!!item, '选择的材料不存在'); must(item.revision === s.revision, '材料已经变化，请重新确认范围'); return copy(item);
    });
    var next = copy(state);
    next.runs.push({id:command.runId,key:command.key,sequence:next.nextRunSequence,status:'running',published:false,selectionSignature:signature,at:command.at,finishedAt:null,message:'',snapshot:{schemaVersion:1,materials:snapshotMaterials}});
    next.nextRunSequence += 1;
    return {state:next,runId:command.runId,shouldExecute:true};
  }
  function validateReportData(data, snapshot) {
    must(data && data.schemaVersion === 1 && data.analysisVersion === 'local-records-1', '分析结果格式或版本不正确');
    var ids = snapshot.materials.map(function (m) { return m.id; }).sort();
    must(Array.isArray(data.materialIds) && JSON.stringify(data.materialIds.slice().sort()) === JSON.stringify(ids), '分析结果的材料范围不一致');
    must(Array.isArray(data.observations) && data.observations.length > 0 && data.observations.length <= 2000, '分析结果缺少作答证据');
    data.observations.forEach(function (o) {
      must(ids.indexOf(o.materialId) >= 0 && typeof o.source === 'string' && o.source.length > 0 && typeof o.questionNo === 'string', '分析结果含未知证据');
    });
    must(Array.isArray(data.subjectSummaries) && data.subjectSummaries.length>0 && data.subjectSummaries.length<=2 && Array.isArray(data.knowledgeNodes) && Array.isArray(data.limitations), '分析结果缺少汇总信息');
    data.observations.forEach(function(o){
      var sourceMaterial=snapshot.materials.find(function(m){return m.id===o.materialId;});
      must(sourceMaterial.kind==='records' && sourceMaterial.subject===o.subject,'证据科目或材料类型不符');
      text(o.questionNo,'题号',80);text(o.module,'模块',80);text(o.source,'原资料位置',400);text(o.nextAction,'下一步',1200);
      must(o.durationSeconds===null || (Number.isFinite(o.durationSeconds) && o.durationSeconds>0 && o.durationSeconds<=14400),'证据耗时不正确');
      must(o.seenBefore===null || typeof o.seenBefore==='boolean','是否见过的标记不正确');
      if(o.subject==='xingce'){
        must(['correct','incorrect','unjudged'].indexOf(o.status)>=0,'行测判断状态不正确');
        ['answer','referenceAnswer','referenceSource'].forEach(function(key){must(o[key]===null || typeof o[key]==='string','答案证据字段不正确');});
        if(o.status!=='unjudged')must(o.answer && o.referenceAnswer && o.referenceSource,'判分缺少答案或出处');
      }else{
        must(['has_feedback','awaiting_feedback'].indexOf(o.status)>=0 && Array.isArray(o.feedback) && o.feedback.length<=12,'申论反馈不正确');
        o.feedback.forEach(function(f){must(f && typeof f==='object','反馈格式不正确');text(f.dimension,'反馈维度',80);text(f.finding,'已有反馈',1000);text(f.source,'反馈出处',400);});
      }
    });
    must(new Set(data.subjectSummaries.map(function(s){return s && s.subject;})).size===data.subjectSummaries.length,'科目汇总重复');
    data.subjectSummaries.forEach(function(s){
      must(s && ['xingce','shenlun'].indexOf(s.subject)>=0,'科目汇总格式不正确');
      var records=data.observations.filter(function(o){return o.subject===s.subject;});
      must(Number.isInteger(s.attempts) && s.attempts===records.length && s.attempts>0 && Number.isInteger(s.timedAttempts) && s.timedAttempts>=0 && s.timedAttempts<=s.attempts,'作答或计时数量不正确');
      must(s.averageSeconds===null ? s.timedAttempts===0 : Number.isFinite(s.averageSeconds) && s.averageSeconds>0 && s.averageSeconds<=14400,'平均耗时不正确');
      must(Number.isInteger(s.pending) && s.pending>=0 && s.pending<=s.attempts,'待判数量不正确');
      if(s.subject==='xingce'){
        ['judged','correct','unseenJudged','unseenCorrect'].forEach(function(k){must(Number.isInteger(s[k]) && s[k]>=0 && s[k]<=s.attempts,'行测统计不正确');});
        must(s.correct<=s.judged && s.pending+s.judged===s.attempts && s.unseenCorrect<=s.unseenJudged && s.unseenJudged<=s.judged,'行测统计口径不正确');
        must(s.accuracy===null ? s.judged===0 : Number.isFinite(s.accuracy) && s.judged>0 && s.accuracy===s.correct/s.judged,'正确率口径不正确');
      }else must(Number.isInteger(s.withFeedback) && s.withFeedback>=0 && s.withFeedback+s.pending===s.attempts,'申论反馈数量不正确');
    });
    must(data.subjectSummaries.reduce(function(sum,s){return sum+s.attempts;},0)===data.observations.length,'科目汇总缺少记录');
    data.knowledgeNodes.forEach(function(n){
      must(n && ['xingce','shenlun'].indexOf(n.subject)>=0 && ['待验证','需复练'].indexOf(n.status)>=0,'知识节点不正确');text(n.module,'知识模块',80);
      must(Number.isInteger(n.attempts) && n.attempts>0 && Number.isInteger(n.incorrect) && n.incorrect>=0 && n.incorrect<=n.attempts && Array.isArray(n.evidence) && n.evidence.length===n.attempts,'知识节点缺少有效证据');
      n.evidence.forEach(function(e){must(e && data.observations.some(function(o){return o.materialId===e.materialId && o.questionNo===e.questionNo && o.source===e.source && o.subject===n.subject && o.module===n.module;}),'知识节点关联未知证据');});
    });
    must(data.limitations.length<=20,'结果说明数量不正确');data.limitations.forEach(function(s){text(s,'结果说明',2000);});
    must(data.forecasts && data.forecasts.score.status === 'unavailable' && data.forecasts.rank.status === 'unavailable', '当前本地分析不支持成绩或排名预测');
    must(data.metaphysics && data.metaphysics.status === 'not_connected', '当前尚未接入正式命理分析');
  }
  function finishAnalysis(state, runId, outcome, at) {
    var original = findRun(state, runId);
    if (original.status !== 'running') return copy(state);
    instant(at); must(outcome && ['succeeded','failed','needs_review'].indexOf(outcome.status) >= 0, '分析结束状态不正确');
    var next = copy(state), run = findRun(next,runId);
    if (outcome.status === 'succeeded') {
      validateReportData(outcome.reportData, run.snapshot);
      var latest = currentReport(next);
      run.status = 'succeeded'; run.finishedAt = at;
      if (latest && latest.version > run.sequence) { run.message = '本次完成较晚，已保留更新的报告'; return next; }
      var report = {id:'report-' + run.id,runId:run.id,version:run.sequence,at:at,inputSnapshot:copy(run.snapshot),data:copy(outcome.reportData)};
      next.reports.push(report); next.currentReportId = report.id; run.published = true;
      run.message = '分析完成，报告已更新'; return next;
    }
    run.status = outcome.status; run.finishedAt = at;
    run.message = text(outcome.message, '分析状态说明', 1200); return next;
  }
  function cancelAnalysis(state, runId, at) {
    var next=copy(state), run=findRun(next,runId); instant(at);
    if (run.status === 'running') { run.status='cancelled';run.finishedAt=at;run.message='本次分析已取消，旧报告保留'; }
    return next;
  }
  function pendingMaterialCount(state) {
    var report=currentReport(state), analyzed=report ? report.inputSnapshot.materials : [];
    return state.materials.filter(function (m) { return !analyzed.some(function (a) { return a.id===m.id && a.revision===m.revision; }); }).length;
  }
  function pendingRemovedCount(state) {
    var report=currentReport(state);return report ? report.inputSnapshot.materials.filter(function(a){return !state.materials.some(function(m){return m.id===a.id;});}).length : 0;
  }
  function validateState(state) {
    must(state && state.schemaVersion===1 && Array.isArray(state.materials) && Array.isArray(state.runs) && Array.isArray(state.reports), '档案结构不正确');
    must(state.materials.length<=100 && state.runs.length<=50 && state.reports.length<=50 && Number.isInteger(state.nextRunSequence) && state.nextRunSequence>=1, '档案数量或序号不正确');
    state.materials.forEach(material);
    must(new Set(state.materials.map(function(m){return m.id;})).size===state.materials.length, '档案材料编号重复');
    var highest=0;
    state.runs.forEach(function (r) {
      id(r.id);text(r.key,'确认编号',160);instant(r.at);
      must(STATUSES.indexOf(r.status)>=0 && Number.isInteger(r.sequence) && r.sequence>0 && typeof r.published==='boolean' && typeof r.message==='string' && r.message.length<=1200, '运行档案不正确');
      must(r.snapshot && r.snapshot.schemaVersion===1 && Array.isArray(r.snapshot.materials) && r.snapshot.materials.length>0 && r.snapshot.materials.length<=100, '运行快照不正确');
      r.snapshot.materials.forEach(material);
      var selected=r.snapshot.materials.map(function(m){return {id:m.id,revision:m.revision};}).sort(function(a,b){return a.id.localeCompare(b.id);});
      must(r.selectionSignature===JSON.stringify(selected), '运行选择与快照不符');
      must(new Set(selected.map(function(s){return s.id;})).size===selected.length,'快照材料编号重复');
      if(r.finishedAt!==null) instant(r.finishedAt);
      highest=Math.max(highest,r.sequence);
    });
    ['id','key','sequence'].forEach(function (field) { must(new Set(state.runs.map(function(r){return r[field];})).size===state.runs.length,'运行档案编号重复'); });
    must(state.nextRunSequence>highest,'档案序号发生冲突');
    state.reports.forEach(function (r) {
      instant(r.at);var run=findRun(state,r.runId);must(r.id==='report-'+run.id,'报告编号不正确');
      must(run.published && run.status==='succeeded' && r.version===run.sequence && JSON.stringify(r.inputSnapshot)===JSON.stringify(run.snapshot),'报告与运行不一致');
      validateReportData(r.data,r.inputSnapshot);
    });
    must(new Set(state.reports.map(function(r){return r.id;})).size===state.reports.length,'报告编号重复');
    must(state.currentReportId===null || !!currentReport(state),'当前报告不存在');
    var latest=state.reports.reduce(function(max,r){return Math.max(max,r.version);},0);
    must(!latest || (currentReport(state) && currentReport(state).version===latest),'当前报告版本不正确');
    return copy(state);
  }
  function recoverInterrupted(state) {
    var next=validateState(state), count=0;
    next.runs.forEach(function(r){if(r.status==='running'){r.status='failed';r.finishedAt=new Date().toISOString();r.message='上次页面关闭导致分析中断，请重新确认开始';count++;}});
    return {state:next,count:count};
  }
  return {createState:createState,addMaterial:addMaterial,editMaterial:editMaterial,removeMaterial:removeMaterial,selectMaterials:selectMaterials,beginAnalysis:beginAnalysis,finishAnalysis:finishAnalysis,cancelAnalysis:cancelAnalysis,currentReport:currentReport,pendingMaterialCount:pendingMaterialCount,pendingRemovedCount:pendingRemovedCount,validateState:validateState,recoverInterrupted:recoverInterrupted};
}));
