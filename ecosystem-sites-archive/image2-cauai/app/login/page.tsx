import type { Metadata } from "next";
import { headers } from "next/headers";
import { UnifiedLoginPanel } from "@/components/unified-login-panel";

const sceneHosts = new Set(["scene.lsb0713.online"]);

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function getRequestHost() {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || requestHeaders.get("host") || "";
  return host.split(":")[0].toLowerCase();
}

function safeReturnTo(value: string | string[] | undefined, fallback: string) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}

function loginIntent(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "admin" ? "admin" : "account";
}

export async function generateMetadata({ searchParams }: LoginPageProps): Promise<Metadata> {
  const host = await getRequestHost();
  const params = (await searchParams) ?? {};
  if (loginIntent(params.intent) === "admin") {
    return {
      title: "Image2 管理员登录",
      description: "使用已授权账号创建安全的 Image2 管理员会话。"
    };
  }
  if (sceneHosts.has(host)) {
    return {
      title: "场景引擎账号",
      description: "使用邮箱或手机号验证码登录场景引擎。"
    };
  }

  return {
    title: "Image2 账号",
    description: "使用邮箱或手机号验证码登录 Image2。"
  };
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const host = await getRequestHost();
  const isScene = sceneHosts.has(host);
  const params = (await searchParams) ?? {};
  const intent = loginIntent(params.intent);
  const fallback = isScene ? "/workbench" : "/image2-cases";

  return (
    <UnifiedLoginPanel
      brand={isScene ? "scene" : "image2"}
      intent={intent}
      returnHref={safeReturnTo(params.returnTo, intent === "admin" ? "/admin/image2-cases" : fallback)}
      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
    />
  );
}
