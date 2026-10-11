import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
export async function marketPageUser(callbackPath: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=" + encodeURIComponent(callbackPath));
  return session.user.id;
}
