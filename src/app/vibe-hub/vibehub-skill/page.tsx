import { vibePageMetadata } from "../metadata";
import { SkillClient } from "./skill-client";
export default function Skill() { return <SkillClient />; }
export function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }) { return vibePageMetadata("vibehub-skill", searchParams); }
