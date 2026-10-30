/**
 * ANS 吉祥物「双形态」与 2D 像素精灵图集的共享定义（纯逻辑，可在服务端/测试中导入）。
 *
 * 图片资源：public/mascot/pixel/dino-atlas.png（8 列 × 8 行，每格 128px）。
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
  /** 整行循环总时长（毫秒） */
  durationMs: number;
  /** 该行 8 帧的用途标签 */
  labels: readonly string[];
}

export const ATLAS_CELL = 128;
export const ATLAS_COLS = 8;
export const ATLAS_ROWS = 8;

export const DINO_STATES: Record<DinoState, DinoStateSpec> = {
  idle: { row: 0, frames: 8, durationMs: 3200, labels: ["站立", "眨眼", "歪头", "摇尾", "举手", "坐下", "打哈欠", "轻跳"] },
  walk: { row: 1, frames: 8, durationMs: 960, labels: ["走1", "走2", "走3", "走4", "走5", "走6", "走7", "走8"] },
  run: { row: 2, frames: 8, durationMs: 720, labels: ["跑1", "跑2", "跑3", "跑4", "跑5", "跑6", "跑7", "跑8"] },
  work: { row: 3, frames: 8, durationMs: 3200, labels: ["摸鱼", "搬砖", "敲键盘", "开会打盹", "接电话", "喝水", "举牌", "被追跑"] },
  emote: { row: 4, frames: 8, durationMs: 3600, labels: ["爆哭", "气鼓鼓", "大笑", "懵圈", "无语", "震惊", "摆烂", "比心"] },
  react: { row: 5, frames: 8, durationMs: 3600, labels: ["敬礼", "求求", "笑滚", "裂开", "流汗", "磕头", "探头", "狂吃"] },
  action: { row: 6, frames: 8, durationMs: 2400, labels: ["跳起", "挥手", "比心", "欢呼", "举方块", "躺睡", "背对", "回头"] },
  meme: { row: 7, frames: 8, durationMs: 3200, labels: ["暴富", "暗中观察", "石化", "没电", "加载中", "冒烟", "发光", "缩成团"] },
};

/** 空闲时随机切换的候选状态（让它像活的） */
export const IDLE_VARIANTS: readonly DinoState[] = ["idle", "idle", "walk", "work", "action", "emote"];

/** 点击时随机触发的状态行 */
export const CLICK_REACTIONS: readonly DinoState[] = ["action", "emote", "react", "meme"];

export const FORM_STORAGE_KEY = "ans.mascot.form";
export const FORM_EVENT = "ans:mascot-form";
export const SAY_EVENT = "ans:dino-say";
export const STATE_EVENT = "ans:dino-state";

export function isMascotForm(value: unknown): value is MascotForm {
  return value === "2d" || value === "3d";
}

export function isDinoState(value: unknown): value is DinoState {
  return typeof value === "string" && value in DINO_STATES;
}

export function otherForm(form: MascotForm): MascotForm {
  return form === "2d" ? "3d" : "2d";
}

/**
 * 计算 8×8 图集某一行（或指定列）的百分比背景定位：
 * background-size: 800% 800% 时，第 col 列 = (col / 7) * 100%，第 row 行 = (row / 7) * 100%
 */
export function atlasRowOffsetPercent(state: DinoState): string {
  const spec = DINO_STATES[state];
  return `${((spec.row / (ATLAS_ROWS - 1)) * 100).toFixed(4)}%`;
}

export function atlasCellPositionPercent(row: number, col: number): string {
  const x = ((Math.max(0, Math.min(ATLAS_COLS - 1, col)) / (ATLAS_COLS - 1)) * 100).toFixed(4);
  const y = ((Math.max(0, Math.min(ATLAS_ROWS - 1, row)) / (ATLAS_ROWS - 1)) * 100).toFixed(4);
  return `${x}% ${y}%`;
}
