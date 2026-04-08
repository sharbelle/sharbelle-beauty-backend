import { v2 as cloudinary } from "cloudinary";
import env from "../config/env.js";
import ApiError from "../helpers/ApiError.js";
import { AssetModel } from "../models/asset.model.js";

const ensureCloudinaryConfig = () => {
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    throw new ApiError(
      500,
      "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
      "CLOUDINARY_NOT_CONFIGURED",
    );
  }
};

export const createUploadSignature = (payload = {}) => {
  ensureCloudinaryConfig();

  const resourceType = payload.resourceType || "image";
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = payload.folder || env.cloudinaryUploadFolder;

  const paramsToSign = {
    timestamp,
    folder,
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, env.cloudinaryApiSecret);

  return {
    cloudName: env.cloudinaryCloudName,
    apiKey: env.cloudinaryApiKey,
    timestamp,
    folder,
    signature,
    resourceType,
  };
};

export const registerUploadedAsset = async ({ payload, userId }) => {
  const document = await AssetModel.findOneAndUpdate(
    { publicId: payload.publicId },
    {
      $set: {
        assetId: payload.assetId || "",
        publicId: payload.publicId,
        secureUrl: payload.secureUrl,
        bytes: payload.bytes,
        format: payload.format || "",
        resourceType: payload.resourceType || "image",
        folder: payload.folder || "",
        createdBy: userId,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  return document;
};

export const assertAssetExists = async ({ publicId, secureUrl }) => {
  const asset = await AssetModel.findOne({ publicId }).lean();

  if (!asset) {
    throw new ApiError(
      400,
      "Image asset was not registered. Upload through the file controller before creating products.",
      "ASSET_NOT_REGISTERED",
    );
  }

  if (asset.secureUrl !== secureUrl) {
    throw new ApiError(400, "Image asset mismatch detected", "ASSET_URL_MISMATCH");
  }

  return asset;
};
