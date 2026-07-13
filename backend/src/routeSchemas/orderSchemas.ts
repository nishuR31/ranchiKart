import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { OrderStatus, PaymentMethod } from "../../prisma/generated/client/index.js";

const opts = { $refStrategy: "none" } as const;

const _checkoutZod = z.object({
  paymentMethod: z.nativeEnum(PaymentMethod),
  address: z.object({
    fullName: z.string().min(2),
    phone: z.string().min(8),
    line1: z.string().min(4),
    line2: z.string().optional(),
    city: z.string().min(2),
    state: z.string().min(2),
    pincode: z.string().min(4),
  }),
  couponCode: z.string().optional(),
  notes: z.string().max(500).optional(),
  items: z.array(
    z.object({
      productId: z.string(),
      variantId: z.string().optional(),
      quantity: z.number().int().min(1).max(50),
      customWidthMm: z.number().int().positive().optional(),
      customHeightMm: z.number().int().positive().optional(),
      customText: z.string().max(300).optional(),
      customization: z.record(z.unknown()).default({}),
    })
  ).min(1),
});

const _getOrdersQueryZod = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(20).default(10),
});

const _getOrderParamsZod = z.object({
  id: z.string(),
});

export const checkoutSchema         = zodToJsonSchema(_checkoutZod,         opts);
export const getOrdersQuerySchema   = zodToJsonSchema(_getOrdersQueryZod,   opts);
export const getOrderParamsSchema   = zodToJsonSchema(_getOrderParamsZod,   opts);
