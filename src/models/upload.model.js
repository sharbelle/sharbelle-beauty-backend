import { z } from "zod";

export const uploadSignatureInputSchema = z.object({
  resourceType: z.enum(["image", "video", "raw", "auto"]).optional(),
  folder: z
    .string()
    .trim()
    .min(1, "Folder must not be empty")
    .max(120, "Folder is too long")
    .optional(),
});

export const completeUploadInputSchema = z.object({
  assetId: z.string().trim().optional(),
  publicId: z.string().trim().min(1, "Public ID is required"),
  secureUrl: z.string().trim().url("Asset URL must be valid"),
  bytes: z.number().int().nonnegative(),
  format: z.string().trim().optional(),
  resourceType: z.enum(["image", "video", "raw", "auto"]).optional(),
  folder: z.string().trim().max(120).optional(),
});
