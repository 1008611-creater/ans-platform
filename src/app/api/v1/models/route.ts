import {
  handleGatewayOptions,
  v1Models,
} from "@/server/integrations/chat-completions-gateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return handleGatewayOptions();
}

export function GET(request: Request) {
  return v1Models(request);
}
