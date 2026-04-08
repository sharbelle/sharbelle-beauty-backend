import asyncHandler from "../helpers/asyncHandler.js";
import sendResponse from "../helpers/sendResponse.js";
import { getStoreSettings, updateStoreSettings } from "../services/store-settings.service.js";

export const getPublicStoreSettings = asyncHandler(async (_req, res) => {
  const settings = await getStoreSettings();

  return sendResponse(res, {
    message: "Store settings fetched",
    data: {
      settings,
    },
  });
});

export const getAdminStoreSettings = asyncHandler(async (_req, res) => {
  const settings = await getStoreSettings();

  return sendResponse(res, {
    message: "Admin store settings fetched",
    data: {
      settings,
    },
  });
});

export const updateAdminStoreSettings = asyncHandler(async (req, res) => {
  const settings = await updateStoreSettings(req.body);

  return sendResponse(res, {
    message: "Store settings updated",
    data: {
      settings,
    },
  });
});
