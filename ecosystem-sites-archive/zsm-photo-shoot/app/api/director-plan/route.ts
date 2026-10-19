import { DirectorBriefSchema, planDirectorScene } from "@/app/lib/director-agent";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json();
    const parsed = DirectorBriefSchema.safeParse(payload);
    if (!parsed.success) {
      return Response.json({ error: "需求描述无效", details: parsed.error.flatten() }, { status: 400 });
    }
    return Response.json(planDirectorScene(parsed.data), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: "无法读取导演需求" }, { status: 400 });
  }
}
