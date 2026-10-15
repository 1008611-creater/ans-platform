"use client";
import { useEffect, useState } from "react";
import { getCommunityDay, millisecondsUntilNextCommunityDay } from "@/domain/growth/check-in";
/** A suspended tab catches up on focus; no mutation or automatic check-in occurs. */
export function useCommunityDay(initialDay: string) {
  const [day, setDay] = useState(initialDay);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      const now = new Date();
      setDay(getCommunityDay(now));
      clearTimeout(timer);
      timer = setTimeout(refresh, millisecondsUntilNextCommunityDay(now));
    };
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => { clearTimeout(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", visible); };
  }, []);
  return day;
}
