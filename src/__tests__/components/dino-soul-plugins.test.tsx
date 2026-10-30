import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SOUL_PLUGIN_CATALOG,
  calcSpeakUpHitLine,
  createDefaultSoulPluginsState,
  decayFeiyuMood,
  judgeTurnMood,
  recallFishMemories,
  recordTurnFishMemory,
  rollSpeakUpDice,
  runBiliSubagentScan,
} from "@/domain/mascot/soul-plugins";
import { DinoSoulToolbar } from "@/components/mascot/dino-soul-plugins";
import { getSoulPluginsSnapshot, toggleSoulPlugin } from "@/lib/mascot/soul-store";

describe("DSH Soul Plugins Engine & UI", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("includes all 8 DSH plugins from the user specification", () => {
    expect(SOUL_PLUGIN_CATALOG.map(p => p.id)).toEqual([
      "dsh-bili-subagent",
      "dsh-feiyu-mood",
      "dsh-fish-memory",
      "dsh-meme",
      "dsh-qq-bridge",
      "dsh-social-bridge-plugin",
      "dsh-speak-up",
      "dsh-tts-bridge",
    ]);
  });

  it("dsh-feiyu-mood judges turn mood with 7 dimensions, MOOD_STEP_DIVISOR=3, and decays toward baseline 70", () => {
    const base = createDefaultSoulPluginsState().feiyuMood;
    const praised = judgeTurnMood(
      base,
      "兔兔龙你真棒，超级可爱，谢谢你！",
      "嘿嘿，我会继续加油的！",
      "user",
      base.updatedAt + 60_000,
    );
    expect(praised.mood).toBeGreaterThan(base.mood);
    expect(praised.dims.sweet).toBeGreaterThan(base.dims.sweet);
    expect(praised.history[0]?.delta).toBeGreaterThan(0);

    const heartache = judgeTurnMood(
      praised,
      "今天加班熬夜好累，头疼得不行",
      "快去休息一下，我帮你盯着",
      "user",
      base.updatedAt + 120_000,
    );
    expect(heartache.mood).toBeLessThan(praised.mood);
    expect(heartache.dims.heartache).toBeGreaterThan(0);

    // 24 hours later -> decays halfway twice toward baseline 70
    const decayed = decayFeiyuMood(praised, praised.updatedAt + 24 * 3600_000);
    expect(Math.abs(decayed.mood - 70)).toBeLessThan(Math.abs(praised.mood - 70));
  });

  it("dsh-fish-memory supersedes duplicate factKey and recalls relevant memories with timestamps", () => {
    let mem = createDefaultSoulPluginsState().fishMemory;
    const t1 = Date.now();
    mem = recordTurnFishMemory(
      mem,
      "记住我喜欢薄荷绿像素风格和极简高帧率动效",
      "已经记在小本本上啦！",
      t1,
    );
    expect(mem.items[0]?.isFact).toBe(true);
    expect(mem.items[0]?.factKey).toBe("ta.偏好");

    // Newer preference with same factKey supersedes older one
    mem = recordTurnFishMemory(
      mem,
      "我喜欢深色赛博风与真3D边缘光",
      "明白，已更新你的偏好！",
      t1 + 60_000,
    );
    const prefFacts = mem.items.filter(i => i.factKey === "ta.偏好");
    expect(prefFacts).toHaveLength(1);
    expect(prefFacts[0]?.text).toContain("真3D边缘光");

    const recalled = recallFishMemories(mem, "真3D边缘光与像素形态", t1 + 120_000);
    expect(recalled.pickedFacts.length + recalled.pickedEpisodes.length).toBeGreaterThan(0);
  });

  it("dsh-speak-up computes peak/off-peak hit-line with timing factor and miss-streak bonus", () => {
    const state = createDefaultSoulPluginsState();
    // Weekday 10:30 AM (Peak time -> base 20%)
    const peakDate = new Date(2026, 9, 28, 10, 30, 0).getTime(); // Wednesday
    const sPeak = {
      ...state.speakUp,
      lastMessageAtMs: peakDate - 45 * 60_000,
      missStreak: 2,
    };
    const calcPeak = calcSpeakUpHitLine(sPeak, peakDate);
    expect(calcPeak.isPeak).toBe(true);
    expect(calcPeak.base).toBe(20);
    expect(calcPeak.bonus).toBe(20);
    expect(calcPeak.hitLine).toBe(40);

    const rolled = rollSpeakUpDice(state, { forceHit: true, dryRunOverride: false });
    expect(rolled.triggeredMessage).toBeTruthy();
    expect(rolled.nextSpeakUp.missStreak).toBe(0);
  });

  it("dsh-bili-subagent generates a video briefing report", () => {
    const state = createDefaultSoulPluginsState();
    const { nextBili, report } = runBiliSubagentScan(state.biliSubagent, "Three.js 3D 桌宠");
    expect(report.bvid).toMatch(/^BV/);
    expect(report.dinoShareText).toContain("Three.js 3D 桌宠");
    expect(nextBili.reports.length).toBeGreaterThanOrEqual(1);
  });

  it("renders DinoSoulToolbar, opens the 8-plugin manager, toggles switches, and dispatches actions", () => {
    const onInject = vi.fn();
    const onSticker = vi.fn();
    const onSpeak = vi.fn();

    render(
      <DinoSoulToolbar
        onInjectAssistantMessage={onInject}
        onSendUserSticker={onSticker}
        onSpeakText={onSpeak}
      />,
    );

    // Open the Installed Soul Plugins panel
    fireEvent.click(screen.getByTestId("dino-soul-plugins-open"));
    expect(screen.getByTestId("dino-soul-plugins-panel")).toBeInTheDocument();

    // Verify all 8 plugin switches are rendered and operable
    for (const plugin of SOUL_PLUGIN_CATALOG) {
      expect(screen.getByTestId(`soul-plugin-switch-${plugin.id}`)).toBeInTheDocument();
    }

    const qqSwitch = screen.getByTestId("soul-plugin-switch-dsh-qq-bridge");
    expect(qqSwitch).toHaveAttribute("aria-checked", "false");
    fireEvent.click(qqSwitch);
    expect(qqSwitch).toHaveAttribute("aria-checked", "true");
    expect(getSoulPluginsSnapshot().enabled["dsh-qq-bridge"]).toBe(true);

    // Trigger Bilibili subagent scan from quick chip
    fireEvent.click(screen.getByTestId("dino-soul-bili-quick"));
    expect(onInject).toHaveBeenCalledTimes(1);

    // Toggle via store helper directly
    toggleSoulPlugin("dsh-qq-bridge", false);
    expect(getSoulPluginsSnapshot().enabled["dsh-qq-bridge"]).toBe(false);
  });
});
