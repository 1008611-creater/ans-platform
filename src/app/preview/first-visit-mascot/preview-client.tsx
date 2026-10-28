"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FirstVisitGuideDialog } from "@/components/homepage/first-visit-guide-dialog";

/**
 * 首访引导的验收台：和首页同一份弹窗本体（兔兔龙舞台 + 五张分流卡）。
 * 触发规则（首访 / 已看标记 / 登录 / ?campaign=1）只在首页生效，这里总是弹。
 */
export function FirstVisitMascotPreview() {
  const t = useTranslations("preview.firstVisit");
  const [open, setOpen] = useState(true);

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[#FBF6E9] p-6">
      <button type="button" onClick={() => setOpen(true)} className="min-h-11 rounded-full bg-[#12211C] px-5 text-sm font-semibold text-white">
        {t("reopen")}
      </button>
      <FirstVisitGuideDialog open={open} onOpenChange={setOpen} testId="first-visit-preview-dialog" />
    </main>
  );
}
