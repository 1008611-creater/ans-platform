"use client";

import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import {
  getFormSnapshot,
  getPixelStateSnapshot,
  subscribeMascotStore,
  writeForm,
  writePixelState,
  type DinoState,
} from "@/lib/mascot/client-store";
import { dispatchDinoInteract } from "./companion-sanctuary-presets";

const PIXEL_DECK_STATES: readonly { id: DinoState; icon: string }[] = [
  { id: "idle", icon: "🟢" },
  { id: "walk", icon: "🐾" },
  { id: "run", icon: "⚡" },
  { id: "work", icon: "💻" },
  { id: "emote", icon: "💖" },
  { id: "react", icon: "🍿" },
  { id: "action", icon: "🎉" },
  { id: "meme", icon: "💰" },
];

const THREE_D_POSES: readonly {
  key: "poseHello" | "poseCelebrate" | "poseShy" | "poseCurious";
  gesture: string;
  icon: string;
}[] = [
  { key: "poseHello", gesture: "hello", icon: "👋" },
  { key: "poseCelebrate", gesture: "celebrate", icon: "🎉" },
  { key: "poseShy", gesture: "shy", icon: "😳" },
  { key: "poseCurious", gesture: "curious", icon: "✨" },
];

export function MascotStageDeck() {
  const t = useTranslations("product.mascot");
  const form = useSyncExternalStore(subscribeMascotStore, getFormSnapshot, () => "3d" as const);
  const pixelState = useSyncExternalStore(subscribeMascotStore, getPixelStateSnapshot, () => "idle" as const);
  const [spinning, setSpinning] = useState(false);

  const selectForm = (nextForm: "2d" | "3d") => {
    writeForm(nextForm);
    if (nextForm === "3d") {
      window.dispatchEvent(new CustomEvent("ans:dino-activate"));
    }
  };

  const trigger3dGesture = (gesture: string) => {
    window.dispatchEvent(new CustomEvent("ans:dino-activate"));
    dispatchDinoInteract({
      type: "pose",
      gesture,
      mood: {
        id: `pose_${gesture}`,
        kaomoji: "(≧∇≦)ﾉ",
        text: "",
        sub: "",
        gesture,
        blush: 0.9,
        happy: 0.96,
        star: 0.92,
        mouth: 0.85,
      },
    });
  };

  const toggleTurntableSpin = () => {
    const nextSpin = !spinning;
    setSpinning(nextSpin);
    window.dispatchEvent(new CustomEvent("ans:dino-activate"));
    window.dispatchEvent(
      new CustomEvent("ans:dino-interact", {
        detail: {
          type: "ans-dino",
          event: "interact",
          action: "turntable",
          spin: nextSpin,
          deltaYaw: nextSpin ? 0 : Math.PI / 2,
        },
      }),
    );
  };

  const triggerCare = (action: "pat" | "feed") => {
    window.dispatchEvent(
      new CustomEvent("ans:dino-interact", {
        detail: {
          type: "ans-dino",
          event: "interact",
          action,
          reactMode: "happy",
          happy: 0.98,
          star: 0.95,
          blush: 0.98,
          mouth: 0.88,
        },
      }),
    );
  };

  return (
    <div className="ans-mascot-stage-deck" data-testid="mascot-stage-deck" data-form={form}>
      <div className="ans-mascot-stage-deck-head">
        <span className="ans-mascot-stage-deck-title">
          {t(form === "2d" ? "deck.title2d" : "deck.title3d")}
        </span>
        <div className="ans-mascot-form-segmented" role="group" aria-label={t(form === "2d" ? "to3d" : "to2d")}>
          <button
            type="button"
            data-testid="mascot-deck-form-2d"
            aria-pressed={form === "2d"}
            onClick={() => selectForm("2d")}
          >
            {t("deck.formPixel")}
          </button>
          <button
            type="button"
            data-testid="mascot-deck-form-3d"
            aria-pressed={form === "3d"}
            onClick={() => selectForm("3d")}
          >
            {t("deck.form3d")}
          </button>
        </div>
      </div>

      {form === "2d" ? (
        <div className="ans-mascot-stage-chips" data-testid="mascot-pixel-chips">
          {PIXEL_DECK_STATES.map(item => (
            <button
              key={item.id}
              type="button"
              data-testid={`mascot-pixel-state-${item.id}`}
              aria-pressed={pixelState === item.id}
              onClick={() => writePixelState(item.id)}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{t(`deck.${item.id}`)}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="ans-mascot-stage-chips" data-testid="mascot-3d-chips">
          {THREE_D_POSES.map(item => (
            <button
              key={item.key}
              type="button"
              data-testid={`mascot-3d-${item.gesture}`}
              onClick={() => trigger3dGesture(item.gesture)}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{t(`deck.${item.key}`)}</span>
            </button>
          ))}
          <button
            type="button"
            data-testid="mascot-3d-pat"
            onClick={() => triggerCare("pat")}
          >
            <span aria-hidden="true">💖</span>
            <span>{t("deck.pat")}</span>
          </button>
          <button
            type="button"
            data-testid="mascot-3d-feed"
            onClick={() => triggerCare("feed")}
          >
            <span aria-hidden="true">🧋</span>
            <span>{t("deck.feed")}</span>
          </button>
          <button
            type="button"
            data-testid="mascot-3d-spin"
            aria-pressed={spinning}
            onClick={toggleTurntableSpin}
          >
            <span aria-hidden="true">🔄</span>
            <span>{t("deck.spin360")}</span>
          </button>
          <button
            type="button"
            data-testid="mascot-3d-macro"
            onClick={() => window.dispatchEvent(new CustomEvent("ans:enter-dino-macro"))}
          >
            <span aria-hidden="true">🔍</span>
            <span>{t("deck.macroStage")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
