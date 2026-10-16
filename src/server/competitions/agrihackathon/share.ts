import { cache } from "react";
import { readAgriWall } from "./wall";

/** Request-local only: withdrawal and current counting are rechecked on each visit. */
export const readAgriWallShare = cache(async (slug: string) => {
  if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(slug)) return null;
  const wall = await readAgriWall();
  const entry = wall.entries.find(row => row.offer.slug === slug && row.eligible);
  return entry ? { entry, round: wall.round } : null;
});
