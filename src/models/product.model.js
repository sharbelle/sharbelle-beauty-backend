import mongoose from "mongoose";
import { z } from "zod";
import {
  booleanFromQuerySchema,
  paginationQuerySchema,
  querySearchSchema,
} from "./query.model.js";

const objectIdStringSchema = z.string().trim().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID");

export const createProductInputSchema = z
  .object({
    name: z.string().trim().min(2, "Product name is required").max(120),
    categoryId: objectIdStringSchema,
    priceInNaira: z.number().nonnegative("Price must be zero or above"),
    description: z.string().trim().min(10, "Description is required").max(2000),
    image: z.string().trim().url("Image must be a valid URL"),
    imagePublicId: z.string().trim().min(1, "Image asset ID is required"),
    tagId: objectIdStringSchema.nullish(),
    inStock: z.boolean().optional(),
    inventoryCount: z.number().int().nonnegative().optional(),
  })
  .strict();

export const updateProductInputSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    categoryId: objectIdStringSchema.optional(),
    priceInNaira: z.number().nonnegative().optional(),
    description: z.string().trim().min(10).max(2000).optional(),
    image: z.string().trim().url().optional(),
    imagePublicId: z.string().trim().min(1).optional(),
    tagId: objectIdStringSchema.nullish(),
    inStock: z.boolean().optional(),
    inventoryCount: z.number().int().nonnegative().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const productIdParamSchema = z.object({
  productId: z.string().trim().min(1, "Product ID is required"),
});

export const productListQuerySchema = z.object({
  categoryId: objectIdStringSchema.optional(),
  categoryIds: z
    .string()
    .trim()
    .optional()
    .transform((value) => {
      if (!value) {
        return [];
      }

      return value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    })
    .refine(
      (categoryIds) => categoryIds.every((categoryId) => /^[0-9a-fA-F]{24}$/.test(categoryId)),
      "Invalid category ID in list",
    ),
  tagIds: z
    .string()
    .trim()
    .optional()
    .transform((value) => {
      if (!value) {
        return [];
      }

      return value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    })
    .refine(
      (tagIds) => tagIds.every((tagId) => /^[0-9a-fA-F]{24}$/.test(tagId)),
      "Invalid tag ID in list",
    ),
  search: querySearchSchema,
  inStock: booleanFromQuerySchema,
  page: paginationQuerySchema.shape.page,
  limit: paginationQuerySchema.shape.limit,
});

export const adminProductListQuerySchema = z.object({
  search: querySearchSchema,
  categoryId: objectIdStringSchema.optional(),
  tagId: objectIdStringSchema.optional(),
  inStock: booleanFromQuerySchema,
  page: paginationQuerySchema.shape.page,
  limit: paginationQuerySchema.shape.limit,
});

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    categoryName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    categorySlug: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    tagId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tag",
      default: null,
      index: true,
    },
    tagName: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    tagSlug: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    priceInNaira: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    imagePublicId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    inStock: {
      type: Boolean,
      default: true,
      index: true,
    },
    inventoryCount: {
      type: Number,
      min: 0,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.categoryId = ret.categoryId?.toString ? ret.categoryId.toString() : ret.categoryId;
        ret.tagId = ret.tagId?.toString ? ret.tagId.toString() : ret.tagId;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

productSchema.pre("save", function syncStock() {
  if (typeof this.inventoryCount === "number" && this.inventoryCount <= 0) {
    this.inStock = false;
  } else if (this.isModified("inventoryCount") && !this.isModified("inStock")) {
    this.inStock = true;
  }
});

export const ProductModel = mongoose.models.Product || mongoose.model("Product", productSchema);
