import type { Metadata } from "next";
import { DaihuoScoutPool } from "@/components/daihuo-scout-pool";

export const metadata: Metadata = {
  title: "带货高价值账号视频样本池",
  description: "面向抖音、快手、小红书的高价值账号与爆款视频侦察样本池"
};

export default function DaihuoScoutPage() {
  return <DaihuoScoutPool />;
}
