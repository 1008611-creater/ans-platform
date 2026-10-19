(function(){
 'use strict';var root=document.getElementById('bunny-companion');if(!root||!window.ExamBunnyMotion)return;
 var B=window.ExamBunnyMotion,s=B.create(),canvas=document.getElementById('bunny-canvas'),image=document.getElementById('bunny-static'),body=document.getElementById('bunny-body'),status=document.getElementById('bunny-status'),toggle=document.getElementById('bunny-expand'),quiet=document.getElementById('bunny-quiet'),retry=document.getElementById('bunny-retry');
 var actions=root.querySelectorAll('[data-bunny-action]'),prefKey='exam-analysis-bunny-v1',expanded=true,visible=true,pageActive=true,instance=null,props={},loading=false,ready=false,frame=0,last=0,hover=0,head=false,petCooldown=0,lastClick=-Infinity,announced=-1,loadEpoch=0,waiting=false,currentRun=null,completedRuns=new Set(),phaseNotice='';
 var media=window.matchMedia('(prefers-reduced-motion: reduce)');
 try{var pref=JSON.parse(localStorage.getItem(prefKey)||'null');if(pref&&typeof pref==='object'){expanded=pref.collapsed!==true;B.setQuiet(s,pref.quiet===true);}}catch(e){/* Ignore only companion preferences; never touch study records. */}
 B.setReduced(s,media.matches);
 function save(){try{localStorage.setItem(prefKey,JSON.stringify({version:1,quiet:s.quiet,collapsed:!expanded}));}catch(e){status.textContent='陪伴偏好暂时无法保存，本次设置仍然有效。';}}
 function apply(){var pose=B.pose(s);Object.keys(pose).forEach(function(name){if(props[name])props[name].value=pose[name];});root.dataset.action=String(s.action);}
 function wording(){if(s.reduced)return '跟随系统减少动态效果，兔兔安静陪你。';if(s.quiet)return '安静陪你，需要互动时再唤醒。';if(waiting)return '正在分析这次材料，兔兔安静陪你等结果。';if(phaseNotice)return phaseNotice;if(!ready)return loading?'兔兔正在准备和你互动…':'动效暂时没加载出来，原图仍然陪着你。';return ['陪着你 · 靠近会看你','在认真看你','摸摸头，蹭蹭你','向你挥挥爪','为你开心！','眯一会儿，回来就醒'][s.action];}
 function describe(){status.textContent=wording();announced=s.action;actions.forEach(function(button){button.disabled=!ready||s.quiet||s.reduced||s.paused;button.setAttribute('aria-pressed',String(Number(button.dataset.bunnyAction)===s.action));});quiet.setAttribute('aria-pressed',String(s.quiet));quiet.textContent=s.quiet?'唤醒兔兔':'安静陪伴';root.dataset.motion=(s.quiet||s.reduced||s.paused)?'stopped':'enabled';}
 function tick(now){frame=0;if(s.paused||s.quiet||s.reduced||!ready)return;var dt=last?Math.min((now-last)/1000,.05):1/60;last=now;petCooldown=Math.max(0,petCooldown-dt);if(head){hover+=dt;if(hover>.42&&petCooldown===0&&B.request(s,2)){petCooldown=3;hover=0;}}else hover=0;B.step(s,dt);apply();if(announced!==s.action)describe();frame=requestAnimationFrame(tick);}
 function sync(){var paused=!expanded||!visible||!pageActive||document.hidden||waiting;if(paused&&!s.paused){B.reset(s);head=false;hover=0;lastClick=-Infinity;}B.setPaused(s,paused);body.hidden=!expanded;toggle.setAttribute('aria-expanded',String(expanded));toggle.textContent=expanded?'收起':'展开';var stopped=s.paused||s.quiet||s.reduced||!ready;
  if(frame){cancelAnimationFrame(frame);frame=0;}last=0;apply();canvas.hidden=stopped;image.hidden=!stopped;
  if(instance){if(stopped)instance.pause();else{instance.play();frame=requestAnimationFrame(tick);}}
  describe();if(expanded&&!s.quiet&&!s.reduced&&!ready&&!loading)load();
 }
 function script(){if(window.rive)return Promise.resolve();return new Promise(function(resolve,reject){var node=document.createElement('script');node.src='./vendor/rive/rive.js';node.onload=resolve;node.onerror=function(){node.remove();reject(new Error('runtime load failed'));};document.head.appendChild(node);});}
 function load(){loading=true;retry.hidden=true;describe();var epoch=++loadEpoch,timer=setTimeout(failed,12000);
  function failed(){if(epoch!==loadEpoch)return;loadEpoch++;clearTimeout(timer);loading=false;ready=false;if(instance){instance.cleanup();instance=null;}props={};root.dataset.renderer='static';canvas.hidden=true;image.hidden=false;retry.hidden=false;describe();}
  script().then(function(){if(epoch!==loadEpoch)return;window.rive.RuntimeLoader.setWasmUrl('./vendor/rive/rive.wasm');window.rive.RuntimeLoader.setWasmFallbackUrl(null);
   instance=new window.rive.Rive({src:'./assets/bunny/rabbit.riv',canvas:canvas,artboard:'Rabbit Web Rig',stateMachine:'Rabbit Web Rig',enableRiveAssetCDN:false,autoplay:true,autoBind:true,shouldDisableRiveListeners:true,layout:new window.rive.Layout({fit:window.rive.Fit.Contain,alignment:window.rive.Alignment.Center}),onLoad:function(){if(epoch!==loadEpoch)return;
    try{var vm=instance.viewModelInstance;if(!vm)throw new Error('missing view model');Object.keys(B.pose(s)).forEach(function(name){var p=vm.number(name);if(!p)throw new Error('missing pose binding');props[name]=p;});clearTimeout(timer);loading=false;ready=true;root.dataset.renderer='rive';instance.resizeDrawingSurfaceToCanvas(Math.min(window.devicePixelRatio||1,2));sync();}catch(e){failed();}},onLoadError:failed});
  }).catch(failed);
 }
 function act(n){if(!ready||s.quiet||s.reduced||s.paused)return;phaseNotice='';B.reset(s);if(B.request(s,n)){hover=0;apply();describe();}}
 function point(event){var box=canvas.getBoundingClientRect();if(!box.width||!box.height)return null;var scale=Math.min(box.width/700,box.height/775),x=(event.clientX-box.left-(box.width-700*scale)/2)/scale,y=(event.clientY-box.top-(box.height-775*scale)/2)/scale;return {x:x,y:y};}
 function leave(){B.exit(s);head=false;hover=0;}
 canvas.addEventListener('pointermove',function(event){if(event.pointerType==='touch'||event.isPrimary===false)return;var p=point(event);if(!p)return;B.point(s,p.x,p.y);head=p.x>305&&p.x<535&&p.y>90&&p.y<200;});
 canvas.addEventListener('pointerleave',leave);canvas.addEventListener('pointercancel',leave);
 canvas.addEventListener('pointerdown',function(event){if(event.isPrimary===false||(typeof event.button==='number'&&event.button!==0))return;var p=point(event);if(!p)return;B.point(s,p.x,p.y);head=false;var now=performance.now();if(p.x>300&&p.x<535&&p.y>90&&p.y<215){act(2);lastClick=-Infinity;}else if(p.y>580&&p.y<725&&p.x>165&&p.x<555){act(3);lastClick=-Infinity;}else if(p.x>140&&p.x<655&&p.y>80&&p.y<730){if(now-lastClick<400)act(4);lastClick=now;}});
 canvas.addEventListener('pointerup',function(event){if(event.pointerType==='touch')leave();});
 root.addEventListener('keydown',function(event){if(event.target!==canvas)return;if(event.repeat){event.preventDefault();return;}if(event.key==='Enter'||event.key===' '){act(2);event.preventDefault();}else if(/^[1-5]$/.test(event.key)){act(Number(event.key));event.preventDefault();}else if(event.key==='Escape'){B.reset(s);leave();apply();describe();event.preventDefault();}});
 // Only transient presentation events, no study records or controller access.
 window.addEventListener('exam-analysis:companion',function(event){
  var detail=event.detail;if(!detail||typeof detail.runId!=='string'||!detail.runId||detail.runId.length>160)return;
  var phase=detail.phase,id=detail.runId;
  if(phase==='running'){
   if(completedRuns.has(id)||(waiting&&currentRun===id))return;
   currentRun=id;waiting=true;phaseNotice='';root.dataset.phase=phase;leave();sync();return;
  }
  if(['succeeded','failed','cancelled','needs_review','settled'].indexOf(phase)<0||!waiting||currentRun!==id||completedRuns.has(id))return;
  completedRuns.add(id);waiting=false;root.dataset.phase=phase;B.reset(s);leave();sync();
  if(phase==='succeeded'){act(4);phaseNotice='报告已更新，兔兔陪你看看下一步。';}
  else if(phase==='needs_review')phaseNotice='这次材料还需要核对，原来的报告保留着。';
  else if(phase==='failed')phaseNotice='这次分析没完成，先核对材料，再慢慢来。';
  else if(phase==='cancelled')phaseNotice='本次分析已取消，按你的节奏来。';
  else phaseNotice='这次分析已结束，当前报告保留着。';
  describe();
 });
 actions.forEach(function(button){button.addEventListener('click',function(){act(Number(button.dataset.bunnyAction));});});
 quiet.addEventListener('click',function(){B.setQuiet(s,!s.quiet);leave();save();sync();});toggle.addEventListener('click',function(){expanded=!expanded;leave();save();sync();});retry.addEventListener('click',function(){if(!loading)load();});
 function reduce(event){B.setReduced(s,event.matches);leave();sync();}if(media.addEventListener)media.addEventListener('change',reduce);else media.addListener(reduce);
 document.addEventListener('visibilitychange',function(){leave();sync();});window.addEventListener('pagehide',function(){pageActive=false;leave();sync();});window.addEventListener('pageshow',function(){pageActive=true;sync();});
 window.addEventListener('resize',function(){if(instance&&ready)instance.resizeDrawingSurfaceToCanvas(Math.min(window.devicePixelRatio||1,2));});
 if(window.IntersectionObserver)new window.IntersectionObserver(function(entries){visible=entries[0].isIntersecting;if(!visible)leave();sync();}).observe(root);
 root.dataset.renderer='static';root.dataset.phase='idle';sync();
}());
