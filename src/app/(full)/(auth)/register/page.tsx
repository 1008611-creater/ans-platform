import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getConfig } from "@/lib/config";
import { getConfiguredProviderIds, getProviderMetadata } from "@/lib/auth/provider-metadata";
import { AuthContent } from "@/components/auth/auth-content";
import { safeCallbackUrl } from "@/lib/auth/safe-callback-url";

export const metadata: Metadata = {
  title: "Register",
  description: "Create a new account",
};

interface RegisterPageProps {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);
  const loginUrl = callbackUrl === "/" ? "/login" : "/login?" + new URLSearchParams({ callbackUrl }).toString();
  const t = await getTranslations("auth");
  const config = await getConfig();
  const providers = getConfiguredProviderIds(config);
  const hasCredentials = providers.includes("credentials");

  // Block registration if disabled or credentials not enabled
  if (!hasCredentials || !config.auth.allowRegistration) {
    redirect(loginUrl);
  }

  const { displayNames, logos } = getProviderMetadata(providers);

  return (
    <div className="container flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center py-8">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold">{t("register")}</h1>
          <p className="text-xs text-muted-foreground">{t("registerDescription")}</p>
        </div>
        <div className="border rounded-lg p-4">
          <AuthContent providers={providers} mode="register" callbackUrl={callbackUrl} providerDisplayNames={displayNames} providerLogos={logos} />
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {t("hasAccount")}{" "}
          <Link href={loginUrl} className="text-foreground hover:underline">{t("login")}</Link>
        </p>
      </div>
    </div>
  );
}
