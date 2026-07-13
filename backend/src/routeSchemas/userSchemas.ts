import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const opts = { $refStrategy: "none" } as const;

const _updateProfileZod = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().min(8).max(15).optional(),
  avatarUrl: z.string().url().optional(),
});

const _addAddressZod = z.object({
  label: z.string().max(30).default("Home"),
  fullName: z.string().min(2),
  phone: z.string().min(8),
  line1: z.string().min(4),
  line2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().min(4),
  isDefault: z.boolean().default(false),
});

const _idParamZod = z.object({ id: z.string() });

const _updatePasswordZod = z.object({
  oldPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

export const updateProfileSchema  = zodToJsonSchema(_updateProfileZod,  opts);
export const addAddressSchema     = zodToJsonSchema(_addAddressZod,     opts);
export const IdParamSchema        = zodToJsonSchema(_idParamZod,        opts);
export const updatePasswordSchema = zodToJsonSchema(_updatePasswordZod, opts);