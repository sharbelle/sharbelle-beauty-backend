import asyncHandler from "../helpers/asyncHandler.js";
import sendResponse from "../helpers/sendResponse.js";
import { createUploadSignature, registerUploadedAsset } from "../services/upload.service.js";

export const getUploadSignature = asyncHandler(async (req, res) => {
  const uploadSignature = createUploadSignature(req.body);

  return sendResponse(res, {
    message: "Upload signature generated",
    data: {
      uploadSignature,
    },
  });
});

export const completeUpload = asyncHandler(async (req, res) => {
  const asset = await registerUploadedAsset({
    payload: req.body,
    userId: req.user.id,
  });

  return sendResponse(res, {
    statusCode: 201,
    message: "Upload asset registered",
    data: {
      asset,
    },
  });
});
