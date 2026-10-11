import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.MIMO_TTS_MODEL || "mimo-v2.5-tts";

export async function POST(request: Request) {
  const apiKey = String(process.env.MIMO_API_KEY || "").trim();
  if (!apiKey) return NextResponse.json({ error: "Mimo TTS 尚未配置" }, { status: 503 });
  let body: { text?: unknown; voice?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求不是有效 JSON" }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 1200) : "";
  const voice = typeof body.voice === "string" && body.voice.trim() ? body.voice.trim().slice(0, 80) : "Chloe";
  if (!text) return NextResponse.json({ error: "请输入要朗读的文字" }, { status: 400 });
  try {
    const upstream = await fetch("https://api.xiaomimimo.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "user", content: "请用自然、友好的中文语气朗读下面内容，不要添加额外文字。" },
          { role: "assistant", content: text },
        ],
        audio: { format: "wav", voice },
      }),
      cache: "no-store",
    });
    const result = await upstream.json().catch(() => null) as { choices?: Array<{ message?: { audio?: { data?: string } } }> } | null;
    if (!upstream.ok) return NextResponse.json({ error: "Mimo TTS 暂时不可用" }, { status: 502 });
    const encoded = result?.choices?.[0]?.message?.audio?.data;
    if (!encoded) return NextResponse.json({ error: "Mimo 未返回音频" }, { status: 502 });
    const audio = Buffer.from(encoded, "base64");
    return new Response(audio, {
      status: 200,
      headers: { "Content-Type": "audio/wav", "Content-Length": String(audio.length), "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return NextResponse.json({ error: "Mimo TTS 暂时不可用" }, { status: 502 });
  }
}
