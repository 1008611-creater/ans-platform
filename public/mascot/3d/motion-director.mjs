import { GESTURE_DURATIONS } from './performance.mjs?v=dock4';
// Deterministic interaction choreography. Time is visible runtime seconds,
// never Date.now()/wall time. This module owns no timers, DOM or pose data.
export const PHASE_GESTURES = Object.freeze({
  confirm: 'nod', attention: 'listen', failed: 'no', ready: 'surprise', review: 'celebrate',
  saving: 'think', submitting: 'think', queued: 'think', working: 'think', recovering: 'think',
});
const PHASES = new Set(['idle', 'input', 'saving', 'confirm', 'ready', 'submitting',
  'queued', 'working', 'review', 'editing', 'recovering', 'attention', 'failed', 'cancelled', 'archived']);
const IDLE_GESTURES = ['curious', 'stretch', 'celebrate', 'listen', 'surprise', 'shy', 'nod', 'no'];
const IDLE_DELAYS = [5.5, 6.8, 8.2, 7.2, 8.8, 7.6, 8.4, 9.2];
const safeTime = time => Number.isFinite(time) ? Math.max(0, time) : 0;

export class MotionDirector {
  constructor({ autoplay = false, random = Math.random } = {}) {
    this.autoplay = autoplay;
    this.paused = false;
    this.random = random;
    this.bag = [];
    this.lastRandomGesture = null;
    this.phase = 'idle';
    this.lastActivity = 0;
    this.nextIdleAt = IDLE_DELAYS[0];
    this.idleCount = 0;
    this.sleepShown = false;
    this.pending = null;
    this.runningGesture = null;
    this.runningSource = null;
    this.lastHello = -Infinity;
    this.lastPhaseGesture = null;
    this.lastPhaseAt = -Infinity;
  }

  activity(time) {
    this.lastActivity = safeTime(time);
    this.idleCount = 0;
    this.sleepShown = false;
    this.nextIdleAt = this.lastActivity + IDLE_DELAYS[0];
  }

  onPhase(phase, time, { active = true } = {}) {
    if (!PHASES.has(phase) || this.phase === phase) return false;
    const previous = PHASE_GESTURES[this.phase] || null;
    this.phase = phase;
    this.activity(time);
    const gesture = PHASE_GESTURES[phase] || null;
    if (!active) { this.pending = null; return true; }
    // Input/editing explicitly settle. New meaningful states may interrupt a
    // different response; repeated busy progress does not repeat thinking.
    if (!gesture) this.pending = { gesture: 'idle', source: 'phase' };
    else if (gesture !== previous) {
      const repeat = this.lastPhaseGesture === gesture && safeTime(time) - this.lastPhaseAt < 1.5;
      if (!repeat) {
        this.pending = { gesture, source: 'phase' };
        this.lastPhaseGesture = gesture;
        this.lastPhaseAt = safeTime(time);
      }
    }
    return true;
  }

  onHello(time, { active = true } = {}) {
    if (!active) return false;
    const now = safeTime(time);
    this.activity(now);
    if (now - this.lastHello < 1.5) return false;
    if ((this.runningGesture === 'celebrate' && this.runningSource === 'phase')
      || (this.pending?.gesture === 'celebrate' && this.pending.source === 'phase')) return false;
    this.lastHello = now;
    this.idleCount = 0;
    this.sleepShown = false;
    this.nextIdleAt = now + 4.2;
    this.pending = { gesture: 'hello', source: 'hello' };
    return true;
  }

  setAutoplay(enabled, time) {
    this.autoplay = Boolean(enabled);
    this.paused = !enabled;
    this.nextIdleAt = safeTime(time) + (this.autoplay ? 1 : IDLE_DELAYS[0]);
    if (!enabled) this.pending = { gesture: 'idle', source: 'pause' };
  }

  randomGesture() {
    if (!this.bag.length) {
      this.bag = [...IDLE_GESTURES, 'think', 'hello'];
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
      if (this.bag.at(-1) === this.lastRandomGesture) [this.bag[0], this.bag[this.bag.length - 1]] = [this.bag.at(-1), this.bag[0]];
    }
    this.lastRandomGesture = this.bag.pop();
    return this.lastRandomGesture;
  }

  onGesture(gesture, time) {
    if (!Object.hasOwn(GESTURE_DURATIONS, gesture)) return false;
    this.pending = { gesture, source: 'interaction' };
    this.nextIdleAt = safeTime(time) + GESTURE_DURATIONS[gesture] + 1.6;
    return true;
  }

  onRandom(time) { return this.onGesture(this.randomGesture(), time); }

  onPointer(time, { active = true } = {}) {
    if (!active) return false;
    if (this.autoplay) return false;
    this.activity(time);
    if (this.runningSource === 'idle' || this.pending?.source === 'idle') {
      this.pending = { gesture: 'idle', source: 'interrupt' };
      return true;
    }
    return false;
  }

  suspend(time) {
    this.pending = null;
    this.runningGesture = this.runningSource = null;
    this.activity(time);
  }

  resume(time) {
    // A fresh idle delay after a hidden interval prevents catching up missed
    // performances, including sleep. Parent/runtime keeps its clock frozen.
    this.activity(time);
    this.pending = null;
    this.runningGesture = this.runningSource = null;
  }

  next(time, currentGesture, { active = true } = {}) {
    if (!active) return null;
    const now = safeTime(time);
    if (!currentGesture) this.runningGesture = this.runningSource = null;
    if (this.pending) {
      const command = this.pending;
      this.pending = null;
      this.runningGesture = command.gesture === 'idle' ? null : command.gesture;
      this.runningSource = this.runningGesture ? command.source : null;
      return command;
    }
    if (this.paused) return null;
    if (this.autoplay) {
      if (this.phase !== 'idle' || currentGesture || now < this.nextIdleAt) return null;
      const gesture = this.randomGesture();
      this.nextIdleAt = now + GESTURE_DURATIONS[gesture] + 1.6 + this.random() * 2;
      this.runningGesture = gesture; this.runningSource = 'random';
      return { gesture, source: 'random' };
    }
    if (this.phase !== 'idle' || currentGesture || now < this.nextIdleAt || this.sleepShown) return null;
    let gesture;
    if (now - this.lastActivity >= 90) {
      gesture = 'sleep';
      this.sleepShown = true;
      this.nextIdleAt = Infinity;
    } else if (this.idleCount < IDLE_GESTURES.length) {
      gesture = IDLE_GESTURES[this.idleCount++];
      this.nextIdleAt = this.idleCount < IDLE_GESTURES.length
        ? now + IDLE_DELAYS[this.idleCount]
        : Math.max(now + 18, this.lastActivity + 90);
    } else return null;
    this.runningGesture = gesture;
    this.runningSource = 'idle';
    return { gesture, source: 'idle' };
  }

  snapshot() {
    return {
      autoplay: this.autoplay, remaining: [...this.bag], phase: this.phase, runningGesture: this.runningGesture, source: this.runningSource,
      nextIdleAt: Number.isFinite(this.nextIdleAt) ? this.nextIdleAt : null,
      lastActivity: this.lastActivity, idleCount: this.idleCount, sleepShown: this.sleepShown,
      pending: this.pending ? { ...this.pending } : null,
    };
  }
}
