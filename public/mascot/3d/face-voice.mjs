import { VoiceClient } from "./voice-client.mjs";
import * as T from './vendor/three.module.js';

const BODY_GREEN = 0xa8cdb7;
const MOUTH_DARK = 0x18201b;
const TONGUE = 0xe98889;
const clamp01 = value => Math.max(0, Math.min(1, value));
const VISemeShapes = {
  rest: { open: 0.08, width: 0.92, round: 0.12 },
  closed: { open: 0.03, width: 0.88, round: 0.05 },
  A: { open: 0.92, width: 0.88, round: 0.28 },
  I: { open: 0.42, width: 1.14, round: 0.12 },
  U: { open: 0.48, width: 0.72, round: 0.72 },
  E: { open: 0.58, width: 1.08, round: 0.22 },
  O: { open: 0.76, width: 0.76, round: 0.88 },
  FV: { open: 0.22, width: 1.05, round: 0.08 },
};
const charViseme = char => {
  if (!char || /[,.!?;:\s]/.test(char)) return 'rest';
  const groups = {
    closed: '唇闭抿嗯不八', O: '乌无五我哦喔欧', U: '鱼于遇雨需许', I: '衣一已以你里',
    E: '诶额也', A: '啊阿爱开来大', FV: '夫福飞风',
  };
  for (const [name, chars] of Object.entries(groups)) if (chars.includes(char)) return name;
  return 'A';
};

function sphere(material, scale) {
  const mesh = new T.Mesh(new T.SphereGeometry(1, 24, 16), material);
  mesh.scale.copy(scale);
  mesh.renderOrder = 8;
  mesh.frustumCulled = false;
  return mesh;
}

export class FaceVoiceController {
  constructor(model, { onStatus = () => {} } = {}) {
    this.model = model;
    this.onStatus = onStatus;
    this.head = null;
    model.traverse(node => { if (!this.head && node.isBone && (node.userData.name || node.name) === 'head') this.head = node; });
    if (!this.head) throw new Error('Missing head bone for face runtime');

    this.face = new T.Group();
    this.face.name = 'ANS_RuntimeFace';
    this.face.frustumCulled = false; this.face.visible = true; this.face.visible = false;
    // The face is a child of the animated head. This keeps it in the model's
    // bind scale and avoids the world-space scale explosion that made the old
    // mouth render as a black oval across the whole body.
    this.head.add(this.face);
    this.face.position.set(0, -0.055, 0.18);

    const lidMaterial = new T.MeshStandardMaterial({ color: BODY_GREEN, roughness: 0.9, metalness: 0, depthTest: true, depthWrite: false });
    const mouthMaterial = new T.MeshStandardMaterial({ color: MOUTH_DARK, roughness: 0.58, metalness: 0, depthTest: false, depthWrite: false });
    const tongueMaterial = new T.MeshStandardMaterial({ color: TONGUE, roughness: 0.75, metalness: 0, depthTest: false, depthWrite: false });
    this.lids = [
      sphere(lidMaterial, new T.Vector3(0.045, 0.021, 0.012)),
      sphere(lidMaterial, new T.Vector3(0.045, 0.021, 0.012)),
    ];
    this.lids[0].position.set(-0.11, 0.018, 0.028);
    this.lids[1].position.set(0.11, 0.018, 0.028);
    this.lids.forEach(lid => { lid.scale.y = 0.035; this.face.add(lid); });

    this.mouth = sphere(mouthMaterial, new T.Vector3(0.018, 0.008, 0.004));
    this.mouth.position.set(0, -0.065, 0.03);
    this.mouth.scale.y = 0.16;
    this.face.add(this.mouth);
    this.tongue = sphere(tongueMaterial, new T.Vector3(0.009, 0.0035, 0.002));
    this.tongue.position.set(0, -0.078, 0.046);
    this.tongue.scale.y = 0.04;
    this.face.add(this.tongue);

    this.audio = null; this.audioUrl = null; this.audioSource = null;
    this.speechRequestId = 0; this.speechAbort = null; this.audioCache = new Map();
    this.audioContext = null; this.analyser = null; this.audioData = null;
    this.voiceLevel = 0; this.mouthOpen = 0; this.blink = 0;
    this.blinkFrom = 0; this.blinkStarted = -Infinity;
    this.nextBlinkAt = 2.4 + Math.random() * 2.8;
    this.status = 'idle';
    this.text = ''; this.timeline = []; this.viseme = 'rest'; this.visemeBlend = 0;
  }

  scheduleBlink(time) { this.blinkStarted = time; this.blinkFrom = this.blink; this.nextBlinkAt = time + 2.6 + Math.random() * 4.2; }

  buildTimeline(text, duration) {
    const chars = [...String(text || '')].filter(Boolean);
    if (!chars.length || !Number.isFinite(duration) || duration <= 0) { this.timeline = []; return; }
    const weights = chars.map(ch => /[锛屻€傦紒锛熴€侊紱锛?.!?\s]/.test(ch) ? 0.55 : 1);
    const total = weights.reduce((a, b) => a + b, 0);
    let cursor = 0;
    this.timeline = chars.map((ch, index) => {
      const start = cursor;
      cursor += duration * weights[index] / total;
      return { start, end: cursor, viseme: charViseme(ch) };
    });
  }

  setAudio(audio, text) {
    this.audio = audio; this.text = text || '';
    audio.addEventListener('loadedmetadata', () => this.buildTimeline(this.text, audio.duration));
    audio.addEventListener('ended', () => {
      if (this.audio !== audio) return;
      this.status = 'idle'; this.onStatus({ state: 'ended' }); this.stopAudio(false);
    });
    audio.addEventListener('error', () => {
      if (this.audio !== audio) return;
      this.status = 'error'; this.onStatus({ state: 'error', message: '闊抽鎾斁澶辫触' }); this.stopAudio(false);
    });
  }

  activateAudio() {
    this.audioContext ||= new AudioContext();
    return this.audioContext.resume().catch(() => {});
  }

  stopAudio(clear = true) {
    this.speechRequestId++; this.speechAbort?.abort(); this.speechAbort = null;
    if (this.status === 'loading') {this.status = 'idle';this.onStatus({state:'stopped'});}
    if (this.audio) { this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load(); }
    this.audioSource?.disconnect?.(); this.audioSource = null;
    if (this.audioUrl) URL.revokeObjectURL(this.audioUrl);
    this.audioUrl = null; if (clear) this.audio = null;
    this.analyser = null; this.audioData = null; this.voiceLevel = 0;
    this.timeline = []; this.viseme = 'rest';
    if (this.status === 'speaking') { this.status = 'idle'; this.onStatus({ state: 'stopped' }); }
  }

  async speak(text, voice = 'Chloe', context = null) {
    const clean = [...String(text || '').trim()].slice(0, 1200).join('');
    if (!clean || !context?.actor || !context?.policyVersion) return;
    this.stopAudio(); const requestId = ++this.speechRequestId;
    this.status = 'loading'; this.onStatus({ state: 'loading' });
    try {
      const scope = context.actor + ':' + context.policyVersion;
      if (this.voiceScope !== scope) { this.audioCache.clear(); this.voiceScope = scope; }
      const cacheKey = scope + ':' + voice + ':' + clean;
      let entry = this.audioCache.get(cacheKey);
      if (!entry || entry.expiresAt <= Date.now()) {
        this.speechAbort = new AbortController();
        if (!this.voiceClient) {
          let storage = null; try { storage = sessionStorage; } catch { /* Private mode. */ }
          this.voiceClient = new VoiceClient({ storage });
        }
        entry = await this.voiceClient.audio(context, { text: clean, voice }, this.speechAbort.signal);
        if (requestId !== this.speechRequestId) return;
        if (this.audioCache.size >= 12) this.audioCache.delete(this.audioCache.keys().next().value);
        this.audioCache.set(cacheKey,entry);
      }
      if (requestId !== this.speechRequestId) return;
      this.speechAbort = null;
      const url = URL.createObjectURL(entry.blob); this.audioUrl = url;
      const audio = new Audio(url); audio.volume = Number.isFinite(this.volume) ? this.volume : 0.65; audio.preload = 'auto'; this.setAudio(audio, clean);
      await this.activateAudio();
      if (requestId !== this.speechRequestId) return;
      const source = this.audioContext.createMediaElementSource(audio); this.audioSource = source;
      this.analyser = this.audioContext.createAnalyser(); this.analyser.fftSize = 256; this.analyser.smoothingTimeConstant = 0.65;
      this.audioData = new Uint8Array(this.analyser.frequencyBinCount); source.connect(this.analyser); this.analyser.connect(this.audioContext.destination);
      this.status = 'speaking'; await audio.play();
      if (requestId === this.speechRequestId) this.onStatus({ state: 'playing', text: clean });
    } catch (error) {
      if (requestId !== this.speechRequestId || error?.name === 'AbortError') return;
      this.stopAudio(); this.status = 'error'; this.onStatus({ state: 'error', message: error?.message || 'Voice unavailable' });
    }
  }
  update(time, dt, reducedMotion = false) {
    if (!reducedMotion && this.status !== 'speaking' && time >= this.nextBlinkAt) this.scheduleBlink(time);
    if (this.blinkStarted > -Infinity) {
      const age = time - this.blinkStarted, duration = 0.22;
      if (age < duration) { const p = age / duration; this.blink = p < 0.5 ? p * 2 : (1 - p) * 2; }
      else { this.blink = 0; this.blinkStarted = -Infinity; }
    }
    let targetLevel = 0;
    if (this.analyser && this.audioData && this.status === 'speaking') {
      this.analyser.getByteFrequencyData(this.audioData); let sum = 0;
      for (const value of this.audioData) sum += value;
      targetLevel = clamp01((sum / this.audioData.length - 16) / 88);
    }
    this.voiceLevel += (targetLevel - this.voiceLevel) * Math.min(1, dt * 16 + 0.14);
    const current = this.audio && Number.isFinite(this.audio.currentTime) ? this.audio.currentTime : 0;
    const timed = this.timeline.find(item => current >= item.start && current < item.end)?.viseme || (this.status === 'speaking' ? 'A' : 'rest');
    this.viseme = timed;
    const shape = VISemeShapes[timed] || VISemeShapes.rest;
    const targetMouth = this.status === 'speaking' ? clamp01(shape.open * 0.78 + this.voiceLevel * 0.52) : 0;
    this.mouthOpen += (targetMouth - this.mouthOpen) * Math.min(1, dt * 18 + 0.16);
    this.visemeBlend += ((this.status === 'speaking' ? 1 : 0) - this.visemeBlend) * Math.min(1, dt * 10 + 0.12);
    const lidScale = 0.035 + this.blink * 0.965;
    for (const lid of this.lids) lid.scale.y = lidScale;
    const open = this.mouthOpen, width = shape.width, round = shape.round;
    this.mouth.visible = this.status === 'speaking';
    this.tongue.visible = this.status === 'speaking' && open > 0.18;
    this.mouth.scale.set(width * (0.88 + open * 0.14), 0.14 + open * (0.88 - round * 0.18), 1);
    this.tongue.scale.set(0.62 + open * 0.46, open * (0.82 + round * 0.18), 1);
  }

  snapshot() { return { status: this.status, viseme: this.viseme, blink: Number(this.blink.toFixed(3)), mouthOpen: Number(this.mouthOpen.toFixed(3)), voiceLevel: Number(this.voiceLevel.toFixed(3)) }; }
  dispose() { this.stopAudio(); this.audioContext?.close().catch(() => {}); this.face.traverse(node => { node.geometry?.dispose?.(); node.material?.dispose?.(); }); this.head?.remove(this.face); }
}



