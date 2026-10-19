import { vibePageMetadata } from "../metadata";
import { SkillClient } from "./skill-client";
export default async function Skill({ searchParams }: { searchParams: Promise<{ scenario?: string }> }) {
  const { scenario } = await searchParams;
  return <SkillClient initialScenario={scenario} />;
}
export function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }) { return vibePageMetadata("vibehub-skill", searchParams); }
