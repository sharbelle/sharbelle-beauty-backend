import asyncHandler from "../helpers/asyncHandler.js";
import sendResponse from "../helpers/sendResponse.js";
import {
  listAllOrders,
  updateOrderStatusByAdmin,
  updatePaymentStatusByAdmin,
} from "../services/admin-orders.service.js";

export const getAdminOrders = asyncHandler(async (req, res) => {
  const { items, meta } = await listAllOrders(req.query);

  return sendResponse(res, {
    message: "Admin orders fetched",
    data: {
      orders: items,
    },
    meta,
  });
});

export const updateAdminOrderStatus = asyncHandler(async (req, res) => {
  const order = await updateOrderStatusByAdmin(req.params.orderId, req.body);

  return sendResponse(res, {
    message: "Order status updated",
    data: {
      order,
    },
  });
});

export const updateAdminOrderPaymentStatus = asyncHandler(async (req, res) => {
  const order = await updatePaymentStatusByAdmin(req.params.orderId, req.body);

  return sendResponse(res, {
    message: "Payment status updated",
    data: {
      order,
    },
  });
});
