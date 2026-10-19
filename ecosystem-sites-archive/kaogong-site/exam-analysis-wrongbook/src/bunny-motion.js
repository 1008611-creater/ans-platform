(function(root,factory){'use strict';var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ExamBunnyMotion=api;}(typeof window==='object'?window:this,function(){
 'use strict';var durations=[0,2,1.65,1.9,2.6,3.2];
 function clamp(x,a,b){return Math.max(a,Math.min(b,x));}function pulse(t,d){return Math.sin(Math.PI*clamp(t/d,0,1));}
 function create(){return {action:0,elapsed:0,clock:0,idle:0,cooldown:0,quiet:false,reduced:false,paused:false,pointerX:350,pointerY:390,gazeX:0,gazeY:0,pointed:false};}
 function stopped(s){return s.quiet||s.reduced||s.paused;}
 function request(s,n){if(stopped(s)||!Number.isInteger(n)||n<1||n>5||s.action!==0||s.cooldown>0)return false;s.action=n;s.elapsed=0;s.idle=0;return true;}
 function point(s,x,y){if(stopped(s)||!Number.isFinite(x)||!Number.isFinite(y))return;s.pointerX=x;s.pointerY=y;s.pointed=true;s.idle=0;if(s.action===5){s.action=0;s.elapsed=0;s.cooldown=0;}}
 function exit(s){s.pointed=false;}
 function reset(s){s.action=0;s.elapsed=0;s.idle=0;s.gazeX=0;s.gazeY=0;s.pointed=false;s.cooldown=0;}
 function setQuiet(s,v){s.quiet=!!v;if(v)reset(s);}function setReduced(s,v){s.reduced=!!v;if(v)reset(s);}function setPaused(s,v){s.paused=!!v;}
 function step(s,dt){if(stopped(s)||!Number.isFinite(dt)||dt<=0)return;s.clock+=dt;s.cooldown=Math.max(0,s.cooldown-dt);s.idle+=dt;
  if(s.action){s.elapsed+=dt;if(s.elapsed>=durations[s.action]){s.action=0;s.elapsed=0;s.cooldown=.7;s.idle=0;}}
  else if(s.idle>=24){s.action=5;s.elapsed=0;s.idle=0;}
  var tx=s.pointed?clamp((s.pointerX-350)/350,-1,1)*1.4:0,ty=s.pointed?clamp((s.pointerY-390)/390,-1,1)*1.1:0;
  if(s.action===1){tx=Math.sin(s.elapsed*3)*1.4;ty=Math.sin(s.elapsed*2)*1.1;}if(s.action>=2){tx=0;ty=0;}
  var k=1-Math.exp(-9*dt);s.gazeX+=(tx-s.gazeX)*k;s.gazeY+=(ty-s.gazeY)*k;
 }
 function pose(s){var p={eyeX:s.gazeX,eyeY:s.gazeY,rootX:350,rootY:700,scaleX:1,scaleY:1,rotation:0,earLeft:0,earRight:0,pawRot:0,pawY:-55,eyeOpacity:1,heart:0,restOpacity:1,animatedOpacity:0};
  if(stopped(s)){p.eyeX=0;p.eyeY=0;return p;}var t=s.elapsed,a;
  if(s.action<=1){if(s.pointed||s.action===1){p.rotation=s.gazeX*.003;p.scaleY=1+Math.sin(s.clock*2)*.003;p.earLeft=Math.sin(s.clock*2.2)*.01;p.earRight=-Math.sin(s.clock*2.2-.6)*.009;}}
  else if(s.action===2){a=pulse(t,1.65);p.scaleX=1+a*.017;p.scaleY=1-a*.035;p.rotation=Math.sin(t*7)*.019*a;p.earRight=-a*.015;}
  else if(s.action===3){a=pulse(t,1.9);p.rotation=-.015*a;p.pawY=-55-22*a;p.pawRot=-.4*a+Math.sin(t*16)*.12*a;p.earLeft=.015*Math.sin(t*7)*a;}
  else if(s.action===4){if(t<.22){a=Math.sin(t/.22*Math.PI);p.scaleY=1-.04*a;p.scaleX=1+.015*a;}else if(t<1){a=Math.sin((t-.22)/.78*Math.PI);p.rootY=700-43*a;p.rotation=Math.sin(t*7)*.02*a;p.scaleY=1+.018*a;p.earLeft=.025*a;p.earRight=-.02*a;}else if(t<1.3){a=Math.sin((t-1)/.3*Math.PI);p.scaleY=1-.025*a;p.scaleX=1+.01*a;}p.heart=Math.min(1,pulse(t,2.6)*2);}
  else if(s.action===5){a=pulse(t,3.2);p.rotation=.018*a;p.scaleY=1-.018*a;p.earRight=-a*.012;if(t>2.45)p.scaleY=1+Math.sin((t-2.45)/.75*Math.PI)*.012;}
  var rest=s.action===0&&!s.pointed&&Math.abs(s.gazeX)<.01&&Math.abs(s.gazeY)<.01;p.restOpacity=rest?1:0;p.animatedOpacity=rest?0:1;return p;
 }
 return {create:create,request:request,point:point,exit:exit,reset:reset,setQuiet:setQuiet,setReduced:setReduced,setPaused:setPaused,step:step,pose:pose};
}));
