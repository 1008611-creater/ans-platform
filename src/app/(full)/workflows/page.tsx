import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Public workflow discovery is retired. Projects and market listings are the discovery surfaces. */
export default function WorkflowsPage() {
  redirect("/market");
}
