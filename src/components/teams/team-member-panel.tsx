"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TeamPermissions } from "@/contracts/teams";

export type TeamMemberView = {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  status: "ACTIVE" | "PENDING" | "LEFT";
  quotaAllowance: number;
  quotaUsed: number;
  user: { id: string; username: string; nickname: string | null; avatar: string | null };
};

const ROLE_LABEL: Record<TeamMemberView["role"], string> = {
  OWNER: "队长",
  ADMIN: "管理员",
  MEMBER: "成员",
};

export function TeamMemberPanel({
  slug,
  members,
  permissions,
  viewerId,
  quotaAvailable,
}: {
  slug: string;
  members: TeamMemberView[];
  permissions: TeamPermissions;
  viewerId: string;
  quotaAvailable: number;
}) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [inviteRole, setInviteRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function call(key: string, url: string, init: RequestInit) {
    setPending(key);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(url, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init.headers || {}) },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.message || "操作失败，请稍后重试");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("网络异常，请稍后重试");
      return false;
    } finally {
      setPending(null);
    }
  }

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    const ok = await call("invite", "/api/teams/" + slug + "/members", {
      method: "POST",
      body: JSON.stringify({ identifier, role: inviteRole }),
    });
    if (ok) {
      setIdentifier("");
      setNotice("邀请已发送，对方接受后即可加入团队。");
    }
  }

  return (
    <div className="space-y-6">
      {permissions.canInvite ? (
        <form onSubmit={invite} className="flex flex-wrap items-end gap-2 rounded-lg border p-4">
          <div className="min-w-[220px] flex-1 space-y-1.5">
            <label className="text-sm font-medium" htmlFor="invite-identifier">邀请成员</label>
            <Input
              id="invite-identifier"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="对方用户名或注册邮箱"
              required
            />
          </div>
          {permissions.canManageRoles ? (
            <select
              aria-label="邀请角色"
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value === "ADMIN" ? "ADMIN" : "MEMBER")}
            >
              <option value="MEMBER">成员</option>
              <option value="ADMIN">管理员</option>
            </select>
          ) : null}
          <Button type="submit" size="sm" disabled={pending === "invite"}>
            {pending === "invite" ? "发送中…" : "发送邀请"}
          </Button>
        </form>
      ) : null}

      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}

      <ul className="divide-y rounded-lg border">
        {members.map((member) => {
          const isSelf = member.user.id === viewerId;
          const canRemove =
            permissions.canRemoveMember &&
            member.role !== "OWNER" &&
            !isSelf &&
            !(permissions.canManageRoles === false && member.role === "ADMIN");
          const canAllocate = permissions.canAllocateQuota && !isSelf && member.status === "ACTIVE";
          return (
            <li key={member.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-[160px] flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{member.user.nickname || member.user.username}</span>
                  <Badge variant={member.role === "OWNER" ? "default" : "secondary"}>
                    {ROLE_LABEL[member.role]}
                  </Badge>
                  {member.status === "PENDING" ? <Badge variant="outline">待接受</Badge> : null}
                  {isSelf ? <span className="text-xs text-muted-foreground">（我）</span> : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  额度 {member.quotaAllowance} 点 · 已用 {member.quotaUsed} 点
                </p>
              </div>

              {canAllocate ? <QuotaAllocator
                slug={slug}
                memberId={member.id}
                current={member.quotaAllowance}
                used={member.quotaUsed}
                available={quotaAvailable}
                onDone={call}
                pending={pending}
              /> : null}

              {permissions.canManageRoles && member.role !== "OWNER" && !isSelf ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending === "role-" + member.id}
                  onClick={() =>
                    call("role-" + member.id, "/api/teams/" + slug + "/members/" + member.id, {
                      method: "PATCH",
                      body: JSON.stringify({ role: member.role === "ADMIN" ? "MEMBER" : "ADMIN" }),
                    })
                  }
                >
                  {member.role === "ADMIN" ? "降为成员" : "设为管理员"}
                </Button>
              ) : null}

              {permissions.canManageRoles && member.role !== "OWNER" && !isSelf ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending === "transfer-" + member.id}
                  onClick={() => {
                    if (window.confirm("确定把队长转让给 " + (member.user.nickname || member.user.username) + "？转让后你会变成管理员。")) {
                      void call("transfer-" + member.id, "/api/teams/" + slug + "/members/" + member.id, {
                        method: "PATCH",
                        body: JSON.stringify({ role: "OWNER" }),
                      });
                    }
                  }}
                >
                  转让队长
                </Button>
              ) : null}

              {canRemove ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending === "remove-" + member.id}
                  onClick={() => {
                    if (window.confirm("确定移除 " + (member.user.nickname || member.user.username) + "？")) {
                      void call("remove-" + member.id, "/api/teams/" + slug + "/members/" + member.id, { method: "DELETE" });
                    }
                  }}
                >
                  移除
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function QuotaAllocator({
  slug,
  memberId,
  current,
  used,
  available,
  onDone,
  pending,
}: {
  slug: string;
  memberId: string;
  current: number;
  used: number;
  available: number;
  onDone: (key: string, url: string, init: RequestInit) => Promise<boolean>;
  pending: string | null;
}) {
  const [value, setValue] = useState(String(current));
  const key = "quota-" + memberId;
  return (
    <div className="flex items-center gap-1.5">
      <Input
        aria-label="分配额度"
        className="h-8 w-24"
        type="number"
        min={used}
        max={current + available}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <Button
        size="sm"
        variant="outline"
        disabled={pending === key}
        onClick={() =>
          void onDone(key, "/api/teams/" + slug + "/members/" + memberId, {
            method: "PUT",
            body: JSON.stringify({ quotaAllowance: Number(value) }),
          })
        }
      >
        {pending === key ? "保存中…" : "保存额度"}
      </Button>
    </div>
  );
}
