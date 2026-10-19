import type { ApiCallFormat, ChannelModel, ModelCapability, ModelChannel } from "./use-config-store";

/**
 * 渠道模板：预填接口地址与模型，用户只需要补 API Key。
 *
 * 铁律：模板里**绝不写 API Key**。仓库是公开的，Key 一旦进代码就等于泄露，
 * 只能让用户在界面里贴一次（存 localStorage）。
 */
export type ChannelTemplate = {
    id: string;
    /** 模板名，直接作为渠道名 */
    name: string;
    baseUrl: string;
    apiFormat: ApiCallFormat;
    models: Array<{ name: string; capability: ModelCapability }>;
    imageBatchLimit?: number;
    editViaGenerations?: boolean;
    /** 提示文案，说明这个渠道还差什么才能用 */
    hint: string;
};

export const channelTemplates: ChannelTemplate[] = [
    {
        id: "openlux",
        name: "OpenLux",
        baseUrl: "https://api.openlux.ai",
        apiFormat: "openai",
        models: [{ name: "gpt-image-2-c", capability: "image" }],
        // 实测（2026-09-01）：n=3 时返回 2 张、HTTP 200 —— 不报错但会静默少给。
        // 填 1 让前端拆成多次调用，保证选几张出几张。
        imageBatchLimit: 1,
        // 它的 /images/edits（multipart）不可用，图生图必须走 generations + image 参数。
        editViaGenerations: true,
        hint: "生图（gpt-image-2-c）。填 API Key 即用。单张约 40–75 秒；该渠道对多张请求会少给，已按 1 张/次拆分以保证张数准确。",
    },
    {
        id: "omniroute",
        name: "OmniRoute",
        baseUrl: "http://127.0.0.1:20128",
        apiFormat: "openai",
        // auto/* 是智能路由，上游某个渠道挂了会自动换，比写死具体模型稳。
        models: [
            { name: "auto/best-chat", capability: "text" },
            { name: "auto/best-fast", capability: "text" },
            { name: "auto/best-vision", capability: "text" },
            { name: "auto/best-coding", capability: "text" },
        ],
        // 实测（2026-09-01）：浏览器不把 127.0.0.1 当混合内容拦截，HTTPS 页面可直接调本机网关，
        // 所以同机使用无需 cloudflared。跨设备才需要隧道，而且不能裸奔——
        // Cloudflare Access 是交互式登录，会把 fetch 302 到登录页，和浏览器请求不兼容；
        // 公网场景要用 tools/omniroute-guard 的令牌守卫，详见 docs/omniroute-integration.md。
        hint: "文本网关（207 个模型，auto/* 会自动挑可用上游）。API Key 留空即可，网关不鉴权。在跑网关的那台电脑上打开画布就能直接用；换设备才需要隧道，届时务必套上 tools/omniroute-guard 的令牌守卫——网关裸奔在公网等于把额度公开。",
    },
    {
        id: "midjourney",
        name: "Midjourney (本地桥接)",
        baseUrl: "http://127.0.0.1:8765",
        apiFormat: "openai",
        models: [{ name: "midjourney", capability: "image" }],
        // 和 OmniRoute 同理：跑桥接的那台电脑上打开画布，HTTPS 页面可直接调 127.0.0.1，不必穿透。
        hint: "走本地 MJ 桥接服务（mxai-rpa-mcp + FastAPI）。需先在本机启动 tools/mj-bridge；在跑桥接的那台电脑上打开画布即可直连。桥接默认只监听本机，跨设备再考虑隧道。",
    },
];

export function createChannelFromTemplate(template: ChannelTemplate): ModelChannel {
    return {
        id: template.id,
        name: template.name,
        baseUrl: template.baseUrl,
        apiKey: "",
        apiFormat: template.apiFormat,
        models: template.models.map((model): ChannelModel => ({ name: model.name, capability: model.capability })),
        ...(template.imageBatchLimit ? { imageBatchLimit: template.imageBatchLimit } : {}),
        ...(template.editViaGenerations ? { editViaGenerations: true } : {}),
    };
}
