"use client";

import {
  SOUL_PLUGINS_EVENT_NAME,
  SOUL_PLUGINS_STORAGE_KEY,
  createDefaultSoulPluginsState,
  decayFeiyuMood,
  describeMoodTier,
  judgeTurnMood,
  recordTurnFishMemory,
  type SoulPluginId,
  type SoulPluginsState,
} from "@/domain/mascot/soul-plugins";
import { writePixelState } from "./client-store";

let cachedRaw: string | null = null;
let cachedState: SoulPluginsState | null = null;
const serverFallbackState: SoulPluginsState = createDefaultSoulPluginsState();

function mergeWithDefaults(parsed: Partial<SoulPluginsState> | null): SoulPluginsState {
  const base = createDefaultSoulPluginsState();
  if (!parsed || typeof parsed !== "object") return base;
  return {
    enabled: { ...base.enabled, ...(parsed.enabled ?? {}) },
    feiyuMood: {
      ...base.feiyuMood,
      ...(parsed.feiyuMood ?? {}),
      dims: { ...base.feiyuMood.dims, ...(parsed.feiyuMood?.dims ?? {}) },
      history: Array.isArray(parsed.feiyuMood?.history)
        ? parsed.feiyuMood.history
        : base.feiyuMood.history,
    },
    fishMemory: {
      ...base.fishMemory,
      ...(parsed.fishMemory ?? {}),
      items: Array.isArray(parsed.fishMemory?.items)
        ? parsed.fishMemory.items
        : base.fishMemory.items,
      lastRecallTraces: Array.isArray(parsed.fishMemory?.lastRecallTraces)
        ? parsed.fishMemory.lastRecallTraces
        : base.fishMemory.lastRecallTraces,
    },
    meme: {
      ...base.meme,
      ...(parsed.meme ?? {}),
      enabledPacks: {
        ...base.meme.enabledPacks,
        ...(parsed.meme?.enabledPacks ?? {}),
      },
      customStickers: Array.isArray(parsed.meme?.customStickers)
        ? parsed.meme.customStickers
        : base.meme.customStickers,
    },
    biliSubagent: {
      ...base.biliSubagent,
      ...(parsed.biliSubagent ?? {}),
      reports: Array.isArray(parsed.biliSubagent?.reports)
        ? parsed.biliSubagent.reports
        : base.biliSubagent.reports,
    },
    speakUp: {
      ...base.speakUp,
      ...(parsed.speakUp ?? {}),
      logs: Array.isArray(parsed.speakUp?.logs)
        ? parsed.speakUp.logs
        : base.speakUp.logs,
    },
    ttsBridge: {
      ...base.ttsBridge,
      ...(parsed.ttsBridge ?? {}),
      favorites: Array.isArray(parsed.ttsBridge?.favorites)
        ? parsed.ttsBridge.favorites
        : base.ttsBridge.favorites,
    },
    qqBridge: {
      ...base.qqBridge,
      ...(parsed.qqBridge ?? {}),
      logs: Array.isArray(parsed.qqBridge?.logs)
        ? parsed.qqBridge.logs
        : base.qqBridge.logs,
    },
    socialBridge: {
      ...base.socialBridge,
      ...(parsed.socialBridge ?? {}),
      members: Array.isArray(parsed.socialBridge?.members)
        ? parsed.socialBridge.members
        : base.socialBridge.members,
    },
  };
}

export function getSoulPluginsSnapshot(): SoulPluginsState {
  if (typeof window === "undefined") return serverFallbackState;
  try {
    const raw = window.localStorage.getItem(SOUL_PLUGINS_STORAGE_KEY);
    if (raw === cachedRaw && cachedState) return cachedState;
    cachedRaw = raw;
    if (!raw) {
      cachedState = createDefaultSoulPluginsState();
      return cachedState;
    }
    const parsed = JSON.parse(raw) as Partial<SoulPluginsState>;
    cachedState = mergeWithDefaults(parsed);
    return cachedState;
  } catch {
    if (!cachedState) cachedState = createDefaultSoulPluginsState();
    return cachedState;
  }
}

export function getServerSoulPluginsSnapshot(): SoulPluginsState {
  return serverFallbackState;
}

export function writeSoulPluginsState(
  updater: SoulPluginsState | ((prev: SoulPluginsState) => SoulPluginsState),
): SoulPluginsState {
  const prev = getSoulPluginsSnapshot();
  const next = typeof updater === "function" ? updater(prev) : updater;
  cachedState = next;
  if (typeof window !== "undefined") {
    try {
      const serialized = JSON.stringify(next);
      cachedRaw = serialized;
      window.localStorage.setItem(SOUL_PLUGINS_STORAGE_KEY, serialized);
    } catch {
      /* Ignore storage quota errors in private mode. */
    }
    window.dispatchEvent(new CustomEvent(SOUL_PLUGINS_EVENT_NAME, { detail: next }));
  }
  return next;
}

export function toggleSoulPlugin(id: SoulPluginId, forceValue?: boolean): SoulPluginsState {
  return writeSoulPluginsState(prev => {
    const nextEnabled = forceValue ?? !prev.enabled[id];
    const nextState: SoulPluginsState = {
      ...prev,
      enabled: {
        ...prev.enabled,
        [id]: nextEnabled,
      },
    };
    if (id === "dsh-feiyu-mood" && nextEnabled) {
      nextState.feiyuMood = decayFeiyuMood(prev.feiyuMood);
    }
    return nextState;
  });
}

/**
 * Settle a completed conversation turn across all active Soul Plugins:
 * - Updates speakUp.lastMessageAtMs & resets missStreak
 * - If dsh-feiyu-mood is ON: judges mood delta, updates 7 dims & timeline, and triggers 2D/3D expression
 * - If dsh-fish-memory is ON: extracts permanent facts / episodic memory & records recall trace
 * - If dsh-qq-bridge is ON: logs outbound sync to QQ OneBot 11
 */
export function settleSoulTurn(
  userText: string,
  replyText: string,
  turnKind: "user" | "speak-up" | "bili-duty-scan" = "user",
): SoulPluginsState {
  const nowMs = Date.now();
  const next = writeSoulPluginsState(prev => {
    const updatedMood = prev.enabled["dsh-feiyu-mood"]
      ? judgeTurnMood(prev.feiyuMood, userText, replyText, turnKind, nowMs)
      : prev.feiyuMood;

    const updatedMemory =
      prev.enabled["dsh-fish-memory"] && turnKind === "user"
        ? recordTurnFishMemory(prev.fishMemory, userText, replyText, nowMs)
        : prev.fishMemory;

    const updatedQq = prev.enabled["dsh-qq-bridge"]
      ? {
          ...prev.qqBridge,
          logs: [
            {
              id: `qq-${nowMs}`,
              at: new Date(nowMs).toTimeString().slice(0, 8),
              direction: "out" as const,
              target: prev.qqBridge.privateTargets || "QQ私聊",
              preview: replyText.replace(/\s+/g, " ").slice(0, 72),
              dryRun: prev.qqBridge.dryRun,
            },
            ...prev.qqBridge.logs,
          ].slice(0, 20),
        }
      : prev.qqBridge;

    return {
      ...prev,
      feiyuMood: updatedMood,
      fishMemory: updatedMemory,
      qqBridge: updatedQq,
      speakUp: {
        ...prev.speakUp,
        lastMessageAtMs: nowMs,
        missStreak: turnKind === "user" ? 0 : prev.speakUp.missStreak,
      },
    };
  });

  // Sync live mood expression to 2D pixel stage & 3D WebGL stage
  if (next.enabled["dsh-feiyu-mood"] && typeof window !== "undefined") {
    const tier = describeMoodTier(next.feiyuMood.mood);
    writePixelState(tier.pixelState);
    window.dispatchEvent(
      new CustomEvent("ans:dino-interact", {
        detail: {
          type: "ans-dino",
          event: "interact",
          action: "pose",
          gesture: tier.gesture3d,
          happy: next.feiyuMood.mood / 100,
          blush: Math.min(1, (next.feiyuMood.dims.sweet + next.feiyuMood.dims.happy) / 100),
          star: next.feiyuMood.mood >= 75 ? 0.95 : 0.4,
        },
      }),
    );
  }

  return next;
}

export function subscribeSoulPluginsStore(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === SOUL_PLUGINS_STORAGE_KEY) {
      cachedRaw = null;
      onStoreChange();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(SOUL_PLUGINS_EVENT_NAME, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SOUL_PLUGINS_EVENT_NAME, onStoreChange);
  };
}
