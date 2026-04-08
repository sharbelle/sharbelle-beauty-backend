import mongoose from "mongoose";
import { z } from "zod";

export const updateStoreSettingsInputSchema = z
  .object({
    playlistUrl: z.string().trim().url("Playlist URL must be a valid URL").max(2000),
  })
  .strict();

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
