/**
 * ANS 吉祥物「双形态」与 2D 像素精灵图集的共享定义（纯逻辑，可在服务端/测试中导入）。
 *
 * 图片资源：public/mascot/pixel/dino-atlas.png（8 列 × 8 行，每格 128px；@2x 为 256px）。
 * 生成方式见 docs/bilibili-ans-launch/mascot-dual-form.md
 */

/** 2D 像素形态的状态（对应精灵图集的 8 行之一） */
export type DinoState =
  | "idle"
  | "walk"
  | "run"
  | "work"
  | "emote"
  | "react"
  | "action"
  | "meme";

/** 形态：2D 像素 / 3D 立体 */
export type MascotForm = "2d" | "3d";

export interface DinoStateSpec {
  /** 图集中的行号（0 起） */
  row: number;
  /** 该行的帧数 */
  frames: number;
  /** 单帧时长（毫秒） */
  durationMs: number;
  /** 该行 8 帧的用途标签（工具链/文档用） */
  labels: readonly string[];
}

export const ATLAS_CELL = 128;
export const ATLAS_COLS = 8;
export const ATLAS_ROWS = 8;

export const DINO_STATES: Record<DinoState, DinoStateSpec> = {
  idle: { row: 0, frames: 8, durationMs: 260, labels: ["站立", "眨眼", "歪头", "摇尾", "举手", "坐下", "打哈欠", "轻跳"] },
  walk: { row: 1, frames: 8, durationMs: 110, labels: ["走1", "走2", "走3", "走4", "走5", "走6", "走7", "走8"] },
  run: { row: 2, frames: 8, durationMs: 90, labels: ["跑1", "跑2", "跑3", "跑4", "跑5", "跑6", "跑7", "跑8"] },
  work: { row: 3, frames: 8, durationMs: 400, labels: ["摸鱼", "搬砖", "敲键盘", "开会打盹", "接电话", "喝水", "举牌", "被追跑"] },
  emote: { row: 4, frames: 8, durationMs: 600, labels: ["爆哭", "气鼓鼓", "大笑", "懵圈", "无语", "震惊", "摆烂", "比心"] },
  react: { row: 5, frames: 8, durationMs: 600, labels: ["敬礼", "求求", "笑滚", "裂开", "流汗", "磕头", "探头", "狂吃"] },
  action: { row: 6, frames: 8, durationMs: 300, labels: ["跳起", "挥手", "比心", "欢呼", "举方块", "躺睡", "背对", "回头"] },
  meme: { row: 7, frames: 8, durationMs: 450, labels: ["暴富", "暗中观察", "石化", "没电", "加载中", "冒烟", "发光", "缩成团"] },
};

/** 空闲时随机切换的候选状态（让它像活的） */
export const IDLE_VARIANTS: readonly DinoState[] = ["idle", "idle", "idle", "walk", "work", "emote"];

/** 点击时随机触发的状态行 */
export const CLICK_REACTIONS: readonly DinoState[] = ["emote", "react", "action"];

export const FORM_STORAGE_KEY = "ans.mascot.form";
export const FORM_EVENT = "ans:mascot-form";
export const SAY_EVENT = "ans:dino-say";
export const STATE_EVENT = "ans:dino-state";
export const POSITION_STORAGE_KEY = "ans.mascot.position";

export function isMascotForm(value: unknown): value is MascotForm {
  return value === "2d" || value === "3d";
}

export function otherForm(form: MascotForm): MascotForm {
  return form === "2d" ? "3d" : "2d";
}

/** 读取已保存的形态（SSR / 无 localStorage 时回退默认值） */
export function readStoredForm(fallback: MascotForm = "2d"): MascotForm {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(FORM_STORAGE_KEY);
    return isMascotForm(raw) ? raw : fallback;
  } catch {
    return fallback;
  }
}

export function storeForm(form: MascotForm): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FORM_STORAGE_KEY, form);
  } catch {
    /* 隐私模式下忽略 */
  }
  window.dispatchEvent(new CustomEvent(FORM_EVENT, { detail: { form } }));
}

/** 精灵图上某一行在给定显示尺寸下的定位参数 */
export function spriteGeometry(state: DinoState, cell: number) {
  const spec = DINO_STATES[state];
  return {
    row: spec.row,
    frames: spec.frames,
    durationMs: spec.durationMs,
    backgroundSize: cell * ATLAS_COLS + "px " + cell * ATLAS_ROWS + "px",
    offsetY: -(spec.row * cell),
    travelX: -(spec.frames * cell),
  };
}
