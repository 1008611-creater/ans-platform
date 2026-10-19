(function(){
  'use strict';
  var D=window.ExamAnalysisDomain, selected=new Set(), known=new Set(), previews=new Map(), localFiles=new Map(), viewedReportId=null, uploading=false, lastNotice='';
  var V=window.ExamAnalysisView, materialFilter={query:'',subject:'all'}, companionRuns=new Map(), companionBaseline=false;
  var labels={xingce:'行测',shenlun:'申论'}, statusLabels={running:'分析中',succeeded:'已完成',failed:'失败',cancelled:'已取消',needs_review:'待核对'};
  function el(tag,cls,text){var node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
  function byId(id){return document.getElementById(id);}
  function clear(node){while(node.firstChild)node.removeChild(node.firstChild);}
  function button(text,cls,action){var b=el('button',cls,text);b.type='button';b.addEventListener('click',action);return b;}
  function randomId(prefix){var data=new Uint32Array(4);window.crypto.getRandomValues(data);return prefix+'-'+Array.from(data,function(n){return n.toString(16);}).join('-');}
  function show(message){lastNotice=message||'';byId('notice').textContent=lastNotice;byId('notice').hidden=!lastNotice;}
  var storage;
  try{storage=window.localStorage;}catch(e){storage={getItem:function(){throw e;},setItem:function(){throw e;}};}
  var controller=window.ExamAnalysisController.createController({storage:storage,onChange:function(){render();}});
  function currentView(){var key=window.location.hash.slice(1);return ['materials','report','knowledge','history'].indexOf(key)>=0?key:'materials';}
  function reportFor(state){return state.reports.find(function(r){return r.id===viewedReportId;})||D.currentReport(state);}
  function empty(parent,title,body){var box=el('div','empty');box.appendChild(el('strong','',title));box.appendChild(el('p','',body));parent.appendChild(box);}
  function sizeText(size){return size>=1024*1024?(size/1024/1024).toFixed(1)+' MB':Math.max(1,Math.round(size/1024))+' KB';}
  function renderMaterials(state){
    var list=byId('material-list');clear(list);
    state.materials.forEach(function(m){if(!known.has(m.id)){known.add(m.id);selected.add(m.id);}});
    var live=new Set(state.materials.map(function(m){return m.id;}));Array.from(selected).forEach(function(id){if(!live.has(id))selected.delete(id);});
    var report=D.currentReport(state), analyzed=report?report.inputSnapshot.materials:[];
    var visible=V.filterMaterials(state.materials,materialFilter);
    visible.forEach(function(m){
      var row=el('div','material-row'), check=el('input');check.type='checkbox';check.id='pick-'+m.id;check.checked=selected.has(m.id);
      check.addEventListener('change',function(){if(check.checked)selected.add(m.id);else selected.delete(m.id);render();var fresh=byId(check.id);if(fresh)fresh.focus();});
      var label=el('label');label.htmlFor=check.id;var fileIcon=el('span','file-icon '+m.kind,m.kind==='records'?'{}':m.kind==='image'?'▧':'PDF');fileIcon.setAttribute('aria-hidden','true');label.appendChild(fileIcon);label.appendChild(el('span','material-name',m.name));
      label.appendChild(el('span','material-meta',labels[m.subject]+' · '+(m.kind==='records'?'作答记录':m.kind==='image'?'照片 / 截图':'PDF')+' · '+sizeText(m.size)+' · 修订 '+m.revision));
      if(previews.has(m.id)){var img=el('img','preview');img.src=previews.get(m.id);img.alt='所选照片的本地预览';img.width=80;img.height=60;img.loading='lazy';label.appendChild(img);}
      else if(m.kind!=='records')label.appendChild(el('span','material-meta','原文件未持久保存；刷新后需要重新选择'));
      var done=analyzed.some(function(a){return a.id===m.id&&a.revision===m.revision;});
      row.appendChild(check);row.appendChild(label);row.appendChild(el('span','material-state'+(done?' done':''),done?'已纳入当前报告':'待分析'));
      row.appendChild(button('移出清单','remove-button',function(){var result=controller.remove(m.id);if(result.ok){if(previews.has(m.id))URL.revokeObjectURL(previews.get(m.id));previews.delete(m.id);localFiles.delete(m.id);show('已移出清单；已有报告保留，下一次开始时使用新的范围。');}else show(result.message);}));
      list.appendChild(row);
    });
    if(!state.materials.length)empty(list,'还没有材料','从上方添加练习，传完再开始分析。');
    else if(!visible.length)empty(list,'没有找到匹配的材料','试试其他名称或切换到「全部」，已选范围保持不变。');
    byId('list-count').textContent=String(state.materials.length);
    byId('filter-summary').textContent=state.materials.length?'显示 '+visible.length+' / '+state.materials.length+' 份 · 已选 '+selected.size+' 份'+(visible.length<state.materials.length?'（包含筛选隐藏的材料）':''):'';
    document.querySelectorAll('[data-filter]').forEach(function(n){n.setAttribute('aria-pressed',String(n.dataset.filter===materialFilter.subject));});
    byId('rail-report').textContent=report?'第 '+report.version+' 版':'尚未生成';byId('rail-runs').textContent=state.runs.length+' 次';
    byId('rail-count').textContent=String(state.materials.length);byId('selected-count').textContent=String(selected.size);
    byId('material-summary').textContent=state.materials.length+' 份材料 · '+D.pendingMaterialCount(state)+' 份尚未纳入当前报告'+(D.pendingRemovedCount(state)?' · '+D.pendingRemovedCount(state)+' 份移出变动待更新':'');
    byId('start-scope').textContent=selected.size?'已选择 '+selected.size+' 份。你点击开始时，才会执行。':'可以先上传，稍后再回来。';
    byId('start-button').disabled=!selected.size||controller.isBusy()||uploading||!controller.canWrite();byId('choose-file').disabled=!controller.canWrite()||uploading;byId('file-input').disabled=!controller.canWrite()||uploading;
    byId('start-button').textContent=controller.isBusy()?'正在分析…':'开始分析';
    byId('select-all').disabled=!state.materials.length;
    byId('select-all').textContent=selected.size===state.materials.length&&state.materials.length?'取消全选':'全选';
    var active=state.runs.slice().reverse().find(function(r){return r.status==='running';});
    byId('cancel-button').hidden=!active;byId('cancel-button').dataset.runId=active?active.id:'';
  }
  function renderReport(state){
    var root=byId('report-content');clear(root);var report=reportFor(state);
    if(!report){var panel=el('div','panel');empty(panel,'报告会在分析成功后出现。','仅上传材料不会更新报告。先选择材料，再点击开始分析。');panel.appendChild(button('回到材料工作台','secondary',function(){location.hash='materials';}));root.appendChild(panel);return;}
    var data=report.data, head=el('div','panel report-section'), headRow=el('div','report-head');
    headRow.appendChild(el('h2','','学习报告 · 第 '+report.version+' 版'));
    headRow.appendChild(button('下载此版数据','secondary',function(){download('学习报告-v'+report.version+'.json',JSON.stringify(report,null,2));}));head.appendChild(headRow);
    head.appendChild(el('p','scope-note','生成于 '+new Date(report.at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})+' · 本地记录分析 · '+report.inputSnapshot.materials.length+' 份选中材料'));
    head.appendChild(el('p','scope-note',(report.id===state.currentReportId?'当前有效报告':'正在查看历史报告')+'；未选材料不纳入本版，后续上传不会自动改变它。'));if(D.pendingRemovedCount(state))head.appendChild(el('p','scope-note','清单已有 '+D.pendingRemovedCount(state)+' 份材料移出；本报告保留开始时的范围，下一次分析后才更新。'));root.appendChild(head);
    var metrics=el('div','metric-grid');
    [[data.observations.length,'本版作答记录','只统计上传且通过格式核对的记录'],[report.inputSnapshot.materials.length,'本版材料','开始时固定的材料版本'],[D.pendingMaterialCount(state),'待分析材料','仍由你决定何时更新']].forEach(function(item){var m=el('div','metric');m.appendChild(el('span','',item[1]));m.appendChild(el('strong','',String(item[0])));m.appendChild(el('small','',item[2]));metrics.appendChild(m);});root.appendChild(metrics);
    var visual=el('div','evidence-bars report-section');
    data.subjectSummaries.forEach(function(s){var card=el('article','evidence-bar'),line=el('div','evidence-bar-title');line.appendChild(el('h3','',labels[s.subject]));var knownCount=s.subject==='xingce'?s.judged:s.attempts,value=s.subject==='xingce'?s.correct:s.withFeedback;line.appendChild(el('span','',s.subject==='xingce'?'可判题正确率':'已有反馈覆盖'));card.appendChild(line);
      var result=el('div','evidence-bar-value');result.appendChild(el('strong','',knownCount?Math.round(value/knownCount*100)+'%':'—'));result.appendChild(el('span','',s.subject==='xingce'?value+' 答对 / '+s.judged+' 可判':value+' 有反馈 / '+s.attempts+' 条记录'));card.appendChild(result);
      if(knownCount){var progress=el('progress');progress.max=knownCount;progress.value=value;progress.setAttribute('aria-label',labels[s.subject]+(s.subject==='xingce'?'可判题正确率':'反馈覆盖率'));card.appendChild(progress);}else card.appendChild(el('p','muted','补充可靠答案或课程反馈后可查看。'));card.appendChild(el('small','',s.subject==='xingce'?'本版可判记录的表现，不代表整卷成绩。':'反馈覆盖情况，不代表申论得分。'));visual.appendChild(card);});root.appendChild(visual);
    var section=el('div','panel report-section');section.appendChild(el('h2','','当前表现 · 按科目'));var wrap=el('div','table-wrap'),table=el('table','data-table'),thead=el('thead'),tr=el('tr');
    ['科目','记录数','可判 / 已有反馈','当前正确率','未见题表现','已记录平均用时'].forEach(function(t){tr.appendChild(el('th','',t));});thead.appendChild(tr);table.appendChild(thead);var tbody=el('tbody');
    data.subjectSummaries.forEach(function(s){var row=el('tr');[labels[s.subject],s.attempts,s.subject==='xingce'?s.judged+' 可判 / '+s.pending+' 待判':s.withFeedback+' 有反馈 / '+s.pending+' 待评',s.subject==='xingce'&&s.accuracy!==null?Math.round(s.accuracy*100)+'%（'+s.correct+'/'+s.judged+'）':'暂无可判数据',s.subject==='xingce'&&s.unseenJudged?s.unseenCorrect+'/'+s.unseenJudged:'暂无记录',s.averageSeconds===null?'未记录':s.averageSeconds+' 秒（'+s.timedAttempts+' 条）'].forEach(function(t){row.appendChild(el('td','',String(t)));});tbody.appendChild(row);});table.appendChild(tbody);wrap.appendChild(table);section.appendChild(wrap);
    var subjectCards=el('div','subject-cards');
    data.subjectSummaries.forEach(function(s){var card=el('article','subject-card');card.appendChild(el('h3','',labels[s.subject]));var fields=s.subject==='xingce'?[['记录数',s.attempts],['可判 / 待判',s.judged+' / '+s.pending],['当前正确率',s.accuracy===null?'暂无可判数据':Math.round(s.accuracy*100)+'%（'+s.correct+'/'+s.judged+'）'],['未见题表现',s.unseenJudged?s.unseenCorrect+'/'+s.unseenJudged:'暂无记录']]:[['记录数',s.attempts],['已有反馈',s.withFeedback],['待反馈',s.pending]];
      fields.push(['已记录平均用时',s.averageSeconds===null?'未记录':s.averageSeconds+' 秒（'+s.timedAttempts+' 条）']);
      fields.forEach(function(f){var line=el('p');line.appendChild(el('span','',f[0]));line.appendChild(el('strong','',String(f[1])));card.appendChild(line);});subjectCards.appendChild(card);});section.appendChild(subjectCards);
    var limits=el('ul','limitation-list');data.limitations.forEach(function(t){limits.appendChild(el('li','',t));});section.appendChild(limits);root.appendChild(section);
    var forecast=el('div','forecast-grid report-section');[['成绩展望',data.forecasts.score.reason],['唐山竞争位置',data.forecasts.rank.reason],['命理分析',data.metaphysics.reason]].forEach(function(item){var box=el('div','forecast');box.appendChild(el('h3','',item[0]));box.appendChild(el('strong','','待接入 / 依据不足'));box.appendChild(el('p','',item[1]));forecast.appendChild(box);});root.appendChild(forecast);
    var questions=el('div','panel report-section');questions.appendChild(el('h2','','逐题证据与下一步'));questions.appendChild(el('p','muted','这一步汇总你已有的证据；错因的理解仍需回到原解析与作答。'));
    data.observations.forEach(function(o){var details=el('details','diagnosis'),sum=el('summary','',labels[o.subject]+' · '+o.module+' · '+o.questionNo+' 题 · '+({correct:'答对，待验证稳定性',incorrect:'答错，需复练',unjudged:'待判',has_feedback:'已有反馈',awaiting_feedback:'待评'}[o.status]));details.appendChild(sum);details.appendChild(el('p','','原资料：'+o.source));
      if(o.subject==='xingce'){details.appendChild(el('p','finding','本人答案：'+(o.answer||'未提供')+'；参考答案：'+(o.referenceAnswer||'未提供')));details.appendChild(el('p','','答案出处：'+(o.referenceSource||'未提供，不能判分')));}else{o.feedback.forEach(function(f){details.appendChild(el('p','finding',f.dimension+'：'+f.finding));details.appendChild(el('p','','反馈出处：'+f.source));});}
      details.appendChild(el('p','finding','下一步：'+o.nextAction));questions.appendChild(details);});root.appendChild(questions);
  }
  function renderKnowledge(state){
    var root=byId('knowledge-content');clear(root);var report=reportFor(state),panel=el('div','panel');panel.appendChild(el('h2','','知识地图 · 从作答证据开始'));panel.appendChild(el('p','muted','当前按上传记录聚合到模块。课程进度与完整知识网尚未接入；没有观察到的知识点不记作已掌握。'));
    if(!report){empty(panel,'还没有可用的作答证据。','分析成功后，这里会显示记录涉及的模块。');root.appendChild(panel);return;}
    var origin=el('div','knowledge-origin');origin.appendChild(el('span','','本版作答证据'));origin.appendChild(el('strong','',report.data.observations.length+' 条记录'));panel.appendChild(origin);
    var grid=el('div','knowledge-grid');report.data.knowledgeNodes.forEach(function(n){var card=el('article','knowledge-card');card.appendChild(el('span','eyebrow',labels[n.subject]));card.appendChild(el('h3','',n.module));card.appendChild(el('span','knowledge-state',n.status));card.appendChild(el('p','',n.attempts+' 条记录'+(n.subject==='xingce'?' · '+n.incorrect+' 条已判错误':' · 按已有反馈核对')));var detail=el('details');detail.appendChild(el('summary','','查看关联证据'));var list=el('ul');n.evidence.forEach(function(e){list.appendChild(el('li','',e.questionNo+' 题 · '+e.source));});detail.appendChild(list);card.appendChild(detail);grid.appendChild(card);});panel.appendChild(grid);root.appendChild(panel);
  }
  function renderHistory(state){
    var root=byId('history-list');clear(root);
    if(!state.runs.length){empty(root,'还没有启动过分析。','上传不会产生分析记录，点击开始才会。');return;}
    state.runs.slice().reverse().forEach(function(run){var row=el('div','history-item'),top=el('div','history-top');top.appendChild(el('strong','','第 '+run.sequence+' 次 · '+run.snapshot.materials.length+' 份材料'));top.appendChild(el('span','history-status',statusLabels[run.status]));row.appendChild(top);row.appendChild(el('p','',new Date(run.at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})));row.appendChild(el('p','',run.message||'分析中，已有报告保留'));row.appendChild(el('p','','材料版本：'+run.snapshot.materials.map(function(m){return m.name+'（修订 '+m.revision+'）';}).join('、')));var report=state.reports.find(function(r){return r.runId===run.id;});if(report)row.appendChild(button('查看第 '+report.version+' 版报告','text-button',function(){viewedReportId=report.id;location.hash='report';render();}));root.appendChild(row);});
  }
  // Presentation-only facts. Existing history is a baseline, never a replay queue.
  function updateCompanion(state){
    if(!companionBaseline){state.runs.forEach(function(run){companionRuns.set(run.id,run.status+'|'+run.published);});companionBaseline=true;return;}
    state.runs.forEach(function(run){
      var phase=run.status==='succeeded'&&!run.published?'settled':run.status;
      // Execution ended but its result could not be saved: do not leave the pet waiting.
      if(phase==='running'&&(companionRuns.get(run.id)==='failed|false'||(!controller.isBusy()&&controller.getMessage())))phase='failed';
      var signature=phase+'|'+run.published;if(companionRuns.get(run.id)===signature)return;companionRuns.set(run.id,signature);
      window.dispatchEvent(new window.CustomEvent('exam-analysis:companion',{detail:{phase:phase,runId:run.id}}));
    });
  }
  function render(){
    var state=controller.getState(),view=currentView(),meta=V.pageMeta(view);
    byId('page-title').textContent=meta.title;byId('page-description').textContent=meta.description;byId('breadcrumb-current').textContent=meta.title;document.title=meta.title+' · 练习回声';['materials','report','knowledge','history'].forEach(function(k){byId(k+'-view').hidden=k!==view;});
    document.querySelectorAll('[data-nav]').forEach(function(n){if(n.dataset.nav===view)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');});
    byId('storage-block').hidden=!!state;
    if(!state){byId('start-button').disabled=true;byId('choose-file').disabled=true;byId('file-input').disabled=true;show(controller.getMessage());return;}
    renderMaterials(state);renderReport(state);renderKnowledge(state);renderHistory(state);updateCompanion(state);
    if(controller.getMessage())show(controller.getMessage());
  }
  function readText(file){return new Promise(function(resolve,reject){var reader=new FileReader();reader.onload=function(){resolve(String(reader.result).replace(/^\uFEFF/,''));};reader.onerror=function(){reject(new Error('无法读取所选文件'));};reader.readAsText(file,'UTF-8');});}
  async function addFiles(files){
    if(!controller.getState()){show(controller.getMessage());return;}
    uploading=true;render();var count=0,errors=[];
    try{for(var i=0;i<files.length;i++){
      var file=files[i],kind,subject=byId('upload-subject').value;
      if(file.size>10*1024*1024){errors.push(file.name+' 超过10MB');continue;}
      if(/\.json$/i.test(file.name))kind='records';else if(/\.(jpe?g|png)$/i.test(file.name)&&['image/jpeg','image/png'].indexOf(file.type)>=0)kind='image';else if(/\.pdf$/i.test(file.name)&&file.type==='application/pdf')kind='pdf';else{errors.push(file.name+' 类型不支持');continue;}
      var state=controller.getState();if(state.materials.some(function(m){return m.name===file.name&&m.size===file.size&&m.subject===subject;})){errors.push(file.name+' 已在清单，请勿重复添加');continue;}
      var input={id:randomId('m'),name:file.name,subject:subject,kind:kind,size:file.size};if(kind==='records')input.rawText=await readText(file);
      var result=controller.add(input);if(!result.ok){errors.push(result.message);continue;}count++;localFiles.set(input.id,file);if(kind==='image')previews.set(input.id,URL.createObjectURL(file));
    }}catch(e){errors.push(e.message||'文件读取失败');}
    finally{uploading=false;render();show('已添加 '+count+' 份材料，尚未开始分析。'+(errors.length?' '+errors.join('；'):''));byId('file-input').value='';}
  }
  function download(name,text){var url=URL.createObjectURL(new Blob([text],{type:'application/json;charset=utf-8'})),a=el('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);}
  function exportArchive(){var raw=controller.exportRaw();if(raw===null){show('无法读取档案，暂时不能导出。');return;}download('练习回声-本地档案.json',raw);}
  function resetArchive(){if(window.confirm('确认清空本地材料记录、报告和分析历史？建议先导出档案。')){var result=controller.reset(true);if(result.ok){previews.forEach(function(url){URL.revokeObjectURL(url);});previews.clear();localFiles.clear();selected.clear();known.clear();viewedReportId=null;render();show('本地档案已重建。');}else show(result.message);}}
  byId('choose-file').addEventListener('click',function(){byId('file-input').click();});byId('file-input').addEventListener('change',function(event){addFiles(Array.from(event.target.files));});
  var drop=byId('drop-zone');drop.addEventListener('dragover',function(e){e.preventDefault();drop.classList.add('dragging');});drop.addEventListener('dragleave',function(){drop.classList.remove('dragging');});drop.addEventListener('drop',function(e){e.preventDefault();drop.classList.remove('dragging');addFiles(Array.from(e.dataTransfer.files));});
  byId('material-search').addEventListener('input',function(e){materialFilter.query=e.target.value;var state=controller.getState();if(state)renderMaterials(state);});
  document.querySelectorAll('[data-filter]').forEach(function(n){n.addEventListener('click',function(){materialFilter.subject=n.dataset.filter;var state=controller.getState();if(state)renderMaterials(state);});});
  byId('select-all').addEventListener('click',function(){var state=controller.getState();if(!state)return;if(selected.size===state.materials.length)selected.clear();else state.materials.forEach(function(m){selected.add(m.id);});render();});
  byId('start-button').addEventListener('click',async function(){show('');var result=await controller.start({confirmed:true,ids:Array.from(selected),key:randomId('click'),runId:randomId('run')});if(!result.ok){show(result.message);return;}var state=controller.getState(),run=state.runs[state.runs.length-1];show(run.message);if(run.published){viewedReportId=null;location.hash='report';}else location.hash='history';render();});
  byId('cancel-button').addEventListener('click',function(){var result=controller.cancel(byId('cancel-button').dataset.runId);show(result.ok?'本次分析已取消，旧报告保留。':result.message);});
  byId('export-archive').addEventListener('click',exportArchive);byId('recover-export').addEventListener('click',exportArchive);byId('reset-archive').addEventListener('click',resetArchive);byId('recover-reset').addEventListener('click',resetArchive);
  byId('download-example').addEventListener('click',function(){var subject=byId('upload-subject').value;var data={schemaVersion:1,subject:subject,records:subject==='xingce'?[{questionNo:'合成示例-1',module:'资料分析',source:'合成示例，不代表真实答题数据',answer:'A',referenceAnswer:'B',referenceSource:'合成参考答案，仅说明文件格式',durationSeconds:65,seenBefore:false}]:[{questionNo:'合成示例-1',module:'概括',source:'合成材料，不代表真实答卷',feedback:[{dimension:'要点覆盖',finding:'合成批注：遗漏主体',source:'合成反馈，仅说明文件格式'}]}]};download(subject+'-合成格式示例.json',JSON.stringify(data,null,2));});
  window.addEventListener('hashchange',render);window.addEventListener('storage',function(event){if(event.key===window.ExamAnalysisStore.KEY)controller.invalidate();});
  render();if(controller.getMessage())show(controller.getMessage());
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./analysis-sw.js').catch(function(){show('离线缓存未能启用；已保存的档案仍保留在本设备。');});
}());
