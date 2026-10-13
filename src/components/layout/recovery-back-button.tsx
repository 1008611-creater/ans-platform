"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RecoveryBackButton({ label }: { label: string }) {
  const router = useRouter();
  return <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />{label}</Button>;
}
