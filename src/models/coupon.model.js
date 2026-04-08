import mongoose from "mongoose";
import { z } from "zod";
import {
  booleanFromQuerySchema,
  dateFilterQuerySchema,
  paginationQuerySchema,
  querySearchSchema,
} from "./query.model.js";

export const couponTypeSchema = z.enum(["fixed", "percent"]);

export const createCouponInputSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, "Coupon code is required")
    .max(30, "Coupon code is too long")
    .transform((value) => value.toUpperCase()),
  type: couponTypeSchema,
  value: z.number().positive("Coupon value must be above zero"),
  active: z.boolean().optional(),
  minOrderTotal: z.number().nonnegative().optional(),
  usageLimit: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const updateCouponInputSchema = createCouponInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: "At least one field is required",
  },
);

export const couponIdParamSchema = z.object({
  couponId: z.string().trim().min(1, "Coupon ID is required"),
});

export const couponListQuerySchema = z.object({
  search: querySearchSchema,
  type: couponTypeSchema.optional(),
  active: booleanFromQuerySchema,
  datePreset: dateFilterQuerySchema.shape.datePreset,
  dateFrom: dateFilterQuerySchema.shape.dateFrom,
  dateTo: dateFilterQuerySchema.shape.dateTo,
  page: paginationQuerySchema.shape.page,
  limit: paginationQuerySchema.shape.limit,
});

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["fixed", "percent"],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    minOrderTotal: {
      type: Number,
      min: 0,
      default: 0,
    },
    usageLimit: {
      type: Number,
      min: 1,
      default: null,
    },
    usedCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export const CouponModel = mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);
