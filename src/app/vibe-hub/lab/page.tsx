import { vibePageMetadata } from "../metadata";
import { LabClient } from "./lab-client";
export default function Lab() { return <LabClient />; }

export function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }) { return vibePageMetadata("lab", searchParams); }
