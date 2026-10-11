import Client from "./anti-ai-flavor-client";
import { vibePageMetadata } from "../metadata";
export function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }) { return vibePageMetadata("anti-ai-flavor", searchParams); }
export default function Page() { return <Client />; }
