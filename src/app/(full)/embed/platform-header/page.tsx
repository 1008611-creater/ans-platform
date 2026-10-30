import { getConfig } from "@/lib/config";
import { platformEmbedOrigins } from "@/lib/platform-embed";
import { PlatformHeader } from "@/components/layout/platform-header";
export const dynamic = "force-dynamic";
export default async function PlatformHeaderPage({ searchParams }: { searchParams: Promise<{ parent?: string }> }) {
  const { parent } = await searchParams;
  if (!parent || !platformEmbedOrigins().includes(parent)) return null;
  const config = await getConfig();
  return <PlatformHeader parentOrigin={parent} authProvider={config.auth.provider} allowRegistration={config.auth.allowRegistration} />;
}
