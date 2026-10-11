import Client from "./updates-client";
import { vibePageMetadata } from "../metadata";
export function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }) { return vibePageMetadata("updates", searchParams); }
export default function Page() { return <Client />; }
