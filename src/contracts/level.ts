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
  grades?: string[];
}

export interface LevelProgress {
  level: LevelDef;
  nextLevel: LevelDef | null;
  progress: number;
  xpIntoLevel: number;
  xpForLevel: number;
  gradeLabel: string | null;
  xpToNext: number;
}
