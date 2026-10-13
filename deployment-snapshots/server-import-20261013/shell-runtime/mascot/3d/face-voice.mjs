import * as T from './vendor/three.module.js';

const BODY_GREEN = 0xa8cdb7;
const MOUTH_DARK = 0x18201b;
const TONGUE = 0xe98889;
const clamp01 = value => Math.max(0, Math.min(1, value));

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
    this.face.position.set(0, 0.185, 0.285);
    this.head.add(this.face);

    const lidMaterial = new T.MeshStandardMaterial({ color: BODY_GREEN, roughness: 0.9, metalness: 0, depthTest: true, depthWrite: false });
    const mouthMaterial = new T.MeshStandardMaterial({ color: MOUTH_DARK, roughness: 0.55, metalness: 0, depthTest: true, depthWrite: false });
    const tongueMaterial = new T.MeshStandardMaterial({ color: TONGUE, roughness: 0.75, metalness: 0, depthTest: true, depthWrite: false });
    this.lids = [
      sphere(lidMaterial, new T.Vector3(0.052, 0.028, 0.012)),
      sphere(lidMaterial, new T.Vector3(0.052, 0.028, 0.012)),
    ];
    this.lids[0].position.set(-0.145, 0.015, 0.012);
    this.lids[1].position.set(0.145, 0.015, 0.012);
    this.lids.forEach(lid => { lid.scale.y = 0.035; this.face.add(lid); });

    this.mouth = sphere(mouthMaterial, new T.Vector3(0.083, 0.044, 0.014));
    this.mouth.position.set(0, -0.105, 0.017);
    this.mouth.scale.y = 0.15;
    this.face.add(this.mouth);
    this.tongue = sphere(tongueMaterial, new T.Vector3(0.044, 0.017, 0.009));
    this.tongue.position.set(0, -0.121, 0.031);
    this.tongue.scale.y = 0.05;
    this.face.add(this.tongue);

    this.audio = null;
    this.audioUrl = null;
    this.audioSource = null;
    this.audioContext = null;
    this.analyser = null;
    this.audioData = null;
    this.voiceLevel = 0;
    this.mouthOpen = 0;
    this.blink = 0;
    this.blinkFrom = 0;
    this.blinkStarted = -Infinity;
    this.nextBlinkAt = 2.4 + Math.random() * 2.8;
    this.status = 'idle';
  }

  scheduleBlink(time) {
    this.blinkStarted = time;
    this.blinkFrom = this.blink;
    this.nextBlinkAt = time + 2.6 + Math.random() * 4.2;
  }

  setAudio(audio) {
    this.stopAudio();
    this.audio = audio;
    this.audio.addEventListener('ended', () => {
      if (this.audio !== audio) return;
      this.status = 'idle';
      this.onStatus({ state: 'ended' });
      this.stopAudio(false);
    });
    this.audio.addEventListener('error', () => {
      if (this.audio !== audio) return;
      this.status = 'error';
      this.onStatus({ state: 'error', message: '??????' });
      this.stopAudio(false);
    });
  }

  stopAudio(clear = true) {
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
    }
    this.audioSource?.disconnect?.();
    this.audioSource = null;
    if (this.audioUrl) URL.revokeObjectURL(this.audioUrl);
    this.audioUrl = null;
    if (clear) this.audio = null;
    this.analyser = null;
    this.audioData = null;
    this.voiceLevel = 0;
    if (this.status === 'speaking') {
      this.status = 'idle';
      this.onStatus({ state: 'stopped' });
    }
  }

  async speak(text, voice = 'Chloe') {
    const clean = String(text || '').trim().slice(0, 1200);
    if (!clean) return;
    this.stopAudio();
    this.status = 'loading';
    this.onStatus({ state: 'loading' });
    try {
      const response = await fetch('/api/mascot/tts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, voice }),
      });
      if (!response.ok) throw new Error(`TTS ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      this.audioUrl = url;
      const audio = new Audio(url);
      audio.preload = 'auto';
      this.setAudio(audio);
      this.audioContext ||= new AudioContext();
      await this.audioContext.resume();
      const source = this.audioContext.createMediaElementSource(audio);
      this.audioSource = source;
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.72;
      this.audioData = new Uint8Array(this.analyser.frequencyBinCount);
      source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      this.status = 'speaking';
      this.onStatus({ state: 'playing', text: clean });
      await audio.play();
    } catch (error) {
      this.status = 'error';
      this.onStatus({ state: 'error', message: error?.message || 'TTS ????' });
      this.stopAudio(false);
    }
  }

  update(time, dt, reducedMotion = false) {
    if (!reducedMotion && this.status !== 'speaking' && time >= this.nextBlinkAt) this.scheduleBlink(time);
    if (this.blinkStarted > -Infinity) {
      const age = time - this.blinkStarted;
      const duration = 0.22;
      if (age < duration) {
        const p = age / duration;
        this.blink = p < 0.5 ? p * 2 : (1 - p) * 2;
      } else { this.blink = 0; this.blinkStarted = -Infinity; }
    }
    let targetLevel = 0;
    if (this.analyser && this.audioData && this.status === 'speaking') {
      this.analyser.getByteFrequencyData(this.audioData);
      let sum = 0;
      for (const value of this.audioData) sum += value;
      targetLevel = clamp01((sum / this.audioData.length - 16) / 88);
    }
    this.voiceLevel += (targetLevel - this.voiceLevel) * Math.min(1, dt * 16 + 0.14);
    const targetMouth = this.status === 'speaking' ? clamp01(this.voiceLevel * 1.7 + 0.08) : 0;
    this.mouthOpen += (targetMouth - this.mouthOpen) * Math.min(1, dt * 15 + 0.12);
    const lidScale = 0.035 + this.blink * 0.965;
    for (const lid of this.lids) lid.scale.y = lidScale;
    this.mouth.scale.y = 0.14 + this.mouthOpen * 0.9;
    this.mouth.scale.x = 0.92 + this.mouthOpen * 0.16;
    this.tongue.scale.y = this.mouthOpen * 0.95;
    this.tongue.scale.x = 0.65 + this.mouthOpen * 0.45;
  }

  snapshot() {
    return { status: this.status, blink: Number(this.blink.toFixed(3)), mouthOpen: Number(this.mouthOpen.toFixed(3)), voiceLevel: Number(this.voiceLevel.toFixed(3)) };
  }

  dispose() {
    this.stopAudio();
    this.audioContext?.close().catch(() => {});
    this.face.traverse(node => { node.geometry?.dispose?.(); node.material?.dispose?.(); });
    this.head?.remove(this.face);
  }
}

