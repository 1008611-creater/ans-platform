import { getTranslations } from "next-intl/server";
import { renderLayeredDiagram, type LayeredDiagram } from "@/server/companion/diagram-spec";
import { ProjectAgentPanel } from "@/components/agent/project-agent-panel";

/**
 * 预览页：项目详情 = 图 + Agent。
 *
 * 路由刻意放在 /preview 下，不进主导航、不影响线上项目页；
 * 详情图由 renderLayeredDiagram 从"领域事实"生成，接真数据时只换 spec。
 */
const PANEL_STATES = ["idle", "quote", "running", "done"] as const;
type PanelState = (typeof PANEL_STATES)[number];

export default async function ProjectAgentPreviewPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const t = await getTranslations("preview");
  const requested = (await searchParams).state;
  const initialState: PanelState = PANEL_STATES.includes(requested as PanelState) ? (requested as PanelState) : "idle";
  const diagram: LayeredDiagram = {
    layers: [
      { label: t("layer1"), items: [{ label: "Web 管理端" }, { label: "移动端应用" }, { label: "大屏可视化" }, { label: "小程序" }] },
      { label: t("layer2"), items: [{ label: "用户管理" }, { label: "农事管理" }, { label: "设备监控" }, { label: "数据分析" }] },
      { label: t("layer3"), items: [{ label: "认证服务" }, { label: "业务服务" }, { label: "数据服务" }, { label: "消息服务" }] },
      { label: t("layer4"), items: [{ label: "关系数据库" }, { label: "时序数据库" }, { label: "对象存储" }, { label: "数据备份" }] },
    ],
  };

  return (
    <main className="min-h-screen bg-[#FBF6E9] px-6 py-6 text-[#12211C] lg:px-10">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-[#9BE0C5] text-base">🦕</span>
            <div>
              <div className="text-lg font-bold tracking-wide">ANS</div>
              <div className="text-[11px] text-[#4A5C55]">{t("breadcrumb")} / {t("project")}</div>
            </div>
          </div>
          <span className="rounded-full bg-[#12211C] px-3 py-1 text-[11px] text-white">{t("badge")}</span>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1fr_400px] lg:items-start">
          <section className="rounded-2xl border border-[#E3E8E4] bg-white p-6">
            <h1 className="text-xl font-bold">{t("diagramTitle")}</h1>
            <div className="mt-4" dangerouslySetInnerHTML={{ __html: renderLayeredDiagram(diagram) }} />
            <p className="mt-3 text-[11px] text-[#4A5C55]">{t("diagramCaption")}</p>
            <div className="mt-4 flex flex-wrap gap-x-10 gap-y-2 border-t border-[#E3E8E4] pt-3 text-[11px] text-[#4A5C55]">
              <span>{t("metaType")}<span className="ml-2 text-[12.5px] font-semibold text-[#12211C]">{t("metaTypeValue")}</span></span>
              <span>{t("metaUpdated")}<span className="ml-2 text-[12.5px] font-semibold text-[#12211C]">{t("metaUpdatedValue")}</span></span>
              <span>{t("metaLevel")}<span className="ml-2 text-[12.5px] font-semibold text-[#12211C]">{t("metaLevelValue")}</span></span>
            </div>
          </section>

          <ProjectAgentPanel projectLabel={t("project")} initialState={initialState} />
        </div>

        <p className="text-[11.5px] text-[#4A5C55]">{t("footnote")}</p>
      </div>
    </main>
  );
}
