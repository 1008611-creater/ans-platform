import { catalogWorkflowIdSchema } from "@/contracts/catalog";
import { projectGoalSchema } from "@/contracts/projects";

type QueryValue = string | string[] | undefined;
const first = (value: QueryValue) => Array.isArray(value) ? value[0] : value;

export function resolveProjectSelection(query: { goal?: QueryValue; workflow?: QueryValue }) {
  const goal = projectGoalSchema.safeParse(first(query.goal));
  const workflow = catalogWorkflowIdSchema.safeParse(first(query.workflow));
  const params = new URLSearchParams();
  if (goal.success) params.set("goal", goal.data);
  if (workflow.success) params.set("workflow", workflow.data);
  return {
    goal: goal.success ? goal.data : "career" as const,
    workflowId: workflow.success ? workflow.data : undefined,
    callbackPath: `/projects${params.size ? `?${params}` : ""}#new-project`,
  };
}

export function studioSelectionHref(projectId: string, workflowId?: string) {
  const parsed = catalogWorkflowIdSchema.safeParse(workflowId);
  if (parsed.success && parsed.data === "resume-website") return `/projects/${encodeURIComponent(projectId)}/website`;
  return `/projects/${encodeURIComponent(projectId)}${parsed.success ? `?workflow=${parsed.data}#selected-workflow` : ""}`;
}
