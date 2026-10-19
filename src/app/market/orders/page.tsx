import { MarketAccountBoundary } from "@/components/marketplace/account-boundary";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { listMarketOrders } from "@/server/marketplace/orders";
import { marketPrice } from "@/domain/marketplace/presentation";
import { MarketFrame } from "@/components/marketplace/frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const SAMPLE_ORDERS = [
  {
    id: "demo-order-agri-vision",
    title: "Agri-Vision 农田多光谱病虫害遥感识别工作流",
    role: "📖 范例 · 买家解锁",
    price: "15 积分",
    cover: "/competitions/agrihackathon/gitglow-hub.webp",
    href: "/market",
    desc: "含完整多模态提示词模板、UAV 航拍切片预处理节点与结构化诊断 JSON 输出。",
  },
  {
    id: "demo-order-canvas",
    title: "CAUAI 无限画布多模态视觉与视频工作流",
    role: "📖 范例 · 买家解锁",
    price: "20 积分",
    cover: "/catalog/ans-pro-v1/infinite-canvas.webp",
    href: "https://hb.cauai.fun/",
    desc: "支持在无限画布中串联分镜提示词、主角特征参考与视频生成节点。",
  },
  {
    id: "demo-order-academic-site",
    title: "Resume-Web 学术个人主页与论文高颜值展示模板",
    role: "📖 范例 · 创作者 80% 分成",
    price: "+16 积分",
    cover: "/catalog/ans-pro-v1/magic-resume.webp",
    href: "/market/resume-website",
    desc: "学生与科研团队零代码生成响应式双语主页，每次被复用自动向作者结算 80% 算力分成。",
  },
];

export default async function OrdersPage() {
  const [session, t] = await Promise.all([auth(), getTranslations("product.market")]);
  const user = session?.user?.id ?? null;

  if (!user) {
    return (
      <MarketFrame title={t("orders")} description={t("ordersBody")}>
        <div className="space-y-6" data-testid="market-orders-guest-preview">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">当前未登录 · 暂无真实订单记录</p>
              <p className="text-xs leading-6 text-muted-foreground">
                登录后可查看你在市场兑换的工作流与售出分成账单。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href="/login?callbackUrl=%2Fmarket%2Forders">登录查看我的订单</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/market">浏览工具与工作流市场</Link>
              </Button>
            </div>
          </div>

          <details className="group rounded-2xl border bg-card p-5">
            <summary className="cursor-pointer list-none font-semibold flex items-center justify-between">
              <span>📖 订单交付与创作者 80% 分成参考范例（点击展开 3 条样例）</span>
              <span className="text-xs font-normal text-muted-foreground group-open:hidden">展开查看 →</span>
            </summary>
            <div className="mt-4 grid gap-5 md:grid-cols-3">
              {SAMPLE_ORDERS.map((item) => (
                <Link key={item.id} href={item.href} className="group/card overflow-hidden rounded-2xl border bg-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                  <div className="aspect-[16/9] w-full overflow-hidden border-b bg-muted">
                    <img src={item.cover} alt={item.title} className="h-full w-full object-cover transition duration-300 group-hover/card:scale-105" loading="lazy" />
                  </div>
                  <div className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary" className="text-xs">{item.role}</Badge>
                      <span className="text-sm font-bold text-primary">{item.price}</span>
                    </div>
                    <h2 className="line-clamp-1 text-base font-semibold group-hover/card:text-primary">{item.title}</h2>
                    <p className="hidden line-clamp-2 text-xs leading-5 text-muted-foreground group-hover/card:block">{item.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </details>
        </div>
      </MarketFrame>
    );
  }

  const orders = await listMarketOrders(user);
  return (
    <MarketFrame title={t("orders")} description={t("ordersBody")}>
      <MarketAccountBoundary actorId={user}>
        <div className="space-y-6">
          {orders.length === 0 && (
            <div className="ans-empty">
              <h2 className="text-xl font-semibold">{t("noOrders")}</h2>
              <Link href="/market" className="mt-4 inline-block text-primary underline">{t("browse")}</Link>
            </div>
          )}
          {orders.map((order) => (
            <Link href={"/market/orders/" + order.id} key={order.id} className="ans-project-card block p-6">
              <div className="flex flex-wrap justify-between gap-4">
                <div>
                  <h2 className="break-words text-lg font-semibold">{order.quote.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t(order.buyerId === user ? "buyer" : "seller")} · {t("orderStatus." + order.status)}
                  </p>
                </div>
                <p className="text-2xl font-semibold">
                  {order.paymentMethod === "POINTS" ? t("pointsUnit", { amount: order.quote.priceMinor / 100 }) : marketPrice(order.quote.priceMinor)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </MarketAccountBoundary>
    </MarketFrame>
  );
}
