import * as T from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { OrbitControls } from './vendor/OrbitControls.js';

const SETTINGS = Object.freeze({
  frameHeight: 1.35,
  maxFps: 30,
  pixelRatio: 1.75,
  exposure: 0.98,
  clipFade: 0.2,
  wardrobeUrl: new URL('./sanctuary-wardrobe.glb?v=20261016s', import.meta.url).href,
});
const SPECIES_TINTS = Object.freeze({
  mint_star:   { color: 0xffffff, emissive: 0x000000, emissiveIntensity: 0.0, roughnessDelta: 0.0 },
  cyber_gold:  { color: 0xd4be98, emissive: 0x3b2306, emissiveIntensity: 0.16, roughnessDelta: -0.14 },
  sakura_mochi:{ color: 0xffd0e2, emissive: 0x380c1e, emissiveIntensity: 0.12, roughnessDelta: 0.04 },
  aurora_ice:  { color: 0xc8e4ff, emissive: 0x0b1f47, emissiveIntensity: 0.15, roughnessDelta: -0.08 },
});
const HEAD_NODES = new Set([
  'species_cyber_horns', 'species_sakura_ears', 'species_aurora_crystals',
  'headwear_starter_antenna', 'headwear_beret_cloud', 'headwear_cyber_visor',
  'headwear_phd_mortarboard', 'headwear_crown_aurora',
  'eyewear_gold_glasses', 'eyewear_pixel_shades', 'eyewear_star_monocle',
]);
const BODY_NODES = new Set([
  'neckwear_starter_scarf', 'neckwear_boba_jetpack', 'neckwear_cyber_wings', 'neckwear_pioneer_cape',
  'handheld_magic_wand', 'handheld_gold_keyboard', 'handheld_floating_grimoire',
]);
const SPECIES_HEAD_NODE = Object.freeze({
  cyber_gold: 'species_cyber_horns',
  sakura_mochi: 'species_sakura_ears',
  aurora_ice: 'species_aurora_crystals',
});
const CANONICAL_NODE_MAP = Object.freeze({
  starter_antenna: 'headwear_starter_antenna',
  beret_cloud: 'headwear_beret_cloud',
  cyber_visor: 'headwear_cyber_visor',
  phd_mortarboard: 'headwear_phd_mortarboard',
  crown_aurora: 'headwear_crown_aurora',
  gold_glasses: 'eyewear_gold_glasses',
  pixel_shades: 'eyewear_pixel_shades',
  star_monocle: 'eyewear_star_monocle',
  starter_scarf: 'neckwear_starter_scarf',
  boba_jetpack: 'neckwear_boba_jetpack',
  handheld_boba_jetpack: 'neckwear_boba_jetpack',
  cyber_wings: 'neckwear_cyber_wings',
  pioneer_cape: 'neckwear_pioneer_cape',
  magic_wand: 'handheld_magic_wand',
  gold_keyboard: 'handheld_gold_keyboard',
  floating_grimoire: 'handheld_floating_grimoire',
});
function resolveWardrobeNodeId(rawId) {
  if (!rawId || rawId === 'none' || rawId === 'none_head') return null;
  if (CANONICAL_NODE_MAP[rawId]) return CANONICAL_NODE_MAP[rawId];
  if (HEAD_NODES.has(rawId) || BODY_NODES.has(rawId)) return rawId;
  return null;
}
const SOURCES = Object.freeze({
  original: { url: new URL('./original-dinosaur.glb', import.meta.url).href, label: '原始模型', rotationY: -Math.PI / 2 },
  animated: { url: new URL('./dinosaur.glb', import.meta.url).href, label: '原模型·骨骼动作', rotationY: 0 },
});
const CLIP_LABELS = { Idle: '待机', Wave: '挥手', Walk: '走路' };
const VIEW_POSITIONS = {
  front: [0, 0.52, 3], back: [0, 0.52, -3],
  left: [3, 0.52, 0], right: [-3, 0.52, 0],
  threeQuarter: [0.88, 0.75, 3],
};
const BLINK_INTERVALS = [3.6, 5.2, 4.4, 6.1];
const ease = value => { const x = T.MathUtils.clamp(value, 0, 1); return x * x * (3 - 2 * x); };
const blinkAt = age => age < 0.065 ? ease(age / 0.065) : age < 0.13 ? 1 : 1 - ease((age - 0.13) / 0.13);

function startInspector() {
  const stage = document.querySelector('#stage');
  const status = document.querySelector('#status');
  const pauseButton = document.querySelector('#pause');
  const playbackNote = document.querySelector('#playback-note');
  const sourceSelector = document.querySelector('#model-source');
  const expressionPanel = document.querySelector('[data-controls="expression"]');
  const viewButtons = [...document.querySelectorAll('[data-view]')];
  const clipButtons = [...document.querySelectorAll('[data-clip]')];
  const expressionButtons = [...document.querySelectorAll('[data-expression]')];
  const allButtons = [...viewButtons, ...clipButtons, ...expressionButtons, pauseButton];
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const scene = new T.Scene();
  scene.background = new T.Color(0xf2f5f2);
  // Presentation transforms live outside the imported scene. Never rewrite its
  // vertex buffers, materials, authored transforms or the original GLB file.
  const display = new T.Group();
  scene.add(display);
  const camera = new T.OrthographicCamera(-0.8, 0.8, 0.675, -0.675, 0.01, 20);
  let renderer;
  let controls;
  let model;
  let mixer;
  let currentAction;
  let source = 'original';
  let loadToken = 0;
  let pendingAsset = null;
  let currentClip = null;
  let view = 'front';
  let expression = 'auto';
  let blinkReturn = 'auto';
  let blinkAge = 0;
  let naturalBlinkStart = -Infinity;
  let nextNaturalBlink = BLINK_INTERVALS[0];
  let naturalBlinkIndex = 0;
  let paused = motionPreference.matches;
  let loaded = false;
  let ready = false;
  let failed = false;
  let disposed = false;
  let frameId = 0;
  let lastFrame = null;
  let rendering = false;
  let pendingFinished = false;
  let elapsed = 0;
  let frames = 0;
  let boneCount = 0;
  let meshCount = 0;
  let modelWidth = 0.8;
  let blinkWeight = 0;
  let happyWeight = 0;
  const actions = new Map();
  const fadeOuts = new Map();
  const morphs = { Blink: [], Happy: [] };
  const closedImages = new WeakSet();
  let wardrobeLoaded = false;
  const wardrobeNodes = new Map();
  const baseSkinMaterials = [];
  let sanctuarySpeciesId = 'mint_star';
  let activeWardrobeIds = [];

  function readSanctuaryStorage() {
    try {
      const raw = localStorage.getItem('ans.mascot.sanctuary.v1');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function syncSanctuaryAppearance(overrideState = null) {
    if (disposed || failed || !model) return;
    const st = overrideState || readSanctuaryStorage();
    const speciesId = (st && SPECIES_TINTS[st.speciesId]) ? st.speciesId : 'mint_star';
    sanctuarySpeciesId = speciesId;
    const tint = SPECIES_TINTS[speciesId];
    for (const entry of baseSkinMaterials) {
      const { mat, baseColor, baseEmissive, baseRoughness } = entry;
      if (mat.color && baseColor) mat.color.copy(baseColor).multiply(new T.Color(tint.color));
      if (mat.emissive && baseEmissive) {
        mat.emissive.copy(baseEmissive).add(new T.Color(tint.emissive));
        mat.emissiveIntensity = tint.emissiveIntensity;
      }
      if (typeof mat.roughness === 'number' && typeof baseRoughness === 'number') {
        mat.roughness = Math.max(0.12, Math.min(0.95, baseRoughness + tint.roughnessDelta));
      }
    }
    const eq = st?.equipped || {
      headwear: 'starter_antenna',
      eyewear: 'none',
      neckwear: 'starter_scarf',
      handheld: 'none',
      aura: 'aura_mint',
    };
    const nextActive = new Set();
    if (SPECIES_HEAD_NODE[speciesId]) nextActive.add(SPECIES_HEAD_NODE[speciesId]);
    for (const rawVal of Object.values(eq)) {
      const resolved = resolveWardrobeNodeId(rawVal);
      if (resolved) nextActive.add(resolved);
    }
    activeWardrobeIds = [...nextActive];
    const hatTuck = eq.headwear === 'beret_cloud' || eq.headwear === 'phd_mortarboard';
    for (const [nodeName, nodeObj] of wardrobeNodes.entries()) {
      nodeObj.visible = nextActive.has(nodeName);
      if (nodeName.startsWith('species_')) {
        nodeObj.scale.set(hatTuck ? 0.68 : 1, hatTuck ? 0.62 : 1, hatTuck ? 0.68 : 1);
      }
    }
    requestFrame();
  }

  function tellParent(type, details = {}) {
    parent.postMessage({ type, source, paused, ...details }, location.origin);
  }

  function reportState() {
    if (!ready || failed || disposed) return;
    tellParent('ans-model-state', { currentClip, view });
  }

  function hasExpressions() { return morphs.Blink.length > 0 || morphs.Happy.length > 0; }
  function hasMotion() { return actions.size > 0 || morphs.Blink.length > 0; }
  function wantsAnimation() { return !paused && (currentAction || (morphs.Blink.length && ['auto', 'blink'].includes(expression))); }

  function stopFrames() {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    lastFrame = null;
  }

  function showError(message) {
    if (failed || disposed) return;
    failed = true;
    ready = false;
    stopFrames();
    status.dataset.state = 'error';
    status.textContent = message;
    for (const button of allButtons) button.disabled = true;
    if (controls) controls.enabled = false;
    tellParent('ans-model-error', { message });
  }

  try {
    renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  } catch {
    showError('无法创建三维画面。请使用支持 WebGL 的浏览器，并检查硬件加速是否开启。');
    return;
  }
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = SETTINGS.exposure;
  renderer.debug.onShaderError = () => showError('模型着色失败。请刷新页面；若仍失败，请检查浏览器的图形支持。');
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', '兔兔龙模型，可用鼠标或触摸旋转缩放，也可使用右侧视角按钮');
  stage.append(renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.enablePan = false;
  controls.minZoom = 0.55;
  controls.maxZoom = 4;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;
  controls.minAzimuthAngle = -Infinity;
  controls.maxAzimuthAngle = Infinity;
  controls.target.set(0, 0.52, 0);
  controls.enabled = false;

  // Match the companion's neutral setup without modifying the GLB materials.
  scene.add(new T.HemisphereLight(0xf7f9f8, 0xb5bab8, 1.25));
  const key = new T.DirectionalLight(0xf8faf9, 2.05);
  key.position.set(-2.6, 3.8, 4.2);
  const fill = new T.DirectionalLight(0xf4f7f8, 0.58);
  fill.position.set(3.5, 1.1, 2.2);
  const rim = new T.DirectionalLight(0xf6faf8, 0.62);
  rim.position.set(1.5, 2.5, -3.2);
  scene.add(key, fill, rim);

  function updatePressed(buttons, key, active) {
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset[key] === active));
  }

  function updatePauseControl() {
    if (loaded && !hasMotion()) {
      pauseButton.textContent = '静态模型';
      pauseButton.setAttribute('aria-pressed', 'false');
      pauseButton.disabled = true;
      playbackNote.textContent = '原文件没有骨骼动画。可自由旋转和缩放查看。';
      return;
    }
    pauseButton.textContent = paused ? '继续动画' : '暂停动画';
    pauseButton.setAttribute('aria-pressed', String(paused));
    playbackNote.textContent = paused
      ? '已暂停。仍可自由旋转缩放和切换视角。'
      : '挥手播放一次，随后回到待机。走路在原地循环。';
  }

  function updateStatus() {
    if (!ready || failed) return;
    status.dataset.state = 'ready';
    status.textContent = actions.size
      ? `${SOURCES[source].label}已加载。当前：${CLIP_LABELS[currentClip] || currentClip}。可旋转观察动作。`
      : `${SOURCES[source].label}已加载。可 360° 旋转查看。`;
  }

  function updateAvailableControls() {
    for (const button of viewButtons) button.disabled = !ready || failed;
    for (const button of clipButtons) button.disabled = !ready || failed || !actions.has(button.dataset.clip);
    for (const button of expressionButtons) {
      const name = button.dataset.expression;
      const supported = name === 'happy' ? morphs.Happy.length : ['auto', 'blink'].includes(name) ? morphs.Blink.length : hasExpressions();
      button.disabled = !ready || failed || !supported;
    }
    if (expressionPanel) expressionPanel.hidden = !hasExpressions();
    pauseButton.disabled = !ready || failed || !hasMotion();
    updatePauseControl();
  }

  function requestFrame() {
    if (!loaded || failed || disposed || document.hidden || frameId || rendering) return;
    frameId = requestAnimationFrame(tick);
  }

  function setView(name) {
    const position = VIEW_POSITIONS[name];
    if (!position || failed || disposed) return;
    view = name === 'threeQuarter' ? 'custom' : name;
    camera.position.fromArray(position);
    camera.up.set(0, 1, 0);
    camera.zoom = 1;
    controls.target.set(0, 0.52, 0);
    camera.updateProjectionMatrix();
    controls.update();
    updatePressed(viewButtons, 'view', view);
    requestFrame();
  }

  function playClip(name) {
    const next = actions.get(name);
    if (!next || failed || disposed) return;
    const previous = currentAction;
    fadeOuts.delete(next);
    next.stopFading().reset().setEffectiveWeight(1).setEffectiveTimeScale(1);
    next.setLoop(name === 'Wave' ? T.LoopOnce : T.LoopRepeat, name === 'Wave' ? 1 : Infinity);
    next.clampWhenFinished = name === 'Wave';
    next.play();
    if (previous && previous !== next) {
      if (paused) {
        previous.stop();
      } else {
        previous.crossFadeTo(next, SETTINGS.clipFade, false);
        fadeOuts.set(previous, elapsed + SETTINGS.clipFade + 0.035);
      }
    }
    currentAction = next;
    currentClip = name;
    pendingFinished = false;
    mixer.update(0);
    updatePressed(clipButtons, 'clip', name);
    updateStatus();
    requestFrame();
  }

  function setExpression(name) {
    if (!['open', 'blink', 'happy', 'auto'].includes(name) || failed || disposed) return;
    if (!hasExpressions() || (name === 'happy' && !morphs.Happy.length) || (['auto', 'blink'].includes(name) && !morphs.Blink.length)) return;
    if (name === 'blink') {
      if (expression !== 'blink') blinkReturn = expression;
      // Hold the closed shape for inspection when animation is paused.
      blinkAge = paused ? 0.09 : 0;
    }
    expression = name;
    naturalBlinkStart = -Infinity;
    nextNaturalBlink = elapsed + BLINK_INTERVALS[0];
    updatePressed(expressionButtons, 'expression', name);
    updateMorphs(0);
    requestFrame();
  }

  function setMorph(name, weight) {
    for (const { mesh, index } of morphs[name]) mesh.morphTargetInfluences[index] = weight;
  }

  function updateMorphs(dt) {
    blinkWeight = 0;
    if (!hasExpressions()) { happyWeight = 0; return; }
    happyWeight = expression === 'happy' ? 1 : 0;
    if (expression === 'blink') {
      blinkAge += dt;
      if (blinkAge >= 0.29) {
        expression = blinkReturn;
        updatePressed(expressionButtons, 'expression', expression);
        happyWeight = expression === 'happy' ? 1 : 0;
      } else {
        blinkWeight = blinkAt(blinkAge);
        happyWeight = blinkReturn === 'happy' ? 1 - blinkWeight : 0;
      }
    } else if (expression === 'auto') {
      if (elapsed >= nextNaturalBlink) {
        naturalBlinkStart = elapsed;
        nextNaturalBlink = elapsed + BLINK_INTERVALS[++naturalBlinkIndex % BLINK_INTERVALS.length];
      }
      blinkWeight = blinkAt(elapsed - naturalBlinkStart);
    }
    happyWeight = T.MathUtils.clamp(happyWeight, 0, 1);
    blinkWeight = T.MathUtils.clamp(blinkWeight, 0, 1 - happyWeight);
    setMorph('Happy', happyWeight);
    setMorph('Blink', blinkWeight);
  }

  function setPaused(value) {
    if (typeof value !== 'boolean' || failed || disposed) return;
    paused = value;
    lastFrame = null;
    updatePauseControl();
    requestFrame();
    reportState();
  }

  function togglePause() { setPaused(!paused); }

  function resize() {
    if (failed || disposed) return;
    const { width, height } = stage.getBoundingClientRect();
    const aspect = Math.max(width, 1) / Math.max(height, 1);
    const vertical = Math.max(SETTINGS.frameHeight, (modelWidth + 0.22) / aspect);
    camera.left = -vertical * aspect / 2;
    camera.right = vertical * aspect / 2;
    camera.top = vertical / 2;
    camera.bottom = -vertical / 2;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SETTINGS.pixelRatio));
    renderer.setSize(Math.max(width, 1), Math.max(height, 1), false);
    requestFrame();
  }

  function tick(stamp) {
    frameId = 0;
    if (!loaded || failed || disposed || document.hidden) return;
    if (lastFrame !== null && stamp - lastFrame < 1000 / SETTINGS.maxFps - 0.25) {
      requestFrame();
      return;
    }
    const dt = paused || lastFrame === null ? 0 : Math.min((stamp - lastFrame) / 1000, 0.08);
    lastFrame = stamp;
    elapsed += dt;
    rendering = true;
    try {
      mixer?.update(dt);
      if (pendingFinished) playClip('Idle');
      for (const [action, stopAt] of fadeOuts) {
        if (elapsed >= stopAt) { action.stop(); fadeOuts.delete(action); }
      }
      updateMorphs(dt);
      controls.update();
      renderer.render(scene, camera);
      if (renderer.getContext().isContextLost()) {
        showError('三维画面已中断。请刷新页面重新加载。');
      }
      if (!failed) {
        frames += 1;
        if (!ready) {
          ready = true;
          controls.enabled = true;
          updateAvailableControls();
          updateStatus();
          tellParent('ans-model-ready', { clips: [...actions.keys()], bones: boneCount, expressions: hasExpressions() });
        }
      }
    } catch {
      showError('模型渲染失败。请刷新页面；若仍失败，请检查模型文件和浏览器图形支持。');
    } finally {
      rendering = false;
    }
    if (wantsAnimation() && !failed) requestFrame();
  }

  function onVisibility() {
    stopFrames();
    if (!document.hidden) requestFrame();
  }

  function onReducedMotion(event) {
    if (event.matches) {
      stopFrames();
      setPaused(true);
    } else {
      // Removing the preference does not override the viewer's explicit pause.
      reportState();
    }
  }

  function releaseObject(object) {
    if (!object) return;
    const geometry = new Set(), materials = new Set(), textures = new Set();
    const skeletons = new Set(), images = new Set();
    object.traverse(node => {
      if (node.geometry) geometry.add(node.geometry);
      if (node.material) for (const material of Array.isArray(node.material) ? node.material : [node.material]) materials.add(material);
      if (node.isSkinnedMesh && node.skeleton) skeletons.add(node.skeleton);
    });
    for (const material of materials) for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    for (const texture of textures) {
      const data = texture.source?.data ?? texture.image;
      for (const image of Array.isArray(data) ? data : [data]) {
        if (image && typeof image.close === 'function') images.add(image);
      }
    }
    for (const value of geometry) value.dispose();
    for (const value of materials) value.dispose();
    for (const value of textures) value.dispose();
    for (const skeleton of skeletons) skeleton.dispose();
    // GLTFLoader's ImageBitmapLoader does not close decoded bitmaps for us.
    // Shared images within one asset close once, including stale source loads.
    for (const image of images) {
      if (closedImages.has(image)) continue;
      image.close();
      closedImages.add(image);
    }
  }

  function clearModel() {
    mixer?.stopAllAction();
    if (model) {
      mixer?.uncacheRoot(model);
      display.remove(model);
      releaseObject(model);
    }
    if (pendingAsset && pendingAsset !== model) releaseObject(pendingAsset);
    model = null;
    pendingAsset = null;
    mixer = null;
    currentAction = undefined;
    currentClip = null;
    actions.clear();
    fadeOuts.clear();
    wardrobeNodes.clear();
    baseSkinMaterials.length = 0;
    wardrobeLoaded = false;
    activeWardrobeIds = [];
    morphs.Blink.length = 0;
    morphs.Happy.length = 0;
    boneCount = 0;
    meshCount = 0;
    loaded = false;
    ready = false;
    blinkWeight = 0;
    happyWeight = 0;
    expression = 'open';
    pendingFinished = false;
    display.position.set(0, 0, 0);
    display.rotation.set(0, 0, 0);
    display.scale.setScalar(1);
    renderer.renderLists?.dispose();
  }

  const onSanctuarySync = () => syncSanctuaryAppearance();

  function receiveMessage(event) {
    if (event.origin !== location.origin || event.source !== parent) return;
    const data = event.data;
    if (!data || typeof data !== 'object' || data.type !== 'ans-model') return;
    if (data.event === 'source' && Object.hasOwn(SOURCES, data.source)) changeSource(data.source);
    if (data.event === 'view' && ['front', 'back', 'left', 'right'].includes(data.view)) setView(data.view);
    if (data.event === 'clip' && typeof data.name === 'string') playClip(data.name);
    if (data.event === 'pause' && typeof data.paused === 'boolean') setPaused(data.paused);
    if (data.event === 'sanctuary') syncSanctuaryAppearance(data.state || null);
    if (data.event === 'state') reportState();
    if (data.event === 'background' && typeof data.color === 'string' && /^#(?:[\da-fA-F]{3}|[\da-fA-F]{6})$/.test(data.color)) {
      scene.background.set(data.color);
      requestFrame();
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    loadToken += 1;
    stopFrames();
    resizeObserver?.disconnect();
    controls.dispose();
    clearModel();
    renderer.dispose();
    removeEventListener('resize', resize);
    removeEventListener('message', receiveMessage);
    removeEventListener('storage', onSanctuarySync);
    removeEventListener('ans:mascot-sanctuary-sync', onSanctuarySync);
    removeEventListener('ans:sanctuary-updated', onSanctuarySync);
    document.removeEventListener('visibilitychange', onVisibility);
    motionPreference.removeEventListener('change', onReducedMotion);
  }

  controls.addEventListener('change', requestFrame);
  controls.addEventListener('start', () => {
    view = 'custom';
    updatePressed(viewButtons, 'view', view);
  });
  for (const button of viewButtons) button.addEventListener('click', () => setView(button.dataset.view));
  for (const button of clipButtons) button.addEventListener('click', () => playClip(button.dataset.clip));
  for (const button of expressionButtons) button.addEventListener('click', () => setExpression(button.dataset.expression));
  pauseButton.addEventListener('click', togglePause);
  sourceSelector?.addEventListener('change', () => changeSource(sourceSelector.value));
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    showError('三维画面已中断。请刷新页面重新加载。');
  });
  const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(stage);
  addEventListener('resize', resize);
  addEventListener('message', receiveMessage);
  addEventListener('storage', onSanctuarySync);
  addEventListener('ans:mascot-sanctuary-sync', onSanctuarySync);
  addEventListener('ans:sanctuary-updated', onSanctuarySync);
  addEventListener('pagehide', dispose, { once: true });
  document.addEventListener('visibilitychange', onVisibility);
  motionPreference.addEventListener('change', onReducedMotion);
  updatePauseControl();
  setView('threeQuarter');
  resize();

  Object.defineProperty(window, '__ANS_MODEL_INSPECTOR__', {
    configurable: true,
    value: Object.freeze({ syncSanctuary: syncSanctuaryAppearance, snapshot: () => ({
      source, loaded, ready, failed, disposed, paused, view, currentClip, expression,
      frames, time: Number(elapsed.toFixed(3)), cameraPosition: camera.position.toArray(),
      cameraZoom: camera.zoom, bones: boneCount, meshes: meshCount,
      clips: [...actions.keys()],
      expressions: hasExpressions(), background: `#${scene.background.getHexString()}`,
      morphs: { Blink: blinkWeight, Happy: happyWeight, totalEyeClosure: blinkWeight + happyWeight },
      sanctuary: {
        speciesId: sanctuarySpeciesId,
        wardrobeLoaded,
        activeWardrobeIds: [...activeWardrobeIds],
        totalWardrobeNodes: wardrobeNodes.size,
      },
      actionWeights: Object.fromEntries([...actions].map(([name, action]) => [name, action.isScheduled() ? action.getEffectiveWeight() : 0])),
    }) }),
  });

  function installAsset(gltf) {
    model = gltf.scene;
    pendingAsset = null;
    display.rotation.y = SOURCES[source].rotationY;
    display.add(model);
    display.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(model);
    const height = box.max.y - box.min.y;
    if (!Number.isFinite(height) || height <= 0) {
      showError('模型尺寸无效，无法显示。请检查选中的 GLB 文件。');
      return;
    }
    // The source includes its own display plane. Keep it untouched, but frame
    // the character above the lowest 3.5% so that the plane cannot shrink it.
    const framing = new T.Box3();
    const vertex = new T.Vector3();
    const cutoff = box.min.y + height * 0.035;
    if (source === 'original') {
      model.traverse(node => {
        const position = node.geometry?.attributes.position;
        if (!node.isMesh || !position) return;
        for (let i = 0; i < position.count; i += 1) {
          vertex.fromBufferAttribute(position, i).applyMatrix4(node.matrixWorld);
          if (vertex.y > cutoff) framing.expandByPoint(vertex);
        }
      });
    }
    if (framing.isEmpty()) framing.copy(box);
    const center = framing.getCenter(new T.Vector3());
    const scale = 1 / height;
    display.scale.setScalar(scale);
    display.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    modelWidth = (framing.max.x - framing.min.x) * scale;
    let headBone = null;
    let bodyBone = null;
    model.traverse(node => {
      if (node.isBone) {
        boneCount += 1;
        const bName = node.userData?.name || node.name;
        if (bName === 'head') headBone = node;
        if (bName === 'body') bodyBone = node;
      }
      if (!node.isMesh) return;
      meshCount += 1;
      if (node.material) {
        const mats = Array.isArray(node.material) ? node.material.map(m => m.clone()) : [node.material.clone()];
        node.material = Array.isArray(node.material) ? mats : mats[0];
        for (const mat of mats) {
          baseSkinMaterials.push({
            mat,
            baseColor: mat.color ? mat.color.clone() : null,
            baseEmissive: mat.emissive ? mat.emissive.clone() : new T.Color(0x000000),
            baseRoughness: typeof mat.roughness === 'number' ? mat.roughness : 0.65,
          });
        }
      }
      for (const name of Object.keys(morphs)) {
        const index = node.morphTargetDictionary?.[name];
        if (index !== undefined && node.morphTargetInfluences) morphs[name].push({ mesh: node, index });
      }
    });
    if (gltf.animations.length) {
      mixer = new T.AnimationMixer(model);
      for (const clip of gltf.animations) actions.set(clip.name, mixer.clipAction(clip));
      mixer.addEventListener('finished', event => {
        if (event.action === currentAction && currentClip === 'Wave') pendingFinished = true;
      });
    }
    loaded = true;
    syncSanctuaryAppearance();
    if (headBone && bodyBone) {
      const activeToken = loadToken;
      const headMount = new T.Group();
      headMount.name = 'SanctuaryHeadWardrobeMount';
      const bodyMount = new T.Group();
      bodyMount.name = 'SanctuaryBodyWardrobeMount';
      headBone.add(headMount);
      bodyBone.add(bodyMount);
      new GLTFLoader().load(SETTINGS.wardrobeUrl, wGltf => {
        if (disposed || failed || activeToken !== loadToken || !wGltf?.scene) return;
        for (const child of wGltf.scene.children) {
          const name = child.name;
          if (!HEAD_NODES.has(name) && !BODY_NODES.has(name)) continue;
          const cloned = child.clone(true);
          cloned.visible = false;
          if (HEAD_NODES.has(name)) headMount.add(cloned);
          else bodyMount.add(cloned);
          wardrobeNodes.set(name, cloned);
        }
        wardrobeLoaded = true;
        syncSanctuaryAppearance();
      }, undefined, () => {});
    }
    if (actions.size) playClip(actions.has('Idle') ? 'Idle' : actions.keys().next().value);
    if (hasExpressions()) setExpression(morphs.Blink.length ? 'auto' : 'open');
    updateAvailableControls();
    setView('threeQuarter');
    resize();
    requestFrame();
  }

  function changeSource(nextSource) {
    if (!Object.hasOwn(SOURCES, nextSource) || disposed) return;
    if (source === nextSource && loaded && !failed) return;
    const token = ++loadToken;
    source = nextSource;
    stopFrames();
    clearModel();
    failed = false;
    elapsed = 0;
    naturalBlinkStart = -Infinity;
    nextNaturalBlink = BLINK_INTERVALS[0];
    status.dataset.state = 'loading';
    status.textContent = `正在加载${SOURCES[source].label}及原始贴图…`;
    if (sourceSelector) sourceSelector.value = source;
    controls.enabled = false;
    updateAvailableControls();
    updatePressed(clipButtons, 'clip', null);
    updatePressed(expressionButtons, 'expression', null);
    try {
      // Do not leave the previous source painted while the replacement loads.
      renderer.render(scene, camera);
    } catch {
      showError('无法更新三维画面。请刷新页面重新加载。');
      return;
    }
    let parsed = null;
    let resourcesComplete = false;
    let settled = false;
    const manager = new T.LoadingManager();
    function finish() {
      if (settled || !parsed || !resourcesComplete || failed || disposed || token !== loadToken) return;
      settled = true;
      try {
        installAsset(parsed);
      } catch {
        showError('模型数据无法用于三维显示。请检查选中的 GLB 文件。');
      }
    }
    manager.onError = () => {
      if (token !== loadToken || disposed) return;
      settled = true;
      showError('模型或原始贴图加载失败。未显示为已就绪，请重新选择模型或刷新页面重试。');
    };
    manager.onLoad = () => { resourcesComplete = true; finish(); };
    new GLTFLoader(manager).load(SOURCES[source].url, gltf => {
      if (token !== loadToken || disposed || failed || settled) { releaseObject(gltf.scene); return; }
      parsed = gltf;
      pendingAsset = gltf.scene;
      finish();
    }, undefined, () => {
      if (token !== loadToken || disposed) return;
      settled = true;
      showError('模型加载失败。请检查网络连接，重新选择模型或刷新页面重试。');
    });
  }

  changeSource('original');
}

startInspector();
