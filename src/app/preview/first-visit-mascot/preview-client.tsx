"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FirstVisitMascot } from "@/components/homepage/first-visit-mascot";
import { FirstVisitRoutes } from "@/components/homepage/first-visit-routes";

/**
 * 首访引导的验收台：站内同一套 Dialog，装上兔兔龙舞台和五张分流卡。
 * 点任意一张卡：弹窗退场，人落到对应页面。触发规则（首访 / 已看标记 / 登录 / ?campaign=1）是后面的格，这里总是弹。
 */
export function FirstVisitMascotPreview() {
  const t = useTranslations("preview.firstVisit");
  const [open, setOpen] = useState(true);
  const content = useRef<HTMLDivElement>(null);

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[#FBF6E9] p-6">
      <button type="button" onClick={() => setOpen(true)} className="min-h-11 rounded-full bg-[#12211C] px-5 text-sm font-semibold text-white">
        {t("reopen")}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          ref={content}
          data-testid="first-visit-preview-dialog"
          // 竖屏铁律：不许把焦点交给第一张卡（浏览器会跟着滚，舞台被顶出视口）。焦点落在容器本身，且不滚动。
          onOpenAutoFocus={event => { event.preventDefault(); content.current?.focus({ preventScroll: true }); }}
          className="max-h-[calc(100dvh-1.5rem)] gap-0 overflow-y-auto overscroll-contain rounded-[28px] border-[#12211C]/10 bg-[#FBF6E9] p-0 text-[#12211C] shadow-[0_30px_80px_-30px_rgba(18,33,28,0.45)] outline-none sm:max-w-[600px] [&>[data-slot=dialog-close]]:top-3 [&>[data-slot=dialog-close]]:right-3 [&>[data-slot=dialog-close]]:grid [&>[data-slot=dialog-close]]:size-11 [&>[data-slot=dialog-close]]:place-items-center [&>[data-slot=dialog-close]]:rounded-full"
        >
          <header className="grid grid-cols-[1fr_auto] items-end gap-2 bg-[radial-gradient(120%_90%_at_88%_100%,#CDEFE0_0%,rgba(205,239,224,0)_62%)] px-6 pt-8 sm:px-8 sm:pt-10">
            <div className="pb-6 sm:pb-8">
              <DialogTitle className="text-[34px] leading-[1.02] font-black tracking-[-0.03em] sm:text-[52px]">{t("title")}</DialogTitle>
              <DialogDescription className="mt-3 max-w-[18em] text-[15px] leading-snug text-[#12211C]/70 sm:text-lg">{t("tagline")}</DialogDescription>
            </div>
            <FirstVisitMascot className="-mr-2 w-[112px] [@media(max-height:700px)]:w-[92px] sm:mr-0 sm:w-[176px]" />
          </header>
          <FirstVisitRoutes
            onNavigate={() => setOpen(false)}
            className="border-t border-[#12211C]/8 px-5 py-5 sm:px-8 sm:py-6 [@media(max-height:700px)]:py-4"
          />
        </DialogContent>
      </Dialog>
    </main>
  );
}
