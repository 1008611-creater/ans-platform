"use client";

/**
 * 社区里还没发出去的草稿，存在本机浏览器里。
 * 游客写了一半去登录，回来时从这里把字放回去；发出后清掉。
 */
export type CommunityDraft = { kind?: string; stall?: string; board?: string; title?: string; body?: string };

const PREFIX = "ans:community-draft:";

export function loadDraft(key: string): CommunityDraft | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) as CommunityDraft : null;
  } catch {
    return null;
  }
}

export function saveDraft(key: string, draft: CommunityDraft) {
  try { window.localStorage.setItem(PREFIX + key, JSON.stringify(draft)); } catch { /* 隐私模式下存不了，就不存 */ }
}

export function clearDraft(key: string) {
  try { window.localStorage.removeItem(PREFIX + key); } catch { /* 同上 */ }
}

/** 去登录，登录完回到 `back`（只用站内相对地址）。 */
export function loginHref(back: string) {
  return `/login?${new URLSearchParams({ callbackUrl: back }).toString()}`;
}
