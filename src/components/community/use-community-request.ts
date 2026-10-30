"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

const KNOWN_ERRORS = new Set([
  "UNAUTHORIZED", "ACCOUNT_RESTRICTED", "DAILY_LIMIT", "INVALID_INPUT", "INVALID_DEADLINE", "NOT_TEAM_LEAD", "INVALID_COMPETITION",
  "NOT_FOUND", "FORBIDDEN", "POST_CLOSED", "INVALID_ACTION", "SELF_ACTION", "HELPER_NOT_OFFERED", "INVALID_ROLE", "ALREADY_MEMBER",
  "ROLE_FULL", "ALREADY_APPLIED", "APPLICATION_STALE", "TEAM_FULL", "REQUEST_TOO_LARGE",
]);

/** 社区帖子的写请求：失败时用站内文案提示，成功后刷新服务端数据。 */
export function useCommunityRequest() {
  const router = useRouter();
  const t = useTranslations("product.communityPost.errors");
  const [pending, setPending] = useState(false);

  const send = useCallback(async <T extends Record<string, unknown>>(url: string, body: unknown): Promise<T | null> => {
    setPending(true);
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({})) as T & { error?: string };
      if (!response.ok) {
        toast.error(t(data.error && KNOWN_ERRORS.has(data.error) ? data.error : "SERVER_ERROR"));
        return null;
      }
      router.refresh();
      return data;
    } catch {
      toast.error(t("SERVER_ERROR"));
      return null;
    } finally {
      setPending(false);
    }
  }, [router, t]);

  return { send, pending };
}
