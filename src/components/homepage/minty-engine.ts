/**
 * Minty 首访吉祥物的弹簧引擎（纯逻辑，无 DOM）。
 *
 * 手法参考 blessonism/grok-icon-study 的学习复刻：固定步长弹簧积分、姿势状态机、
 * 视线跟随指针、眨眼队列、点击反应。几何与造型一概不用——Minty 就是仓库里的权威像素图集
 * （public/mascot/pixel/dino-atlas.png，行与帧见同目录 manifest.json），一个像素都不重画。
 * 这里只算两件事：整只精灵的位移 / 挤压 / 歪头，以及此刻该显示图集里的哪一格。
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

/**
 * 图集格子：[行, 列]，与 manifest.json 的 states.*.row / labels 下标一一对应。
 * 图集实物是 8×8（1024px / 128px），只用 0–7 行。
 */
export type AtlasCell = readonly [row: number, col: number];

export const MINTY_CELLS = {
  stand: [0, 0], // idle · 站立
  blink: [0, 1], // idle · 眨眼
  tilt: [0, 2], // idle · 歪头
  wag: [0, 3], // idle · 摇尾
  hop: [0, 7], // idle · 轻跳
  jump: [6, 0], // action · 跳起
  wave: [6, 1], // action · 挥手
  heart: [6, 2], // action · 比心
  cheer: [6, 3], // action · 欢呼
  laugh: [4, 2], // emote · 大笑
} as const satisfies Record<string, AtlasCell>;

export type MintyCell = keyof typeof MINTY_CELLS;

export type MintyPose = "rise" | "wave" | "idle" | "look" | "curious" | "wag" | "hop" | "poke";

/** 每个姿势停留时长（毫秒）。rise / wave / hop / poke 是一次性动作，结束后回轮换。 */
const POSE_MS: Record<MintyPose, readonly [number, number]> = {
  rise: [700, 700],
  wave: [1300, 1300],
  idle: [2600, 4800],
  look: [1400, 2200],
  curious: [1600, 2600],
  wag: [1200, 1600],
  hop: [760, 760],
  poke: [900, 900],
};

/** 空闲轮换：大部分时间安静呼吸，偶尔张望、歪头、摇尾巴、蹦一下。 */
const IDLE_ROTATION: readonly MintyPose[] = ["idle", "look", "idle", "curious", "idle", "wag", "idle", "hop", "look", "idle"];

/** 点一下轮流给的开心反应——只挑正向表情，不吓人、不哭。 */
const POKE_CELLS: readonly MintyCell[] = ["laugh", "cheer", "heart"];

export interface MintyFrame {
  /** 精灵位移（舞台宽度的比例，-1..1 ≈ 一个身位）。 */
  x: number;
  y: number;
  /** 精灵旋转，角度；视线跟随就靠它朝指针微倾。 */
  tilt: number;
  /** 纵向挤压：>1 拉长，<1 压扁；横向按体积守恒反算。 */
  squash: number;
  /** 此刻显示的图集格。 */
  cell: MintyCell;
  /** 地面影子缩放，离地越高越小。 */
  shadow: number;
}

/** 朝指针歪头的最大角度——只是「看向你」，不是摔倒。 */
const GAZE_TILT = 6;
/** 朝指针探身的最大位移（舞台宽度比例）。 */
const GAZE_LEAN = 0.025;
/** 眨眼那一格停留时长。 */
const BLINK_MS = 140;

export class MintyEngine {
  readonly bx = spring(0);
  readonly by = spring(0.55);
  readonly tilt = spring(0);
  readonly squash = spring(0.7);

  pose: MintyPose = "rise";
  private poseAt = 0;
  private poseUntil = 0;
  private rotation = 0;
  private pokes = 0;
  private pokeCell: MintyCell = POKE_CELLS[0];
  private blinkAt = 0;
  private blinkQueue: number[] = [];
  private blinkUntil = 0;
  private lookSide = 1;
  private pointer: [number, number] | null = null;
  private now = 0;
  private last = -1;
  private random: () => number;

  constructor(now: number, random: () => number = Math.random) {
    this.random = random;
    this.now = now;
    this.enter("rise", now);
    this.blinkAt = now + 2600;
  }

  /** 指针相对舞台中心的位置，按舞台半宽归一化；null = 指针不在。 */
  setPointer(p: [number, number] | null) {
    this.pointer = p;
  }

  /** 点一下：压扁回弹 + 换一个开心表情。 */
  poke(now: number) {
    this.pokeCell = POKE_CELLS[this.pokes % POKE_CELLS.length];
    this.pokes += 1;
    this.enter("poke", now);
    this.squash.v -= 2.2;
  }

  /** 推进到 now（毫秒），返回这一帧该画的姿态。 */
  tick(now: number): MintyFrame {
    if (this.last < 0) this.last = now;
    const dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    this.now = now;

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
    }
    return this.frame();
  }

  frame(): MintyFrame {
    const lift = Math.max(0, -this.by.x);
    return {
      x: this.bx.x,
      y: this.by.x,
      tilt: this.tilt.x,
      squash: clamp(this.squash.x, 0.82, 1.12),
      cell: this.cell(),
      shadow: clamp(1 - lift * 4.5, 0.45, 1.1) * (this.by.x > 0.3 ? 0 : 1),
    };
  }

  private cell(): MintyCell {
    const t = (this.now - this.poseAt) / 1000;
    switch (this.pose) {
      case "rise": return t < 0.4 ? "jump" : "stand";
      case "wave": return "wave";
      case "curious": return "tilt";
      case "wag": return "wag";
      case "hop": return t >= 0.1 && t < 0.4 ? "hop" : "stand";
      case "poke": return t < 0.06 ? "stand" : this.pokeCell;
      default:
        // 眨眼用图集自己的「眨眼」格，只在站立格上换，别的表情保持原样。
        return this.now < this.blinkUntil ? "blink" : "stand";
    }
  }

  private enter(pose: MintyPose, now: number) {
    this.pose = pose;
    this.poseAt = now;
    const [a, b] = POSE_MS[pose];
    this.poseUntil = now + a + this.random() * (b - a);
    if (pose === "look") this.lookSide = this.random() < 0.5 ? -1 : 1;
  }

  private advance(now: number) {
    // 出场冒头后先打个招呼，再进空闲轮换。
    if (this.pose === "rise") return this.enter("wave", now);
    const next = IDLE_ROTATION[this.rotation % IDLE_ROTATION.length];
    this.rotation += 1;
    this.enter(next, now);
  }

  private applyPose(now: number) {
    const t = (now - this.poseAt) / 1000;
    const breathe = Math.sin(now / 1000 * 2.1);
    const ptr = this.pointer;
    // 视线跟随：整只朝指针微倾、微探身。
    const px = ptr ? clamp(ptr[0], -1, 1) : 0;
    let x = px * GAZE_LEAN, y = 0, tilt = px * GAZE_TILT, squash = 1 + breathe * 0.012;

    switch (this.pose) {
      case "rise": {
        // 从舞台下沿冒头：先压扁蓄力，再一下弹到位。弹簧负责过冲与回落。
        if (t < 0.12) { y = 0.55; squash = 0.84; }
        else { y = 0; squash = t < 0.32 ? 1.05 : 1; }
        tilt = 0;
        break;
      }
      case "wave":
        y = breathe * 0.006;
        tilt += Math.sin(t * 7) * 2;
        break;
      case "idle":
        y = breathe * 0.006;
        if (!ptr) tilt = Math.sin(now / 1000 * 0.7) * 1.2;
        break;
      case "look":
        if (!ptr) { tilt = this.lookSide * GAZE_TILT * 0.6; x = this.lookSide * GAZE_LEAN; }
        break;
      case "curious":
        // 「歪头」格本身已经歪了，弹簧只补一点同向的倾角，不叠加成摔倒。
        tilt = ptr ? px * 4 : 3;
        y = -0.01;
        squash = 1.02;
        break;
      case "wag":
        tilt += Math.sin(t * 9) * 1.5;
        break;
      case "hop":
        // 两段：蹲（压扁）→ 起跳（拉长 + 离地）→ 落地交还弹簧。
        if (t < 0.1) { squash = 0.88; y = 0.01; }
        else if (t < 0.32) { squash = 1.06; y = -0.09; }
        else { squash = 1; y = 0; }
        break;
      case "poke":
        if (t < 0.06) { squash = 0.84; }
        else if (t < 0.28) { squash = 1.04; y = -0.07; }
        else { squash = 1; y = 0; }
        break;
    }

    this.bx.t = x;
    this.by.t = y;
    this.tilt.t = tilt;
    this.squash.t = squash;
  }

  private updateBlink(now: number) {
    if (now >= this.blinkAt && this.blinkQueue.length === 0) {
      this.blinkQueue.push(now);
      if (this.random() < 0.18) this.blinkQueue.push(now + 320);
      this.blinkAt = now + 2800 + this.random() * 4200;
    }
    while (this.blinkQueue.length && now >= this.blinkQueue[0]) this.blinkUntil = this.blinkQueue.shift()! + BLINK_MS;
  }
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}
