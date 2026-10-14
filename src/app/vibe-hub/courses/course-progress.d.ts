export type ChapterProgress = {status: "not-started" | "in-progress" | "completed";readCompleted: boolean;updatedAt:number};
export type CourseView = {articleScrollTop:number;selectedTermId:string|null;termScrollTopById:Record<string,number>};
export function useCourseProgress(course: string): {hydrated:boolean;persisted:boolean;progress:{version:number;chapters:Record<string,ChapterProgress>;views:Record<string,CourseView>};updateChapter:(chapter:string,change:Partial<ChapterProgress>)=>void;updateView:(chapter:string,change:Partial<CourseView>)=>CourseView};
export function emptyChapterProgress(): ChapterProgress;
