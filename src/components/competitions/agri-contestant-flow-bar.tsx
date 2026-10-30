import { ChevronRight } from "lucide-react";
import { WorkspaceLink } from "@/components/providers/workspace-navigation";
import { Button } from "@/components/ui/button";

export type AgriContestantStepId =
  | "hub"
  | "credits"
  | "submissions"
  | "bindWall"
  | "wall"
  | "showcase"
  | "tasks";

const FLOW_STEPS: Array<{
  id: AgriContestantStepId;
  href: string;
  key: string;
  isMainStep?: boolean;
}> = [
  { id: "hub", href: "/competitions/agrihackathon", key: "crossNav.hub", isMainStep: true },
  { id: "credits", href: "/workspace/credits", key: "crossNav.credits", isMainStep: true },
  { id: "submissions", href: "/competitions/agrihackathon/submissions", key: "crossNav.submissions", isMainStep: true },
  { id: "wall", href: "/explore?category=competition&subcategory=agri-wall", key: "crossNav.wall", isMainStep: true },
  { id: "showcase", href: "/competitions/agrihackathon/showcase", key: "crossNav.showcase", isMainStep: true },
  { id: "bindWall", href: "/explore/agrihackathon/submit", key: "crossNav.bindWall", isMainStep: false },
  { id: "tasks", href: "/competitions/agrihackathon/tasks", key: "crossNav.tasks", isMainStep: false },
];

export function AgriContestantFlowBar({
  current,
  backHref,
  backLabel,
  nav,
}: {
  current: AgriContestantStepId;
  backHref?: string;
  backLabel?: string;
  nav: (key: string) => string;
}) {
  const mainSteps = FLOW_STEPS.filter((step) => step.isMainStep);
  const auxSteps = FLOW_STEPS.filter((step) => !step.isMainStep);

  return (
    <nav
      aria-label={nav("crossNav.flowLabel")}
      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-muted/25 px-3 py-2.5"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {backHref && backLabel && (
          <Button asChild variant="ghost" size="sm" className="h-8 px-2.5 text-xs">
            <WorkspaceLink href={backHref}>{backLabel}</WorkspaceLink>
          </Button>
        )}
        {mainSteps.map((step, index) => {
          const active = step.id === current;
          return (
            <div key={step.id} className="inline-flex items-center gap-1">
              {index > 0 && (
                <ChevronRight
                  className="hidden size-3.5 shrink-0 text-muted-foreground/60 sm:inline"
                  aria-hidden="true"
                />
              )}
              <Button
                asChild
                variant={active ? "default" : "outline"}
                size="sm"
                className="h-8 px-2.5 text-xs"
              >
                <WorkspaceLink
                  href={step.href}
                  aria-current={active ? "step" : undefined}
                >
                  {nav(step.key)}
                </WorkspaceLink>
              </Button>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {auxSteps.map((step) => {
          const active = step.id === current;
          return (
            <Button
              key={step.id}
              asChild
              variant={active ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <WorkspaceLink
                href={step.href}
                aria-current={active ? "page" : undefined}
              >
                {nav(step.key)}
              </WorkspaceLink>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
