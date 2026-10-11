import type { MarketOrderAction, MarketOrderStatus } from "@/contracts/marketplace";
import { nextOrderStatus } from "./order";
export function marketPrice(minor: number) { return "¥" + Math.floor(minor / 100) + "." + String(minor % 100).padStart(2, "0"); }
export function parseMarketPrice(value: string) {
  if (!/^(?:0|[1-9][0-9]{0,6})(?:\.[0-9]{1,2})?$/.test(value)) return null;
  const [whole, decimal = ""] = value.split("."); const minor = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  return minor >= 1 && minor <= 100_000_000 ? minor : null;
}
export function availableMarketActions(order: { status: MarketOrderStatus; revisionRequests: number; revisionLimit: number }, role: "buyer" | "seller"): MarketOrderAction["action"][] {
  const actions: MarketOrderAction["action"][] = ["submit_requirements", "deliver", "request_revision", "accept", "cancel", "dispute"];
  return actions.filter((action) => { try { nextOrderStatus(order, action, role); return true; } catch { return false; } });
}
