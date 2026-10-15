import { ok } from "@/server/http/respond";
import { fourViewConfig } from "@/server/visual-portfolio/four-view-jobs";
export const dynamic="force-dynamic";
export async function GET(){return ok(fourViewConfig());}
