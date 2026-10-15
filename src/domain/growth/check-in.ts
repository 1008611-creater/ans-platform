/** Community participation uses the Asia/Shanghai calendar, independent of host timezone. */
const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
});
export function getCommunityDay(now: Date): string {
  const parts = dayFormatter.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function shiftCommunityDay(day: string, offset: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
/** The stored counter belongs to the last check-in; reads must expire a broken streak. */
export function activeCheckInStreak(stored: number, lastCheckInAt: Date | null, now = new Date()): number {
  if (!lastCheckInAt || !Number.isFinite(stored) || stored <= 0) return 0;
  const today = getCommunityDay(now), last = getCommunityDay(lastCheckInAt);
  return last === today || last === shiftCommunityDay(today, -1) ? stored : 0;
}
export function communityCalendarDays(today: string, count = 28): string[] {
  return Array.from({ length: count }, (_, index) => shiftCommunityDay(today, index - count + 1));
}
export function millisecondsUntilNextCommunityDay(now: Date): number {
  const midnight = new Date(`${getCommunityDay(now)}T00:00:00+08:00`).getTime();
  return Math.max(1, midnight + 86400000 - now.getTime() + 1);
}
