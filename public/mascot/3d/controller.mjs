import * as T from './vendor/three.module.js';
import { samplePerformance, GESTURE_DURATIONS } from './performance.mjs?v=dock4';

const NAMES = ['root', 'body', 'head', 'arm.L', 'arm.R', 'foot.L', 'foot.R', 'tail'];
const RAD = Math.PI / 180;
const RIG_AXES = ['x', 'y', 'z', 'rx', 'ry', 'rz'];

/** Runtime-only performance; never rewrites geometry, materials or the GLB. */
export class DinoPerformance {
  constructor(model, clips) {
    this.model = model;
    this.modelRest = {
      position: model.position.clone(), quaternion: model.quaternion.clone(), scale: model.scale.clone(),
      matrix: model.matrix.clone(), matrixAutoUpdate: model.matrixAutoUpdate,
    };
    this.rigTransform = {
      x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, jumpHeight: 0, groundCompensation: 0,
      modelHeight: 1, position: model.position.toArray(), quaternion: model.quaternion.toArray(),
    };
    this.rigQuaternion = new T.Quaternion();
    this.inverseModel = new T.Matrix4();
    this.meshToModel = new T.Matrix4();
    this.baseMatrix = new T.Matrix4();
    this.finalMatrix = new T.Matrix4();
    this.rigidMatrix = new T.Matrix4();
    this.point = new T.Vector3();
    this.pivot = new T.Vector3();
    this.supports = [];
    this.skeletons = new Set();
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
    this.armParentRest = new Map();
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
    this.model.updateMatrixWorld(true);
    const inverseModelRotation = this.model.getWorldQuaternion(new T.Quaternion()).invert();
    for (const name of ['arm.L', 'arm.R']) {
      this.armParentRest.set(name, this.bones.get(name).parent.getWorldQuaternion(new T.Quaternion())
        .premultiply(inverseModelRotation));
    }
    this.captureSupport();
  }

  captureSupport() {
    const bounds = new T.Box3();
    const meshes = [];
    this.inverseModel.copy(this.model.matrixWorld).invert();
    this.model.traverse(mesh => {
      if (!mesh.isMesh || !mesh.geometry?.attributes.position) return;
      if (mesh.skeleton) { this.skeletons.add(mesh.skeleton); mesh.skeleton.update(); }
      meshes.push(mesh);
      this.meshToModel.multiplyMatrices(this.inverseModel, mesh.matrixWorld);
      const positions = mesh.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        this.point.fromBufferAttribute(positions, i);
        if (mesh.isSkinnedMesh) mesh.applyBoneTransform(i, this.point);
        bounds.expandByPoint(this.point.applyMatrix4(this.meshToModel));
      }
    });
    this.modelHeight = bounds.max.y - bounds.min.y;
    if (!Number.isFinite(this.modelHeight) || this.modelHeight <= 0) throw new Error('Invalid rigid model bounds');
    bounds.getCenter(this.pivot);
    this.pivot.y = bounds.min.y;
    this.restFloor = bounds.min.y;
    for (const mesh of meshes) {
      this.meshToModel.multiplyMatrices(this.inverseModel, mesh.matrixWorld);
      const positions = mesh.geometry.attributes.position;
      const vertices = [];
      for (let i = 0; i < positions.count; i++) {
        this.point.fromBufferAttribute(positions, i);
        if (mesh.isSkinnedMesh) mesh.applyBoneTransform(i, this.point);
        this.point.applyMatrix4(this.meshToModel);
        if (this.point.y <= bounds.min.y + this.modelHeight * 0.12) vertices.push(i);
      }
      if (vertices.length) this.supports.push({ mesh, vertices });
    }
    this.rigTransform.modelHeight = this.modelHeight;
  }

  restoreModel() {
    this.model.position.copy(this.modelRest.position);
    this.model.quaternion.copy(this.modelRest.quaternion);
    this.model.scale.copy(this.modelRest.scale);
    this.model.matrix.copy(this.modelRest.matrix);
    this.model.matrixAutoUpdate = this.modelRest.matrixAutoUpdate;
    this.model.matrixWorldNeedsUpdate = true;
  }

  restore() {
    this.restoreModel();
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
    for (const axis of RIG_AXES) this.rigTransform[axis] = 0;
    this.rigTransform.jumpHeight = this.rigTransform.groundCompensation = 0;
    this.model.position.toArray(this.rigTransform.position);
    this.model.quaternion.toArray(this.rigTransform.quaternion);
    this.model.updateMatrixWorld(true);
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

  applyArm(name, request) {
    if (!request || request.weight <= 0) return;
    const sourceName = request.source === 'left' ? 'arm.L' : name;
    const rest = this.rest.get(name).quaternion;
    this.targetQ.fromArray(this.armTracks.get(sourceName).evaluate(request.time)).normalize();
    if (request.mirror) {
      // Mirror the source's rotation delta in character sagittal space. The
      // axial quaternion vector transforms (x,y,z)->(x,-y,-z), not by copying
      // a left local quaternion into the differently oriented right bone.
      this.delta.copy(this.rest.get(sourceName).quaternion).invert();
      this.targetQ.multiply(this.delta);
      this.parentQ.copy(this.armParentRest.get(sourceName));
      this.inverseQ.copy(this.parentQ).invert();
      this.targetQ.premultiply(this.parentQ).multiply(this.inverseQ);
      this.targetQ.y *= -1;
      this.targetQ.z *= -1;
      this.parentQ.copy(this.armParentRest.get(name));
      this.inverseQ.copy(this.parentQ).invert();
      this.targetQ.premultiply(this.inverseQ).multiply(this.parentQ).multiply(rest);
    }
    this.bones.get(name).quaternion.slerpQuaternions(rest, this.targetQ,
      T.MathUtils.clamp(request.weight, 0, request.mirror ? 0.75 : 1)).normalize();
  }

  applyRigid(amount) {
    for (const axis of RIG_AXES) {
      this.rigTransform[axis] += (this.sample.rig[axis] - this.rigTransform[axis]) * amount;
    }
    const pose = this.rigTransform;
    this.rigQuaternion.setFromEuler(this.euler.set(pose.rx, pose.ry, pose.rz, 'YXZ'));
    this.model.updateMatrixWorld(true);
    for (const skeleton of this.skeletons) skeleton.update();
    this.inverseModel.copy(this.model.matrixWorld).invert();
    let lowest = Infinity;
    for (const { mesh, vertices } of this.supports) {
      this.meshToModel.multiplyMatrices(this.inverseModel, mesh.matrixWorld);
      const positions = mesh.geometry.attributes.position;
      for (const index of vertices) {
        this.point.fromBufferAttribute(positions, index);
        if (mesh.isSkinnedMesh) mesh.applyBoneTransform(index, this.point);
        this.point.applyMatrix4(this.meshToModel).sub(this.pivot)
          .applyQuaternion(this.rigQuaternion).add(this.pivot);
        lowest = Math.min(lowest, this.point.y);
      }
    }
    const correction = Number.isFinite(lowest) ? this.restFloor - lowest : 0;
    pose.jumpHeight = pose.y;
    pose.groundCompensation = correction / this.modelHeight;
    this.rigidMatrix.makeRotationFromQuaternion(this.rigQuaternion);
    this.point.copy(this.pivot).applyQuaternion(this.rigQuaternion).multiplyScalar(-1).add(this.pivot);
    this.point.x += pose.x * this.modelHeight;
    this.point.y += pose.y * this.modelHeight + correction;
    this.point.z += pose.z * this.modelHeight;
    this.rigidMatrix.setPosition(this.point);
    // Right multiplication expresses rigid motion in model coordinates while
    // preserving its original parent framing and bind scale exactly.
    if (this.modelRest.matrixAutoUpdate) {
      this.baseMatrix.compose(this.modelRest.position, this.modelRest.quaternion, this.modelRest.scale);
    } else this.baseMatrix.copy(this.modelRest.matrix);
    this.finalMatrix.multiplyMatrices(this.baseMatrix, this.rigidMatrix);
    this.finalMatrix.decompose(this.model.position, this.model.quaternion, this.model.scale);
    this.model.scale.copy(this.modelRest.scale);
    this.model.matrix.copy(this.finalMatrix);
    this.model.matrixAutoUpdate = false;
    this.model.matrixWorldNeedsUpdate = true;
    this.model.position.toArray(pose.position);
    this.model.quaternion.toArray(pose.quaternion);
    this.model.updateMatrixWorld(true);
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
      for (const axis of RIG_AXES) this.rigTransform[axis] = 0;
      this.rigTransform.jumpHeight = this.rigTransform.groundCompensation = 0;
      this.model.position.toArray(this.rigTransform.position);
      this.model.quaternion.toArray(this.rigTransform.quaternion);
      this.model.updateMatrixWorld(true);
      return this.sample;
    }
    this.model.updateMatrixWorld(true);
    this.applyWorld('root', { x: this.sample.root.rx, y: this.sample.root.ry, z: this.sample.root.rz });
    this.applyWorld('body', this.sample.body);
    this.applyWorld('head', this.sample.head);
    this.applyWorld('tail', this.sample.tail);
    this.applyArm('arm.L', this.sample.arms.left);
    this.applyArm('arm.R', this.sample.arms.right);
    const amount = dt > 0 ? 1 - Math.exp(-12 * dt) : hasPreviousSample ? 0 : 1;
    for (const [name, bone] of this.bones) {
      this.targetQ.copy(bone.quaternion);
      bone.quaternion.slerpQuaternions(this.previous.get(name), this.targetQ, amount).normalize();
      if (name === 'head') {
        const rest = this.rest.get(name).quaternion;
        const angle = rest.angleTo(bone.quaternion);
        if (angle > 5.5 * RAD) {
          this.targetQ.copy(bone.quaternion);
          bone.quaternion.slerpQuaternions(rest, this.targetQ, 5.5 * RAD / angle);
        }
      }
      this.previous.get(name).copy(bone.quaternion);
    }
    if (this.sample.gestureDone) this.gesture = null;
    this.model.updateMatrixWorld(true);
    // Whole-actor turns settle a little slower than the small bone response,
    // including interrupted poses, to keep foot pivots and stops gentle.
    this.applyRigid(dt > 0 ? 1 - Math.exp(-10 * dt) : amount);
    return this.sample;
  }

  snapshot() {
    const angles = Object.fromEntries([...this.bones].map(([name, bone]) => [
      name, Number((this.rest.get(name).quaternion.angleTo(bone.quaternion) / RAD).toFixed(4)),
    ]));
    return { gesture: this.gesture || 'idle', mood: this.sample?.mood || 'idle', angles, sample: this.sample,
      rigTransform: { ...this.rigTransform, position: [...this.rigTransform.position], quaternion: [...this.rigTransform.quaternion] } };
  }
}
