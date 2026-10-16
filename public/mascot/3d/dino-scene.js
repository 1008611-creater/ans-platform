import * as T from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { DinoPerformance } from './controller.mjs?v=expressive6';
import { MotionDirector } from './motion-director.mjs?v=expressive6';
import { FaceVoiceController } from './face-voice.mjs?v=voice-points-20261013-1';
import { OrbitControls } from './vendor/OrbitControls.js';
import { installCompanion } from './companion-widget.mjs?v=settings-20261012-2';

const VERSION = 'ans-mascot-settings-20261012-2';
const DOCK = new URLSearchParams(location.search).get('dock') === '1';
const SOURCE_SHA256 = 'e420b1580e76a5871e0427e8b2fe1756532692af377b9f30c67d7038517efa51';
const SETTINGS = Object.freeze({
  modelUrl: new URL('./dinosaur.glb', import.meta.url).href,
  wardrobeUrl: new URL('./sanctuary-wardrobe.glb', import.meta.url).href,
  maxFps: 30, maxPixelRatio: 1.75, verticalFrame: 1.48,
  shadowOpacity: 0.12,
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
// Lifecycle test harness fallback; the live companion keeps its own scoped controller.

const PHASES = new Set([
  'idle', 'input', 'saving', 'confirm', 'ready', 'submitting', 'queued',
  'working', 'review', 'editing', 'recovering', 'attention', 'failed',
  'cancelled', 'archived',
]);

function releaseGraph(root) {
  if (!root) return;
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const skeletons = new Set();
  const images = new Set();
  root.traverse(node => {
    if (node.geometry) geometries.add(node.geometry);
    if (node.skeleton) skeletons.add(node.skeleton);
    if (node.material) for (const material of Array.isArray(node.material) ? node.material : [node.material]) materials.add(material);
  });
  for (const material of materials) for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
  for (const skeleton of skeletons) skeleton.dispose();
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) {
    if (texture.source?.data?.close) images.add(texture.source.data);
    texture.dispose();
  }
  for (const image of images) image.close();
}

function startCompanion() {
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const themePreference = matchMedia('(prefers-color-scheme: dark)');
  const scene = new T.Scene();
  const actor = new T.Group();
  const framing = new T.Group();
  const camera = new T.OrthographicCamera(-0.7, 0.7, 0.7, -0.7, 0.01, 12);
  camera.position.set(0.11, 0.65, 3.2);
  camera.lookAt(0, 0.58, 0);
  actor.add(framing);
  scene.add(actor);

  let renderer, model, performer, faceVoice, pendingModel;
  let wardrobeLoaded = false;
  const wardrobeNodes = new Map();
  const baseSkinMaterials = [];
  let sanctuarySpeciesId = 'mint_star';
  let activeWardrobeIds = [];
  let sourceClips = [];
  let phase = 'idle';
  let parentVisible = true;
  let pageSuspended = false;
  let calmMode = false;
  let voiceEnabled = window.parent === window;
  let voiceVolume = 0.65;
  let reducedMotion = motionPreference.matches;
  let disposed = false, failed = false, ready = false, modelLoaded = false;
  let resourcesComplete = false, rafId = 0, lastFrameStamp = null;
  let time = 0, frames = 0, modelWidth = 0.85;
  const director = new MotionDirector({ autoplay: true });
  let orbit = null;
  let lastReportedGesture = null;
  let themeObserver;

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
    for (const [nodeName, nodeObj] of wardrobeNodes.entries()) {
      nodeObj.visible = nextActive.has(nodeName);
    }
    wake();
  }

  function animateWardrobeNodes(nowSec) {
    if (!wardrobeLoaded || !wardrobeNodes.size) return;
    const grimoire = wardrobeNodes.get('handheld_floating_grimoire');
    if (grimoire?.visible) {
      grimoire.position.y = (grimoire.userData.baseY ?? 0.16) + Math.sin(nowSec * 3.1) * 0.022;
      grimoire.rotation.y = (grimoire.userData.baseRY ?? 0) + Math.sin(nowSec * 1.7) * 0.12;
    }
    const wand = wardrobeNodes.get('handheld_magic_wand');
    if (wand?.visible) {
      wand.rotation.z = (wand.userData.baseRZ ?? 0) + Math.sin(nowSec * 3.8) * 0.08;
    }
    const crown = wardrobeNodes.get('headwear_crown_aurora');
    if (crown?.visible) {
      crown.position.y = (crown.userData.baseY ?? 0) + Math.sin(nowSec * 2.6) * 0.008;
    }
    for (const auraKey of ['aura_mint', 'aura_gold', 'aura_sakura', 'aura_aurora']) {
      const auraNode = wardrobeNodes.get(auraKey);
      if (auraNode?.visible) {
        auraNode.rotation.y = nowSec * 0.65;
      }
    }
  }

  function tellParent(type, extra = {}) {
    parent.postMessage({ type, ...extra }, location.origin);
  }
  function stopFrames() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    lastFrameStamp = null;
  }
  function fail(code) {
    if (disposed || failed) return;
    failed = true;
    ready = false;
    stopFrames();
    if (pendingModel) { releaseGraph(pendingModel.scene); pendingModel = null; }
    tellParent('ans-dino-error', { code });
  }
  function syncEmbeddingScheme() {
    // A transparent iframe becomes opaque when its used color scheme differs
    // from its embedding element. Read only same-origin presentation metadata.
    try {
      const embedding = window.frameElement;
      document.documentElement.style.colorScheme = embedding
        ? embedding.ownerDocument.defaultView.getComputedStyle(embedding).colorScheme || 'normal'
        : 'normal';
    } catch { document.documentElement.style.colorScheme = 'normal'; }
  }
  syncEmbeddingScheme();
  try {
    const embedding = window.frameElement;
    if (embedding) {
      themeObserver = new MutationObserver(syncEmbeddingScheme);
      for (let element = embedding; element; element = element.parentElement) {
        themeObserver.observe(element, { attributes: true, attributeFilter: ['class', 'style', 'data-theme', 'data-mode'] });
      }
    }
  } catch { /* Cross-origin embedding is unsupported by the message protocol. */ }

  try {
    renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power', premultipliedAlpha: true });
  } catch {
    themeObserver?.disconnect();
    fail('WEBGL_UNAVAILABLE');
    return;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.debug.onShaderError = () => fail('SHADER_COMPILE_FAILED');
  renderer.domElement.setAttribute('aria-hidden', 'true');
  document.body.append(renderer.domElement);

  // Neutral studio light; the GLB's original textures and materials stay intact.
  scene.add(new T.HemisphereLight(0xf7f9f8, 0xb5bab8, 1.25));
  const key = new T.DirectionalLight(0xf8faf9, 2.05);
  key.position.set(-2.6, 3.8, 4.2);
  const fill = new T.DirectionalLight(0xf4f7f8, 0.58);
  fill.position.set(3.5, 1.1, 2.2);
  const rim = new T.DirectionalLight(0xf6faf8, 0.62);
  rim.position.set(1.5, 2.5, -3.2);
  scene.add(key, fill, rim);
  const contactMaterial = new T.ShaderMaterial({
    transparent: true, depthWrite: false, toneMapped: false,
    uniforms: { opacity: { value: SETTINGS.shadowOpacity } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'varying vec2 vUv;uniform float opacity;void main(){float r=length((vUv-.5)*2.0);float a=pow(1.0-smoothstep(.12,1.0,r),2.0)*opacity;gl_FragColor=vec4(.19,.27,.21,a);}',
  });
  const contact = new T.Mesh(new T.PlaneGeometry(0.81, 0.61), contactMaterial);
  contact.rotation.x = -Math.PI / 2;
  contact.position.set(0, 0.001, 0.025);
  scene.add(contact);

  function isVisible() {
    return !pageSuspended && !document.hidden && parentVisible;
  }
  function canAnimate() { return modelLoaded && !failed && !disposed && isVisible() && (!reducedMotion || faceVoice?.status === 'speaking'); }
  function wake() {
    if (!modelLoaded || failed || disposed || !isVisible()) return;
    if (reducedMotion && faceVoice?.status !== 'speaking') { stopFrames(); renderStill(); }
    else if (!rafId) { lastFrameStamp = null; rafId = requestAnimationFrame(tick); }
  }
  function applyNextGesture() {
    if (!performer) return;
    const command = director.next(time, performer.gesture, { active: ready && !reducedMotion && isVisible() });
    if (command) performer.trigger(command.gesture, time);
  }
  function hello() {
    if (disposed || failed || reducedMotion || !isVisible()) return;
    director.onHello(time);
    applyNextGesture();
    wake();
  }
  function changePhase(nextPhase) {
    if (!PHASES.has(nextPhase) || phase === nextPhase) return;
    phase = nextPhase;
    if (performer) performer.phase = phase;
    director.onPhase(phase, time, { active: !reducedMotion && isVisible() });
    applyNextGesture();
    if (reducedMotion || !isVisible()) performer?.trigger('idle', time);
    wake();
  }
  function suspend() {
    stopFrames();
    director.suspend(time);
    if (performer) {
      performer.pointerAt = -Infinity;
      performer.trigger('idle', time);
    }
  }
  function receiveMessage(event) {
    if (event.origin !== location.origin) return;
    // A legacy avatar module installs the parent dock; postMessage retains
    // that module's incumbent source window. Only that exact iframe is trusted.
    let trustedSource = event.source === parent;
    if (!trustedSource && window.parent !== window) {
      try { trustedSource = event.source === parent.document.querySelector('.ans-dino-canvas')?.contentWindow; }
      catch { /* Cross-origin parents are unsupported. */ }
    }
    if (!trustedSource) return;
    const data = event.data;
    if (!data || typeof data !== 'object' || data.type !== 'ans-dino') return;
    if (data.event === 'preferences') {
      voiceEnabled = data.voice === true;
      if (Number.isFinite(data.volume)) voiceVolume = Math.max(0, Math.min(1, data.volume));
      calmMode = data.calm === true;
      reducedMotion = motionPreference.matches || calmMode;
      director.setAutoplay(!reducedMotion, time);
      if (faceVoice) { faceVoice.volume = voiceVolume; if (faceVoice.audio) faceVoice.audio.volume = voiceVolume; if (!voiceEnabled) faceVoice.stopAudio(); }
      suspend(); wake();
    }
    if (data.event === 'sanctuary') {
      syncSanctuaryAppearance(data.state || null);
    }
    if (data.event === 'hello') hello();
    if (data.event === 'autoplay' && typeof data.enabled === 'boolean') {
      director.setAutoplay(data.enabled, time); applyNextGesture(); wake();
    }
    if (data.event === 'random' && ready && !reducedMotion) {director.onRandom(time); applyNextGesture(); wake();}
    if (data.event === 'gesture' && typeof data.gesture === 'string' && ready && !reducedMotion) {
      director.onGesture(data.gesture, time); applyNextGesture(); wake();
    }
    if (data.event === 'phase' && typeof data.phase === 'string') changePhase(data.phase);
    if (data.event === 'pointer' && !reducedMotion && isVisible() && Number.isFinite(data.x) && Number.isFinite(data.y)) {
      director.onPointer(time);
      applyNextGesture();
      performer?.look(data.x, data.y, time);
      wake();
    }
    if (data.event === 'speak' && voiceEnabled && typeof data.text === 'string') {
      if (typeof data.actor === 'string' && typeof data.policyVersion === 'string') faceVoice?.speak(data.text, 'Chloe', { actor: data.actor, policyVersion: data.policyVersion });
      wake();
    }
    if (data.event === 'stop-speech') { faceVoice?.stopAudio(); wake(); }
    if (data.event === 'visibility' && typeof data.visible === 'boolean') {
      const wasVisible = parentVisible;
      parentVisible = data.visible;
      if (!parentVisible) { faceVoice?.stopAudio(); suspend(); }
      else { if (!wasVisible) director.resume(time); wake(); }
    }
  }
  function resize() {
    if (disposed || failed) return;
    const width = Math.max(1, document.documentElement.clientWidth);
    const height = Math.max(1, document.documentElement.clientHeight);
    const aspect = width / height;
    const vertical = Math.max(SETTINGS.verticalFrame, (modelWidth + 0.18) / aspect);
    camera.left = -vertical * aspect / 2;
    camera.right = vertical * aspect / 2;
    camera.top = vertical / 2;
    camera.bottom = -vertical / 2;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SETTINGS.maxPixelRatio));
    renderer.setSize(width, height, false);
    wake();
  }
  function renderSafely(updatePose, initialFrame = false) {
    if (failed || disposed || (!initialFrame && !isVisible())) return false;
    try {
      updatePose();
      animateWardrobeNodes(time);
      const jump = performer?.rigTransform.jumpHeight || 0;
      const spread = 1 + jump * 3;
      contact.scale.set(spread, spread, 1);
      contact.position.x = performer?.rigTransform.x || 0;
      contact.position.z = 0.025 + (performer?.rigTransform.z || 0);
      contactMaterial.uniforms.opacity.value = SETTINGS.shadowOpacity * (1 - Math.min(0.45, jump * 5));
      orbit?.update();
      renderer.render(scene, camera);
      const currentGesture = performer?.gesture || 'idle';
      if (currentGesture !== lastReportedGesture) {
        lastReportedGesture = currentGesture; tellParent('ans-dino-motion', { gesture: currentGesture });
      }
      if (failed || disposed) return false;
      if (renderer.getContext().isContextLost()) { fail('WEBGL_CONTEXT_LOST'); return false; }
      frames += 1;
      if (!ready) {
        ready = true;
        tellParent('ans-dino-ready');
        applyNextGesture();
      }
      return true;
    } catch { fail('RENDER_FAILED'); return false; }
  }
  function renderStill() {
    if (!modelLoaded || failed || disposed || !isVisible()) return;
    renderSafely(() => { performer.update(time, 0, true); faceVoice?.update(time, 0, true); });
  }
  function tick(stamp) {
    rafId = 0;
    if (!canAnimate()) return;
    if (lastFrameStamp !== null && stamp - lastFrameStamp < 1000 / SETTINGS.maxFps - 0.25) {
      rafId = requestAnimationFrame(tick);
      return;
    }
    const dt = lastFrameStamp === null ? 0 : Math.min((stamp - lastFrameStamp) / 1000, 0.08);
    lastFrameStamp = stamp;
    time += dt;
    const rendered = renderSafely(() => {
      applyNextGesture();
      performer.update(time, dt, reducedMotion);
      faceVoice?.update(time, dt, reducedMotion);
    });
    if (rendered && canAnimate() && !rafId) rafId = requestAnimationFrame(tick);
  }
  function onMotionPreference(event) {
    reducedMotion = event.matches || calmMode;
    suspend();
    wake();
  }
  function onVisibility() {
    if (!isVisible()) { faceVoice?.stopAudio(); suspend(); }
    else { director.resume(time); wake(); }
  }
  function onPageHide(event) {
    if (!event.persisted) { dispose(); return; }
    pageSuspended = true;
    suspend();
  }
  function onPageShow(event) {
    if (!event.persisted || disposed) return;
    pageSuspended = false;
    director.resume(time);
    syncEmbeddingScheme();
    resize();
  }
  function onContextLost(event) { event.preventDefault(); fail('WEBGL_CONTEXT_LOST'); }
  const onSanctuarySync = () => syncSanctuaryAppearance();
  function dispose() {
    if (disposed) return;
    disposed = true;
    stopFrames();
    removeEventListener('message', receiveMessage);
    removeEventListener('storage', onSanctuarySync);
    removeEventListener('ans:mascot-sanctuary-sync', onSanctuarySync);
    removeEventListener('ans:sanctuary-updated', onSanctuarySync);
    try {
      if (window.parent && window.parent !== window) {
        window.parent.removeEventListener('ans:mascot-sanctuary-sync', onSanctuarySync);
        window.parent.removeEventListener('ans:sanctuary-updated', onSanctuarySync);
      }
    } catch {}
    removeEventListener('resize', resize);
    removeEventListener('pagehide', onPageHide);
    removeEventListener('pageshow', onPageShow);
    document.removeEventListener('visibilitychange', onVisibility);
    motionPreference.removeEventListener('change', onMotionPreference);
    themePreference.removeEventListener('change', syncEmbeddingScheme);
    themeObserver?.disconnect();
    renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
    orbit?.dispose();
    faceVoice?.dispose();
    faceVoice = null;
    performer = null;
    if (pendingModel) { releaseGraph(pendingModel.scene); pendingModel = null; }
    releaseGraph(scene);
    renderer.renderLists.dispose();
    renderer.dispose();
  }

  addEventListener('message', receiveMessage);
  addEventListener('storage', onSanctuarySync);
  addEventListener('ans:mascot-sanctuary-sync', onSanctuarySync);
  addEventListener('ans:sanctuary-updated', onSanctuarySync);
  try {
    if (window.parent && window.parent !== window) {
      window.parent.addEventListener('ans:mascot-sanctuary-sync', onSanctuarySync);
      window.parent.addEventListener('ans:sanctuary-updated', onSanctuarySync);
    }
  } catch {}
  addEventListener('resize', resize);
  addEventListener('pagehide', onPageHide);
  addEventListener('pageshow', onPageShow);
  document.addEventListener('visibilitychange', onVisibility);
  motionPreference.addEventListener('change', onMotionPreference);
  themePreference.addEventListener('change', syncEmbeddingScheme);
  renderer.domElement.addEventListener('webglcontextlost', onContextLost);
  if (DOCK) {
    orbit = new OrbitControls(camera, renderer.domElement);
    orbit.target.set(0, 0.58, 0); orbit.enablePan = false; orbit.enableZoom = false;
    orbit.enableDamping = true; orbit.dampingFactor = 0.1;
    orbit.minPolarAngle = 0.25; orbit.maxPolarAngle = Math.PI * 0.8;
    orbit.addEventListener('change', wake); orbit.update();
  }
  resize();
  Object.defineProperty(window, '__ANS_DINO__', {
    configurable: true,
    value: Object.freeze({ activateAudio: () => faceVoice?.activateAudio(), syncSanctuary: syncSanctuaryAppearance, snapshot: () => {
      const motion = performer?.snapshot() || null;
      return {
        version: VERSION, sourceSHA256: SOURCE_SHA256, modelLoaded, ready, failed, disposed,
        phase, currentClip: performer?.gesture === 'hello' ? 'Wave-arms-only' : null,
        performance: motion?.gesture || 'idle', performanceState: motion,
        face: faceVoice?.snapshot() || null,
        sanctuary: {
          speciesId: sanctuarySpeciesId,
          wardrobeLoaded,
          activeWardrobeIds: [...activeWardrobeIds],
          totalWardrobeNodes: wardrobeNodes.size,
        },
        visible: isVisible(), reducedMotion, animating: Boolean(rafId),
        time: Number(time.toFixed(3)), frames, fpsLimit: SETTINGS.maxFps,
        gaze: {
          yaw: motion?.sample?.head.y || 0, pitch: motion?.sample?.head.x || 0,
          headAngleDegrees: motion?.angles.head || 0, limitDegrees: 5.5,
        },
        rootHeight: performer?.rigTransform.jumpHeight || 0,
        rootTilt: performer?.rigTransform.rz || 0,
        groundCompensation: performer?.rigTransform.groundCompensation || 0,
        director: director.snapshot(),
        bones: performer ? [...performer.bones.keys()] : [], clips: [...sourceClips],
        poseMode: 'original-preserved-expressive', deployment: 'website-companion',
        colorScheme: document.documentElement.style.colorScheme,
        drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
      };
    } }),
  });

  function loadWardrobeAssets() {
    if (!performer || disposed || failed) return;
    const headBone = performer.bones.get('head');
    const bodyBone = performer.bones.get('body');
    if (!headBone || !bodyBone) return;
    const headMount = new T.Group();
    headMount.name = 'SanctuaryHeadWardrobeMount';
    const bodyMount = new T.Group();
    bodyMount.name = 'SanctuaryBodyWardrobeMount';
    headBone.add(headMount);
    bodyBone.add(bodyMount);

    new GLTFLoader().load(SETTINGS.wardrobeUrl, gltf => {
      if (disposed || failed || !gltf?.scene) return;
      for (const child of gltf.scene.children) {
        const name = child.name;
        if (!HEAD_NODES.has(name) && !BODY_NODES.has(name)) continue;
        const cloned = child.clone(true);
        cloned.traverse(sub => {
          if (sub.isMesh && sub.material) {
            sub.material = Array.isArray(sub.material)
              ? sub.material.map(m => m.clone())
              : sub.material.clone();
          }
        });
        cloned.userData.baseY = cloned.position.y;
        cloned.userData.baseRY = cloned.rotation.y;
        cloned.userData.baseRZ = cloned.rotation.z;
        cloned.visible = false;
        if (HEAD_NODES.has(name)) headMount.add(cloned);
        else bodyMount.add(cloned);
        wardrobeNodes.set(name, cloned);
      }
      wardrobeLoaded = true;
      syncSanctuaryAppearance();
    }, undefined, () => {
      // Wardrobe is an enhancement; never fail the core companion if unavailable.
    });
  }

  function installModel() {
    if (!pendingModel || !resourcesComplete || failed || disposed) return;
    const gltf = pendingModel;
    pendingModel = null;
    model = gltf.scene;
    model.traverse(node => {
      if (!node.isMesh || !node.material) return;
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
    });
    framing.add(model);
    model.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(model);
    const size = box.getSize(new T.Vector3());
    if (![size.x, size.y, size.z].every(Number.isFinite) || size.y <= 0) { fail('INVALID_MODEL_BOUNDS'); return; }
    const normalizer = 1 / size.y;
    framing.scale.setScalar(normalizer);
    framing.position.set(-(box.min.x + box.max.x) * normalizer / 2, -box.min.y * normalizer, 0);
    modelWidth = size.x * normalizer;
    try {
      performer = new DinoPerformance(model, gltf.animations);
      faceVoice = new FaceVoiceController(model, { onStatus: status => { tellParent('ans-dino-voice', status); wake(); } });
    } catch { fail('MODEL_CONTRACT_MISSING'); return; }
    sourceClips = gltf.animations.map(clip => clip.name);
    performer.phase = phase;
    modelLoaded = true;
    syncSanctuaryAppearance();
    loadWardrobeAssets();
    resize();
  }
  const manager = new T.LoadingManager();
  manager.onError = () => fail('MODEL_RESOURCE_FAILED');
  manager.onLoad = () => { resourcesComplete = true; installModel(); };
  new GLTFLoader(manager).load(SETTINGS.modelUrl, gltf => {
    if (disposed || failed) { releaseGraph(gltf.scene); return; }
    pendingModel = gltf;
    installModel();
  }, undefined, () => fail('MODEL_LOAD_FAILED'));
}

startCompanion();
// The existing Next avatar is the bootstrap; dock frames never install another dock.
if (!DOCK && window.parent !== window) {
  try {
    if (window.frameElement?.closest('.ans-dino-guide') && !window.frameElement.closest('[data-companion-owner=react]')) installCompanion(window.parent, window.frameElement);
  } catch { /* Only same-origin embedding is supported. */ }
}

