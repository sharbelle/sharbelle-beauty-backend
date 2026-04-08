import asyncHandler from "../helpers/asyncHandler.js";
import sendResponse from "../helpers/sendResponse.js";
import {
  createCoupon,
  deleteCoupon,
  listCoupons,
  updateCoupon,
} from "../services/coupon.service.js";

export const getAdminCoupons = asyncHandler(async (req, res) => {
  const { items, meta } = await listCoupons(req.query);

  return sendResponse(res, {
    message: "Coupons fetched",
    data: {
      coupons: items,
    },
    meta,
  });
});

export const createAdminCoupon = asyncHandler(async (req, res) => {
  const coupon = await createCoupon(req.body);

  return sendResponse(res, {
    statusCode: 201,
    message: "Coupon created",
    data: {
      coupon,
    },
  });
});

export const updateAdminCoupon = asyncHandler(async (req, res) => {
  const coupon = await updateCoupon(req.params.couponId, req.body);

  return sendResponse(res, {
    message: "Coupon updated",
    data: {
      coupon,
    },
  });
});

export const deleteAdminCoupon = asyncHandler(async (req, res) => {
  const coupon = await deleteCoupon(req.params.couponId);

  return sendResponse(res, {
    message: "Coupon deleted",
    data: {
      coupon,
    },
  });
});
