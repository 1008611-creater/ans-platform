import sizes from "./four-view-sizes.json";
import { z } from "zod";
export const FOUR_VIEW_PRICE=5;
export const FOUR_VIEW_ORDER=["front","back","left","right"] as const;
export const FOUR_VIEW_SIZES=sizes;
export const fourViewInputSchema=z.object({idempotencyKey:z.string().regex(/^[A-Za-z0-9_-]{16,80}$/),aspectRatio:z.enum(["1:1","4:3","3:4","16:9","9:16","3:2","2:3"]),acknowledged:z.literal(true),acceptedPoints:z.literal(5)}).strict();
export type FourViewInput=z.infer<typeof fourViewInputSchema>;
export type FourViewStatus="UPLOADING"|"QUEUED"|"RUNNING"|"SUCCEEDED"|"FAILED"|"NEEDS_REVIEW"|"CANCELLED"|"ARCHIVED";
export interface FourViewJob {id:string;status:FourViewStatus;aspectRatio:FourViewInput["aspectRatio"];costPoints:number;refunded:boolean;errorCode:string|null;createdAt:string;}
