import { publicCatalogError, publicCatalogResponse, readAnsCasePack } from "@/lib/image2-public-catalog";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params;
    const pack = await readAnsCasePack(key);
    if (!pack) return publicCatalogError("案例不存在", 404);
    const download = new URL(request.url).searchParams.get("download") === "1";
    return publicCatalogResponse(request, pack, download ? `image2-${key}.ans.json` : undefined);
  } catch { return publicCatalogError("案例详情暂时不可用，请稍后重试", 503); }
}
