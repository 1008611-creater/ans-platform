import { readSignedComputeCommand, computeResponse } from "@/server/compute/http";
import { executeComputeCommand } from "@/server/compute/service";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return computeResponse(async () => executeComputeCommand(await readSignedComputeCommand(request)));
}
