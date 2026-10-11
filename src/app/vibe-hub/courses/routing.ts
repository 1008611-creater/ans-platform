type Language = "en" | "zh";
export const s3 = (id: string, locale: Language) => `/vibe-hub/${id}?lang=${locale}`;
export const BB = (course: string, locale: Language) => `/vibe-hub/courses/${course}?lang=${locale}`;
export const Qi = (course: string, chapter: string, locale: Language) => `/vibe-hub/courses/${course}/${chapter}?lang=${locale}`;
export const qD = (locale: Language) => `/vibe-hub/courses?lang=${locale}`;
