import mongoose from "mongoose";

const assetSchema = new mongoose.Schema(
  {
    assetId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    publicId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    secureUrl: {
      type: String,
      required: true,
      trim: true,
    },
    bytes: {
      type: Number,
      required: true,
      min: 0,
    },
    format: {
      type: String,
      trim: true,
      default: "",
    },
    resourceType: {
      type: String,
      trim: true,
      default: "image",
      index: true,
    },
    folder: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
        ret.createdBy = ret.createdBy?.toString ? ret.createdBy.toString() : ret.createdBy;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export const AssetModel = mongoose.models.Asset || mongoose.model("Asset", assetSchema);
