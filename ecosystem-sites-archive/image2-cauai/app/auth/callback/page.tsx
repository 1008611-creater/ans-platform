import type { Metadata } from "next";
import { headers } from "next/headers";
import { AuthCallbackPanel } from "@/components/auth-callback-panel";

const sceneHosts = new Set(["scene.lsb0713.online"]);

export const dynamic = "force-dynamic";

const getRequestHost = async () => {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || requestHeaders.get("host") || "";
  return host.split(":")[0].toLowerCase();
};

export async function generateMetadata(): Promise<Metadata> {
  const host = await getRequestHost();
  if (sceneHosts.has(host)) {
    return {
      title: "场景引擎账号",
      description: "验证场景引擎账号邮箱链接，回到商品场景图生成工作台。"
    };
  }

  return {
    title: "Image2 账号",
    description: "验证 Image2 账号邮箱链接，回到 Image2 案例库。"
  };
}

export default async function AuthCallbackPage() {
  const host = await getRequestHost();
  return <AuthCallbackPanel initialIsSceneSite={sceneHosts.has(host)} />;
}
