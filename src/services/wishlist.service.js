import crypto from "crypto";
import { isValidObjectId } from "mongoose";
import env from "../config/env.js";
import ApiError from "../helpers/ApiError.js";
import { ProductModel } from "../models/product.model.js";
import { WishlistModel } from "../models/wishlist.model.js";
import { toPaginationMeta, toSkipValue } from "../utils/pagination.js";
import { getProductsByIds } from "./product.service.js";

const buildTitleFromName = (fullName) => {
  const firstName = (fullName || "My").split(" ")[0]?.trim() || "My";
  return `${firstName}'s Wishlist`;
};

const createShareToken = () => crypto.randomBytes(12).toString("hex");
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createUniqueShareToken = async () => {
  while (true) {
    const shareToken = createShareToken();
    const exists = await WishlistModel.exists({ shareToken });

    if (!exists) {
      return shareToken;
    }
  }
};

const toShareUrl = (shareToken) => `${env.frontendOrigin}/wishlist/${shareToken}`;

const filterWishlistItems = (items, filters = {}) => {
  const { search, categoryId, tagId, inStock } = filters;

  const pattern = search?.trim() ? new RegExp(escapeRegex(search.trim()), "i") : null;

  return items.filter((item) => {
    if (categoryId && item.product.categoryId !== categoryId) {
      return false;
    }

    if (tagId && item.product.tagId !== tagId) {
      return false;
    }

    if (typeof inStock === "boolean" && item.product.inStock !== inStock) {
      return false;
    }

    if (!pattern) {
      return true;
    }

    return (
      pattern.test(item.product.name) ||
      pattern.test(item.product.slug) ||
      pattern.test(item.product.description) ||
      pattern.test(item.product.category || "") ||
      pattern.test(item.product.tag || "")
    );
  });
};

const hydrateWishlist = async (wishlist, ownerName = null, filters = {}) => {
  const productIds = wishlist.items.map((item) => item.productId.toString());
  const products = await getProductsByIds(productIds);
  const productsById = new Map(products.map((product) => [product.id, product]));

  const items = wishlist.items
    .slice()
    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
    .map((item) => {
      const product = productsById.get(item.productId.toString());
      if (!product) {
        return null;
      }

      return {
        productId: product.id,
        addedAt: item.addedAt,
        product,
      };
    })
    .filter(Boolean);

  const filteredItems = filterWishlistItems(items, filters);
  const hasPagination =
    typeof filters.page === "number" && Number.isFinite(filters.page) &&
    typeof filters.limit === "number" && Number.isFinite(filters.limit);

  const skip = hasPagination ? toSkipValue(filters.page, filters.limit) : 0;
  const paginatedItems = hasPagination
    ? filteredItems.slice(skip, skip + filters.limit)
    : filteredItems;

  const response = {
    id: wishlist.id,
    title: wishlist.title,
    isPublic: wishlist.isPublic,
    shareToken: wishlist.shareToken,
    shareUrl: toShareUrl(wishlist.shareToken),
    items: paginatedItems,
    itemsCount: filteredItems.length,
    ownerName,
    createdAt: wishlist.createdAt,
    updatedAt: wishlist.updatedAt,
  };

  if (hasPagination) {
    response.meta = toPaginationMeta({
      page: filters.page,
      limit: filters.limit,
      totalItems: filteredItems.length,
    });
  }

  return response;
};

const ensureWishlistForUser = async (user) => {
  let wishlist = await WishlistModel.findOne({ userId: user.id });

  if (!wishlist) {
    wishlist = await WishlistModel.create({
      userId: user.id,
      title: buildTitleFromName(user.fullName),
      shareToken: await createUniqueShareToken(),
      isPublic: true,
      items: [],
    });
  }

  if (!wishlist.shareToken) {
    wishlist.shareToken = await createUniqueShareToken();
    await wishlist.save();
  }

  return wishlist;
};

export const getWishlistForUser = async (user, filters = {}) => {
  const wishlist = await ensureWishlistForUser(user);
  return hydrateWishlist(wishlist, user.fullName || user.email || null, filters);
};

export const addWishlistItemForUser = async (user, productId) => {
  if (!isValidObjectId(productId)) {
    throw new ApiError(400, "Invalid product", "INVALID_PRODUCT");
  }

  const productExists = await ProductModel.exists({ _id: productId });

  if (!productExists) {
    throw new ApiError(404, "Product not found", "PRODUCT_NOT_FOUND");
  }

  const wishlist = await ensureWishlistForUser(user);

  const alreadyAdded = wishlist.items.some((item) => item.productId.toString() === productId);

  if (!alreadyAdded) {
    wishlist.items.push({ productId, addedAt: new Date() });
    await wishlist.save();
  }

  return hydrateWishlist(wishlist, user.fullName || user.email || null);
};

export const removeWishlistItemForUser = async (user, productId) => {
  if (!isValidObjectId(productId)) {
    throw new ApiError(400, "Invalid product", "INVALID_PRODUCT");
  }

  const wishlist = await ensureWishlistForUser(user);
  const nextItems = wishlist.items.filter((item) => item.productId.toString() !== productId);

  if (nextItems.length !== wishlist.items.length) {
    wishlist.items = nextItems;
    await wishlist.save();
  }

  return hydrateWishlist(wishlist, user.fullName || user.email || null);
};

export const updateWishlistSharingForUser = async (user, isPublic) => {
  const wishlist = await ensureWishlistForUser(user);
  wishlist.isPublic = isPublic;
  await wishlist.save();

  return hydrateWishlist(wishlist, user.fullName || user.email || null);
};

export const getPublicWishlistByShareToken = async (shareToken, filters = {}) => {
  const wishlist = await WishlistModel.findOne({ shareToken, isPublic: true }).populate({
    path: "userId",
    select: "fullName",
  });

  if (!wishlist) {
    throw new ApiError(404, "Wishlist not found", "WISHLIST_NOT_FOUND");
  }

  const ownerName = wishlist.userId?.fullName || null;
  return hydrateWishlist(wishlist, ownerName, filters);
};
