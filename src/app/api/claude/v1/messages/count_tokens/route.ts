import { claudeCountTokens } from "@/server/integrations/claude-gateway";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = claudeCountTokens;
