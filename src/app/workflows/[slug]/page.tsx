import { redirect } from "next/navigation";

type WorkflowDetailProps = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

/** Keep old public workflow links usable while the product surface is projects + market. */
export default async function WorkflowDetailPage({ params }: WorkflowDetailProps) {
  const { slug } = await params;
  redirect(slug === "ans-portfolio-website" ? "/market/resume-website" : "/market");
}
