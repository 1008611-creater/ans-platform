(function(root,factory){
  var domain=typeof module==='object' && module.exports ? require('./analysis-domain.js') : root.ExamAnalysisDomain;
  var api=factory(domain);
  if(typeof module==='object' && module.exports) module.exports=api;else root.ExamAnalysisStore=api;
}(typeof window!=='undefined' ? window : this,function(D){
  'use strict';
  var KEY='exam-analysis.local.v1', MAX_CHARS=4*1024*1024;
  function load(storage){
    var raw;
    try{raw=storage.getItem(KEY);}catch(e){return {status:'unavailable',state:null,message:'无法读取本地档案，请检查浏览器存储权限。'};}
    if(raw===null)return {status:'empty',state:D.createState(),raw:null,message:''};
    try{
      if(typeof raw!=='string' || raw.length>MAX_CHARS)throw new Error('文件过大');
      var recovered=D.recoverInterrupted(JSON.parse(raw));
      return {status:recovered.count ? 'recovered' : 'ready',state:recovered.state,raw:raw,message:recovered.count ? '上次分析因页面关闭而中断；已保留旧报告，请重新确认开始。' : ''};
    }catch(e){return {status:'corrupt',state:null,raw:raw,message:'本地档案损坏，已停止写入。请先下载原始档案，再选择清空重建。'};}
  }
  function save(storage,state){
    try{D.validateState(state);var raw=JSON.stringify(state);if(raw.length>MAX_CHARS)throw new Error('超出本地存储限制');storage.setItem(KEY,raw);return {ok:true,raw:raw,message:''};}
    catch(e){return {ok:false,message:'本地保存失败，操作未生效。请先导出档案，再清理浏览器空间。'};}
  }
  return {KEY:KEY,load:load,save:save};
}));
