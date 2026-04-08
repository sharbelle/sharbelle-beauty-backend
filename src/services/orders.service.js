import ApiError from "../helpers/ApiError.js";
import { isValidObjectId } from "mongoose";
import { OrderModel } from "../models/order.model.js";
import { buildStatusSteps } from "../utils/statusProgress.js";
import { toOrderStatusLabel, toPaymentStatusLabel } from "../utils/formatters.js";
import { resolveDateRange } from "../utils/dateRange.js";
import { toPaginationMeta, toSkipValue } from "../utils/pagination.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const assertUserOwnsOrder = async (userId, orderId) => {
  if (!isValidObjectId(orderId)) {
    throw new ApiError(404, "Order not found", "ORDER_NOT_FOUND");
  }

  const order = await OrderModel.findById(orderId).lean();

  if (!order || order.userId.toString() !== userId) {
    throw new ApiError(404, "Order not found", "ORDER_NOT_FOUND");
  }

  return order;
};

const serializeOrder = (order) => {
  const serialized = {
    ...order,
    id: order._id.toString(),
    userId: order.userId.toString(),
  };

  delete serialized._id;
  delete serialized.__v;

  return serialized;
};

const withLabels = (order) => ({
  ...serializeOrder(order),
  orderStatusLabel: toOrderStatusLabel(order.orderStatus),
  paymentStatusLabel: toPaymentStatusLabel(order.paymentStatus),
});

const toSummaryOrder = (order) => ({
  id: order._id.toString(),
  orderNumber: order.orderNumber,
  createdAt: order.createdAt,
  orderStatus: order.orderStatus,
  orderStatusLabel: toOrderStatusLabel(order.orderStatus),
  paymentStatus: order.paymentStatus,
  paymentStatusLabel: toPaymentStatusLabel(order.paymentStatus),
  total: order.total,
  currency: order.currency,
  itemsCount: order.items.reduce((count, item) => count + item.quantity, 0),
  estimatedDeliveryDate: order.estimatedDeliveryDate,
});

export const listOrdersForUser = async (userId, filters = {}) => {
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

  const query = { userId };

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
    query.$or = [
      { orderNumber: pattern },
      { trackingCode: pattern },
      { couponCode: pattern },
      { "items.productName": pattern },
      { "shippingAddress.recipientName": pattern },
      { "shippingAddress.city": pattern },
      { "shippingAddress.state": pattern },
    ];
  }

  const skip = toSkipValue(page, limit);

  const [totalItems, orders] = await Promise.all([
    OrderModel.countDocuments(query),
    OrderModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);

  return {
    items: orders.map(toSummaryOrder),
    meta: toPaginationMeta({
      page,
      limit,
      totalItems,
    }),
  };
};

export const getOrderForUser = async (userId, orderId) => {
  const order = await assertUserOwnsOrder(userId, orderId);
  return withLabels(order);
};

export const getOrderTrackingForUser = async (userId, orderId) => {
  const order = await assertUserOwnsOrder(userId, orderId);

  const sortedHistory = order.statusHistory
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return {
    orderId: order._id.toString(),
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    orderStatusLabel: toOrderStatusLabel(order.orderStatus),
    trackingCode: order.trackingCode,
    progress: buildStatusSteps(order.orderStatus),
    statusHistory: sortedHistory,
    estimatedDeliveryDate: order.estimatedDeliveryDate,
    updatedAt: order.updatedAt,
  };
};
