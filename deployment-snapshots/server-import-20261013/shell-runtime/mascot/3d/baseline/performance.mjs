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

export const GESTURE_DURATIONS = Object.freeze({ hello: 3, listen: 2.65, think: 3, celebrate: 2.7 });
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

function sampleGesture(gesture, age, head, body, tail, root) {
  if (gesture === 'hello') {
    const lean = beat(age, 0.12, 0.68, 1.48, 2.76);
    const anticipation = beat(age, 0.02, 0.19, 0.25, 0.53);
    const acknowledge = beat(age, 0.43, 0.84, 1.9, 2.88);
    head.x += radians(0.38 * anticipation - 0.62 * acknowledge);
    head.z += radians(-1.12 * lean);
    body.z += radians(-0.34 * beat(age, 0.23, 0.81, 1.57, 2.85));
    root.ry = radians(0.24 * lean);
    tail.y += radians(2.6 * Math.sin(TAU * (age - 0.44) / 1.32)
      * beat(age, 0.28, 0.68, 1.81, 2.86));
  } else if (gesture === 'listen') {
    const tilt = beat(age, 0.08, 0.65, 1.43, 2.57);
    const nod = beat(age, 1.03, 1.25, 1.36, 1.84);
    head.z += radians(1.55 * tilt);
    head.x += radians(0.42 * tilt - 0.55 * nod);
    head.y += radians(0.28 * tilt);
    body.z += radians(0.29 * beat(age, 0.19, 0.79, 1.52, 2.59));
    tail.y += radians(0.82 * beat(age, 0.48, 0.95, 1.5, 2.63));
  } else if (gesture === 'think') {
    const consider = beat(age, 0.09, 0.72, 1.57, 2.8);
    const resolve = beat(age, 1.7, 1.99, 2.1, 2.69);
    head.y += radians(-1.4 * consider);
    head.z += radians(0.58 * consider);
    head.x += radians(0.24 * consider - 0.68 * resolve);
    body.x += radians(0.25 * beat(age, 0.22, 0.86, 1.6, 2.85));
    root.ry = radians(-0.15 * consider);
    tail.y += radians(-2.8 * beat(age, 0.34, 0.94, 1.86, 2.94));
  } else if (gesture === 'celebrate') {
    const first = beat(age, 0.06, 0.39, 0.53, 0.91);
    const second = beat(age, 0.89, 1.13, 1.25, 1.67);
    const finish = beat(age, 1.54, 1.83, 1.94, 2.55);
    const delight = beat(age, 0.17, 0.62, 1.54, 2.6);
    head.x += radians(-0.87 * first + 0.64 * second - 0.33 * finish);
    head.z += radians(-0.9 * delight);
    body.x += radians(-0.41 * first - 0.13 * second);
    body.z += radians(-0.35 * beat(age, 0.26, 0.75, 1.63, 2.66));
    root.ry = radians(0.3 * delight);
    tail.y += radians(4 * Math.sin(TAU * (age - 0.31) / 1.08)
      * beat(age, 0.15, 0.47, 1.72, 2.66));
  }
}

/**
 * @returns {{head:object,body:object,tail:object,root:object,
 *   waveTime:number|null,gestureDone:boolean,mood:string}}
 */
export function samplePerformance({
  time = 0,
  phase = 'idle',
  gesture = null,
  gestureAge = 0,
  pointer = { x: 0, y: 0, age: Infinity },
  reducedMotion = false,
} = {}) {
  const t = Math.max(0, finite(time));
  const profile = phaseProfile(phase);
  const duration = typeof gesture === 'string'
    && Object.hasOwn(GESTURE_DURATIONS, gesture) ? GESTURE_DURATIONS[gesture] : null;
  const age = gestureAge === Infinity ? Infinity : Math.max(0, finite(gestureAge));
  const active = duration !== null && age < duration;
  const gestureDone = Boolean(gesture) && (!active || reducedMotion);
  const head = zero();
  const body = zero();
  const tail = zero();
  const root = zeroRoot();
  const mood = active && !reducedMotion ? gesture : profile.mood;
  if (reducedMotion) return { head, body, tail, root, waveTime: null, gestureDone, mood };

  sampleIdle(t, phase, profile, head, body, tail);
  const pointerAge = Math.max(0, finite(pointer?.age, Infinity));
  const memory = 1 - rise(0.5, 2.3, pointerAge);
  // Recent motion gets attention, with a regular comfortable break.
  // No age-based ramp-in: a pointer moving every frame must still register.
  const attention = 1 - beat(t % 9.4, 4.25, 4.95, 5.65, 6.75);
  const occupied = active ? beat(age, 0, 0.35, duration - 0.5, duration) : 0;
  const gestureFocus = 1 - occupied * (gesture === 'listen' ? 0.52 : 0.88);
  const pointerWeight = memory * attention * profile.pointer * gestureFocus;
  head.y += radians(clamp(finite(pointer?.x), -1, 1) * 1.5 * pointerWeight);
  head.x += radians(clamp(finite(pointer?.y), -1, 1) * 0.68 * pointerWeight);

  if (active) {
    const addedHead = zero();
    const addedBody = zero();
    const addedTail = zero();
    sampleGesture(gesture, age, addedHead, addedBody, addedTail, root);
    const energy = FOCUSED.has(phase) ? 0.36 : RESTING.has(phase) ? 0.5 : 1;
    for (const axis of ['x', 'y', 'z']) {
      head[axis] += addedHead[axis] * energy;
      body[axis] += addedBody[axis] * energy;
      tail[axis] += addedTail[axis] * energy;
    }
    root.rx *= energy;
    root.ry *= energy;
    root.rz *= energy;
  }
  constrain(body, radians(active ? 1 : 0.5));
  tail.y = radians(6) * Math.tanh(tail.y / radians(6));
  const parentBudget = l1(body) + Math.abs(root.rx) + Math.abs(root.ry) + Math.abs(root.rz);
  constrain(head, Math.max(0, radians(3) - parentBudget - 1e-12));

  // Arm sampling starts/ends at original rest with zero speed, allowing the
  // body to anticipate then settle. Sample its actual exported time interval.
  const waveTime = active && gesture === 'hello'
    ? WAVE_CLIP_START + (WAVE_CLIP_DURATION - WAVE_CLIP_START)
      * smootherstep((age - 0.07) / (duration - 0.14)) : null;
  return { head, body, tail, root, waveTime, gestureDone, mood };
}
