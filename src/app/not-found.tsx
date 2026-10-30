import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Home } from "lucide-react";
import { RecoveryBackButton } from "@/components/layout/recovery-back-button";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const [t, nav] = await Promise.all([getTranslations("notFound"), getTranslations("hubs.nav")]);

  return (
    <div className="container flex flex-col items-center justify-center min-h-[60vh] py-12">
      <div className="text-center space-y-6 max-w-md">
        {/* Mascot */}
        <div className="mx-auto w-32 h-32 flex items-center justify-center">
          <Image
            src="/mascot/ans-mascot.png"
            alt="ANS mascot"
            width={128}
            height={128}
            unoptimized
            className="h-32 w-32 object-contain [image-rendering:pixelated]"
            priority
          />
        </div>

        {/* Error Code */}
        <div className="space-y-2">
          <h1 className="text-7xl font-bold text-primary">404</h1>
          <h2 className="text-xl font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              {t("goHome")}
            </Link>
          </Button>
          <RecoveryBackButton label={t("goBack")} />
        </div>

        {/* Helpful Links */}
        <div className="pt-8 border-t">
          <p className="text-xs text-muted-foreground mb-3">
            {t("helpfulLinks")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <Link href="/explore" className="text-primary hover:underline">
              {nav("explore")}
            </Link>
            <Link href="/hubs" className="text-primary hover:underline">
              {nav("hubs")}
            </Link>
            <Link href="/community" className="text-primary hover:underline">{nav("community")}</Link>
            <Link href="/competitions" className="text-primary hover:underline">{nav("competitions")}</Link>
            <Link href="/market" className="text-primary hover:underline">{nav("market")}</Link>
            <Link href="/workspace" className="text-primary hover:underline">
              {nav("workspace")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
