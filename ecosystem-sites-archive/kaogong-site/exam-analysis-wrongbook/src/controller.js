(function(root,factory){
  var common=typeof module==='object' && module.exports;
  var api=factory(common?require('./analysis-domain.js'):root.ExamAnalysisDomain,common?require('./record-analyzer.js'):root.ExamRecordAnalyzer,common?require('./local-store.js'):root.ExamAnalysisStore);
  if(common)module.exports=api;else root.ExamAnalysisController=api;
}(typeof window!=='undefined'?window:this,function(D,A,S){
  'use strict';
  function createController(options){
    options=options||{};var storage=options.storage;
    var loaded=S.load(storage), state=loaded.state, message=loaded.message, busy=false, persistedRaw=loaded.raw, conflict=false;
    var changed=typeof options.onChange==='function'?options.onChange:function(){};
    var execute=options.execute||function(snapshot){return A.analyzeSnapshot(snapshot);};
    function emit(){changed();}
    function commit(next){
      if(conflict){message='档案已在其他页面变动，请刷新后再继续操作。';emit();return {ok:false,message:message};}
      try{if(storage.getItem(S.KEY)!==persistedRaw){conflict=true;message='档案已在其他页面变动，请刷新后再继续操作。';emit();return {ok:false,message:message};}}catch(e){message='无法读取本地档案，操作未生效。';emit();return {ok:false,message:message};}
      var saved=S.save(storage,next);
      if(!saved.ok){message=saved.message;emit();return {ok:false,message:message};}
      state=next;persistedRaw=saved.raw;message='';emit();return {ok:true,message:''};
    }
    if(loaded.status==='recovered'){var recoverySaved=S.save(storage,state);if(!recoverySaved.ok)message=recoverySaved.message;else persistedRaw=recoverySaved.raw;}
    function mutate(action){
      if(!state)return {ok:false,message:message};
      try{return commit(action(state));}catch(e){message=e.message;emit();return {ok:false,message:message};}
    }
    async function start(command){
      if(!state)return {ok:false,message:message};
      if(busy)return {ok:false,message:'当前分析正在进行，请稍后再开始'};
      var begun;
      try{begun=D.beginAnalysis(state,{confirmed:command.confirmed,selection:D.selectMaterials(state,command.ids),key:command.key,runId:command.runId,at:new Date().toISOString()});}
      catch(e){message=e.message;emit();return {ok:false,message:message};}
      if(!begun.shouldExecute)return {ok:true,reused:true};
      var saved=commit(begun.state);if(!saved.ok)return saved;
      busy=true;emit();
      var snapshot=JSON.parse(JSON.stringify(state.runs.find(function(r){return r.id===begun.runId;}).snapshot));
      try{
        var outcome=await execute(snapshot);
        return mutate(function(current){return D.finishAnalysis(current,begun.runId,outcome,new Date().toISOString());});
      }catch(e){return mutate(function(current){return D.finishAnalysis(current,begun.runId,{status:'failed',message:'分析未能完成，请核对材料后重新开始。'},new Date().toISOString());});}
      finally{busy=false;emit();}
    }
    function reset(confirmed){
      if(confirmed!==true)return {ok:false,message:'请明确确认清空重建'};
      if(busy)return {ok:false,message:'请先取消当前分析，再重建档案'};
      return commit(D.createState());
    }
    return {
      getState:function(){return state?JSON.parse(JSON.stringify(state)):null;},
      getMessage:function(){return message;},isBusy:function(){return busy;},canWrite:function(){return !!state&&!conflict;},invalidate:function(){conflict=true;message='档案已在其他页面变动，请刷新后再继续操作。';emit();},
      add:function(m){return mutate(function(s){return D.addMaterial(s,m);});},
      edit:function(id,patch){return mutate(function(s){return D.editMaterial(s,id,patch);});},
      remove:function(id){return mutate(function(s){return D.removeMaterial(s,id);});},
      cancel:function(id){return mutate(function(s){return D.cancelAnalysis(s,id,new Date().toISOString());});},
      start:start,reset:reset,
      exportRaw:function(){try{return storage.getItem(S.KEY)||JSON.stringify(D.createState());}catch(e){return null;}}
    };
  }
  return {createController:createController};
}));
