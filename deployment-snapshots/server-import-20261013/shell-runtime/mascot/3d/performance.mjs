/**
 * Pure preserved-shape performance; rotations are radians about WORLD axes.
 * +X screen right, +Y up, +Z toward viewer. Restore bind pose each frame,
 * sample ONLY the original Wave arm rotations, then apply these offsets in
 * parent-corrected world space. No original Idle or Wave scale/head/tail.
 * `time`/`gestureAge` are visible, unpaused seconds; this module reads no clock.
 * Pointer uses existing screen convention: x right-positive, y down-positive.
 * Controller blends phase/pointer changes and gesture interruptions.
 */
const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

export const GESTURE_DURATIONS = Object.freeze({
  hello: 3.2, listen: 3.5, think: 4.1, celebrate: 3.3,
  curious: 4, nod: 2.7, no: 2.9, shy: 3.8,
  stretch: 4.4, sleep: 5, surprise: 2.6,
});
// GLB audit: export preserves Blender's frame-1 offset; 90 intervals at 30fps.
export const WAVE_CLIP_START = 0.03333333507180214;
export const WAVE_CLIP_DURATION = 3.0333333015441895;

const FOCUSED = new Set(['input', 'editing']);
const BUSY = new Set(['saving', 'submitting', 'queued', 'working', 'recovering']);
const PLEASED = new Set(['confirm', 'ready', 'review']);
const CONCERNED = new Set(['attention', 'failed']);
const RESTING = new Set(['cancelled', 'archived']);
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const radians = value => value * DEG;
const zero = () => ({ x: 0, y: 0, z: 0 });
const zeroRoot = () => ({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 });

function smootherstep(value) {
  const t = clamp(value, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}
function rise(start, end, time) {
  return smootherstep((time - start) / (end - start));
}
// C2-continuous beat with a deliberate resting plateau.
function beat(time, start, arrived, leave, end) {
  return rise(start, arrived, time) * (1 - rise(leave, end, time));
}
function scaleVector(vector, multiplier) {
  vector.x *= multiplier;
  vector.y *= multiplier;
  vector.z *= multiplier;
}
function l1(vector) {
  return Math.abs(vector.x) + Math.abs(vector.y) + Math.abs(vector.z);
}
// Absolute Euler-angle sum bounds quaternion angle, including inheritance.
function constrain(vector, maximum) {
  const length = l1(vector);
  if (length > maximum) scaleVector(vector, maximum / length);
}
function phaseProfile(phase) {
  if (FOCUSED.has(phase)) return { amplitude: 0.28, pointer: 0.16, mood: 'focused' };
  if (BUSY.has(phase)) return { amplitude: 0.65, pointer: 0.55, mood: 'thinking' };
  if (PLEASED.has(phase)) return { amplitude: 1, pointer: 0.8, mood: 'happy' };
  if (CONCERNED.has(phase)) return { amplitude: 0.48, pointer: 0.6, mood: 'concerned' };
  if (RESTING.has(phase)) return { amplitude: 0.28, pointer: 0.3, mood: 'resting' };
  return { amplitude: 0.82, pointer: 1, mood: 'calm' };
}
function sampleIdle(time, phase, profile, head, body, tail) {
  const breath = TAU * (time % 4.9) / 4.9;
  const weight = TAU * (time % 8.8) / 8.8;
  const attentionTime = time % 18.4;
  const glance = beat(attentionTime, 5.2, 6.05, 6.55, 7.8)
    - 0.65 * beat(attentionTime, 13.1, 13.95, 14.25, 15.4);
  // Breathing is a tiny torso rotation: no mesh scaling or foot channels.
  head.x = radians(0.15 * Math.sin(breath - 0.42));
  head.y = radians(0.19 * Math.sin(TAU * (time % 8.1) / 8.1 + 0.8) + 0.7 * glance);
  head.z = radians(0.12 * Math.sin(TAU * (time % 6.7) / 6.7 + 0.2) - 0.22 * glance);
  body.x = radians(-0.13 * Math.sin(breath));
  body.z = radians(0.13 * Math.sin(weight - 1));
  tail.y = radians(2.45 * Math.sin(TAU * (time % 5.7) / 5.7 - 0.72)
    * (0.72 + 0.22 * Math.sin(TAU * (time % 13.1) / 13.1)));
  if (BUSY.has(phase)) {
    head.y += radians(-0.4);
    head.z += radians(0.26);
  } else if (CONCERNED.has(phase)) {
    head.x += radians(0.32);
    head.z += radians(-0.46);
  } else if (PLEASED.has(phase)) {
    head.x -= radians(0.16);
  }
  scaleVector(head, profile.amplitude);
  scaleVector(body, profile.amplitude);
  scaleVector(tail, profile.amplitude);
}

const clipTime = u => WAVE_CLIP_START + (WAVE_CLIP_DURATION - WAVE_CLIP_START) * clamp(u, 0, 1);
function armPose(u, weight, mirrored = false) {
  return weight > 1e-10 ? { time: clipTime(u), weight: clamp(weight, 0, mirrored ? 0.75 : 1),
    ...(mirrored ? { source: 'left', mirror: true } : {}) } : null;
}
// Quintic pulses have exact contact/rest at both ends, unlike clipped sinusoids.
function hop(u, start, top, end) {
  return u < top ? rise(start, top, u) : 1 - rise(top, end, u);
}

function sampleGesture(name, u, head, body, tail, rig, arms) {
  const envelope = beat(u, 0.015, 0.19, 0.72, 0.985);
  if (name === 'hello') {
    const greeting = beat(u, 0.03, 0.22, 0.65, 0.94);
    rig.ry = radians(-15 * greeting);
    rig.rz = radians(-2.8 * greeting);
    rig.rx = radians(-1.2 * beat(u, 0.12, 0.35, 0.53, 0.89));
    head.z += radians(-0.78 * greeting);
    head.x -= radians(0.35 * greeting);
    arms.left = armPose(smootherstep((u - 0.025) / 0.95), 0.94);
    arms.right = armPose(0.49, 0.3 * beat(u, 0.12, 0.36, 0.6, 0.91), true);
    tail.y += radians(3.3 * Math.sin((u - 0.1) * TAU * 2) * envelope);
  } else if (name === 'listen') {
    const lean = beat(u, 0.03, 0.23, 0.7, 0.96);
    const agreement = beat(u, 0.47, 0.53, 0.56, 0.67);
    rig.rx = radians(3.3 * lean + 1.2 * agreement);
    rig.rz = radians(3.5 * lean);
    rig.ry = radians(3 * lean);
    rig.z = 0.014 * lean;
    head.z += radians(1.3 * lean);
    head.x += radians(0.55 * agreement);
    tail.y -= radians(1.5 * lean);
  } else if (name === 'think') {
    const ponder = beat(u, 0.02, 0.22, 0.59, 0.91);
    const idea = beat(u, 0.61, 0.7, 0.76, 0.94);
    rig.ry = radians(-18 * ponder + 7 * idea);
    rig.rx = radians(-3.1 * ponder + 2 * idea);
    rig.rz = radians(1.8 * ponder);
    head.y -= radians(0.75 * ponder);
    head.z += radians(0.6 * ponder);
    arms.left = armPose(0.49, 0.55 * beat(u, 0.12, 0.31, 0.52, 0.7));
    tail.y -= radians(2.5 * ponder);
  } else if (name === 'celebrate') {
    const first = hop(u, 0.14, 0.25, 0.39);
    const second = hop(u, 0.43, 0.54, 0.68);
    const settle = beat(u, 0.68, 0.75, 0.8, 0.98);
    rig.y = 0.048 * first + 0.036 * second;
    rig.rz = radians(-3 * first + 3.2 * second - 0.8 * settle);
    rig.ry = radians(-4.5 * first + 5.5 * second);
    rig.rx = radians(-1.8 * (first + second));
    head.x -= radians(0.55 * (first + second));
    const cheer = beat(u, 0.055, 0.16, 0.61, 0.85);
    arms.left = armPose(0.49, 0.84 * cheer);
    arms.right = armPose(0.49, 0.6 * cheer, true);
    tail.y += radians(4 * Math.sin((u - 0.08) * TAU * 2.7) * envelope);
  } else if (name === 'curious') {
    const first = beat(u, 0.03, 0.2, 0.34, 0.52);
    const second = beat(u, 0.43, 0.62, 0.76, 0.97);
    rig.ry = radians(22 * first - 20 * second);
    rig.rz = radians(-2.6 * first + 2.4 * second);
    rig.rx = radians(1.8 * (first + second));
    rig.x = 0.01 * first - 0.009 * second;
    rig.z = 0.01 * (first + second);
    head.y += radians(0.65 * (first - second));
    head.z += radians(-0.62 * first + 0.62 * second);
    tail.y += radians(-2.7 * first + 2.4 * second);
  } else if (name === 'nod') {
    const first = beat(u, 0.04, 0.2, 0.24, 0.41);
    const second = beat(u, 0.43, 0.57, 0.63, 0.85);
    rig.rx = radians(5.6 * first + 4.4 * second);
    rig.z = 0.006 * (first + second);
    head.x += radians(1.1 * first + 0.9 * second);
    body.x += radians(0.18 * (first + second));
  } else if (name === 'no') {
    const left = beat(u, 0.035, 0.18, 0.24, 0.42);
    const right = beat(u, 0.3, 0.45, 0.52, 0.69);
    const settle = beat(u, 0.62, 0.75, 0.79, 0.97);
    rig.ry = radians(14 * left - 14 * right + 7 * settle);
    head.y += radians(0.75 * left - 0.75 * right + 0.35 * settle);
    head.x -= radians(0.15 * envelope);
    tail.y += radians(-1.8 * left + 1.8 * right);
  } else if (name === 'shy') {
    const turn = beat(u, 0.03, 0.26, 0.59, 0.96);
    const peek = beat(u, 0.55, 0.65, 0.7, 0.86);
    // Turn away from the default three-quarter camera, then peek back. This
    // is rigid actor yaw, so it does not consume the local skinning budget.
    rig.ry = radians(-28 * turn + 12 * peek);
    rig.rx = radians(3.6 * turn - 0.8 * peek);
    rig.rz = radians(-3.3 * turn);
    rig.x = -0.012 * turn;
    head.x += radians(0.65 * turn);
    head.y += radians(0.7 * peek);
    arms.left = armPose(0.49, 0.2 * beat(u, 0.04, 0.17, 0.23, 0.46));
    tail.y -= radians(3.6 * turn);
  } else if (name === 'stretch') {
    const stretch = beat(u, 0.04, 0.36, 0.64, 0.96);
    rig.rx = radians(-4.7 * stretch);
    rig.rz = radians(1.7 * beat(u, 0.45, 0.57, 0.66, 0.85));
    head.x -= radians(0.65 * stretch);
    arms.left = armPose(0.49, 0.88 * stretch);
    arms.right = armPose(0.49, 0.63 * stretch, true);
    tail.y += radians(2.7 * stretch);
  } else if (name === 'sleep') {
    const doze = beat(u, 0.04, 0.33, 0.71, 0.98);
    const stir = beat(u, 0.74, 0.8, 0.82, 0.91);
    rig.rx = radians(5.3 * doze - 2 * stir);
    rig.rz = radians(3.7 * doze);
    rig.ry = radians(-4 * doze);
    head.x += radians(0.75 * doze);
    head.z += radians(0.68 * doze);
    tail.y -= radians(2 * doze);
  } else if (name === 'surprise') {
    const gasp = beat(u, 0.015, 0.095, 0.2, 0.45);
    const check = beat(u, 0.42, 0.6, 0.7, 0.95);
    rig.rx = radians(-5.8 * gasp + 2.1 * check);
    rig.ry = radians(-5 * check);
    rig.z = -0.016 * gasp + 0.006 * check;
    head.x -= radians(0.75 * gasp);
    head.y -= radians(0.35 * check);
    arms.left = armPose(0.49, 0.9 * gasp);
    arms.right = armPose(0.49, 0.64 * gasp, true);
    tail.y += radians(3.5 * gasp - 1.8 * check);
  }
}

/** Bone offsets remain tiny; `rig` is a separate whole-model rigid transform.
 * Translations are fractions of bind-pose height, rotation is radians.
 * Arms only sample the original Wave; right mirroring is capped below .75.
 */
export function samplePerformance({
  time = 0, phase = 'idle', gesture = null, gestureAge = 0,
  pointer = { x: 0, y: 0, age: Infinity }, reducedMotion = false,
} = {}) {
  const t = Math.max(0, finite(time));
  const profile = phaseProfile(phase);
  const duration = typeof gesture === 'string' && Object.hasOwn(GESTURE_DURATIONS, gesture)
    ? GESTURE_DURATIONS[gesture] : null;
  const age = gestureAge === Infinity ? Infinity : Math.max(0, finite(gestureAge));
  const active = duration !== null && age < duration;
  const gestureDone = Boolean(gesture && gesture !== 'idle') && (!active || reducedMotion);
  const head = zero(), body = zero(), tail = zero(), root = zeroRoot(), rig = zeroRoot();
  const arms = { left: null, right: null };
  const mood = active && !reducedMotion ? gesture : profile.mood;
  if (reducedMotion) return { head, body, tail, root, rig, arms, waveTime: null, gestureDone, mood };

  sampleIdle(t, phase, profile, head, body, tail);
  const pointerAge = Math.max(0, finite(pointer?.age, Infinity));
  const memory = 1 - rise(0.5, 2.3, pointerAge);
  const attention = 1 - beat(t % 9.4, 4.25, 4.95, 5.65, 6.75);
  const occupied = active ? beat(age / duration, 0, 0.13, 0.78, 1) : 0;
  const gestureFocus = 1 - occupied * (gesture === 'listen' ? 0.66 : 0.96);
  const pointerWeight = memory * attention * profile.pointer * gestureFocus;
  head.y += radians(clamp(finite(pointer?.x), -1, 1) * 1.5 * pointerWeight);
  head.x += radians(clamp(finite(pointer?.y), -1, 1) * 0.68 * pointerWeight);

  if (active) {
    const addedHead = zero(), addedBody = zero(), addedTail = zero();
    const u = age / duration;
    sampleGesture(gesture, u, addedHead, addedBody, addedTail, rig, arms);
    const energy = FOCUSED.has(phase) ? 0.36 : RESTING.has(phase) ? 0.5 : 1;
    const quiet = gesture === 'sleep' ? 1 - 0.85 * occupied : 1;
    for (const axis of ['x', 'y', 'z']) {
      head[axis] = head[axis] * quiet + addedHead[axis] * energy;
      body[axis] = body[axis] * quiet + addedBody[axis] * energy;
      tail[axis] = tail[axis] * quiet + addedTail[axis] * energy;
    }
    for (const axis of ['x', 'y', 'z', 'rx', 'ry', 'rz']) rig[axis] *= energy;
    for (const arm of Object.values(arms)) if (arm) arm.weight *= energy;
  }
  constrain(body, radians(active ? 1 : 0.5));
  tail.y = radians(6) * Math.tanh(tail.y / radians(6));
  constrain(head, Math.max(0, radians(3) - l1(body) - 1e-12));
  const waveTime = active && gesture === 'hello' ? arms.left?.time ?? WAVE_CLIP_START : null;
  return { head, body, tail, root, rig, arms, waveTime, gestureDone, mood };
}
