"use client";

import { ChatBubble } from "@/components/growth/chat-bubble";
import { AvatarFrame } from "@/components/growth/avatar-frame";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

async function post(url: string, body?: unknown) {
  const response = await fetch(url, { method: "POST", headers: body === undefined ? {} : { "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error?.message ?? "操作失败。");
  return result.data;
}

export function ShowcaseInteractions({ artifactId, liked, favorited, reactionCount, favoriteCount, comments }: {
  artifactId: string; liked: boolean; favorited: boolean; reactionCount: number; favoriteCount: number;
  comments: Array<{ id: string; content: string; createdAt: Date; user: { username: string; nickname: string | null; avatar?: string | null; avatarFrameKey?: string; chatBubbleKey?: string } }>;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function act(url: string, body?: unknown) {
    setBusy(true); setError("");
    try { await post(url, body); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "操作失败。"); }
    finally { setBusy(false); }
  }
  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: "ANS \u521b\u4f5c\u5e7f\u573a\u4f5c\u54c1", url });
      else { await navigator.clipboard.writeText(url); setError("\u94fe\u63a5\u5df2\u590d\u5236\uff0c\u53ef\u4ee5\u53d1\u7ed9\u961f\u53cb\u3002"); }
      // Award after native sharing or copying succeeds; dismissing does not award XP.
      void fetch("/api/community/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "artifact", targetId: artifactId }),
      }).catch(() => undefined);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : "\u5206\u4eab\u5931\u8d25\u3002");
    }
  }
  return <section className="space-y-6 rounded-2xl border bg-card p-5">
    <div className="flex flex-wrap gap-2"><Button disabled={busy} variant={liked ? "default" : "outline"} onClick={() => act(`/api/showcase/${artifactId}/reactions`)}>♥ {liked ? "已点赞" : "点赞"} · {reactionCount}</Button><Button disabled={busy} variant={favorited ? "secondary" : "outline"} onClick={() => act(`/api/showcase/${artifactId}/favorites`)}>☆ {favorited ? "已收藏" : "收藏"} · {favoriteCount}</Button><Button variant="outline" onClick={share}>分享作品 ↗</Button></div>
    <div className="space-y-3"><h2 className="font-semibold">讨论 · {comments.length}</h2><div className="space-y-3">{comments.map((comment) => <article key={comment.id} className="rounded-xl bg-muted/40 p-3"><div className="flex items-center gap-2"><AvatarFrame frameKey={comment.user.avatarFrameKey} className="h-7 w-7"><Avatar className="h-full w-full"><AvatarImage src={comment.user.avatar || undefined} alt={comment.user.nickname || comment.user.username} /><AvatarFallback>{(comment.user.nickname || comment.user.username).charAt(0)}</AvatarFallback></Avatar></AvatarFrame><p className="text-xs font-medium">{comment.user.nickname || comment.user.username} <span className="font-normal text-muted-foreground">· {new Date(comment.createdAt).toLocaleDateString("zh-CN")}</span></p></div><ChatBubble bubbleKey={comment.user.chatBubbleKey} className="mt-2 whitespace-pre-wrap">{comment.content}</ChatBubble></article>)}</div><Textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={2000} placeholder="给创作者一个具体、有帮助的反馈…"/><Button disabled={busy || text.trim().length < 2} onClick={async () => { await act(`/api/showcase/${artifactId}/comments`, { content: text }); setText(""); }}>发布评论</Button></div>
    <div className="border-t pt-4"><Button variant="ghost" size="sm" disabled={busy} onClick={() => act(`/api/showcase/${artifactId}/reports`, { reason: "OTHER", details: "用户从作品详情页举报" })}>举报不当内容</Button></div>
    {error ? <p role="status" className="text-sm text-muted-foreground">{error}</p> : null}
  </section>;
}
