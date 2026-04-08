import asyncHandler from "../helpers/asyncHandler.js";
import sendResponse from "../helpers/sendResponse.js";
import { getOrderForUser, getOrderTrackingForUser, listOrdersForUser } from "../services/orders.service.js";

export const getOrders = asyncHandler(async (req, res) => {
  const { items, meta } = await listOrdersForUser(req.user.id, req.query);

  return sendResponse(res, {
    message: "Orders fetched",
    data: {
      orders: items,
    },
    meta,
  });
});

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await getOrderForUser(req.user.id, req.params.orderId);

  return sendResponse(res, {
    message: "Order details fetched",
    data: {
      order,
    },
  });
});

export const trackOrder = asyncHandler(async (req, res) => {
  const tracking = await getOrderTrackingForUser(req.user.id, req.params.orderId);

  return sendResponse(res, {
    message: "Order tracking fetched",
    data: {
      tracking,
    },
  });
});
