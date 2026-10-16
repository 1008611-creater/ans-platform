// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CNY_PER_POINT,
  POINTS_PER_USD,
  QUEST_DEFINITIONS,
  USD_PER_POINT,
  advanceAndClaimQuest,
  drawArcadePrize,
  loadQuestArcadeState,
} from "@/domain/mascot/quest-arcade";
import { ComputeQuestArcade } from "@/components/workspace/claw-arcade-pod";

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
}));

describe("Quest Arcade & 3D Claw Machine / Starlight Roulette", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("enforces the official 1 Point = ¥0.10 CNY = $0.10 USD APIC nominal quota ratio", () => {
    expect(POINTS_PER_USD).toBe(10);
    expect(CNY_PER_POINT).toBe(0.1);
    expect(USD_PER_POINT).toBe(0.1);

    const initial = loadQuestArcadeState("u-ratio");
    expect(initial.deepseekTotalUsd).toBe(1000);
    expect(initial.deepseekUnlockedUsd).toBe(50); // $50 = 500 pts initial unlock
    expect(initial.flagshipTotalUsd).toBe(600); // $300 Terra + $200 GPT-6.1 + $100 Opus 5.5
    expect(initial.arcadeTokens).toBe(3);
  });

  it("unlocks progressive vault quota and awards tokens across daily, agri M1-M4, and 6 secret easter eggs", () => {
    const secrets = QUEST_DEFINITIONS.filter(q => q.category === "secret");
    expect(secrets).toHaveLength(6);

    const m1 = advanceAndClaimQuest("agri_m1_apply", "u-quest");
    expect(m1?.newlyClaimed).toBe(true);
    expect(m1?.state.flagshipUnlockedUsd).toBe(120); // 20% of $600 = $120 (1,200 pts)
    expect(m1?.state.arcadeTokens).toBe(6); // 3 starter + 3 reward

    const secretPua = advanceAndClaimQuest("secret_reverse_pua", "u-quest");
    expect(secretPua?.newlyClaimed).toBe(true);
    expect(secretPua?.state.flagshipUnlockedUsd).toBe(140);
    expect(secretPua?.state.secretUnlockedAt.secret_reverse_pua).toBeTruthy();
  });

  it("draws prizes from the 3D Claw Machine and guarantees SSR/UR at 10-draw pity", () => {
    // Give user enough tokens for 10 draws
    for (const q of ["agri_m1_apply", "agri_m2_code_host", "agri_m3_wall_public"]) {
      advanceAndClaimQuest(q, "u-pity");
    }
    let sawHighRarity = false;
    for (let i = 0; i < 10; i++) {
      const outcome = drawArcadePrize("claw", "u-pity");
      expect(outcome).not.toBeNull();
      if (outcome?.prize.rarity === "SSR" || outcome?.prize.rarity === "UR") {
        sawHighRarity = true;
      }
    }
    expect(sawHighRarity).toBe(true);
  });

  it("renders ComputeQuestArcade with 3D Claw Machine, Roulette switcher, and 4 quest tabs", () => {
    render(<ComputeQuestArcade actorId="u-ui" />);
    expect(screen.getByText(/1 积分 = ¥0.10 元 = \$0.10 USD/i)).toBeTruthy();
    expect(screen.getByTestId("arcade-token-count").textContent).toContain("3");
    expect(screen.getByTestId("gateway-live-points").textContent).toContain("500");

    // Claim daily check-in quest
    const claimCheckin = screen.getByTestId("claim-quest-daily_checkin");
    fireEvent.click(claimCheckin);
    expect(screen.getByTestId("arcade-token-count").textContent).toContain("4");

    // Switch to 6 Secret Easter Eggs tab
    fireEvent.click(screen.getByText(/6大反常识彩蛋/i));
    expect(screen.getByText(/硅基胃穿孔/i)).toBeTruthy();
    expect(screen.getByText(/生产队的驴也得休假/i)).toBeTruthy();
    expect(screen.getByText(/赛博活菩萨/i)).toBeTruthy();

    // Switch to Tripo Four-View + .glb 3D Studio tab
    fireEvent.click(screen.getByTestId("arcade-mode-glb"));
    expect(screen.getByTestId("tripo-glb-studio")).toBeTruthy();
  });

  it("loads and parses all 5 Tripo multiview .glb 3D models from public/arcade-3d", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { TRIPO_GLB_ASSETS, parseGlbBinaryMesh } = await import(
      "@/components/workspace/claw-arcade-pod"
    );

    expect(TRIPO_GLB_ASSETS).toHaveLength(5);
    for (const asset of TRIPO_GLB_ASSETS) {
      const glbDiskPath = path.join(process.cwd(), "public", asset.glbUrl);
      const sheetDiskPath = path.join(process.cwd(), "public", asset.sheetUrl);
      expect(fs.existsSync(glbDiskPath)).toBe(true);
      expect(fs.existsSync(sheetDiskPath)).toBe(true);

      const bytes = fs.readFileSync(glbDiskPath);
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      const parsed = parseGlbBinaryMesh(asset.id, ab, asset.fallbackRgb, 120);
      expect(parsed).not.toBeNull();
      expect(parsed?.vertexCount).toBe(asset.vertexCount);
      expect(parsed?.triangles.length).toBeGreaterThan(50);
    }
  });

  it("aligns server-side ARCADE_QUEST_REWARDS and ARCADE_PRIZE_REWARDS with client definitions", async () => {
    const { ARCADE_QUEST_REWARDS, ARCADE_PRIZE_REWARDS } = await import(
      "@/server/compute-benefits/arcade"
    );
    const { ARCADE_PRIZES } = await import("@/domain/mascot/quest-arcade");

    for (const q of QUEST_DEFINITIONS) {
      const serverReward = ARCADE_QUEST_REWARDS[q.id];
      expect(serverReward).toBeDefined();
      expect(serverReward.points).toBe(q.unlockUsd * POINTS_PER_USD);
      expect(serverReward.tokens).toBe(q.rewardTokens);
    }

    for (const p of ARCADE_PRIZES) {
      const serverPrize = ARCADE_PRIZE_REWARDS[p.id];
      expect(serverPrize).toBeDefined();
      expect(serverPrize.points).toBe(p.unlockUsd * POINTS_PER_USD);
    }
  });
});
