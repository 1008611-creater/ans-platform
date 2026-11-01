"use client";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

/** 手机布局断点（PRD v1.1 第三节）：窄于 768px 时，小恐龙面板改成底部抽屉。 */
export const COMPANION_SHEET_QUERY = "(max-width: 767px)";
/** 下拉超过这个距离松手就收起（在 80% 档时先回到 60%）。 */
export const SHEET_CLOSE_PX = 96;
/** 上拉超过这个距离松手就吸附到 80% 档。 */
export const SHEET_EXPAND_PX = 48;
export type SheetSnap = "half" | "full";

/** 松手时按拖动距离决定去向：收起、切档，或回到原档。 */
export function settleSheet(snap: SheetSnap, offset: number): SheetSnap | "close" {
  if (offset > SHEET_CLOSE_PX) return snap === "full" ? "half" : "close";
  if (offset < -SHEET_EXPAND_PX) return "full";
  return snap;
}

const HISTORY_MARK = "ansCompanionSheet";
const root = () => document.documentElement.style;

/**
 * 小恐龙底部抽屉：60% / 80% 两档，拖拽条与列表顶部下拉都能收起；
 * 打开时锁住底层滚动，安卓返回键（WebView goBack）通过一条历史记录收起抽屉。
 * 抽屉里有输入框，所以不提供"点遮罩收起"。
 */
export function useCompanionSheet(open: boolean, close: () => void) {
  const [enabled, setEnabled] = useState(false);
  const [snap, setSnap] = useState<SheetSnap>("half");
  const [offset, setOffset] = useState(0);
  const pushed = useRef(false), navigating = useRef(false), closeRef = useRef(close), drag = useRef<{ id: number; y: number } | null>(null);
  const snapRef = useRef(snap);
  useEffect(() => { closeRef.current = close; snapRef.current = snap; });
  const active = enabled && open;

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(COMPANION_SHEET_QUERY), sync = () => setEnabled(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  function finish(value: number) {
    drag.current = null;
    setOffset(0);
    const next = settleSheet(snapRef.current, value);
    if (next === "close") closeRef.current();
    else setSnap(next);
  }

  // 抽屉高度、拖动位移和键盘高度写到根节点上，抽屉本体（portal）和停在抽屉上沿的小恐龙共用。
  useEffect(() => {
    if (!active) return;
    const style = root();
    style.setProperty("--ans-sheet-h", snap === "full" ? "86dvh" : "70dvh");
    return () => { style.removeProperty("--ans-sheet-h"); };
  }, [active, snap]);
  useEffect(() => {
    if (!active) return;
    const style = root();
    style.setProperty("--ans-sheet-drag", `${offset}px`);
    if (offset) document.documentElement.dataset.ansSheetDragging = "true";
    else delete document.documentElement.dataset.ansSheetDragging;
    return () => { style.removeProperty("--ans-sheet-drag"); delete document.documentElement.dataset.ansSheetDragging; };
  }, [active, offset]);
  useEffect(() => {
    const visual = window.visualViewport;
    if (!active || !visual) return;
    const sync = () => {
      const keyboard = Math.max(0, window.innerHeight - visual.height - visual.offsetTop);
      root().setProperty("--ans-sheet-kb", `${Math.round(keyboard)}px`);
      root().setProperty("--ans-sheet-vh", `${Math.round(visual.height)}px`);
    };
    sync();
    visual.addEventListener("resize", sync);
    visual.addEventListener("scroll", sync);
    return () => {
      visual.removeEventListener("resize", sync);
      visual.removeEventListener("scroll", sync);
      root().removeProperty("--ans-sheet-kb");
      root().removeProperty("--ans-sheet-vh");
    };
  }, [active]);

  // 锁住底层滚动：body 固定并记住 scrollY，关闭时回到原位（换了页面就不回）。
  useEffect(() => {
    if (!active) return;
    const body = document.body.style, y = window.scrollY, path = window.location.pathname;
    const previous = { position: body.position, top: body.top, width: body.width, overflow: body.overflow };
    Object.assign(body, { position: "fixed", top: `-${y}px`, width: "100%", overflow: "hidden" });
    return () => {
      Object.assign(body, previous);
      if (window.location.pathname === path) window.scrollTo(0, y);
    };
  }, [active]);

  // 安卓返回键：打开时压一条历史记录，返回时只收起抽屉，不离开页面。
  useEffect(() => {
    if (!active) return;
    if (!pushed.current) {
      pushed.current = true;
      window.history.pushState({ ...window.history.state, [HISTORY_MARK]: true }, "");
    }
    const onPop = () => { pushed.current = false; closeRef.current(); };
    // 点抽屉里的链接是去别的页面：收起时不能再退历史，否则会把这次跳转退掉。
    const onClick = (event: MouseEvent) => { if ((event.target as Element | null)?.closest?.("#ans-companion-panel a[href]")) navigating.current = true; };
    navigating.current = false;
    window.addEventListener("popstate", onPop);
    document.addEventListener("click", onClick, true);
    return () => { window.removeEventListener("popstate", onPop); document.removeEventListener("click", onClick, true); setSnap("half"); };
  }, [active]);

  // 用按钮、Esc 或下滑收起时，把打开时压的那条历史记录退掉；点链接收起时只摘掉标记。
  useEffect(() => {
    if (active || !pushed.current) return;
    pushed.current = false;
    const state = window.history.state as Record<string, unknown> | null;
    if (!state?.[HISTORY_MARK]) return;
    if (navigating.current) window.history.replaceState({ ...state, [HISTORY_MARK]: undefined }, "");
    else window.history.back();
  }, [active]);

  // 列表滚到顶以后继续下拉，才算拖动抽屉。
  useEffect(() => {
    if (!active) return;
    const list = document.querySelector<HTMLElement>("#ans-companion-panel .ans-companion-body");
    if (!list) return;
    let start: number | null = null, pulled = 0;
    const onStart = (event: TouchEvent) => { start = list.scrollTop <= 0 ? event.touches[0].clientY : null; pulled = 0; };
    const onMove = (event: TouchEvent) => {
      if (start === null) return;
      pulled = event.touches[0].clientY - start;
      if (pulled <= 0 || list.scrollTop > 0) { if (pulled < 0) start = null; pulled = 0; setOffset(0); return; }
      event.preventDefault();
      setOffset(pulled);
    };
    const onEnd = () => { if (start !== null && pulled > 0) finish(pulled); start = null; pulled = 0; };
    list.addEventListener("touchstart", onStart, { passive: true });
    list.addEventListener("touchmove", onMove, { passive: false });
    list.addEventListener("touchend", onEnd);
    list.addEventListener("touchcancel", onEnd);
    return () => {
      list.removeEventListener("touchstart", onStart);
      list.removeEventListener("touchmove", onMove);
      list.removeEventListener("touchend", onEnd);
      list.removeEventListener("touchcancel", onEnd);
    };
  }, [active]);

  const grabber = {
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      if (event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { id: event.pointerId, y: event.clientY };
    },
    onPointerMove(event: PointerEvent<HTMLButtonElement>) {
      const d = drag.current; if (!d || d.id !== event.pointerId) return;
      const value = event.clientY - d.y;
      setOffset(snapRef.current === "full" ? Math.max(0, value) : value);
    },
    onPointerUp(event: PointerEvent<HTMLButtonElement>) {
      const d = drag.current; if (!d || d.id !== event.pointerId) return;
      const value = event.clientY - d.y;
      finish(snapRef.current === "full" ? Math.max(0, value) : value);
    },
    onPointerCancel() { drag.current = null; setOffset(0); },
    onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
      if (event.key === "ArrowUp") { event.preventDefault(); setSnap("full"); }
      if (event.key === "ArrowDown") { event.preventDefault(); if (snapRef.current === "full") setSnap("half"); else closeRef.current(); }
    },
  };

  return { enabled, active, snap, grabber };
}
