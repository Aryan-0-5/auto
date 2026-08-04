import { z } from "zod";

export const pinSchema = z.object({
  pin: z.string().min(1),
});

export const createProfileSchema = z.object({
  name: z.string().trim().min(1).max(60),
});

export const selectProfileSchema = z.object({
  userId: z.string().min(1),
});

export type TiptapNodeInput = {
  type: string;
  content?: TiptapNodeInput[];
  marks?: { type: string }[];
};

const tiptapNodeSchema: z.ZodType<TiptapNodeInput> = z.object({
  type: z.string(),
  content: z.array(z.lazy(() => tiptapNodeSchema)).optional(),
  marks: z.array(z.object({ type: z.string() })).optional(),
});

const templateFieldSchema = z.object({
  html: z.string(),
  json: tiptapNodeSchema,
});

export const updateTemplateSchema = z.object({
  openingLine: templateFieldSchema,
  termsBlock: templateFieldSchema,
  closingSignature: templateFieldSchema,
});

export const sendDraftsSchema = z.object({
  draftIds: z.array(z.string()).min(1),
});

export const updateEnquirySchema = z.object({
  generalRemarks: z.string().nullable().optional(),
  lineItems: z
    .array(
      z.object({
        id: z.string(),
        itemName: z.string().min(1),
        qty: z.string().nullable().optional(),
        price: z.number().nullable().optional(),
        stockRemarks: z.string().nullable().optional(),
      })
    )
    .optional(),
});
