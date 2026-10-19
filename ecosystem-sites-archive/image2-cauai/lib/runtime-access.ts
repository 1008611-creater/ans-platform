import { NextResponse } from "next/server";

function isTruthy(value: string | undefined) {
  return /^(1|true|yes|on)$/i.test(value?.trim() ?? "");
}

export function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || isTruthy(process.env.VERCEL);
}

export function isLegacySeedanceApiEnabled() {
  return false;
}

export function isInternalOperationsApiEnabled() {
  return !isProductionRuntime() || isTruthy(process.env.IMAGE2_ENABLE_INTERNAL_OPERATIONS_API);
}

export function hiddenRouteResponse() {
  return NextResponse.json({ error: "接口不存在。" }, { status: 404 });
}

export function productionConfigurationResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 503 });
}
