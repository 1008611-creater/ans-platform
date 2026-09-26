"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OFFICIAL_WORKFLOWS } from "@/domain/projects/pack";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Fact = {
  key: "problem" | "contribution" | "method" | "result" | "evidence";
  label: string;
  hint: string;
  value: string;
  evidenceUrl: string;
  confirmation: "missing" | "unconfirmed" | "confirmed";
};

type Artifact = {
  id: string;
  workflowId: string;
  title: string;
  currentVersion: number;
  versions: Array<{ id: string; version: number; markdown: string; createdAt: string }>;
};

export type ProjectView = {
  id: string;
  title: string;
  goal: "career" | "contest" | "portfolio";
  facts: Fact[];
  artifacts: Artifact[];
};

const GOAL_LABEL = { career: "求职项目", contest: "比赛项目", portfolio: "作品展示" };
const STATUS_LABEL = { missing: "未填写", unconfirmed: "待确认", confirmed: "已确认" };

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error?.message ?? "操作失败，请稍后重试。");
  return payload.data;
}

export function ProjectStudio({ project }: { project: ProjectView }) {
  const router = useRouter();
  const [facts, setFacts] = useState(project.facts);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState("");
  const completed = project.artifacts.length;
  const recommended = useMemo(() => OFFICIAL_WORKFLOWS.filter((workflow) => ["resume-bullets", "readme-draft", "project-one-pager"].includes(workflow.id)), []);
  const more = OFFICIAL_WORKFLOWS.filter((workflow) => !recommended.some((item) => item.id === workflow.id));

  function factPayload(confirm: boolean) {
    return facts.map((fact) => {
      const value = fact.value.trim();
      return {
        key: fact.key,
        value: fact.value,
        confirmation: !value ? "missing" : value === "暂无" || confirm ? "confirmed" : "unconfirmed",
      };
    });
  }

  function updateFact(key: Fact["key"], value: string) {
    setFacts((current) => current.map((fact) => fact.key === key ? { ...fact, value, confirmation: value.trim() ? "unconfirmed" : "missing" } : fact));
  }

  async function saveFacts(confirm = false) {
    setPending(confirm ? "confirm" : "save");
    setError("");
    try {
      await postJson(`/api/projects/${project.id}/facts`, { facts: factPayload(confirm) });
      setMessage(confirm ? "事实已确认。接下来生成的材料会使用这份已确认内容。" : "事实已保存。接下来生成的材料都会使用这份内容。");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失败。");
    } finally {
      setPending("");
    }
  }

  async function runWorkflow(workflowId: string) {
    setPending(workflowId);
    setError("");
    try {
      await postJson(`/api/projects/${project.id}/facts`, { facts: factPayload(false) });
      await postJson(`/api/projects/${project.id}/runs`, {
        workflowId,
        idempotencyKey: `${workflowId}-${Date.now().toString(36)}`,
      });
      setMessage("新版本已保存。可以继续生成其他材料，已填写的事实会自动复用。");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "生成失败。");
    } finally {
      setPending("");
    }
  }

  function WorkflowButton({ workflow }: { workflow: (typeof OFFICIAL_WORKFLOWS)[number] }) {
    const artifact = project.artifacts.find((item) => item.workflowId === workflow.id);
    return (
      <button className="rounded-lg border p-4 text-left transition hover:border-primary disabled:opacity-50" disabled={Boolean(pending)} onClick={() => runWorkflow(workflow.id)}>
        <span className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">{workflow.title}</span>
          {artifact ? <Badge variant="secondary">v{artifact.currentVersion}</Badge> : <Badge variant="outline">未生成</Badge>}
        </span>
        <span className="mt-2 block text-xs leading-5 text-muted-foreground">{workflow.summary}</span>
        <span className="mt-3 block text-xs text-muted-foreground">约 {workflow.minutes} 分钟 · {pending === workflow.id ? "正在生成" : artifact ? "再次生成会保存为新版本" : "使用左侧事实生成"}</span>
      </button>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle>项目事实</CardTitle>
          <CardDescription>一份事实可以生成多份材料。没有的内容写“暂无”，不会被补成经历或成绩。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {facts.map((fact) => (
            <label key={fact.key} className="block space-y-2">
              <span className="flex items-center justify-between gap-3 text-sm font-medium">{fact.label}<Badge variant="outline">{STATUS_LABEL[fact.confirmation]}</Badge></span>
              <Textarea value={fact.value} onChange={(event) => updateFact(fact.key, event.target.value)} placeholder={fact.hint} rows={3} />
            </label>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => saveFacts(false)} disabled={Boolean(pending)}>保存事实</Button>
            <Button variant="outline" onClick={() => saveFacts(true)} disabled={Boolean(pending)}>确认事实</Button>
          </div>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>{project.title}</CardTitle>
                <CardDescription>{GOAL_LABEL[project.goal]} · 已完成 {completed}/8 份材料 · 默认仅自己可见</CardDescription>
              </div>
              <Button asChild variant="outline"><a href={`/api/projects/${project.id}/export`}>导出全部材料</a></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <h2 className="mb-3 text-sm font-medium">先完成这三份</h2>
              <div className="grid gap-3 sm:grid-cols-3">{recommended.map((workflow) => <WorkflowButton key={workflow.id} workflow={workflow} />)}</div>
            </div>
            <div>
              <h2 className="mb-3 text-sm font-medium">继续补充</h2>
              <div className="grid gap-3 sm:grid-cols-2">{more.map((workflow) => <WorkflowButton key={workflow.id} workflow={workflow} />)}</div>
            </div>
          </CardContent>
        </Card>
        {message ? <p className="text-sm text-primary">{message}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {project.artifacts.length === 0 ? <Card className="border-dashed"><CardContent className="py-8 text-sm text-muted-foreground">还没有材料。先填写左侧事实，再生成第一份简历条目、README 或项目介绍。</CardContent></Card> : project.artifacts.map((artifact) => {
          const version = artifact.versions[0];
          return version ? (
            <Card key={artifact.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-base">{artifact.title}</CardTitle>
                  <Badge variant="secondary">最新版本 v{version.version}</Badge>
                </div>
                <CardDescription>历史版本保留在项目中，再次生成不会覆盖这一版。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-lg bg-muted/40 p-4 text-sm leading-6">{version.markdown}</pre>
              </CardContent>
            </Card>
          ) : null;
        })}
      </div>
    </div>
  );
}
