import { z } from "zod";

export const LIST_DATE_PRESETS = ["all", "today", "last_7_days", "last_30_days", "this_month"];

export const querySearchSchema = z.string().trim().max(120).optional();

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
});

export const dateFilterQuerySchema = z.object({
  datePreset: z.enum(LIST_DATE_PRESETS).optional().default("all"),
  dateFrom: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "dateFrom must be in YYYY-MM-DD format")
    .optional(),
  dateTo: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "dateTo must be in YYYY-MM-DD format")
    .optional(),
});

export const booleanFromQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  return value;
}, z.boolean().optional());
