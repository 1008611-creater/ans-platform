(function(){'use strict';
 window.ShanganMap={create:function(container,questions,onQuestion){
  if(!window.MindElixirLite||!container||!questions.length)return null;
  var topicIndex=new Map(),targets=new Map(),groups=new Map(),serial=0;
  var tree={id:'study-root',topic:'我的知识档案',root:true,children:[]};
  function next(){return 'study-node-'+(++serial);}
  questions.forEach(function(q){var subject=q.subject==='shenlun'?'申论':'行测',module=q.record.module||'待分类',key=subject+' · '+module;
   if(!groups.has(key)){var group={id:next(),topic:key,children:[],expanded:true};groups.set(key,group);tree.children.push(group);}
   var points=q.diagnosis&&q.diagnosis.knowledgePoints.length?q.diagnosis.knowledgePoints:[module];
   points.forEach(function(point){var tk=key+'|'+point;if(!topicIndex.has(tk)){var topic={id:next(),topic:String(point).slice(0,100),children:[],expanded:false};topicIndex.set(tk,topic);groups.get(key).children.push(topic);}
    var id=next();targets.set(id,q);topicIndex.get(tk).children.push({id:id,topic:'第'+q.record.questionNo+'题 · '+(q.confirmed?'已核对':'识别草稿'),tags:[q.record.stem.replace(/\s+/g,' ').slice(0,26)],expanded:false});
   });
  });
  var Mind=window.MindElixirLite.default,mind=new Mind({el:container,direction:window.MindElixirLite.RIGHT,editable:false,contextMenu:false,toolBar:false,keypress:false,allowUndo:false,overflowHidden:true,handleWheel:function(){},theme:{name:'Shangan',type:'light',palette:['#b52466','#b178a6','#aa7091','#9278b0','#c8917f'],cssVar:{'--main-color':'#482d41','--main-bgcolor':'#f8dfeb','--color':'#5f4757','--bgcolor':'#fffbfd'}}});
  var error=mind.init({nodeData:tree});if(error){mind.destroy();throw error;}
  var pointer=null;
  function down(e){pointer={x:e.clientX,y:e.clientY,id:e.pointerId};}
  function up(e){if(!pointer||pointer.id!==e.pointerId)return;var moved=Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>8;pointer=null;if(moved)return;var topic=e.target.closest('me-tpc');if(topic&&container.contains(topic)){var q=targets.get(String(topic.dataset.nodeid||'').slice(2));if(q)onQuestion(q);}}
  container.addEventListener('pointerdown',down);container.addEventListener('pointerup',up);
  mind.scaleFit();var zoom=1;
  return {destroy:function(){container.removeEventListener('pointerdown',down);container.removeEventListener('pointerup',up);mind.destroy();},fit:function(){mind.scaleFit();zoom=mind.scaleVal;},zoom:function(delta){zoom=Math.max(.2,Math.min(3,(mind.scaleVal||zoom)+delta));mind.scale(zoom);},expand:function(value){mind.expandNodeAll(mind.findEle('study-root'),value);mind.scaleFit();},svg:function(){return mind.exportSvg();},json:function(){return JSON.stringify(mind.getData(),null,2);}};
 }};
})();
