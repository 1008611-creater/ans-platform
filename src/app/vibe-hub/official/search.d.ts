export type SearchEntry = { id: string; name: string; cn: string; cat: string; aliases?: string[]; quote?: string; tagline?: string; desc?: string };
export type SearchHit = { entry: SearchEntry; score: number; matchedFields: string[] };
export function searchTerms(options?: { query?: string; category?: string; limit?: number; minScore?: number; entries?: SearchEntry[] }): SearchHit[];
