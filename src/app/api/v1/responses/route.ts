import { codexResponses } from "@/server/integrations/codex-gateway";
import { handleGatewayOptions } from "@/server/integrations/chat-completions-gateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return handleGatewayOptions();
}

export function POST(request: Request) {
  return codexResponses(request);
}
