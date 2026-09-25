import { z } from "zod";

export const apiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.unknown().optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  requestId: string;
};

export type ApiFailure = {
  ok: false;
  error: ApiError;
  requestId: string;
};

