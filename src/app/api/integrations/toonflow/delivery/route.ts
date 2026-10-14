import { readSignedComputeDeliveryCommand, computeDeliveryResponse } from "@/server/compute/delivery-http";
import { executeComputeDeliveryCommand } from "@/server/compute/delivery-service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return computeDeliveryResponse(async () => executeComputeDeliveryCommand(await readSignedComputeDeliveryCommand(request)));
}
