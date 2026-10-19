"use client";

import { useEffect, useRef } from "react";

// One active dialog owns keyboard focus, including nested image previews.
export function useDialogFocus(selector: string | null) {
  const stack = useRef<Array<{ selector: string; trigger: HTMLElement | null }>>([]);
  useEffect(() => {
    if (!selector) {
      const trigger = stack.current[0]?.trigger;
      stack.current = [];
      if (trigger?.isConnected && trigger.getClientRects().length) trigger.focus({ preventScroll: true });
      return;
    }
    const dialog = document.querySelector<HTMLElement>(selector);
    if (!dialog || !dialog.getClientRects().length) return;
    const parentIndex = stack.current.findIndex(entry => entry.selector === selector);
    if (parentIndex < 0) {
      stack.current.push({ selector, trigger: document.activeElement instanceof HTMLElement ? document.activeElement : null });
    } else if (parentIndex < stack.current.length - 1) {
      const trigger = stack.current[parentIndex + 1].trigger;
      stack.current = stack.current.slice(0, parentIndex + 1);
      if (trigger?.isConnected && dialog.contains(trigger)) trigger.focus({ preventScroll: true });
    }
    const originalTabIndex = dialog.getAttribute("tabindex");
    dialog.tabIndex = -1;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, [tabindex]'
    )).filter(element => element.tabIndex >= 0 && !element.matches(':disabled, [aria-disabled="true"]') &&
      !element.closest('[inert], [hidden], [aria-hidden="true"]') && element.getClientRects().length > 0 &&
      getComputedStyle(element).visibility !== "hidden");
    const enter = () => (focusable()[0] ?? dialog).focus({ preventScroll: true });
    const onTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const controls = focusable();
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first || !dialog.contains(document.activeElement) || document.activeElement === dialog) {
        event.preventDefault();
        (event.shiftKey ? last ?? dialog : first ?? dialog).focus({ preventScroll: true });
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus({ preventScroll: true });
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus({ preventScroll: true });
      }
    };
    const onFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog.contains(event.target)) enter();
    };
    document.addEventListener("keydown", onTab, true);
    document.addEventListener("focusin", onFocus);
    if (!dialog.contains(document.activeElement)) enter();
    return () => {
      document.removeEventListener("keydown", onTab, true);
      document.removeEventListener("focusin", onFocus);
      if (originalTabIndex === null) dialog.removeAttribute("tabindex");
      else dialog.setAttribute("tabindex", originalTabIndex);

    };
  }, [selector]);
  useEffect(() => () => {
    const trigger = stack.current[0]?.trigger;
    stack.current = [];
    if (trigger?.isConnected && trigger.getClientRects().length) trigger.focus({ preventScroll: true });
  }, []);
}