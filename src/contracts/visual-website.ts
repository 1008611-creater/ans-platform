import { z } from "zod";
import { resumeWebsiteInputSchema } from "./resume-website";
import { modelAssetRefSchema } from "./visual-generation";
export const VISUAL_WEBSITE_ID = "visual-portfolio-v1";
const vector = z.tuple([z.number().finite().min(-100).max(100), z.number().finite().min(-100).max(100), z.number().finite().min(-100).max(100)]);
export const tourCameraSchema = z.object({ position: vector, target: vector }).strict();
export function isSelfContainedVisualModel(value: string): boolean {
    try {
        const encoded = value.split(",")[1];
        if (!encoded)
            return false;
        const raw = atob(encoded), bytes = Uint8Array.from(raw, c => c.charCodeAt(0)), view = new DataView(bytes.buffer);
        if (bytes.length > 5000000 || view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== bytes.length || view.getUint32(16, true) !== 0x4e4f534a)
            return false;
        const length = view.getUint32(12, true);
        if (length > bytes.length - 20)
            return false;
        const metadata = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + length)));
        return !(metadata.buffers ?? []).some((item: {
            uri?: string;
        }) => item.uri) && !(metadata.images ?? []).some((item: {
            uri?: string;
        }) => item.uri) && !(metadata.extensionsRequired ?? []).some((extension: string) => !["EXT_texture_webp", "KHR_materials_unlit", "KHR_texture_transform"].includes(extension));
    }
    catch {
        return false;
    }
}
export const visualTourSchema = z.object({
    modelAsset: modelAssetRefSchema.optional(),
    model: z.string().max(7000000).regex(/^data:model\/gltf-binary;base64,[A-Za-z0-9+/=]+$/).refine(isSelfContainedVisualModel).optional(),
    hero: z.object({ title: z.string().max(120), body: z.string().max(3000), byline: z.string().max(80), issue: z.string().max(40), tagline: z.string().max(120), location: z.string().max(100), layout: z.enum(["editorial", "minimal"]), camera: tourCameraSchema.optional() }).strict(),
    nodes: z.array(z.object({ id: z.string().max(50), title: z.string().max(100), eyebrow: z.string().max(100), subtitle: z.string().max(120), body: z.string().max(2000), url: resumeWebsiteInputSchema.shape.contactUrl, camera: tourCameraSchema.optional() }).strict()).max(10),
    sections: z.array(z.object({ id: z.string().max(50), title: z.string().max(100), body: z.string().max(2000), url: resumeWebsiteInputSchema.shape.contactUrl }).strict()).max(4),
    stickers: z.array(z.object({ id: z.string().max(50), text: z.string().max(24), color: z.string().regex(/^#[0-9a-f]{6}$/i), position: vector, normal: vector, size: z.number().min(.01).max(2), rotation: z.number().min(-180).max(180), visible: z.boolean() }).strict()).max(24),
    settings: z.object({ font: z.enum(["sans", "serif", "mono"]).optional(), ambientColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(), keyColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(), keyAngle: z.number().min(-180).max(180).optional(), keyHeight: z.number().min(.1).max(6).optional(), bloom: z.number().min(0).max(2).optional(), bloomThreshold: z.number().min(0).max(1).optional(), accent: z.string().regex(/^#[0-9a-f]{6}$/i), text: z.string().regex(/^#[0-9a-f]{6}$/i), background: z.string().regex(/^#[0-9a-f]{6}$/i), ambient: z.number().min(0).max(4), key: z.number().min(0).max(6), exposure: z.number().min(.2).max(2), fov: z.number().min(20).max(75), vignette: z.number().min(0).max(1), grayscale: z.number().min(0).max(1) }).strict(),
    loading: z.object({ title: z.string().max(100), subtitle: z.string().max(200) }).strict(),
}).strict().superRefine((tour, ctx) => {
    if (tour.model && tour.modelAsset) ctx.addIssue({ code: "custom", path: ["modelAsset"], message: "MODEL_CONFLICT" });
    for (const key of ["nodes", "sections", "stickers"] as const) {
        const ids = new Set<string>();
        for (const [index, item] of tour[key].entries()) {
            if (!item.id.trim() || ids.has(item.id))
                ctx.addIssue({ code: "custom", path: [key, index, "id"], message: "DUPLICATE_OR_EMPTY_ID" });
            ids.add(item.id);
        }
    }
});
export type VisualTour = z.infer<typeof visualTourSchema>;
export type TourCamera = z.infer<typeof tourCameraSchema>;
export const visualAppearanceSchema = z.object({
    avatar: z.enum(["reference", "clay", "studio", "vinyl", "faceted"]),
    palette: z.enum(["lime", "lavender", "coral"]),
    background: z.enum(["dark", "light"]),
    motion: z.boolean(),
    tour: visualTourSchema.optional(),
    stops: z.array(z.object({ angle: z.number().min(-180).max(180), zoom: z.number().min(.8).max(1.6) }).strict()).length(4),
}).strict();
const visualDocumentSchema = z.object({ format: z.literal("ans-visual-website"), version: z.literal(1), profile: resumeWebsiteInputSchema, appearance: visualAppearanceSchema }).strict();
export const visualWebsiteSchema = visualDocumentSchema.superRefine((document, ctx) => {
    const tour = document.appearance.tour;
    if (!tour)
        return;
    for (const key of ["byline", "title", "body"] as const)
        if (!tour.hero[key].trim())
            ctx.addIssue({ code: "custom", path: ["appearance", "tour", "hero", key], message: "REQUIRED" });
    if (!tour.nodes.length)
        ctx.addIssue({ code: "custom", path: ["appearance", "tour", "nodes"], message: "REQUIRED" });
    for (const [index, node] of tour.nodes.entries())
        for (const key of ["title", "body"] as const)
            if (!node[key].trim())
                ctx.addIssue({ code: "custom", path: ["appearance", "tour", "nodes", index, key], message: "REQUIRED" });
});
// Editable files may be incomplete; publishing and private versions still require all facts.
const draftWebUrl = z.string().max(500).refine(value => {
    const normalized = value.replace(/[\u0000-\u0020]/g, "");
    const scheme = normalized.match(/^([a-z][a-z\d+.-]*):/i)?.[1]?.toLowerCase();
    return !scheme || scheme === "http" || scheme === "https";
});
const visualDraftProfileSchema = resumeWebsiteInputSchema.extend({
    email: z.string().max(254),
    contactUrl: draftWebUrl,
    fullName: z.string().trim().max(80),
    headline: z.string().trim().max(120),
    about: z.string().trim().max(3000),
    projects: z.array(z.object({
        name: z.string().trim().max(100),
        role: z.string().trim().max(100),
        description: z.string().trim().max(2000),
        url: draftWebUrl,
    }).strict()).max(6),
});
const visualDraftTourSchema = visualTourSchema.safeExtend({
    nodes: z.array(visualTourSchema.shape.nodes.element.extend({ url: draftWebUrl })).max(10),
    sections: z.array(visualTourSchema.shape.sections.element.extend({ url: draftWebUrl })).max(4),
});
export const visualWebsiteDraftSchema = visualDocumentSchema.extend({ profile: visualDraftProfileSchema, appearance: visualAppearanceSchema.extend({ tour: visualDraftTourSchema.optional() }) });
export const visualWebsiteSaveSchema = z.object({ projectId: z.string().uuid(), expectedVersion: z.number().int().min(0), document: visualWebsiteSchema }).strict().refine(value => !value.document.appearance.tour?.model, { message: "CUSTOM_MODEL_LOCAL_ONLY" }).refine(value => new TextEncoder().encode(JSON.stringify(value)).byteLength <= 100000, { message: "REQUEST_TOO_LARGE" });
export type VisualAppearance = z.infer<typeof visualAppearanceSchema>;
export type VisualWebsite = z.infer<typeof visualWebsiteSchema>;
export type VisualWebsiteVersion = {
    version: number;
    createdAt: string;
    document: VisualWebsite;
};
export type VisualWebsiteState = {
    projectId: string;
    currentVersion: number;
    versions: VisualWebsiteVersion[];
};
export const DEFAULT_APPEARANCE: VisualAppearance = { avatar: "reference", palette: "lime", background: "dark", motion: true, stops: [{ angle: -12, zoom: 1 }, { angle: 28, zoom: 1.1 }, { angle: -35, zoom: .9 }, { angle: 12, zoom: 1.1 }] };
