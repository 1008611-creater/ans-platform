import * as T from 'three';
import { GLTFLoader } from '/mascot/3d/vendor/GLTFLoader.js';

const cfg = JSON.parse(document.getElementById('site-config').textContent);
const canvas = document.querySelector('canvas');
const reduced = !cfg.motion || matchMedia('(prefers-reduced-motion: reduce)').matches;
const renderer = new T.WebGLRenderer({canvas, antialias:true, alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = cfg.tour?.settings.exposure ?? 1.0;
const scene = new T.Scene();
scene.background = new T.Color(cfg.tour?.settings.background || (cfg.background === "light" ? "#e9e9e3" : "#1c1c20"));
scene.add(new T.HemisphereLight(cfg.tour?.settings.ambientColor||0xffffff,0x535369,cfg.tour?.settings.ambient ?? 1.2));
const key = new T.DirectionalLight(cfg.tour?.settings.keyColor||0xffeee0,cfg.tour?.settings.key ?? 2.4); key.position.set(Math.sin((cfg.tour?.settings.keyAngle??-35)*Math.PI/180)*5,cfg.tour?.settings.keyHeight??5,Math.cos((cfg.tour?.settings.keyAngle??-35)*Math.PI/180)*5); scene.add(key);
const fill = new T.DirectionalLight(0xd2dcff,.7); fill.position.set(4,1,3); scene.add(fill);
const rim = new T.DirectionalLight(0xffffff,2); rim.position.set(-2,2,-3); scene.add(rim);
const postTarget=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType}),postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
const postMaterial=new T.ShaderMaterial({uniforms:{source:{value:postTarget.texture},resolution:{value:new T.Vector2(1,1)},strength:{value:cfg.tour?.settings.bloom||0},threshold:{value:cfg.tour?.settings.bloomThreshold??.9}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',fragmentShader:'uniform sampler2D source;uniform vec2 resolution;uniform float strength;uniform float threshold;varying vec2 vUv;void main(){vec3 base=texture2D(source,vUv).rgb;vec3 glow=vec3(0.0);for(int x=-2;x<=2;x++){for(int y=-2;y<=2;y++){vec3 c=texture2D(source,vUv+vec2(float(x),float(y))*4.0/resolution).rgb;glow+=max(c-vec3(threshold),vec3(0.0))/25.0;}}gl_FragColor=vec4(base+glow*strength,1.0);\n#include <colorspace_fragment>\n}' });
postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),postMaterial));
function paintScene(){if((cfg.tour?.settings.bloom||0)>0){renderer.setRenderTarget(postTarget);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);}else renderer.render(scene,camera);}
const camera = new T.PerspectiveCamera(cfg.tour?.settings.fov ?? 24.6,1,.02,100);
let stops=[], current=0, animation=null, drag=null, target=new T.Vector3();
let raf=0, visible=true, dirty=true, editing=false, placing=false, model=null;
const raycaster=new T.Raycaster(), pointer=new T.Vector2();
function reportView(){if(editing&&model)parent.postMessage({channel:'ans-visual-scene',type:'view',index:current,camera:{position:camera.position.toArray(),target:target.toArray()}},'*');}

const buttons=[...document.querySelectorAll('[data-stop]')];
const panels=[...document.querySelectorAll('[data-panel]')];
function frameView(){const bounds=canvas.getBoundingClientRect();if(cfg.tour&&current===0&&!document.body.classList.contains("model-mode"))camera.setViewOffset(bounds.width,bounds.height,-bounds.width*.18,0,bounds.width,bounds.height);else camera.clearViewOffset();}
function setSize(){ const r=canvas.getBoundingClientRect(); renderer.setSize(r.width,r.height,false);const pixels=renderer.getDrawingBufferSize(new T.Vector2());postTarget.setSize(pixels.x,pixels.y);postMaterial.uniforms.resolution.value.copy(pixels); camera.aspect=r.width/Math.max(1,r.height); camera.updateProjectionMatrix();frameView(); dirty=true; requestDraw(); }
function requestDraw(){ if(!raf && visible) raf=requestAnimationFrame(draw); }
function draw(time){
 raf=0;
 if(animation){
  const k=reduced?1:Math.min(1,(time-animation.time)/950), e=k<.5?8*k*k*k*k:1-Math.pow(-2*k+2,4)/2;
  camera.position.lerpVectors(animation.position,animation.destination,e);
  camera.quaternion.slerpQuaternions(animation.quaternion,animation.rotation,e);
  if(k===1){animation=null;document.body.classList.remove('travelling');}
  dirty=true;
 }
 if(dirty){paintScene();dirty=false;}
 if(animation)requestDraw();
}
function select(index,immediate=false){
 if(!stops.length)return;
 current=index;frameView();
 const selected=stops[index];
 target.copy(selected.target);
 const configured=cfg.tour ? null : cfg.stops?.[index];
 const position=selected.position.clone();
 let rotation=selected.quaternion.clone();
 if(configured){
  const offset=position.clone().sub(target); offset.applyAxisAngle(new T.Vector3(0,1,0),(configured.angle||0)*Math.PI/180); offset.divideScalar(configured.zoom||1); position.copy(target).add(offset);
  const temporary=camera.clone(); temporary.position.copy(position);temporary.lookAt(target);rotation=temporary.quaternion;
 }
 buttons.forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.stop)===index)));
 panels.forEach(p=>p.hidden=Number(p.dataset.panel)!==index);
 if(immediate||reduced){camera.position.copy(position);camera.quaternion.copy(rotation);animation=null;}
 else {document.body.classList.add('travelling');animation={time:performance.now(),position:camera.position.clone(),quaternion:camera.quaternion.clone(),destination:position,rotation};}
 dirty=true;requestDraw();
}
buttons.forEach(b=>b.addEventListener('click',()=>select(Number(b.dataset.stop))));
addEventListener('message',event=>{
 if(event.source!==parent || event.data?.channel!=='ans-visual-scene')return;
 if(event.data.type==='select' && Number.isInteger(event.data.index) && event.data.index>=0 && event.data.index<stops.length)select(event.data.index);
 if(event.data.type==='section'){document.querySelector('[data-section="'+Number(event.data.index)+'"]')?.scrollIntoView({behavior:'smooth'});}
 if(event.data.type==='capture'){paintScene();let thumbnail='';try{thumbnail=canvas.toDataURL('image/png');}catch{}parent.postMessage({channel:'ans-visual-scene',type:'camera',requestId:event.data.requestId,thumbnail,camera:{position:camera.position.toArray(),target:target.toArray()}},'*');}
 if(event.data.type==='editor'){editing=!!event.data.active;placing=!!event.data.placing;canvas.style.cursor=placing?'crosshair':'grab';document.body.classList.toggle('editing',editing);const loading=document.getElementById('tour-loading');if(loading){loading.hidden=!(editing&&event.data.loading);}document.body.classList.toggle('model-mode',editing&&!event.data.showContent);if(!event.data.section)scrollTo({top:0,behavior:'instant'});frameView();dirty=true;requestDraw();}
});
canvas.addEventListener('pointerdown',e=>{if(placing&&model){const bounds=canvas.getBoundingClientRect();pointer.set((e.clientX-bounds.left)/bounds.width*2-1,-(e.clientY-bounds.top)/bounds.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObject(model,true).find(hit=>hit.object.isMesh);if(hit?.face){const normal=hit.face.normal.clone().applyMatrix3(new T.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize();parent.postMessage({channel:'ans-visual-scene',type:'surface',position:hit.point.toArray(),normal:normal.toArray()},'*');}return;}drag={x:e.clientX,y:e.clientY,button:e.button};animation=null;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;const button=drag.button;drag={x:e.clientX,y:e.clientY,button};if(button===1){const distance=camera.position.distanceTo(target)*.0015,right=new T.Vector3(1,0,0).applyQuaternion(camera.quaternion).multiplyScalar(-dx*distance),up=new T.Vector3(0,1,0).applyQuaternion(camera.quaternion).multiplyScalar(dy*distance);target.add(right).add(up);camera.position.add(right).add(up);dirty=true;requestDraw();return;}const offset=camera.position.clone().sub(target),s=new T.Spherical().setFromVector3(offset);s.theta-=dx*.007;s.phi=T.MathUtils.clamp(s.phi+dy*.004,.2,Math.PI-.2);camera.position.copy(target).add(new T.Vector3().setFromSpherical(s));camera.lookAt(target);dirty=true;requestDraw();});
canvas.addEventListener('pointerup',()=>{reportView();drag=null;document.body.classList.remove('travelling');});
canvas.addEventListener('pointercancel',()=>{drag=null;});
canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const offset=camera.position.clone().sub(target);offset.applyAxisAngle(new T.Vector3(0,1,0),e.key==='ArrowLeft'?-.12:.12);camera.position.copy(target).add(offset);camera.lookAt(target);dirty=true;requestDraw();reportView();}});
new ResizeObserver(setSize).observe(canvas);
addEventListener('visibilitychange',()=>{visible=!document.hidden;if(visible){dirty=true;requestDraw();}});
new GLTFLoader().load(cfg.modelUrl || '/visual-portfolio/reference/banner.glb',gltf=>{
 model=gltf.scene;scene.add(gltf.scene);
 const fitModel=!!cfg.tour?.model||!!(cfg.tour?.modelAsset&&cfg.tour.fitModel);
 if(fitModel){const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3()),scale=2/Math.max(size.x,size.y,size.z,.001);model.scale.multiplyScalar(scale);model.position.sub(center.multiplyScalar(scale));}
 gltf.scene.updateMatrixWorld(true);
 for(let i=0;i<5;i++){
  const c=gltf.scene.getObjectByName('cam-'+i), f=gltf.scene.getObjectByName('focus-'+i);
  if(c&&f&&!fitModel)stops.push({position:c.getWorldPosition(new T.Vector3()),quaternion:c.getWorldQuaternion(new T.Quaternion()),target:f.getWorldPosition(new T.Vector3())});else{const position=new T.Vector3(Math.sin(i*1.1)*5.5,.2,Math.cos(i*1.1)*5.5),focus=new T.Vector3(),temp=camera.clone();temp.position.copy(position);temp.lookAt(focus);stops.push({position,quaternion:temp.quaternion,target:focus});}
 }
 if(cfg.tour){
  const original=[...stops],cameraList=[cfg.tour.hero.camera,...cfg.tour.nodes.map(n=>n.camera)];
  stops=cameraList.map((capture,index)=>{if(!capture)return original[index%original.length];const position=new T.Vector3().fromArray(capture.position),focus=new T.Vector3().fromArray(capture.target),temporary=camera.clone();temporary.position.copy(position);temporary.lookAt(focus);return {position,quaternion:temporary.quaternion.clone(),target:focus};});
  for(const [index,sticker] of cfg.tour.stickers.entries())if(sticker.visible)addSticker(sticker,index);
 }else if(!cfg.demo)stops=[stops[0],stops[1],stops[3],stops[4]];
 select(cfg.initialStop||0,true);
 document.body.dataset.loaded='true';document.getElementById('tour-loading')?.setAttribute('hidden','');
 parent.postMessage({channel:'ans-visual-scene',type:'ready'},'*');
},undefined,()=>{document.getElementById('tour-loading')?.setAttribute('hidden','');document.body.dataset.failed='true';parent.postMessage({channel:'ans-visual-scene',type:'failed'},'*');document.getElementById('fallback')?.removeAttribute('hidden');});
addEventListener('pagehide',()=>{cancelAnimationFrame(raf);renderer.dispose();postTarget.dispose();postMaterial.dispose();postScene.children[0].geometry.dispose();scene.traverse(node=>{node.geometry?.dispose();const materials=Array.isArray(node.material)?node.material:[node.material];for(const m of materials){if(!m)continue;for(const value of Object.values(m)){if(value?.isTexture){value.source?.data?.close?.();value.dispose();}}m.dispose();}});});
setSize();

canvas.addEventListener('wheel',event=>{if(editing){event.preventDefault();const offset=camera.position.clone().sub(target);offset.multiplyScalar(Math.exp(T.MathUtils.clamp(event.deltaY,-100,100)*.002));if(offset.length()>.05&&offset.length()<30){camera.position.copy(target).add(offset);dirty=true;requestDraw();reportView();}}},{passive:false});
function addSticker(sticker,layerOrder){
 const center=new T.Vector3().fromArray(sticker.position),normal=new T.Vector3().fromArray(sticker.normal).normalize();
 const orientation=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),normal);orientation.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),sticker.rotation*Math.PI/180));
 const inverse=orientation.clone().invert(),positions=[],uvs=[];
 model.traverse(mesh=>{if(!mesh.isMesh)return;const geometry=mesh.geometry,index=geometry.index,p=geometry.attributes.position;
  for(let i=0;i<(index?index.count:p.count);i+=3){const points=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld));const face=new T.Vector3().subVectors(points[1],points[0]).cross(new T.Vector3().subVectors(points[2],points[0])).normalize();if(face.dot(normal)<.2)continue;
   const local=points.map(point=>point.clone().sub(center).applyQuaternion(inverse));
   if(local.every(v=>v.x< -sticker.size/2)||local.every(v=>v.x>sticker.size/2)||local.every(v=>v.y< -sticker.size/2)||local.every(v=>v.y>sticker.size/2)||local.every(v=>Math.abs(v.z)>sticker.size*.25))continue;
   points.forEach((point,j)=>{point.addScaledVector(face,.001);positions.push(...point.toArray());uvs.push(local[j].x/sticker.size+.5,local[j].y/sticker.size+.5);});
  }
 });
 if(!positions.length)return;
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect x="8" y="8" width="240" height="240" rx="60" fill="'+sticker.color+'" stroke="white" stroke-width="10"/><text x="128" y="139" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="'+(sticker.text.length>4?32:66)+'" fill="#181818">'+escape(sticker.text)+'</text></svg>';
 const texture=new T.TextureLoader().load('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg),()=>{dirty=true;requestDraw();});texture.colorSpace=T.SRGBColorSpace;
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.computeVertexNormals();
 const material=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4});material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','if(vMapUv.x<0.0||vMapUv.x>1.0||vMapUv.y<0.0||vMapUv.y>1.0)discard;\n#include <map_fragment>');};
 const decal=new T.Mesh(geometry,material);decal.renderOrder=layerOrder+1;scene.add(decal);
}
