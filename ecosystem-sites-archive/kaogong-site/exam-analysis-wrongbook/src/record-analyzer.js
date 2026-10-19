(function (root, factory) {
  var api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.ExamRecordAnalyzer=api;
}(typeof window!=='undefined' ? window : this, function () {
  'use strict';
  function must(ok,message){if(!ok)throw new Error(message);}
  function field(value,label,max){must(typeof value==='string' && value.trim().length>0 && value.length<=max,label+'不能为空或过长');return value.trim();}
  function optionalText(value,label,max){return value===undefined || value===null || value==='' ? null : field(value,label,max);}
  function parseSheet(material){
    var sheet;
    try{sheet=JSON.parse(material.rawText);}catch(e){throw new Error(material.name+'：JSON格式不正确');}
    must(sheet && sheet.schemaVersion===1 && ['xingce','shenlun'].indexOf(sheet.subject)>=0,'作答记录版本或科目不正确');
    must(sheet.subject===material.subject,'记录科目与材料选择不一致');
    must(Array.isArray(sheet.records) && sheet.records.length>0 && sheet.records.length<=200,'每份材料需要1到200条作答记录');
    var seen=new Set();
    return sheet.records.map(function(r){
      must(r && typeof r==='object','作答记录格式不正确');
      var o={materialId:material.id,subject:sheet.subject,questionNo:field(r.questionNo,'题号',80),module:field(r.module,'模块',80),source:field(r.source,'原资料位置',400),status:'unjudged'};
      o.attemptId=optionalText(r.attemptId,'作答轮次',80);var attemptKey=o.source+'\n'+o.questionNo+'\n'+(o.attemptId||'');must(!seen.has(attemptKey),'同一资料位置与题号重复；不同次作答请区分练习轮次');seen.add(attemptKey);
      if(r.durationSeconds===undefined || r.durationSeconds===null) o.durationSeconds=null;
      else{must(Number.isFinite(r.durationSeconds) && r.durationSeconds>0 && r.durationSeconds<=14400,'作答耗时必须大于0且不超过4小时');o.durationSeconds=r.durationSeconds;}
      must(r.seenBefore===undefined || r.seenBefore===null || typeof r.seenBefore==='boolean','是否见过题目须为是、否或未知');
      o.seenBefore=r.seenBefore===undefined ? null : r.seenBefore;
      if(sheet.subject==='xingce'){
        o.answer=optionalText(r.answer,'本人答案',80);o.referenceAnswer=optionalText(r.referenceAnswer,'参考答案',80);o.referenceSource=optionalText(r.referenceSource,'参考答案出处',400);
        if(o.answer && o.referenceAnswer && o.referenceSource) o.status=o.answer.trim().toUpperCase()===o.referenceAnswer.trim().toUpperCase() ? 'correct' : 'incorrect';
        o.nextAction=o.status==='incorrect' ? '先核对原解析，再遮住答案重做；随后用未见同类题验证。' : o.status==='correct' ? '用未见同类题与延迟重做验证，当前答对不等于稳定掌握。' : '补充本人答案及可靠参考答案出处后再判断。';
      }else{
        must(r.feedback===undefined || (Array.isArray(r.feedback) && r.feedback.length<=12),'申论反馈维度格式不正确');
        o.feedback=(r.feedback||[]).map(function(f){return {dimension:field(f.dimension,'反馈维度',80),finding:field(f.finding,'已有反馈',1000),source:field(f.source,'反馈出处',400)};});
        o.status=o.feedback.length ? 'has_feedback' : 'awaiting_feedback';
        o.nextAction=o.feedback.length ? '回到已有批注对应的材料与作答，改写后请原批改渠道核对。' : '补齐材料、作答与课程或老师反馈；当前不生成阅卷分数。';
      }
      return o;
    });
  }
  function summary(subject,observations){
    var items=observations.filter(function(o){return o.subject===subject;}), timed=items.filter(function(o){return o.durationSeconds!==null;});
    var s={subject:subject,attempts:items.length,timedAttempts:timed.length,averageSeconds:timed.length ? Math.round(timed.reduce(function(sum,o){return sum+o.durationSeconds;},0)/timed.length*10)/10 : null};
    if(subject==='xingce'){
      var judged=items.filter(function(o){return o.status==='correct' || o.status==='incorrect';}), unseen=judged.filter(function(o){return o.seenBefore===false;});
      s.judged=judged.length;s.correct=judged.filter(function(o){return o.status==='correct';}).length;s.pending=items.length-s.judged;
      s.unseenJudged=unseen.length;s.unseenCorrect=unseen.filter(function(o){return o.status==='correct';}).length;
      s.accuracy=s.judged ? s.correct/s.judged : null;
    }else{s.withFeedback=items.filter(function(o){return o.status==='has_feedback';}).length;s.pending=items.length-s.withFeedback;}
    return s;
  }
  function analyzeSnapshot(snapshot){
    try{
      must(snapshot && Array.isArray(snapshot.materials) && snapshot.materials.length>0,'本次没有材料');
      var missing=snapshot.materials.filter(function(m){return m.kind!=='records';});
      if(missing.length) return {status:'needs_review',message:'照片/PDF识别尚未接入，无法读取作答。请暂时选择已确认的作答记录；本次不更新报告。'};
      var observations=[];
      snapshot.materials.forEach(function(m){observations=observations.concat(parseSheet(m));});
      var unique=[], attempts=new Map(), duplicateCount=0;
      observations.forEach(function(o){var key=JSON.stringify([o.subject,o.source,o.questionNo,o.attemptId]), comparable=Object.assign({},o);delete comparable.materialId;var fingerprint=JSON.stringify(comparable);
        if(attempts.has(key)){must(attempts.get(key)===fingerprint,'同次作答记录存在冲突；不同次复练请标注练习轮次');duplicateCount++;}else{attempts.set(key,fingerprint);unique.push(o);}});
      observations=unique;must(observations.length<=2000,'单次最多分析2000条作答记录');
      var nodes=[];
      observations.forEach(function(o){
        var node=nodes.find(function(n){return n.subject===o.subject && n.module===o.module;});
        if(!node){node={subject:o.subject,module:o.module,status:'待验证',attempts:0,incorrect:0,evidence:[]};nodes.push(node);}
        node.attempts++;if(o.status==='incorrect'){node.incorrect++;node.status='需复练';}
        node.evidence.push({materialId:o.materialId,questionNo:o.questionNo,source:o.source});
      });
      return {status:'succeeded',reportData:{schemaVersion:1,analysisVersion:'local-records-1',materialIds:snapshot.materials.map(function(m){return m.id;}),
        subjectSummaries:['xingce','shenlun'].filter(function(subject){return observations.some(function(o){return o.subject===subject;});}).map(function(subject){return summary(subject,observations);}),
        observations:observations,knowledgeNodes:nodes,
        limitations:['没有区分练习轮次的重复记录会合并；不同次复练请标注练习轮次。本次合并 '+duplicateCount+' 条重复记录。','只汇总本次选中的作答记录；未上传部分没有被观察。','记录中的答案出处和反馈来源由用户提供，尚未逐条独立核验。','正确率只针对可判记录；仅上传错题时不能代表整卷或总体水平。','未见题标记由用户提供；当前没有等难新题对照或延迟复测，不能判断稳定掌握。'],
        forecasts:{score:{status:'unavailable',reason:'缺少可比完整限时模考、考试权重与校准数据。'},rank:{status:'unavailable',reason:'尚未接入对应年度、岗位及范围一致的官方竞争数据。'}},
        metaphysics:{status:'not_connected',reason:'正式命理分析保留为完整报告类别，当前尚未接入排盘与解释流程。'}}};
    }catch(e){return {status:'failed',message:e.message || '记录分析失败，请核对输入。'};}
  }
  return {analyzeSnapshot:analyzeSnapshot};
}));
