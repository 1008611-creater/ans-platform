import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPublishedArtifact } from "@/server/projects/publication";
import { ShowcaseInteractions } from "@/components/showcase/showcase-interactions";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function ShowcaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  let artifact;
  try { artifact = await getPublishedArtifact(id, session?.user?.id); } catch { notFound(); }
  return <main className="container grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_360px]"><article className="space-y-6"><Link href="/showcase" className="text-sm text-muted-foreground">← 返回作品广场</Link><header className="space-y-4 rounded-3xl border bg-gradient-to-br from-indigo-500/10 via-fuchsia-500/5 to-amber-400/10 p-6 sm:p-10"><div className="flex flex-wrap gap-2"><Badge>评审通过</Badge><Badge variant="secondary">指定版本 v{artifact.version}</Badge></div><h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{artifact.title}</h1><p className="text-sm text-muted-foreground">项目：{artifact.project.title}{artifact.project.team ? ` · 团队：${artifact.project.team.name}` : ""}</p></header><section className="rounded-2xl border bg-card p-5 sm:p-8"><pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7">{artifact.markdown}</pre></section><div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground"><span>作者：</span><Link href={`/@${artifact.author.username}`} className="font-medium text-foreground hover:underline">{artifact.author.nickname || artifact.author.username}</Link><span>·</span><span>评审后公开</span><span>·</span><span>版本 v{artifact.version}</span></div></article><aside className="lg:sticky lg:top-6 lg:self-start"><ShowcaseInteractions artifactId={id} liked={artifact.liked} favorited={artifact.favorited} reactionCount={artifact.reactionCount} favoriteCount={artifact.favoriteCount} comments={artifact.comments}/></aside></main>;
}
