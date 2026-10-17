import { z } from "zod";
import { auth } from "@/lib/auth";
import { executePiAgentAction } from "@/server/companion/pi-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const piActionSchema = z.object({
  intent: z.enum(["checkin", "claw", "market", "scaffold", "auto"]).optional(),
  prompt: z.string().trim().max(400).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        {
          ok: false,
          error: "UNAUTHORIZED",
          replyZh: "🔒 请先登录 ANS 账号，小恐龙 Pi Agent 就能直接帮你代签到、代抓娃娃、逛市场和创建参赛项目啦！",
          replyEn: "🔒 Please sign in first so Little Dino Pi Agent can execute actions for you!",
          links: [{ href: "/login", title: "立即登录 / 注册", detail: "注册即送 10 积分 + 破冰问卷 50 积分", icon: "credits" }],
        },
        { status: 401 },
      );
    }

    const rawBody = await request.json().catch(() => ({}));
    const parsed = piActionSchema.safeParse(rawBody);
    if (!parsed.success) {
      return Response.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
    }

    const result = await executePiAgentAction(session.user.id, parsed.data);
    return Response.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "PI_AGENT_ERROR";
    return Response.json(
      {
        ok: false,
        error: msg,
        replyZh: "⚠️ Pi Agent 执行遇到临时波动，请稍后重试。",
        replyEn: "⚠️ Pi Agent encountered a temporary error. Please try again.",
        links: [],
      },
      { status: 500 },
    );
  }
}
