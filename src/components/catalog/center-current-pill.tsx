"use client";

import { useEffect } from "react";

/** In a horizontally scrolling pill row, bring the selected pill to the middle so it is never off-screen. */
export function CenterCurrentPill({ rowId }: { rowId: string }) {
  useEffect(() => {
    const row = document.getElementById(rowId);
    const current = row?.querySelector<HTMLElement>("[aria-current]");
    if (!row || !current || row.scrollWidth <= row.clientWidth) return;
    const pill = current.getBoundingClientRect(), box = row.getBoundingClientRect();
    row.scrollLeft += pill.left - box.left - (row.clientWidth - pill.width) / 2;
  }, [rowId]);
  return null;
}
