import type { Metadata } from "next";
import { Image2GachaLab } from "@/components/image2-gacha-lab";
import type { Image2GachaMode } from "@/lib/image2-gacha-store";

export const metadata: Metadata = {
  title: "Image2 同款抽卡",
  description: "从已收藏的 Image2 案例图提取视觉 DNA，进行单抽或九抽开包。"
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Image2GachaPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const modeParam = firstParam(params.mode);
  const initialMode: Image2GachaMode = modeParam === "single" ? "single" : "pack";

  return <Image2GachaLab initialCaseKey={firstParam(params.case)} initialMode={initialMode} />;
}
