import mongoose from "mongoose";
import { z } from "zod";

const normalizedStringSchema = z.string().trim().min(2).max(60);

export const tagIdParamSchema = z.object({
  tagId: z.string().trim().min(1, "Tag ID is required"),
});

export const createTagInputSchema = z.object({
  name: normalizedStringSchema,
  description: z.string().trim().max(200).optional(),
});

const tagSchema = new mongoose.Schema(
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

export const TagModel = mongoose.models.Tag || mongoose.model("Tag", tagSchema);
