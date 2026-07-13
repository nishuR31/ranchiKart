import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const opts = { $refStrategy: "none" } as const;

const _reviewProductSlugZod = z.object({
  slug: z.string(),
});

const _getReviewsQueryZod = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(20).default(10),
});

const _createReviewZod = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().min(10).max(2000),
});

const _reviewIdParamZod = z.object({
  id: z.string(),
});

export const reviewProductSlugSchema = zodToJsonSchema(_reviewProductSlugZod, opts);
export const getReviewsQuerySchema   = zodToJsonSchema(_getReviewsQueryZod,   opts);
export const createReviewSchema      = zodToJsonSchema(_createReviewZod,      opts);
export const reviewIdParamSchema     = zodToJsonSchema(_reviewIdParamZod,     opts);
