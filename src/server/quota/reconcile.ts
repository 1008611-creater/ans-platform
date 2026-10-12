import { sweepVoiceUsage } from "@/server/voice/service";
import { db } from "@/lib/db";
import { reconcileCodexCharges } from "@/server/integrations/codex-gateway";
let sweepOffset = 0;
let current: Promise<{ checkedUsers: number; pending: number }> | null = null;
export function reconcilePendingCredits() {
 if (current) return current;
 current = reconcileBatch().finally(() => { current = null; });
 return current;
}
async function reconcileBatch() {
 const deadline = Date.now() + 45000;
 const voice = await sweepVoiceUsage();
 const users = await db.apiComputeRequest.findMany({ where: { provider: "apic-codex", state: { in: ["RUNNING", "UNCERTAIN"] } }, distinct: ["userId"], select: { userId: true }, orderBy: { updatedAt: "asc" }, skip: sweepOffset, take: 10 });
 let checkedUsers = 0;
 for (const user of users) {
   if (Date.now() >= deadline) break;
   await reconcileCodexCharges(user.userId, { limit: 20, deadline });
   checkedUsers++;
 }
 sweepOffset = users.length < 10 ? 0 : sweepOffset + checkedUsers;
 const pending = await db.apiComputeRequest.count({ where: { state: "UNCERTAIN", provider: "apic-codex" } });
 return { checkedUsers, pending: pending + voice.pending, voice };
}
