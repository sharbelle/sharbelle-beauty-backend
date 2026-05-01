import mongoose from "mongoose";
import { z } from "zod";
import { paginationQuerySchema, querySearchSchema } from "./query.model.js";

export const waitlistSubscribeInputSchema = z.object({
  email: z.string().trim().email("A valid email is required"),
  fullName: z.string().trim().min(2).max(120).optional(),
  source: z.string().trim().min(2).max(80).optional(),
});

export const waitlistListQuerySchema = z.object({
  search: querySearchSchema,
  page: paginationQuerySchema.shape.page,
  limit: paginationQuerySchema.shape.limit,
});

export const waitlistExportQuerySchema = z.object({
  search: querySearchSchema,
});

const waitlistSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    fullName: {
      type: String,
      default: "",
      trim: true,
    },
    source: {
      type: String,
      default: "website",
      trim: true,
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

export const WaitlistEntryModel =
  mongoose.models.WaitlistEntry || mongoose.model("WaitlistEntry", waitlistSchema);
