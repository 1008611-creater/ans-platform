import { z } from "zod";
import type { MarketOfferView } from "./marketplace-view";
const id = z.string().trim().min(1).max(100);
export const AGRI_WALL_CATEGORY = "competition";
export const AGRI_WALL_SUBCATEGORY = "agri-wall";
export const agriWallBindSchema = z.object({ action: z.literal("bind"), teamCompetitionId: id, listingId: id, expectedVersion: z.number().int().positive() }).strict();
export const agriPopularityConfigureSchema = z.object({ action: z.literal("configurePopularity"), expectedRevision: z.number().int().nonnegative(), opensAt: z.string().datetime({ offset: true }), closesAt: z.string().datetime({ offset: true }) }).strict().refine(value => Date.parse(value.opensAt) < Date.parse(value.closesAt), { message: "INVALID_WINDOW_ORDER" });
export const agriWallCommandSchema = z.discriminatedUnion("action", [agriWallBindSchema, agriPopularityConfigureSchema]);
export interface AgriWallResult { entryId: string; listingId: string; title: string; teamName: string; votes: number; rank: number; winner: boolean }
export interface AgriPopularityView { revision: number; opensAt: string; closesAt: string; state: "NOT_OPEN" | "OPEN" | "CLOSED"; frozenAt: string | null; results: AgriWallResult[] }
export interface AgriWallCard { id: string; teamName: string; projectId: string; offer: MarketOfferView; validStars: number; eligible: boolean; viewerEligible: boolean | null; viewerVoted: boolean }
export interface AgriWallView { configured: boolean; competitionId: string | null; round: AgriPopularityView | null; entries: AgriWallCard[] }
export interface AgriWallMine { entries: Array<{ id: string; teamName: string; wall: { id: string; listingId: string; projectId: string; artifactVersionId: string; title: string; published: boolean } | null }>; listings: MarketOfferView[]; canConfigure: boolean; round: AgriPopularityView | null }
export interface AgriWallBinding { id: string; listingId: string; projectId: string; artifactVersionId: string; published: boolean; synchronized: boolean; isOwner: boolean; href: string }
