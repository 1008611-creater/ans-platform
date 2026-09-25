/**
 * 等级契约：等级定义与进度结构。
 *
 * 这些类型放在 contracts 层，是为了让客户端组件可以描述「等级进度」，
 * 而不必 import 任何服务端模块。运行时实现（LEVELS / getLevelProgress /
 * XP_RULES）仍在 src/lib/level.ts，那是纯函数模块，客户端可以安全引用。
 *
 * src/lib/level.ts 会原样再导出这里的类型，保证全仓库只有一份定义。
 */

export type LevelKey =
  | "KINDERGARTEN"
  | "PRIMARY"
  | "JUNIOR"
  | "SENIOR"
  | "UNDERGRAD"
  | "MASTER"
  | "PHD"
  | "PROFESSOR";

export interface LevelDef {
  key: LevelKey;
  index: number;
  nameZh: string;
  nameEn: string;
  minXp: number;
  /** 该等级内部的年级名（大学生=大一~大四）；为空则不分年级 */
  grades?: string[];
}

export interface LevelProgress {
  level: LevelDef;
  nextLevel: LevelDef | null;
  /** 当前等级内进度 0~1（满级恒为 1） */
  progress: number;
  xpIntoLevel: number;
  xpForLevel: number;
  /** 等级内的年级显示，如「大二」「研一」；无年级则为 null */
  gradeLabel: string | null;
  xpToNext: number;
}
