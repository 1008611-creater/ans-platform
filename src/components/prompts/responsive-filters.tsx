"use client";

import { createContext, useContext, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * 标记筛选组件当前是否渲染在移动端抽屉内。
 * 抽屉内需要强制展示完整筛选项，而不是组件自带的移动端折叠逻辑。
 */
const FilterDrawerContext = createContext(false);

export function useInFilterDrawer() {
  return useContext(FilterDrawerContext);
}

interface ResponsiveFiltersProps {
  children: React.ReactNode;
  title: string;
  resultLabel: string;
}

/**
 * 响应式筛选容器：
 * - 桌面端（lg 及以上）保持左侧固定筛选栏；
 * - 移动端改为「筛选」按钮 + 底部抽屉，避免筛选条件占满首屏。
 */
export function ResponsiveFilters({
  children,
  title,
  resultLabel,
}: ResponsiveFiltersProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 桌面端：侧边筛选栏 */}
      <aside className="hidden lg:block w-56 shrink-0 lg:sticky lg:top-16 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto">
        {children}
      </aside>

      {/* 移动端：筛选入口 + 底部抽屉 */}
      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="w-full h-9">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              {title}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="max-h-[85vh] flex flex-col gap-0 p-0"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <SheetHeader className="p-4 pb-3 border-b text-left">
              <SheetTitle className="text-base">{title}</SheetTitle>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <FilterDrawerContext.Provider value={true}>
                {children}
              </FilterDrawerContext.Provider>
            </div>

            <SheetFooter className="p-4 pt-3 border-t">
              <Button className="w-full" onClick={() => setOpen(false)}>
                {resultLabel}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
