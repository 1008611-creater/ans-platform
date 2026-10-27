/**
 * Minty 首访吉祥物的弹簧引擎（纯逻辑，无 DOM）。
 *
 * 手法参考 blessonism/grok-icon-study 的学习复刻：固定步长弹簧积分、姿势状态机、
 * 眼睛跟随指针、眨眼队列、点击反应。几何与造型一概不用——Minty 的身体与眼睛
 * 都是图像生成的成品图（public/first-visit/minty/），这里只算它们的位移 / 挤压 / 旋转。
 */

export interface Spring {
  x: number;
  v: number;
  t: number;
}

/** [角频率, 阻尼比]：阻尼比 < 1 会回弹，= 1 刚好不过冲。 */
export type SpringTune = readonly [freq: number, damp: number];

export const SPRING_TUNE = {
  x: [7, 0.62],
  y: [9, 0.55],
  tilt: [8, 0.5],
  squash: [15, 0.48],
  gaze: [18, 0.9],
  lid: [42, 1],
} as const satisfies Record<string, SpringTune>;

const FIXED_DT = 1 / 120;

export function spring(x: number): Spring {
  return { x, v: 0, t: x };
}

/** 半隐式欧拉，一步。数值炸了就钉回目标，宁可不动也不乱飞。 */
export function stepSpring(s: Spring, [freq, damp]: SpringTune, dt: number) {
  s.v += (-2 * damp * freq * s.v - freq * freq * (s.x - s.t)) * dt;
  s.x += s.v * dt;
  if (!Number.isFinite(s.x) || !Number.isFinite(s.v)) {
    s.x = s.t;
    s.v = 0;
  }
}

export type MintyPose = "rise" | "idle" | "look" | "curious" | "hop" | "poke";

/** 每个姿势停留时长（毫秒）。rise / hop / poke 是一次性动作，结束后回 idle。 */
const POSE_MS: Record<MintyPose, readonly [number, number]> = {
  rise: [900, 900],
  idle: [2600, 4800],
  look: [1400, 2200],
  curious: [1600, 2600],
  hop: [760, 760],
  poke: [620, 620],
};

/** 空闲轮换：大部分时间安静呼吸，偶尔张望、歪头、蹦一下。 */
const IDLE_ROTATION: readonly MintyPose[] = ["look", "idle", "curious", "idle", "hop", "idle", "look", "idle"];

export interface MintyFrame {
  /** 身体位移（舞台宽度的比例，-1..1 ≈ 一个身位）。 */
  x: number;
  y: number;
  /** 身体旋转，角度。 */
  tilt: number;
  /** 纵向挤压：>1 拉长，<1 压扁；横向按体积守恒反算。 */
  squash: number;
  /** 眼睛偏移（舞台宽度的比例）。 */
  gazeX: number;
  gazeY: number;
  /** 眼皮：1 全睁，~0.08 闭眼。 */
  lid: number;
  /** 地面影子缩放，离地越高越小。 */
  shadow: number;
}

/** 眼睛最大偏移（舞台宽度比例）——停在脸内，不出球。 */
const GAZE_MAX_X = 0.035;
const GAZE_MAX_Y = 0.024;

export class MintyEngine {
  readonly bx = spring(0);
  readonly by = spring(0.55);
  readonly tilt = spring(0);
  readonly squash = spring(0.7);
  readonly gx = spring(0);
  readonly gy = spring(0);
  readonly lid = spring(1);

  pose: MintyPose = "rise";
  private poseAt = 0;
  private poseUntil = 0;
  private rotation = 0;
  private blinkAt = 0;
  private blinkQueue: { at: number; v: number }[] = [];
  private lookTarget: [number, number] = [0, 0];
  private pointer: [number, number] | null = null;
  private last = -1;
  private random: () => number;

  constructor(now: number, random: () => number = Math.random) {
    this.random = random;
    this.enter("rise", now);
    this.blinkAt = now + 1400;
  }

  /** 指针相对舞台中心的位置，按舞台半宽归一化；null = 指针不在。 */
  setPointer(p: [number, number] | null) {
    this.pointer = p;
  }

  /** 点一下：压扁回弹 + 眨眼 + 小蹦。 */
  poke(now: number) {
    this.enter("poke", now);
    this.squash.v -= 2.2;
    this.queueBlink(now + 40);
  }

  /** 推进到 now（毫秒），返回这一帧该画的姿态。 */
  tick(now: number): MintyFrame {
    if (this.last < 0) this.last = now;
    const dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;

    if (now >= this.poseUntil) this.advance(now);
    this.applyPose(now);
    this.updateBlink(now);

    const steps = Math.max(1, Math.ceil(dt / FIXED_DT));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      stepSpring(this.bx, SPRING_TUNE.x, h);
      stepSpring(this.by, SPRING_TUNE.y, h);
      stepSpring(this.tilt, SPRING_TUNE.tilt, h);
      stepSpring(this.squash, SPRING_TUNE.squash, h);
      stepSpring(this.gx, SPRING_TUNE.gaze, h);
      stepSpring(this.gy, SPRING_TUNE.gaze, h);
      stepSpring(this.lid, SPRING_TUNE.lid, h);
    }
    return this.frame();
  }

  frame(): MintyFrame {
    const lift = Math.max(0, -this.by.x);
    return {
      x: this.bx.x,
      y: this.by.x,
      tilt: this.tilt.x,
      squash: clamp(this.squash.x, 0.78, 1.16),
      gazeX: clamp(this.gx.x, -GAZE_MAX_X, GAZE_MAX_X),
      gazeY: clamp(this.gy.x, -GAZE_MAX_Y, GAZE_MAX_Y),
      lid: clamp(this.lid.x, 0.06, 1.1),
      shadow: clamp(1 - lift * 4.5, 0.45, 1.1) * (this.by.x > 0.3 ? 0 : 1),
    };
  }

  private enter(pose: MintyPose, now: number) {
    this.pose = pose;
    this.poseAt = now;
    const [a, b] = POSE_MS[pose];
    this.poseUntil = now + a + this.random() * (b - a);
    if (pose === "look") {
      this.lookTarget = [(this.random() * 2 - 1) * GAZE_MAX_X, (this.random() * 2 - 1) * GAZE_MAX_Y * 0.7];
    }
  }

  private advance(now: number) {
    const next = IDLE_ROTATION[this.rotation % IDLE_ROTATION.length];
    this.rotation += 1;
    this.enter(next, now);
  }

  private applyPose(now: number) {
    const t = (now - this.poseAt) / 1000;
    const breathe = Math.sin(now / 1000 * 2.1);
    const ptr = this.pointer;
    let x = 0, y = 0, tilt = 0, squash = 1 + breathe * 0.012;
    let gx = ptr ? ptr[0] * GAZE_MAX_X : 0;
    let gy = ptr ? ptr[1] * GAZE_MAX_Y : 0;

    switch (this.pose) {
      case "rise": {
        // 从舞台下沿冒头：先压扁蓄力，再一下弹到位。弹簧负责过冲与回落。
        if (t < 0.18) { y = 0.55; squash = 0.78; }
        else { y = 0; squash = t < 0.36 ? 1.05 : 1; }
        break;
      }
      case "idle":
        y = breathe * 0.006;
        tilt = Math.sin(now / 1000 * 0.7) * 1.2;
        break;
      case "look":
        if (!ptr) [gx, gy] = this.lookTarget;
        tilt = this.lookTarget[0] > 0 ? 3 : -3;
        x = this.lookTarget[0] * 0.6;
        break;
      case "curious":
        tilt = ptr ? clamp(ptr[0], -1, 1) * 9 : 8;
        y = -0.012;
        squash = 1.03;
        break;
      case "hop": {
        // 两段：蹲（压扁）→ 起跳（拉长 + 离地）→ 落地交还弹簧。
        if (t < 0.12) { squash = 0.86; y = 0.01; }
        else if (t < 0.34) { squash = 1.08; y = -0.1; }
        else { squash = 1; y = 0; }
        break;
      }
      case "poke":
        if (t < 0.08) { squash = 0.8; }
        else if (t < 0.3) { squash = 1.04; y = -0.08; tilt = 5; }
        else { squash = 1; y = 0; }
        break;
    }

    this.bx.t = x;
    this.by.t = y;
    this.tilt.t = tilt;
    this.squash.t = squash;
    this.gx.t = gx;
    this.gy.t = gy;
  }

  private queueBlink(at: number) {
    this.blinkQueue.push({ at, v: 0.06 }, { at: at + 80, v: 0.06 }, { at: at + 150, v: 1.06 }, { at: at + 260, v: 1 });
  }

  private updateBlink(now: number) {
    if (now >= this.blinkAt && this.blinkQueue.length === 0) {
      this.queueBlink(now);
      if (this.random() < 0.18) this.queueBlink(now + 330);
      this.blinkAt = now + 2800 + this.random() * 4200;
    }
    let key: number | null = null;
    while (this.blinkQueue.length && now >= this.blinkQueue[0].at) key = this.blinkQueue.shift()!.v;
    if (key !== null) this.lid.t = key;
  }
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}
