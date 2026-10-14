/** Self-contained browser runtime. No network, generated code, credentials or third-party assets. */
export const VISUAL_SCENE_SCRIPT = String.raw`
(() => {
 const config=JSON.parse(document.getElementById('site-config').textContent),canvas=document.querySelector('canvas');
 const reduced=!config.motion||matchMedia('(prefers-reduced-motion: reduce)').matches;
 let target=config.stops[0],angle=target.angle*Math.PI/180,zoom=target.zoom,drag=null,frame=0;
 const gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:false});
 function show(index){target=config.stops[index];document.querySelectorAll('[data-stop]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.stop)===index)));document.querySelectorAll('[data-panel]').forEach(p=>p.hidden=Number(p.dataset.panel)!==index);draw();}
 document.querySelectorAll('[data-stop]').forEach(b=>b.addEventListener('click',()=>show(Number(b.dataset.stop))));
 if(!gl){canvas.hidden=true;document.getElementById('fallback').hidden=false;return;}
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('shader');return s;}
 const program=gl.createProgram();
 gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec3 p;attribute vec3 n;uniform float a;uniform float z;uniform float ratio;varying vec3 normal;varying vec3 pos;void main(){float c=cos(a),s=sin(a);vec3 q=vec3(p.x*c+p.z*s,p.y,-p.x*s+p.z*c);normal=vec3(n.x*c+n.z*s,n.y,-n.x*s+n.z*c);pos=q;float depth=6.5-q.z;gl_Position=vec4(q.x*z*3.4/ratio,(q.y-0.15)*z*3.4,-q.z*.05,depth);}'));
 gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision mediump float;uniform vec3 color;varying vec3 normal;varying vec3 pos;void main(){vec3 n=normalize(normal);float key=max(0.,dot(n,normalize(vec3(-.6,.8,1.5))));float fill=max(0.,dot(n,normalize(vec3(1.,.2,.3))));float rim=pow(1.-abs(n.z),3.);vec3 rgb=color*(.40+.57*key+.17*fill)+vec3(.13,.15,.17)*rim;gl_FragColor=vec4(pow(rgb,vec3(.91)),1.);}'));
 gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;gl.useProgram(program);gl.enable(gl.DEPTH_TEST);
 const ap=gl.getAttribLocation(program,'p'),an=gl.getAttribLocation(program,'n');gl.enableVertexAttribArray(ap);gl.enableVertexAttribArray(an);
 const ua=gl.getUniformLocation(program,'a'),uz=gl.getUniformLocation(program,'z'),ur=gl.getUniformLocation(program,'ratio'),uc=gl.getUniformLocation(program,'color');
 const objects=[],faceted=config.avatar==='faceted';
 function ellipsoid(x,y,z,rx,ry,rz,color){const vertices=[],normals=[],lat=faceted?9:28,lon=faceted?12:36;function point(i,j){const t=Math.PI*i/lat,f=2*Math.PI*j/lon;return [Math.sin(t)*Math.cos(f),Math.cos(t),Math.sin(t)*Math.sin(f)];}for(let i=0;i<lat;i++)for(let j=0;j<lon;j++){const ps=[point(i,j),point(i+1,j),point(i+1,j+1),point(i,j),point(i+1,j+1),point(i,j+1)];for(const p of ps){vertices.push(x+p[0]*rx,y+p[1]*ry,z+p[2]*rz);normals.push(p[0]/rx,p[1]/ry,p[2]/rz);}}const vb=gl.createBuffer(),nb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(normals),gl.STATIC_DRAW);objects.push({vb,nb,count:vertices.length/3,color});}
 const skin=config.avatar==='studio'?[.52,.29,.17]:[.92,.65,.43],hair=[.09,.065,.055],shirt=config.palette==='lavender'?[.47,.36,.72]:config.palette==='coral'?[.85,.34,.26]:[.31,.43,.25],dark=[.10,.13,.12],shoe=[.87,.86,.79],white=[.98,.98,.92];
 const big=config.avatar==='vinyl'?1.17:1;
 ellipsoid(-.24,-1.18,.02,.20,.48,.23,dark);ellipsoid(.24,-1.18,.02,.20,.48,.23,dark);
 ellipsoid(-.25,-1.61,.17,.24,.14,.39,shoe);ellipsoid(.25,-1.61,.17,.24,.14,.39,shoe);
 ellipsoid(0,-.37,0,.62,.64,.34,shirt);ellipsoid(-.61,-.45,0,.18,.49,.19,shirt);ellipsoid(.61,-.45,0,.18,.49,.19,shirt);
 ellipsoid(-.64,-.88,.01,.15,.19,.15,skin);ellipsoid(.64,-.88,.01,.15,.19,.15,skin);
 ellipsoid(0,.23,0,.19,.27,.19,skin);ellipsoid(0,.93,0,.61*big,.68*big,.52*big,skin);
 ellipsoid(-.60,.91,0,.11,.17,.13,skin);ellipsoid(.60,.91,0,.11,.17,.13,skin);
 ellipsoid(0,1.41,-.10,.63*big,.27,.49,hair);
 for(let i=0;i<8;i++){const t=i*.65;ellipsoid(Math.cos(t)*.45,1.44+Math.sin(i*1.9)*.09,Math.sin(t)*.34,.24,.22,.22,hair);}
 ellipsoid(-.45,1.15,-.07,.18,.30,.31,hair);ellipsoid(.45,1.15,-.07,.18,.30,.31,hair);
 for(const x of [-.225,.225]){ellipsoid(x,1.01,.466,.135,.16,.065,white);ellipsoid(x,1.00,.525,.064,.088,.035,dark);ellipsoid(x-.018,1.035,.557,.018,.025,.012,white);ellipsoid(x,.79,.46,.12,.055,.02,[.9,.47,.34]);ellipsoid(x,1.23,.46,.15,.033,.025,hair);}
 ellipsoid(0,.86,.51,.08,.105,.10,skin);ellipsoid(0,.65,.47,.145,.035,.035,[.40,.20,.13]);
 if(config.avatar==='studio')for(const x of [-.225,.225])ellipsoid(x,1.01,.49,.18,.20,.019,[.12,.14,.12]);
 function paint(){if(document.hidden)return;const dpr=Math.min(devicePixelRatio||1,2),w=Math.round(canvas.clientWidth*dpr),h=Math.round(canvas.clientHeight*dpr);if(!w||!h)return;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);const desired=target.angle*Math.PI/180;angle=reduced?desired:angle+(desired-angle)*.09;zoom=reduced?target.zoom:zoom+(target.zoom-zoom)*.09;gl.uniform1f(ua,angle);gl.uniform1f(uz,zoom);gl.uniform1f(ur,w/h);for(const o of objects){gl.bindBuffer(gl.ARRAY_BUFFER,o.vb);gl.vertexAttribPointer(ap,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,o.nb);gl.vertexAttribPointer(an,3,gl.FLOAT,false,0,0);gl.uniform3fv(uc,o.color);gl.drawArrays(gl.TRIANGLES,0,o.count);}if(Math.abs(desired-angle)>.0001||Math.abs(target.zoom-zoom)>.0001)frame=requestAnimationFrame(paint);}
 function draw(){cancelAnimationFrame(frame);frame=requestAnimationFrame(paint);}
 canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,a:target.angle};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(drag){target={...target,angle:drag.a+(e.clientX-drag.x)*.5};draw();}});for(const name of ['pointerup','pointercancel'])canvas.addEventListener(name,()=>drag=null);
 canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();target={...target,angle:target.angle+(e.key==='ArrowLeft'?-10:e.key==='ArrowRight'?10:0),zoom:Math.max(.8,Math.min(1.6,target.zoom+(e.key==='ArrowUp'?.1:e.key==='ArrowDown'?-.1:0)))};draw();}});
 new ResizeObserver(draw).observe(canvas);document.addEventListener('visibilitychange',draw);canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();canvas.hidden=true;document.getElementById('fallback').hidden=false;});
 show(config.initialStop||0);
})();`;
