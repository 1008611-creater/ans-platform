import { WorkspaceLink } from "@/components/providers/workspace-navigation";
import { Button } from "@/components/ui/button";

export type AgriOrganizerTab = "manage" | "market" | "popularity" | "works" | "onsite" | "publication-review";

const TABS: Array<{ id: AgriOrganizerTab; href: string; key: string }> = [
  { id: "manage", href: "/competitions/agrihackathon/manage", key: "organizerNav.manage" },
  { id: "market", href: "/admin/market", key: "organizerNav.market" },
  { id: "popularity", href: "/competitions/agrihackathon/popularity", key: "organizerNav.popularity" },
  { id: "works", href: "/competitions/agrihackathon/works", key: "organizerNav.works" },
  { id: "onsite", href: "/competitions/agrihackathon/onsite", key: "organizerNav.onsite" },
  { id: "publication-review", href: "/competitions/agrihackathon/publication-review", key: "organizerNav.publicationReview" },
];

export function AgriOrganizerNav({
  current,
  backLabel,
  nav,
}: {
  current: AgriOrganizerTab;
  backLabel: string;
  nav: (key: string) => string;
}) {
  return (
    <nav aria-label={nav("organizerTools")} className="flex flex-wrap items-center gap-2 border-b pb-4">
      <Button asChild variant="ghost" size="sm">
        <WorkspaceLink href="/competitions/agrihackathon">{backLabel}</WorkspaceLink>
      </Button>
      {TABS.map((tab) => (
        <Button
          key={tab.id}
          asChild
          variant={tab.id === current ? "secondary" : "outline"}
          size="sm"
        >
          <WorkspaceLink
            href={tab.href}
            aria-current={tab.id === current ? "page" : undefined}
          >
            {nav(tab.key)}
          </WorkspaceLink>
        </Button>
      ))}
    </nav>
  );
}
