export type VisualModule = { type: string; title: string; visualKind?: string; example?: Record<string, unknown>; [key: string]: unknown };
export type OfficialEntry = { modules?: VisualModule[]; en?: { modules?: VisualModule[] }; flowLesson?: Record<string, unknown> };
export type OfficialDetail = { __entryId: string; entry: OfficialEntry };
