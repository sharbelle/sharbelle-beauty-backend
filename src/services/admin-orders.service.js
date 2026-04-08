import { isValidObjectId } from "mongoose";
import ApiError from "../helpers/ApiError.js";
import { OrderModel } from "../models/order.model.js";
import { UserModel } from "../models/user.model.js";
import { toOrderStatusLabel, toPaymentStatusLabel } from "../utils/formatters.js";
import { resolveDateRange } from "../utils/dateRange.js";
import { toPaginationMeta, toSkipValue } from "../utils/pagination.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const serializeOrder = (order) => {
  const plain = order.toJSON ? order.toJSON() : order;

  return {
    ...plain,
    user: plain.userId?.email
      ? {
          id: plain.userId.id || plain.userId._id?.toString?.() || plain.userId.toString?.(),
          fullName: plain.userId.fullName,
          email: plain.userId.email,
        }
      : null,
    orderStatusLabel: toOrderStatusLabel(plain.orderStatus),
    paymentStatusLabel: toPaymentStatusLabel(plain.paymentStatus),
  };
};

const ensureOrder = async (orderId) => {
  if (!isValidObjectId(orderId)) {
    throw new ApiError(404, "Order not found", "ORDER_NOT_FOUND");
  }

  const order = await OrderModel.findById(orderId);

  if (!order) {
    throw new ApiError(404, "Order not found", "ORDER_NOT_FOUND");
  }

  return order;
};

export const listAllOrders = async (filters = {}) => {
  const {
    search,
    orderStatus,
    paymentStatus,
    datePreset = "all",
    dateFrom,
    dateTo,
    page = 1,
    limit = 12,
  } = filters;

  const query = {};

  if (orderStatus) {
    query.orderStatus = orderStatus;
  }

  if (paymentStatus) {
    query.paymentStatus = paymentStatus;
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
    const pattern = new RegExp(escapeRegex(search.trim()), "i");
    const matchingUsers = await UserModel.find({
      $or: [{ fullName: pattern }, { email: pattern }],
    })
      .select("_id")
      .lean();

    const userIds = matchingUsers.map((user) => user._id);

    query.$or = [
      { orderNumber: pattern },
      { trackingCode: pattern },
      { couponCode: pattern },
      { "items.productName": pattern },
      { "shippingAddress.recipientName": pattern },
      { "shippingAddress.city": pattern },
      { "shippingAddress.state": pattern },
      ...(userIds.length > 0 ? [{ userId: { $in: userIds } }] : []),
    ];
  }

  const skip = toSkipValue(page, limit);

  const [totalItems, orders] = await Promise.all([
    OrderModel.countDocuments(query),
    OrderModel.find(query)
      .populate("userId", "fullName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
  ]);

  return {
    items: orders.map((order) => serializeOrder(order)),
    meta: toPaginationMeta({
      page,
      limit,
      totalItems,
    }),
  };
};

export const updateOrderStatusByAdmin = async (orderId, payload) => {
  const order = await ensureOrder(orderId);

  order.orderStatus = payload.orderStatus;
  order.statusHistory.push({
    status: payload.orderStatus,
    label: payload.label || toOrderStatusLabel(payload.orderStatus),
    description:
      payload.description || `Order status updated to ${toOrderStatusLabel(payload.orderStatus)} by admin.`,
    timestamp: new Date(),
  });

  await order.save();

  return serializeOrder(order);
};

export const updatePaymentStatusByAdmin = async (orderId, payload) => {
  const order = await ensureOrder(orderId);

  order.paymentStatus = payload.paymentStatus;

  if (payload.paymentStatus === "paid" && !order.paymentVerifiedAt) {
    order.paymentVerifiedAt = new Date();
  }

  if (payload.paymentStatus === "failed") {
    order.orderStatus = "cancelled";
    order.statusHistory.push({
      status: "cancelled",
      label: "Cancelled",
      description:
        payload.note || "Payment failed and order status was marked as cancelled by admin.",
      timestamp: new Date(),
    });
  }

  await order.save();

  return serializeOrder(order);
};
