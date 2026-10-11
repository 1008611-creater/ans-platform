import { vibePageMetadata } from "../metadata";
import { readVibeData } from "../source-data";
import { LabClient } from "./lab-client";
export default async function Lab() {
  const preview = await readVibeData<{ en: string; zh: string }>("activity-preview.json");
  return <LabClient preview={preview || { en: "", zh: "" }} />;
}

export function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }) { return vibePageMetadata("lab", searchParams); }
