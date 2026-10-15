import * as T from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { DinoPerformance } from './controller.mjs';
import { GESTURE_DURATIONS } from './performance.mjs';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const LABELS = { idle: '安静陪伴', hello: '打个招呼', listen: '认真听你说', think: '想一想', celebrate: '小小庆祝' };
const MODES = {
  enhanced: { asset: 'rig', note: '动作优化版：自然待机、轻微跟随和完整的小动作。保留原模型比例、材质与贴图。' },
  baseline: { asset: 'rig', note: '原有骨骼动作：播放原有待机和挥手片段，使用相同模型、灯光与机位。' },
  original: { asset: 'original', note: '原始 GLB，包含文件自带地面。没有骨骼动作，可自由旋转检查原形。' },
};
const ASSETS = { rig: './dinosaur.glb', original: './original-dinosaur.glb' };
const HASHES = {
  rig: 'e420b1580e76a5871e0427e8b2fe1756532692af377b9f30c67d7038517efa51',
  original: '05323eb7c6bd195aa6657828b338ee9cc2fc91c2e5990f449b7f76687f47308e',
};
const VIEWS = {
  front: [0, 0.62, 3], back: [0, 0.62, -3],
  left: [3, 0.62, 0], right: [-3, 0.62, 0], threeQuarter: [0.88, 0.75, 3],
};
const stage = $('#stage');
const status = $('#status');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const scene = new T.Scene();
scene.background = new T.Color(0xf2f5f2);
const display = new T.Group();
scene.add(display);
const camera = new T.OrthographicCamera(-0.8, 0.8, 0.675, -0.675, 0.01, 20);
camera.position.fromArray(VIEWS.threeQuarter);
let renderer, controls, model, mixer, performance;
let mode = 'enhanced', asset = null, currentClip = 'Idle', currentAction;
let ready = false, loaded = false, failed = false, disposed = false, suspended = false;
let paused = false, userReduced = false, dragActive = false;
let elapsed = 0, frames = 0, raf = 0, lastStamp = null, lastDiagnostics = -Infinity;
let view = 'threeQuarter', modelWidth = 0.8, pending = null, loadToken = 0, loadTimeout = null;
let loadRemaining = 20000, loadStarted = null, timeoutHandler = null;
let lastGesture = 'idle', lastHello = -Infinity;
let inspectedGesture = null;
const actions = new Map();
const fadeOuts = new Map();
const reduced = () => userReduced || preference.matches;
const isVisible = () => !document.hidden && !suspended;
const closeImages = new WeakSet();

function updateButtons() {
  $('#mode').value = mode;
  $('#mode-note').textContent = MODES[mode].note;
  for (const button of $$('[data-gesture]')) {
    const name = button.dataset.gesture;
    button.disabled = !ready || mode === 'original' || reduced()
      || (mode === 'baseline' && !['idle', 'hello'].includes(name));
    button.setAttribute('aria-pressed', String(lastGesture === name));
  }
  for (const button of $$('[data-view],#zoom-in,#zoom-out,#reset-camera')) button.disabled = !ready;
  $('#pause').disabled = !ready || mode === 'original' || reduced();
  $('#pause').textContent = mode === 'original' ? '原件为静态模型' : paused ? '继续动作' : '暂停动作';
  $('#pause').setAttribute('aria-pressed', String(paused));
  $('#reduced-motion').checked = reduced();
  $('#reduced-motion').disabled = preference.matches;
  $('#pose-check').hidden = mode !== 'enhanced' || !inspectedGesture || reduced();
  $('#gesture-note').textContent = reduced()
    ? '已减少动态，模型保持静止。仍可旋转、缩放和切换视角。'
    : mode === 'original' ? '原文件用于核对造型，不播放动作。'
    : mode === 'baseline' ? '待机与挥手为原有片段。切回动作优化版可体验其余小动作。'
    : '动作结束后回到陪伴。移动鼠标，它会短暂看向你；拖动时专注于旋转查看。';
}

function message(text, state = 'ready') {
  status.textContent = text;
  status.dataset.state = state;
}

function stop() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  lastStamp = null;
}

function pauseLoadBudget() {
  clearTimeout(loadTimeout);
  loadTimeout = null;
  if (loadStarted !== null) loadRemaining -= window.performance.now() - loadStarted;
  loadStarted = null;
}

function resumeLoadBudget() {
  if (!timeoutHandler || loaded || failed || disposed || !isVisible() || loadStarted !== null) return;
  loadStarted = window.performance.now();
  loadTimeout = setTimeout(timeoutHandler, Math.max(0, loadRemaining));
}

function requestFrame() {
  if (!loaded || failed || disposed || !isVisible() || raf) return;
  raf = requestAnimationFrame(tick);
}

function fail(text) {
  if (failed || disposed) return;
  failed = true;
  ready = false;
  stop();
  pauseLoadBudget();
  timeoutHandler = null;
  message(text, 'error');
  updateButtons();
  writeDiagnostics(true);
}

function releaseGraph(root) {
  if (!root) return;
  const geometries = new Set(), materials = new Set(), textures = new Set(), skeletons = new Set();
  root.traverse(node => {
    if (node.geometry) geometries.add(node.geometry);
    if (node.skeleton) skeletons.add(node.skeleton);
    for (const material of node.material ? Array.isArray(node.material) ? node.material : [node.material] : []) materials.add(material);
  });
  for (const material of materials) for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
  for (const item of skeletons) item.dispose();
  for (const item of geometries) item.dispose();
  for (const item of materials) item.dispose();
  for (const item of textures) {
    const image = item.source?.data;
    if (image?.close && !closeImages.has(image)) { image.close(); closeImages.add(image); }
    item.dispose();
  }
}

function clearAsset() {
  mixer?.stopAllAction();
  if (model) { mixer?.uncacheRoot(model); display.remove(model); releaseGraph(model); }
  if (pending && pending.scene !== model) releaseGraph(pending.scene);
  model = mixer = performance = pending = null;
  currentAction = null;
  actions.clear();
  fadeOuts.clear();
  loaded = ready = false;
  display.position.set(0, 0, 0);
  display.rotation.set(0, 0, 0);
  display.scale.setScalar(1);
  renderer?.renderLists.dispose();
}

function playBaseline(name) {
  const next = actions.get(name);
  if (!next) return;
  const previous = currentAction;
  fadeOuts.delete(next);
  next.stopFading().reset().setEffectiveWeight(1).setEffectiveTimeScale(name === 'Idle' ? 0.8 : 1);
  next.setLoop(name === 'Wave' ? T.LoopOnce : T.LoopRepeat, name === 'Wave' ? 1 : Infinity);
  next.clampWhenFinished = name === 'Wave';
  next.play();
  if (previous && previous !== next) {
    previous.crossFadeTo(next, 0.24, false);
    fadeOuts.set(previous, elapsed + 0.28);
  }
  currentAction = next;
  currentClip = name;
}

function activateMode() {
  mixer?.stopAllAction();
  fadeOuts.clear();
  currentAction = null;
  performance?.reset();
  elapsed = 0;
  lastDiagnostics = -Infinity;
  lastHello = -Infinity;
  lastStamp = null;
  lastGesture = 'idle';
  inspectedGesture = null;
  if (mode === 'baseline' && !reduced()) playBaseline('Idle');
  else performance?.update(0, 0, reduced());
  updateButtons();
  if (ready) message(mode === 'original' ? '原始文件已加载，可 360° 查看。' : '可以开始互动，也可以拖动查看背面。');
  requestFrame();
}

function changeMode(next) {
  if (!Object.hasOwn(MODES, next) || disposed) return;
  mode = next;
  if (asset === MODES[mode].asset && loaded && !failed) { activateMode(); return; }
  loadAsset(MODES[mode].asset);
}

function trigger(name) {
  if (!ready || reduced() || mode === 'original') return;
  if (name === 'hello' && elapsed - lastHello < 1.15) return;
  if (name === 'hello') lastHello = elapsed;
  paused = false;
  lastStamp = null;
  if (mode === 'enhanced') performance.trigger(name, elapsed);
  else if (['hello', 'idle'].includes(name)) playBaseline(name === 'hello' ? 'Wave' : 'Idle');
  else return;
  lastGesture = name;
  inspectedGesture = name === 'idle' ? null : name;
  $('#pose-progress').value = '0';
  $('#pose-progress-value').textContent = '0%';
  message(LABELS[name]);
  updateButtons();
  requestFrame();
}

function resize() {
  if (!renderer || disposed) return;
  const { width, height } = stage.getBoundingClientRect();
  const aspect = Math.max(width, 1) / Math.max(height, 1);
  const vertical = Math.max(1.32, (modelWidth + 0.21) / aspect);
  camera.left = -vertical * aspect / 2;
  camera.right = vertical * aspect / 2;
  camera.top = vertical / 2;
  camera.bottom = -vertical / 2;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.setSize(Math.max(width, 1), Math.max(height, 1), false);
  requestFrame();
}

function selectView(name, resetZoom = false) {
  if (!VIEWS[name] || !controls) return;
  // Drain camera damping so a button selection cannot drift afterward.
  const damping = controls.enableDamping;
  controls.enableDamping = false;
  controls.update();
  camera.position.fromArray(VIEWS[name]);
  camera.up.set(0, 1, 0);
  controls.target.set(0, 0.52, 0);
  if (resetZoom) camera.zoom = 1;
  camera.updateProjectionMatrix();
  controls.update();
  controls.enableDamping = damping;
  view = name;
  for (const button of $$('[data-view]')) button.setAttribute('aria-pressed', String(button.dataset.view === name));
  requestFrame();
}

function zoom(amount) {
  camera.zoom = T.MathUtils.clamp(camera.zoom * amount, 0.65, 2.5);
  camera.updateProjectionMatrix();
  requestFrame();
}

function writeDiagnostics(force = false) {
  if (!force && elapsed - lastDiagnostics < 0.25 && !paused && !reduced() && mode !== 'original') return;
  lastDiagnostics = elapsed;
  const state = {
    version: 'original-performance-20261010', mode, asset, ready, loaded, failed,
    paused, reducedMotion: reduced(), visible: isVisible(), frames,
    time: Number(elapsed.toFixed(3)), view, cameraZoom: camera.zoom,
    camera: camera.position.toArray().map(value => Number(value.toFixed(4))),
    glbSHA256: HASHES[asset] || null, fpsLimit: 30,
    bones: performance?.bones.size || 0,
    performance: mode === 'enhanced' ? performance?.snapshot() : { clip: currentClip },
    triangles: renderer?.info.render.triangles || 0,
    materialsAndTextures: 'original', deployment: 'site-preview',
  };
  $('#diagnostics').textContent = JSON.stringify(state, null, 2);
}

function tick(stamp) {
  raf = 0;
  if (!loaded || failed || disposed || !isVisible()) return;
  if (lastStamp !== null && stamp - lastStamp < 1000 / 30 - 0.25) { requestFrame(); return; }
  const animated = !paused && !reduced() && mode !== 'original';
  const dt = animated && lastStamp !== null ? Math.min((stamp - lastStamp) / 1000, 0.08) : 0;
  lastStamp = stamp;
  elapsed += dt;
  try {
    if (mode === 'enhanced' && (!paused || reduced())) performance.update(elapsed, dt, reduced());
    else if (mode === 'baseline' && !reduced()) {
      mixer.update(dt);
      if (currentClip === 'Wave' && currentAction.time >= currentAction.getClip().duration) playBaseline('Idle');
      for (const [action, stopAt] of fadeOuts) if (elapsed >= stopAt) { action.stop(); fadeOuts.delete(action); }
    }
    const cameraChanged = controls.update();
    renderer.render(scene, camera);
    if (failed || disposed) return;
    if (renderer.getContext().isContextLost()) throw new Error('Context lost');
    frames += 1;
    if (!ready) { ready = true; controls.enabled = true; updateButtons(); message('可以开始互动，也可以拖动查看背面。'); }
    const activeGesture = mode === 'enhanced' ? performance.gesture || 'idle' : currentClip === 'Wave' ? 'hello' : 'idle';
    if (activeGesture !== lastGesture) {
      lastGesture = activeGesture;
      updateButtons();
      if (activeGesture === 'idle') message('动作结束，回到安静陪伴。');
    }
    if (mode === 'enhanced' && inspectedGesture && !paused) {
      const progress = Math.round(T.MathUtils.clamp((elapsed - performance.startedAt) / GESTURE_DURATIONS[inspectedGesture], 0, 1) * 100);
      $('#pose-progress').value = String(progress);
      $('#pose-progress-value').textContent = `${progress}%`;
    }
    $('#performance-label').textContent = mode === 'original' ? '原始模型' : reduced() ? '静静陪着你' : paused ? '动作已暂停' : LABELS[activeGesture];
    writeDiagnostics();
    if (animated || cameraChanged) requestFrame();
  } catch { fail('三维画面暂时无法显示，请刷新预览重试。'); }
}

function install(gltf) {
  pending = null;
  model = gltf.scene;
  display.rotation.y = asset === 'original' ? -Math.PI / 2 : 0;
  display.add(model);
  display.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(model);
  const height = bounds.max.y - bounds.min.y;
  if (!Number.isFinite(height) || height <= 0) throw new Error('Invalid model bounds');
  const framing = new T.Box3();
  if (asset === 'original') {
    const vertex = new T.Vector3();
    const cutoff = bounds.min.y + height * 0.035;
    model.traverse(node => {
      const position = node.geometry?.attributes.position;
      if (!node.isMesh || !position) return;
      for (let i = 0; i < position.count; i++) {
        vertex.fromBufferAttribute(position, i).applyMatrix4(node.matrixWorld);
        if (vertex.y > cutoff) framing.expandByPoint(vertex);
      }
    });
  }
  if (framing.isEmpty()) framing.copy(bounds);
  const center = framing.getCenter(new T.Vector3());
  display.scale.setScalar(1 / height);
  display.position.set(-center.x / height, -bounds.min.y / height, -center.z / height);
  modelWidth = (framing.max.x - framing.min.x) / height;
  if (asset === 'rig') {
    performance = new DinoPerformance(model, gltf.animations);
    mixer = new T.AnimationMixer(model);
    for (const clip of gltf.animations) actions.set(clip.name, mixer.clipAction(clip));
  }
  loaded = true;
  contact.visible = asset === 'rig';
  activateMode();
  resize();
}

function loadAsset(name) {
  const token = ++loadToken;
  stop();
  pauseLoadBudget();
  timeoutHandler = null;
  clearAsset();
  asset = name;
  failed = false;
  message('正在加载原始贴图和模型…', 'loading');
  controls.enabled = false;
  updateButtons();
  renderer.render(scene, camera);
  let parsed = null, complete = false, settled = false;
  const manager = new T.LoadingManager();
  function finish() {
    if (!parsed || !complete || settled || disposed || failed || token !== loadToken) return;
    settled = true;
    pauseLoadBudget();
    timeoutHandler = null;
    try { install(parsed); } catch { fail('模型载入失败，请切换版本或刷新重试。'); }
  }
  function loadError() {
    if (token !== loadToken || disposed || settled) return;
    settled = true;
    if (parsed) { releaseGraph(parsed.scene); parsed = pending = null; }
    fail('模型或贴图未加载成功，请切换版本或刷新重试。');
  }
  manager.onLoad = () => { complete = true; finish(); };
  manager.onError = loadError;
  loadRemaining = 20000;
  timeoutHandler = loadError;
  resumeLoadBudget();
  new GLTFLoader(manager).load(ASSETS[name], gltf => {
    if (token !== loadToken || failed || disposed || settled) { releaseGraph(gltf.scene); return; }
    parsed = pending = gltf;
    finish();
  }, undefined, loadError);
}

function syncMotion() {
  stop();
  if (reduced()) {
    mixer?.stopAllAction();
    performance?.reset();
    performance?.update(elapsed, 0, true);
    lastGesture = 'idle';
  } else if (mode === 'baseline') playBaseline('Idle');
  updateButtons();
  writeDiagnostics(true);
  requestFrame();
}

let contact, observer;
function start() {
  try { renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'low-power' }); }
  catch { fail('当前浏览器无法显示三维模型，请开启硬件加速后刷新。'); return; }
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.debug.onShaderError = () => fail('模型着色未成功，请刷新预览重试。');
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', '小恐龙三维模型：拖动旋转，滚轮缩放。键盘方向键旋转，加减号缩放。');
  stage.append(renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.52, 0);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.17;
  controls.minZoom = 0.65;
  controls.maxZoom = 2.5;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;
  controls.minAzimuthAngle = -Infinity;
  controls.maxAzimuthAngle = Infinity;
  controls.enabled = false;
  controls.update();
  scene.add(new T.HemisphereLight(0xf7f9f8, 0xb5bab8, 1.25));
  for (const [color, intensity, position] of [
    [0xf8faf9, 2.05, [-2.6, 3.8, 4.2]], [0xf4f7f8, 0.58, [3.5, 1.1, 2.2]], [0xf6faf8, 0.62, [1.5, 2.5, -3.2]],
  ]) { const light = new T.DirectionalLight(color, intensity); light.position.fromArray(position); scene.add(light); }
  const shadowMaterial = new T.ShaderMaterial({
    transparent: true, depthWrite: false, toneMapped: false,
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'varying vec2 vUv;void main(){float r=length((vUv-.5)*2.0);float a=pow(1.0-smoothstep(.1,1.0,r),2.0)*.13;gl_FragColor=vec4(.17,.23,.19,a);}',
  });
  contact = new T.Mesh(new T.PlaneGeometry(0.87, 0.57), shadowMaterial);
  contact.rotation.x = -Math.PI / 2;
  contact.position.set(0, 0.001, 0.075);
  scene.add(contact);
  controls.addEventListener('change', requestFrame);
  controls.addEventListener('start', () => {
    dragActive = true;
    view = 'custom';
    if (performance) performance.pointerAt = -Infinity;
    for (const button of $$('[data-view]')) button.setAttribute('aria-pressed', 'false');
  });
  controls.addEventListener('end', () => { dragActive = false; });
  stage.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || dragActive || paused || reduced() || mode !== 'enhanced') return;
    const rect = stage.getBoundingClientRect();
    performance?.look((event.clientX - rect.left) / rect.width * 2 - 1, (event.clientY - rect.top) / rect.height * 2 - 1, elapsed);
  });
  stage.addEventListener('pointerleave', () => { if (performance) performance.pointerAt = -Infinity; });
  renderer.domElement.addEventListener('keydown', event => {
    if (!ready) return;
    if (['+', '='].includes(event.key)) { event.preventDefault(); zoom(1.15); return; }
    if (event.key === '-') { event.preventDefault(); zoom(1 / 1.15); return; }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const spherical = new T.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    if (event.key === 'ArrowLeft') spherical.theta -= 0.2;
    if (event.key === 'ArrowRight') spherical.theta += 0.2;
    if (event.key === 'ArrowUp') spherical.phi -= 0.15;
    if (event.key === 'ArrowDown') spherical.phi += 0.15;
    spherical.makeSafe();
    camera.position.setFromSpherical(spherical).add(controls.target);
    controls.update();
    view = 'custom';
    for (const button of $$('[data-view]')) button.setAttribute('aria-pressed', 'false');
    requestFrame();
  });
  renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); fail('三维画面已中断，请刷新重试。'); });
  $('#mode').addEventListener('change', event => changeMode(event.target.value));
  for (const button of $$('[data-gesture]')) button.addEventListener('click', () => trigger(button.dataset.gesture));
  for (const button of $$('[data-view]')) button.addEventListener('click', () => selectView(button.dataset.view));
  $('#pause').addEventListener('click', () => { paused = !paused; lastStamp = null; updateButtons(); requestFrame(); });
  $('#pose-progress').addEventListener('input', event => {
    if (mode !== 'enhanced' || !inspectedGesture || reduced() || !ready) return;
    paused = true;
    const age = GESTURE_DURATIONS[inspectedGesture] * Number(event.target.value) / 100;
    performance.reset();
    performance.trigger(inspectedGesture, elapsed - age);
    performance.update(elapsed, 0);
    lastGesture = performance.gesture || 'idle';
    lastStamp = null;
    $('#pose-progress-value').textContent = `${event.target.value}%`;
    message('已暂停在所选动作帧，可旋转检查。');
    updateButtons();
    requestFrame();
  });
  $('#zoom-in').addEventListener('click', () => zoom(1.18));
  $('#zoom-out').addEventListener('click', () => zoom(1 / 1.18));
  $('#reset-camera').addEventListener('click', () => selectView('threeQuarter', true));
  $('#reduced-motion').addEventListener('change', event => { userReduced = event.target.checked; syncMotion(); });
  for (const button of $$('[data-background]')) button.addEventListener('click', () => {
    const dark = button.dataset.background === 'dark';
    document.documentElement.dataset.background = dark ? 'dark' : 'light';
    scene.background.set(dark ? 0x1d2822 : 0xf2f5f2);
    for (const other of $$('button[data-background]')) other.setAttribute('aria-pressed', String(other === button));
    requestFrame();
  });
  preference.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', () => {
    stop();
    if (isVisible()) resumeLoadBudget(); else pauseLoadBudget();
    writeDiagnostics(true);
    requestFrame();
  });
  addEventListener('pagehide', event => {
    suspended = true;
    stop();
    pauseLoadBudget();
    if (event.persisted) return;
    disposed = true;
    loadToken++;
    timeoutHandler = null;
    observer?.disconnect();
    preference.removeEventListener('change', syncMotion);
    clearAsset();
    controls.dispose();
    releaseGraph(scene);
    renderer.dispose();
  });
  addEventListener('pageshow', event => {
    if (event.persisted && !disposed) { suspended = false; resumeLoadBudget(); resize(); requestFrame(); }
  });
  observer = new ResizeObserver(resize);
  observer.observe(stage);
  resize();
  updateButtons();
  loadAsset('rig');
}
start();
