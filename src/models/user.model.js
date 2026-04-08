import mongoose from "mongoose";
import { z } from "zod";
import { USER_ROLES } from "../config/constants.js";

export const userRoleSchema = z.enum(USER_ROLES);

const preferenceArraySchema = z
  .array(z.string().trim().min(2).max(60))
  .max(20, "Too many selected preferences")
  .transform((values) => [...new Set(values.map((value) => value.trim()).filter(Boolean))]);

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: "user",
      index: true,
    },
    phone: {
      type: String,
      default: null,
    },
    preferredCategories: {
      type: [String],
      default: [],
    },
    preferredSubcategories: {
      type: [String],
      default: [],
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
        delete ret.passwordHash;
        return ret;
      },
    },
  },
);

export const registerInputSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required"),
  email: z.string().trim().email("A valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().trim().min(7).optional(),
  preferredCategories: preferenceArraySchema.optional(),
  preferredSubcategories: preferenceArraySchema.optional(),
});

export const loginInputSchema = z.object({
  email: z.string().trim().email("A valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export const UserModel = mongoose.models.User || mongoose.model("User", userSchema);
