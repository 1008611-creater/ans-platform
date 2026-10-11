import Client from "./favorites-client";
import { vibePageMetadata } from "../metadata";
export function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }) { return vibePageMetadata("favorites", searchParams); }
export default function Page() { return <Client />; }
