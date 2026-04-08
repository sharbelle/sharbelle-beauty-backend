import { isValidObjectId } from "mongoose";
import ApiError from "../helpers/ApiError.js";
import { CouponModel } from "../models/coupon.model.js";
import { resolveDateRange } from "../utils/dateRange.js";
import { toPaginationMeta, toSkipValue } from "../utils/pagination.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const listCoupons = async (filters = {}) => {
  const {
    search,
    type,
    active,
    datePreset = "all",
    dateFrom,
    dateTo,
    page = 1,
    limit = 12,
  } = filters;

  const query = {};

  if (type) {
    query.type = type;
  }

  if (typeof active === "boolean") {
    query.active = active;
  }

  const dateRange = resolveDateRange({
    datePreset,
    dateFrom,
    dateTo,
  });

  if (dateRange) {
    query.createdAt = {
      $gte: dateRange.start,
      $lte: dateRange.end,
    };
  }

  if (search?.trim()) {
    query.code = new RegExp(escapeRegex(search.trim()), "i");
  }

  const skip = toSkipValue(page, limit);

  const [totalItems, coupons] = await Promise.all([
    CouponModel.countDocuments(query),
    CouponModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
  ]);

  return {
    items: coupons,
    meta: toPaginationMeta({
      page,
      limit,
      totalItems,
    }),
  };
};

export const createCoupon = async (payload) => {
  try {
    return await CouponModel.create({
      ...payload,
      code: payload.code.toUpperCase(),
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
      minOrderTotal: payload.minOrderTotal ?? 0,
      active: payload.active ?? true,
      usageLimit: payload.usageLimit ?? null,
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, "A coupon with this code already exists", "DUPLICATE_COUPON_CODE");
    }

    throw error;
  }
};

export const updateCoupon = async (couponId, payload) => {
  if (!isValidObjectId(couponId)) {
    throw new ApiError(404, "Coupon not found", "COUPON_NOT_FOUND");
  }

  const coupon = await CouponModel.findById(couponId);

  if (!coupon) {
    throw new ApiError(404, "Coupon not found", "COUPON_NOT_FOUND");
  }

  if (payload.code) {
    coupon.code = payload.code.toUpperCase();
  }

  if (payload.type) {
    coupon.type = payload.type;
  }

  if (typeof payload.value === "number") {
    coupon.value = payload.value;
  }

  if (typeof payload.active === "boolean") {
    coupon.active = payload.active;
  }

  if (typeof payload.minOrderTotal === "number") {
    coupon.minOrderTotal = payload.minOrderTotal;
  }

  if (typeof payload.usageLimit === "number") {
    coupon.usageLimit = payload.usageLimit;
  }

  if (payload.expiresAt !== undefined) {
    coupon.expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;
  }

  try {
    await coupon.save();
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, "A coupon with this code already exists", "DUPLICATE_COUPON_CODE");
    }

    throw error;
  }

  return coupon;
};

export const deleteCoupon = async (couponId) => {
  if (!isValidObjectId(couponId)) {
    throw new ApiError(404, "Coupon not found", "COUPON_NOT_FOUND");
  }

  const deleted = await CouponModel.findByIdAndDelete(couponId);

  if (!deleted) {
    throw new ApiError(404, "Coupon not found", "COUPON_NOT_FOUND");
  }

  return deleted;
};
