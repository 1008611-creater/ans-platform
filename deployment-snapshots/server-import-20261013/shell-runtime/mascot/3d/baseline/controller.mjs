import * as T from '../vendor/three.module.js';
import { samplePerformance, GESTURE_DURATIONS } from './performance.mjs';

const NAMES = ['root', 'body', 'head', 'arm.L', 'arm.R', 'foot.L', 'foot.R', 'tail'];
const RAD = Math.PI / 180;

/** Runtime-only performance; never rewrites geometry, materials or the GLB. */
export class DinoPerformance {
  constructor(model, clips) {
    this.model = model;
    this.bones = new Map();
    this.rest = new Map();
    this.previous = new Map();
    this.gesture = null;
    this.startedAt = 0;
    this.phase = 'idle';
    this.pointer = { x: 0, y: 0, age: Infinity };
    this.pointerAt = -Infinity;
    this.sample = null;
    this.euler = new T.Euler(0, 0, 0, 'YXZ');
    this.delta = new T.Quaternion();
    this.parentQ = new T.Quaternion();
    this.inverseQ = new T.Quaternion();
    this.targetQ = new T.Quaternion();
    model.traverse(node => {
      const name = node.userData.name || node.name;
      if (!node.isBone || !NAMES.includes(name)) return;
      this.bones.set(name, node);
      this.rest.set(name, {
        quaternion: node.quaternion.clone(), position: node.position.clone(), scale: node.scale.clone(),
      });
      this.previous.set(name, node.quaternion.clone());
    });
    if (this.bones.size !== NAMES.length) throw new Error('Expected original eight-bone rig');
    this.armTracks = new Map();
    const wave = clips.find(clip => clip.name === 'Wave');
    for (const name of ['arm.L', 'arm.R']) {
      const bone = this.bones.get(name);
      const track = wave?.tracks.find(item => item.name === `${bone.name}.quaternion` || item.name === `${bone.uuid}.quaternion`);
      if (!track) throw new Error(`Missing original wave track: ${name}`);
      this.armTracks.set(name, track.createInterpolant(new Float32Array(4)));
    }
  }

  restore() {
    for (const [name, bone] of this.bones) {
      const rest = this.rest.get(name);
      bone.quaternion.copy(rest.quaternion);
      bone.position.copy(rest.position);
      bone.scale.copy(rest.scale);
    }
  }

  reset() {
    this.restore();
    this.gesture = null;
    this.pointerAt = -Infinity;
    this.pointer = { x: 0, y: 0, age: Infinity };
    for (const [name, bone] of this.bones) this.previous.get(name).copy(bone.quaternion);
    this.sample = null;
  }

  trigger(name, time) {
    if (name !== 'idle' && !Object.hasOwn(GESTURE_DURATIONS, name)) return false;
    this.gesture = name === 'idle' ? null : name;
    this.startedAt = time;
    return true;
  }

  look(x, y, time) {
    this.pointer.x = T.MathUtils.clamp(x, -1, 1);
    this.pointer.y = T.MathUtils.clamp(y, -1, 1);
    this.pointerAt = time;
  }

  applyWorld(name, angles) {
    const bone = this.bones.get(name);
    this.delta.setFromEuler(this.euler.set(angles.x, angles.y, angles.z, 'YXZ'));
    bone.parent.getWorldQuaternion(this.parentQ).normalize();
    this.inverseQ.copy(this.parentQ).invert();
    this.delta.premultiply(this.inverseQ).multiply(this.parentQ);
    bone.quaternion.premultiply(this.delta).normalize();
    bone.updateMatrixWorld(true);
  }

  update(time, dt, reducedMotion = false) {
    const hasPreviousSample = this.sample !== null;
    this.restore();
    this.pointer.age = time - this.pointerAt;
    this.sample = samplePerformance({
      time, phase: this.phase, gesture: this.gesture,
      gestureAge: time - this.startedAt, pointer: this.pointer, reducedMotion,
    });
    if (reducedMotion) {
      this.gesture = null;
      for (const [name, bone] of this.bones) this.previous.get(name).copy(bone.quaternion);
      return this.sample;
    }
    this.model.updateMatrixWorld(true);
    this.applyWorld('root', { x: this.sample.root.rx, y: this.sample.root.ry, z: this.sample.root.rz });
    this.applyWorld('body', this.sample.body);
    this.applyWorld('head', this.sample.head);
    this.applyWorld('tail', this.sample.tail);
    if (this.sample.waveTime !== null) {
      for (const [name, interpolant] of this.armTracks) {
        this.bones.get(name).quaternion.fromArray(interpolant.evaluate(this.sample.waveTime)).normalize();
      }
    }
    const amount = dt > 0 ? 1 - Math.exp(-12 * dt) : hasPreviousSample ? 0 : 1;
    for (const [name, bone] of this.bones) {
      this.targetQ.copy(bone.quaternion);
      bone.quaternion.slerpQuaternions(this.previous.get(name), this.targetQ, amount).normalize();
      if (name === 'head') {
        const rest = this.rest.get(name).quaternion;
        const angle = rest.angleTo(bone.quaternion);
        if (angle > 3 * RAD) {
          this.targetQ.copy(bone.quaternion);
          bone.quaternion.slerpQuaternions(rest, this.targetQ, 3 * RAD / angle);
        }
      }
      this.previous.get(name).copy(bone.quaternion);
    }
    if (this.sample.gestureDone) this.gesture = null;
    this.model.updateMatrixWorld(true);
    return this.sample;
  }

  snapshot() {
    const angles = Object.fromEntries([...this.bones].map(([name, bone]) => [
      name, Number((this.rest.get(name).quaternion.angleTo(bone.quaternion) / RAD).toFixed(4)),
    ]));
    return { gesture: this.gesture || 'idle', mood: this.sample?.mood || 'idle', angles, sample: this.sample };
  }
}
