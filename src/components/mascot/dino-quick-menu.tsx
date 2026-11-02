"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Check, MessageCircle, Settings, Sparkles, Volume2, Wand2 } from "lucide-react";

/** 长按（或右键、键盘菜单键）兔兔龙弹出的快捷设置：只放随手要改的几项，完整设置仍在网站设置里。 */
export function DinoQuickMenu({ bubbles, voice, voiceDisabled, voiceHint, formLabel, onToggleBubbles, onToggleVoice, onToggleForm, onEnterStage, onOpenSettings, onClose }: {
  bubbles: boolean;
  voice: boolean;
  voiceDisabled: boolean;
  voiceHint?: string;
  formLabel: string;
  onToggleBubbles: () => void;
  onToggleVoice: () => void;
  onToggleForm: () => void;
  onEnterStage: () => void;
  onOpenSettings: () => void;
  onClose: () => void;
}) {
  const ui = useTranslations("companion");
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    menu.current?.querySelector<HTMLElement>("[role^=menuitem]:not(:disabled)")?.focus({ preventScroll: true });
    const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    const onPointer = (event: PointerEvent) => {
      if (!(event.target as Element | null)?.closest?.(".ans-dino-quick-menu, .ans-dino-trigger")) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer, true);
    };
  }, [onClose]);
  function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const items = Array.from(menu.current?.querySelectorAll<HTMLElement>("[role^=menuitem]:not(:disabled)") ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  }
  return (
    <div ref={menu} className="ans-dino-quick-menu" role="menu" aria-label={ui("dinoQuickMenu")} onKeyDown={moveFocus}>
      <button type="button" role="menuitemcheckbox" aria-checked={bubbles} onClick={onToggleBubbles}>
        <MessageCircle aria-hidden="true" /><span>{ui("speechBubbles")}</span>{bubbles && <Check className="ans-dino-quick-check" aria-hidden="true" />}
      </button>
      <button type="button" role="menuitemcheckbox" aria-checked={voice} disabled={voiceDisabled} title={voiceHint} onClick={onToggleVoice}>
        <Volume2 aria-hidden="true" /><span>{ui("spokenReplies")}</span>{voice && <Check className="ans-dino-quick-check" aria-hidden="true" />}
      </button>
      <button type="button" role="menuitem" data-testid="mascot-form-toggle" onClick={onToggleForm}>
        <Wand2 aria-hidden="true" /><span>{formLabel}</span>
      </button>
      <hr aria-hidden="true" />
      <button type="button" role="menuitem" onClick={onEnterStage}>
        <Sparkles aria-hidden="true" /><span>{ui("enterStage")}</span>
      </button>
      <button type="button" role="menuitem" onClick={onOpenSettings}>
        <Settings aria-hidden="true" /><span>{ui("openSiteSettings")}</span>
      </button>
    </div>
  );
}
