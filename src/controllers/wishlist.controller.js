import asyncHandler from "../helpers/asyncHandler.js";
import sendResponse from "../helpers/sendResponse.js";
import {
  addWishlistItemForUser,
  getPublicWishlistByShareToken,
  getWishlistForUser,
  removeWishlistItemForUser,
  updateWishlistSharingForUser,
} from "../services/wishlist.service.js";

export const getMyWishlist = asyncHandler(async (req, res) => {
  const wishlist = await getWishlistForUser(req.user, req.query);

  return sendResponse(res, {
    message: "Wishlist fetched",
    data: {
      wishlist,
    },
  });
});

export const addWishlistItem = asyncHandler(async (req, res) => {
  const wishlist = await addWishlistItemForUser(req.user, req.body.productId);

  return sendResponse(res, {
    statusCode: 201,
    message: "Product added to wishlist",
    data: {
      wishlist,
    },
  });
});

export const removeWishlistItem = asyncHandler(async (req, res) => {
  const wishlist = await removeWishlistItemForUser(req.user, req.params.productId);

  return sendResponse(res, {
    message: "Product removed from wishlist",
    data: {
      wishlist,
    },
  });
});

export const updateWishlistSharing = asyncHandler(async (req, res) => {
  const wishlist = await updateWishlistSharingForUser(req.user, req.body.isPublic);

  return sendResponse(res, {
    message: "Wishlist sharing updated",
    data: {
      wishlist,
    },
  });
});

export const getSharedWishlist = asyncHandler(async (req, res) => {
  const wishlist = await getPublicWishlistByShareToken(req.params.shareToken, req.query);

  return sendResponse(res, {
    message: "Shared wishlist fetched",
    data: {
      wishlist,
    },
  });
});
