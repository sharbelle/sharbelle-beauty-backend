import mongoose from "mongoose";
import { z } from "zod";
import { booleanFromQuerySchema, querySearchSchema } from "./query.model.js";

const objectIdStringSchema = z.string().trim().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID");

export const addWishlistItemInputSchema = z.object({
  productId: z.string().trim().min(1, "Product ID is required"),
});

export const wishlistItemParamSchema = z.object({
  productId: z.string().trim().min(1, "Product ID is required"),
});

export const wishlistShareParamSchema = z.object({
  shareToken: z.string().trim().min(8, "Share token is required").max(64),
});

export const updateWishlistSharingInputSchema = z.object({
  isPublic: z.boolean(),
});

export const wishlistListQuerySchema = z.object({
  search: querySearchSchema,
  categoryId: objectIdStringSchema.optional(),
  tagId: objectIdStringSchema.optional(),
  inStock: booleanFromQuerySchema,
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const wishlistItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: "My Wishlist",
    },
    isPublic: {
      type: Boolean,
      default: true,
      index: true,
    },
    shareToken: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    items: {
      type: [wishlistItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.userId = ret.userId?.toString ? ret.userId.toString() : ret.userId;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export const WishlistModel =
  mongoose.models.Wishlist || mongoose.model("Wishlist", wishlistSchema);
