import mongoose from "mongoose";
import { z } from "zod";

const normalizedStringSchema = z.string().trim().min(2).max(80);
const subcategorySchema = z
  .array(z.string().trim().min(2).max(80))
  .max(40, "Too many subcategories")
  .transform((values) => [...new Set(values.map((value) => value.trim()).filter(Boolean))]);

export const categoryIdParamSchema = z.object({
  categoryId: z.string().trim().min(1, "Category ID is required"),
});

export const createCategoryInputSchema = z.object({
  name: normalizedStringSchema,
  description: z.string().trim().max(240).optional(),
  subcategories: subcategorySchema.optional(),
});

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    subcategories: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
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

export const CategoryModel = mongoose.models.Category || mongoose.model("Category", categorySchema);
