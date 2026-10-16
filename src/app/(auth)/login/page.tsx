import { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { getConfig } from "@/lib/config";
import { getConfiguredProviderIds, getProviderMetadata } from "@/lib/auth/provider-metadata";
import { AuthContent } from "@/components/auth/auth-content";
import { safeCallbackUrl } from "@/lib/auth/safe-callback-url";

export const metadata: Metadata = {
  title: "Login",
  description: "Login to your account",
};

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);
  const [t, locale] = await Promise.all([getTranslations("auth"), getLocale()]);
  const isEn = locale.startsWith("en");
  const isCommunityCallback = callbackUrl.startsWith("/community");
  const config = await getConfig();
  const providers = getConfiguredProviderIds(config);
  const hasCredentials = providers.includes("credentials");
  const hasOnlyCredentials = providers.length === 1 && hasCredentials;
  const useCloneBranding = config.homepage?.useCloneBranding ?? false;
  const { displayNames, logos } = getProviderMetadata(providers);

  return (
    <div className="container flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center py-8">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold">{t("login")}</h1>
          <p className="text-xs text-muted-foreground">
            {hasOnlyCredentials ? t("loginDescription") : t("loginDescriptionOAuth")}
          </p>
        </div>
        {callbackUrl !== "/" && (
          <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">
              {isCommunityCallback
                ? isEn
                  ? "Community Growth Center requires sign-in"
                  : "「社区成长中心」需登录个人账号"
                : isEn
                  ? "Sign in to continue to your workspace"
                  : "请先登录以继续访问目标页面"}
            </p>
            <p className="mt-1">
              {isCommunityCallback
                ? isEn
                  ? "Daily check-ins, XP levels, and personal contribution logs are tied to your account. Want to browse public works without signing in?"
                  : "每日签到、经验等级（XP）与贡献记录需绑定个人账号。如果您只想免登录逛逛公开内容，可直接前往："
                : isEn
                  ? `You will be redirected to ${callbackUrl} after signing in, or you can browse public pages first:`
                  : `登录后将自动跳转至 ${callbackUrl}；您也可以先免登录浏览公开页面：`}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href="/showcase"
                className="inline-flex items-center rounded-md border bg-background px-2.5 py-1 font-medium text-foreground hover:bg-muted"
              >
                {isEn ? "Community Showcase (/showcase)" : "社区作品展 (/showcase)"}
              </Link>
              <Link
                href="/explore"
                className="inline-flex items-center rounded-md border bg-background px-2.5 py-1 font-medium text-foreground hover:bg-muted"
              >
                {isEn ? "Explore Projects (/explore)" : "浏览公开项目 (/explore)"}
              </Link>
            </div>
          </div>
        )}
        <div className="border rounded-lg p-4">
          <AuthContent providers={providers} mode="login" callbackUrl={callbackUrl} useCloneBranding={useCloneBranding} providerDisplayNames={displayNames} providerLogos={logos} />
        </div>
        {hasCredentials && (
          <p className="text-center text-xs text-muted-foreground">
            {t("noAccount")}{" "}
            <Link href={callbackUrl === "/" ? "/register" : "/register?" + new URLSearchParams({ callbackUrl }).toString()} className="text-foreground hover:underline">{t("register")}</Link>
          </p>
        )}
      </div>
    </div>
  );
}

