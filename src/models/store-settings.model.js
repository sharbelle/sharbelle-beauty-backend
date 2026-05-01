import mongoose from "mongoose";
import { z } from "zod";
import {
  DEFAULT_DELIVERY_FEE,
  DELIVERY_PRICING_ORIGIN,
  getDeliveryPricingConfig,
  normalizeAreaLga,
} from "../config/delivery-zones.js";

const deliveryAreaPricingInputSchema = z
  .object({
    areaLga: z
      .string()
      .trim()
      .min(1, "Delivery area is required")
      .max(120, "Delivery area is too long"),
    fee: z.number().int().nonnegative("Delivery fee must be 0 or greater"),
  })
  .strict();

const deliveryPricingInputSchema = z
  .object({
    origin: z
      .string()
      .trim()
      .min(1, "Delivery origin is required")
      .max(120, "Delivery origin is too long"),
    defaultFee: z.number().int().nonnegative("Default delivery fee must be 0 or greater"),
    areas: z
      .array(deliveryAreaPricingInputSchema)
      .min(1, "Add at least one delivery area"),
  })
  .strict()
  .superRefine((value, ctx) => {
    const seen = new Set();

    value.areas.forEach((area, index) => {
      const normalized = normalizeAreaLga(area.areaLga);

      if (!normalized) {
        return;
      }

      if (seen.has(normalized)) {
        ctx.addIssue({
          code: "custom",
          message: "Delivery areas must be unique",
          path: ["areas", index, "areaLga"],
        });
        return;
      }

      seen.add(normalized);
    });
  });

export const updateStoreSettingsInputSchema = z
  .object({
    playlistUrl: z.string().trim().url("Playlist URL must be a valid URL").max(2000).optional(),
    deliveryPricing: deliveryPricingInputSchema.optional(),
  })
  .strict()
  .refine(
    (value) => value.playlistUrl !== undefined || value.deliveryPricing !== undefined,
    "Provide at least one settings field to update",
  );

const deliveryAreaPricingSchema = new mongoose.Schema(
  {
    areaLga: {
      type: String,
      required: true,
      trim: true,
    },
    fee: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

const deliveryPricingSchema = new mongoose.Schema(
  {
    origin: {
      type: String,
      required: true,
      trim: true,
      default: DELIVERY_PRICING_ORIGIN,
    },
    defaultFee: {
      type: Number,
      required: true,
      min: 0,
      default: DEFAULT_DELIVERY_FEE,
    },
    areas: {
      type: [deliveryAreaPricingSchema],
      required: true,
      default: () => getDeliveryPricingConfig().areas,
      validate: {
        validator: (areas) => Array.isArray(areas) && areas.length > 0,
        message: "At least one delivery area must be configured",
      },
    },
  },
  {
    _id: false,
  },
);

const storeSettingsSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: "store_settings",
    },
    playlistUrl: {
      type: String,
      required: true,
      trim: true,
      default: "https://open.spotify.com",
    },
    deliveryPricing: {
      type: deliveryPricingSchema,
      required: true,
      default: () => getDeliveryPricingConfig(),
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

export const StoreSettingsModel =
  mongoose.models.StoreSettings || mongoose.model("StoreSettings", storeSettingsSchema);
