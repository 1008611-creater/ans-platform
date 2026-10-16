import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ComputeBenefitError } from "@/contracts/compute-benefits";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { HttpRequestError } from "@/server/http/json";
export const benefitResponseHeaders = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie, x-ans-actor" };
export function benefitFailure(error: unknown) {
  const known = error instanceof ComputeBenefitError || error instanceof HttpRequestError || error instanceof AgriWorkspaceError;
  const status = known ? error.status : error instanceof ZodError ? 400 : 500;
  const code = known ? error.code : error instanceof ZodError ? "INVALID_INPUT" : "COMPUTE_BENEFITS_FAILED";
  return NextResponse.json({ error: code }, { status, headers: benefitResponseHeaders });
}
