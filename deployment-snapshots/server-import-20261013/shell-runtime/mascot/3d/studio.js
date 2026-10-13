import * as T from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { DinoPerformance } from './controller.mjs';
import { GESTURE_DURATIONS } from './performance.mjs';
import { FaceVoiceController } from './face-voice.mjs';
import { DinoPerformance as PublishedPerformance } from './baseline/controller.mjs';
import { GESTURE_DURATIONS as PUBLISHED_DURATIONS } from './baseline/performance.mjs';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const LABELS = { idle: "自然待机", hello: "嗨，你来啦", listen: "我在认真听", think: "让我想一想", celebrate: "太棒了", curious: "那是什么？", nod: "明白了", no: "我有点疑惑", shy: "有点不好意思", stretch: "伸个懒腰", sleep: "打个盹", surprise: "哇，真的吗？" };
const REEL = ['hello', 'curious', 'listen', 'nod', 'no', 'think', 'shy', 'surprise', 'celebrate', 'stretch', 'sleep'];
const MODES = {
  enhanced: { asset: 'rig', note: '12 种回应，包含眨眼、口型和更连贯的动作。' },
  baseline: { asset: 'rig', note: '原线上动作，用于快速对比。' },
  original: { asset: 'original', note: '原始 GLB，仅用于检查模型外形。' },
};
const ASSETS = { rig: './dinosaur.glb', original: './original-dinosaur.glb' };
const HASHES = {
  rig: 'f4be8ba420e58ac3304d8d9f5f6a6b984f7bab11ebb15c7895af7cfb5574cb93',
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
let renderer, controls, model, performance, published, faceVoice;
let miniRenderer = null, miniVisible = false;
const miniCamera = new T.OrthographicCamera(-0.65, 0.65, 0.65, -0.65, 0.01, 20);
miniCamera.position.set(0.11, 0.65, 3.2);
miniCamera.lookAt(0, 0.52, 0);
let mode = 'enhanced', asset = null;
let ready = false, loaded = false, failed = false, disposed = false, suspended = false;
let paused = false, userReduced = false, dragActive = false;
let elapsed = 0, frames = 0, raf = 0, lastStamp = null, lastDiagnostics = -Infinity;
let view = 'threeQuarter', modelWidth = 0.8, pending = null, loadToken = 0, loadTimeout = null;
let loadRemaining = 20000, loadStarted = null, timeoutHandler = null;
let lastGesture = 'idle';
let inspectedGesture = null;
let reelIndex = -1, reelNextAt = Infinity;
const activePerformance = () => mode === 'baseline' ? published : performance;
const durations = () => mode === 'baseline' ? PUBLISHED_DURATIONS : GESTURE_DURATIONS;
const reduced = () => userReduced || preference.matches;
const isVisible = () => !document.hidden && !suspended;
const closeImages = new WeakSet();

function updateButtons() {
  $('#mode').value = mode;
  $('#mode-note').textContent = MODES[mode].note;
  for (const button of $$('[data-gesture]')) {
    const name = button.dataset.gesture;
    button.disabled = !ready || mode === 'original' || reduced()
      || (mode === 'baseline' && name !== 'idle' && !Object.hasOwn(PUBLISHED_DURATIONS, name));
    button.setAttribute('aria-pressed', String(lastGesture === name));
  }
  for (const button of $$('[data-view],#zoom-in,#zoom-out,#reset-camera')) button.disabled = !ready;
  $('#pause').disabled = !ready || mode === 'original' || reduced();
  $('#pause').textContent = mode === 'original' ? '鍘熶欢涓洪潤鎬佹ā鍨? : paused ? '缁х画鍔ㄤ綔' : '鏆傚仠鍔ㄤ綔';
  $('#pause').setAttribute('aria-pressed', String(paused));
  $('#reduced-motion').checked = reduced();
  $('#reduced-motion').disabled = preference.matches;
  $('#pose-check').hidden = mode === 'original' || !inspectedGesture || reduced();
  $('#play-reel').disabled = !ready || mode === 'original' || reduced();
  $('#play-reel').textContent = reelIndex < 0 ? '杩炵画鐪嬩竴閬? : '鍋滄杩炴挱';
  $('#play-reel').setAttribute('aria-pressed', String(reelIndex >= 0));
  $('#companion-size').disabled = !ready;
  $('#gesture-note').textContent = reduced()
    ? '宸插噺灏戝姩鎬侊紝妯″瀷淇濇寔闈欐銆備粛鍙棆杞€佺缉鏀惧拰鍒囨崲瑙嗚銆?
    : mode === 'original' ? '鍘熸枃浠剁敤浜庢牳瀵归€犲瀷锛屼笉鎾斁鍔ㄤ綔銆?
    : mode === 'baseline' ? '杩欐槸褰撳墠绾夸笂鍔ㄤ綔銆傚垏鍥炴柊鍔ㄤ綔鍙姣旀洿澶氬洖搴斻€?
    : '鍔ㄤ綔缁撴潫鍚庡洖鍒伴櫔浼淬€傜Щ鍔ㄩ紶鏍囷紝瀹冧細鐭殏鐪嬪悜浣狅紱鎷栧姩鏃朵笓娉ㄤ簬鏃嬭浆鏌ョ湅銆?;
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
  performance?.reset();
  published?.reset();
  faceVoice?.dispose();
  faceVoice = null;
  if (model) { display.remove(model); releaseGraph(model); }
  if (pending && pending.scene !== model) releaseGraph(pending.scene);
  model = performance = published = pending = null;
  loaded = ready = false;
  display.position.set(0, 0, 0);
  display.rotation.set(0, 0, 0);
  display.scale.setScalar(1);
  renderer?.renderLists.dispose();
  miniRenderer?.renderLists.dispose();
}

function stopReel(text = '鐐逛竴娆★紝渚濇鐪嬪畬姣忎釜鍔ㄤ綔銆?) {
  reelIndex = -1;
  reelNextAt = Infinity;
  $('#reel-status').textContent = text;
}

function reelGestures() {
  return REEL.filter(name => mode === 'enhanced' || Object.hasOwn(PUBLISHED_DURATIONS, name));
}

function advanceReel() {
  const sequence = reelGestures();
  reelIndex += 1;
  if (reelIndex >= sequence.length) {
    stopReel('鐪嬪畬鍟︺€傚彲浠ユ寫涓€涓姩浣滐紝杞埌渚ч潰鍐嶇湅鐪嬨€?);
    updateButtons();
    return;
  }
  const name = sequence[reelIndex];
  trigger(name, true);
  reelNextAt = elapsed + durations()[name] + 0.75;
  $('#reel-status').textContent = `${reelIndex + 1} / ${sequence.length} 路 ${LABELS[name]}`;
}

function activateMode() {
  performance?.reset();
  published?.reset();
  stopReel();
  elapsed = 0;
  lastDiagnostics = -Infinity;
  lastStamp = null;
  paused = false;
  lastGesture = 'idle';
  inspectedGesture = null;
  activePerformance()?.update(0, 0, reduced());
  updateButtons();
  if (ready) message(mode === 'original' ? '鍘熷鏂囦欢宸插姞杞斤紝鍙?360掳 鏌ョ湅銆? : '鍙互寮€濮嬩簰鍔紝涔熷彲浠ユ嫋鍔ㄦ煡鐪嬭儗闈€?);
  requestFrame();
}

function changeMode(next) {
  if (!Object.hasOwn(MODES, next) || disposed) return;
  mode = next;
  if (asset === MODES[mode].asset && loaded && !failed) { activateMode(); return; }
  loadAsset(MODES[mode].asset);
}

function trigger(name, fromReel = false) {
  if (!ready || reduced() || mode === 'original') return;
  if (name !== 'idle' && !Object.hasOwn(durations(), name)) return;
  if (!fromReel) stopReel();
  paused = false;
  lastStamp = null;
  activePerformance().trigger(name, elapsed);
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
    version: 'expressive-performance-20261010', mode, asset, ready, loaded, failed,
    paused, reducedMotion: reduced(), visible: isVisible(), frames,
    time: Number(elapsed.toFixed(3)), view, cameraZoom: camera.zoom,
    camera: camera.position.toArray().map(value => Number(value.toFixed(4))),
    glbSHA256: HASHES[asset] || null, fpsLimit: 30,
    bones: performance?.bones.size || 0,
    performance: activePerformance()?.snapshot(),
    reelIndex, miniVisible,
    triangles: renderer?.info.render.triangles || 0,
    materialsAndTextures: 'original', deployment: 'local-candidate-not-published',
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
    if (mode !== 'original' && (!paused || reduced())) activePerformance().update(elapsed, dt, reduced());
    faceVoice?.update(elapsed, dt, reduced());
    if (reelIndex >= 0 && !paused && !reduced() && elapsed >= reelNextAt) advanceReel();
    const rig = activePerformance()?.rigTransform;
    const jump = rig?.jumpHeight || 0;
    contact.scale.setScalar(1 + jump * 2);
    contact.position.x = rig?.x || 0;
    contact.position.z = 0.075 + (rig?.z || 0);
    contact.material.uniforms.opacity.value = Math.max(0.4, 1 - jump * 6);
    const cameraChanged = controls.update();
    renderer.render(scene, camera);
    if (miniVisible && miniRenderer) {
      const background = scene.background;
      try {
        scene.background = null;
        miniRenderer.render(scene, miniCamera);
        if (miniRenderer.getContext().isContextLost()) throw new Error('Mini context lost');
      } catch {
        miniVisible = false;
        $('#mini-stage').hidden = true;
        $('#companion-size').setAttribute('aria-pressed', 'false');
        miniRenderer.domElement.remove();
        miniRenderer.dispose();
        miniRenderer = null;
        message('灏忕獥鏆傛椂鏃犳硶鏄剧ず锛屼富棰勮浠嶅彲浣跨敤銆?);
      }
      finally { scene.background = background; }
    }
    if (failed || disposed) return;
    if (renderer.getContext().isContextLost()) throw new Error('Context lost');
    frames += 1;
    if (!ready) { ready = true; controls.enabled = true; updateButtons(); message(mode === 'original' ? '鍘熷鏂囦欢宸插姞杞斤紝鍙?360掳 鏌ョ湅銆? : '鍙互寮€濮嬩簰鍔紝涔熷彲浠ユ嫋鍔ㄦ煡鐪嬭儗闈€?); }
    const activeGesture = mode === 'original' ? 'idle' : activePerformance().gesture || 'idle';
    if (activeGesture !== lastGesture) {
      lastGesture = activeGesture;
      updateButtons();
      if (activeGesture === 'idle') message('鍔ㄤ綔缁撴潫锛屽洖鍒板畨闈欓櫔浼淬€?);
    }
    if (mode !== 'original' && inspectedGesture && !paused) {
      const progress = Math.round(T.MathUtils.clamp((elapsed - activePerformance().startedAt) / durations()[inspectedGesture], 0, 1) * 100);
      $('#pose-progress').value = String(progress);
      $('#pose-progress-value').textContent = `${progress}%`;
    }
    $('#performance-label').textContent = mode === 'original' ? '鍘熷妯″瀷' : reduced() ? '闈欓潤闄潃浣? : paused ? `${LABELS[activeGesture]} 路 宸叉殏鍋渀 : LABELS[activeGesture];
    writeDiagnostics();
    if (animated || cameraChanged || faceVoice?.status === 'speaking') requestFrame();
  } catch { fail('涓夌淮鐢婚潰鏆傛椂鏃犳硶鏄剧ず锛岃鍒锋柊棰勮閲嶈瘯銆?); }
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
    published = new PublishedPerformance(model, gltf.animations);
    faceVoice = new FaceVoiceController(model, { onStatus: state => {
      const map = { loading: "正在生成声音…", playing: "正在播放 · 嘴型同步", ended: "播放完成", stopped: "已停止", error: `TTS 失败：${state.message || "请稍后再试"}` };
      const voiceState = $('#voice-state');
      if (voiceState) voiceState.textContent = map[state.state] || state.state || '??';
      requestFrame();
    } });
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
  message('姝ｅ湪鍔犺浇鍘熷璐村浘鍜屾ā鍨嬧€?, 'loading');
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
    try { install(parsed); } catch { fail('妯″瀷杞藉叆澶辫触锛岃鍒囨崲鐗堟湰鎴栧埛鏂伴噸璇曘€?); }
  }
  function loadError() {
    if (token !== loadToken || disposed || settled) return;
    settled = true;
    if (parsed) { releaseGraph(parsed.scene); parsed = pending = null; }
    fail('妯″瀷鎴栬创鍥炬湭鍔犺浇鎴愬姛锛岃鍒囨崲鐗堟湰鎴栧埛鏂伴噸璇曘€?);
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
    stopReel();
    performance?.reset();
    published?.reset();
    activePerformance()?.update(elapsed, 0, true);
    lastGesture = 'idle';
  }
  if (ready) message(reduced() ? '宸插噺灏戝姩鎬侊紝鍙户缁棆杞煡鐪嬫ā鍨嬨€? : paused ? '鍔ㄤ綔淇濇寔鏆傚仠锛屽彲缁х画鎾斁銆? : '宸叉仮澶嶅姩浣滐紝鍙互鎸戜竴涓洖搴旂湅鐪嬨€?);
  updateButtons();
  writeDiagnostics(true);
  requestFrame();
}

let contact, observer;
function start() {
  try { renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'low-power' }); }
  catch { fail('褰撳墠娴忚鍣ㄦ棤娉曟樉绀轰笁缁存ā鍨嬶紝璇峰紑鍚‖浠跺姞閫熷悗鍒锋柊銆?); return; }
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.debug.onShaderError = () => fail('妯″瀷鐫€鑹叉湭鎴愬姛锛岃鍒锋柊棰勮閲嶈瘯銆?);
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', '灏忔亹榫欎笁缁存ā鍨嬶細鎷栧姩鏃嬭浆锛屾粴杞缉鏀俱€傞敭鐩樻柟鍚戦敭鏃嬭浆锛屽姞鍑忓彿缂╂斁銆?);
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
    uniforms: { opacity: { value: 1 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'uniform float opacity;varying vec2 vUv;void main(){float r=length((vUv-.5)*2.0);float a=pow(1.0-smoothstep(.1,1.0,r),2.0)*.13*opacity;gl_FragColor=vec4(.17,.23,.19,a);}',
  });
  contact = new T.Mesh(new T.PlaneGeometry(0.87, 0.57), shadowMaterial);
  contact.rotation.x = -Math.PI / 2;
  contact.position.set(0, 0.001, 0.075);
  scene.add(contact);
  controls.addEventListener('change', requestFrame);
  controls.addEventListener('start', () => {
    dragActive = true;
    view = 'custom';
    if (activePerformance()) activePerformance().pointerAt = -Infinity;
    for (const button of $$('[data-view]')) button.setAttribute('aria-pressed', 'false');
  });
  controls.addEventListener('end', () => { dragActive = false; });
  stage.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || dragActive || paused || reduced() || mode === 'original') return;
    const rect = stage.getBoundingClientRect();
    activePerformance()?.look((event.clientX - rect.left) / rect.width * 2 - 1, (event.clientY - rect.top) / rect.height * 2 - 1, elapsed);
  });
  stage.addEventListener('pointerleave', () => { if (activePerformance()) activePerformance().pointerAt = -Infinity; });
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
  renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); fail('涓夌淮鐢婚潰宸蹭腑鏂紝璇峰埛鏂伴噸璇曘€?); });
  $('#mode').addEventListener('change', event => changeMode(event.target.value));
  for (const button of $$('[data-gesture]')) button.addEventListener('click', () => trigger(button.dataset.gesture));
  $('#play-reel').addEventListener('click', () => {
    if (!ready || reduced() || mode === 'original') return;
    if (reelIndex >= 0) stopReel('杩炴挱宸插仠姝紝鍙崟鐙寫閫夊姩浣溿€?);
    else { reelIndex = -1; advanceReel(); }
    updateButtons(); requestFrame();
  });
  $('#companion-size').addEventListener('click', () => {
    if (!ready) return;
    miniVisible = !miniVisible;
    if (miniVisible && !miniRenderer) {
      try {
        miniRenderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
        miniRenderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
        miniRenderer.setSize(88, 88, false);
        miniRenderer.outputColorSpace = renderer.outputColorSpace;
        miniRenderer.toneMapping = renderer.toneMapping;
        miniRenderer.toneMappingExposure = renderer.toneMappingExposure;
        miniRenderer.domElement.setAttribute('aria-label', '88鍍忕礌灏忔亹榫欏姩浣滈瑙?);
        $('#mini-stage').append(miniRenderer.domElement);
      } catch { miniVisible = false; message('褰撳墠璁惧鏃犳硶鍐嶅紑鍚皬绐楋紝涓婚瑙堜粛鍙娇鐢ㄣ€?); }
    }
    $('#mini-stage').hidden = !miniVisible;
    $('#companion-size').setAttribute('aria-pressed', String(miniVisible));
    requestFrame();
  });
  for (const button of $$('[data-view]')) button.addEventListener('click', () => selectView(button.dataset.view));
  $('#pause').addEventListener('click', () => { paused = !paused; lastStamp = null; updateButtons(); requestFrame(); });
  $('#pose-progress').addEventListener('input', event => {
    if (mode === 'original' || !inspectedGesture || reduced() || !ready) return;
    stopReel('宸茶繘鍏ュ姩浣滃抚妫€鏌ワ紝杩炴挱鏆傚仠銆?);
    paused = true;
    const age = durations()[inspectedGesture] * Number(event.target.value) / 100;
    const controller = activePerformance();
    controller.reset();
    controller.trigger(inspectedGesture, elapsed - age);
    controller.update(elapsed, 0);
    lastGesture = controller.gesture || 'idle';
    lastStamp = null;
    $('#pose-progress-value').textContent = `${event.target.value}%`;
    message('宸叉殏鍋滃湪鎵€閫夊姩浣滃抚锛屽彲鏃嬭浆妫€鏌ャ€?);
    updateButtons();
    requestFrame();
  });
  $('#zoom-in').addEventListener('click', () => zoom(1.18));
  $('#zoom-out').addEventListener('click', () => zoom(1 / 1.18));
  $('#reset-camera').addEventListener('click', () => selectView('threeQuarter', true));
  $('#reduced-motion').addEventListener('change', event => { userReduced = event.target.checked; syncMotion(); });
  $('#speak')?.addEventListener('click', () => { const text = $('#voice-text')?.value.trim(); if (text) faceVoice?.speak(text, 'Chloe'); requestFrame(); });
  $('#stop-speech')?.addEventListener('click', () => { faceVoice?.stopAudio(); requestFrame(); });
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
    miniRenderer?.dispose();
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


