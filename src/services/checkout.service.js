import crypto from "crypto";
import { isValidObjectId } from "mongoose";
import ApiError from "../helpers/ApiError.js";
import env from "../config/env.js";
import {
  DEFAULT_CURRENCY,
  DEFAULT_DISCOUNT,
  DEFAULT_PAYMENT_METHOD,
  DEFAULT_SHIPPING_FEE,
} from "../config/constants.js";
import { CouponModel } from "../models/coupon.model.js";
import { OrderModel } from "../models/order.model.js";
import { ProductModel } from "../models/product.model.js";
import { toOrderStatusLabel, toPaymentStatusLabel } from "../utils/formatters.js";

const PAYSTACK_SUCCESS = "success";
const PAYSTACK_FAILURE_STATES = new Set(["failed", "abandoned", "reversed"]);

const toKobo = (amount) => Math.round(amount * 100);

const generateOrderNumber = () => {
  const stamp = Date.now().toString().slice(-8);
  const random = Math.floor(100 + Math.random() * 900);
  return `SHR-${stamp}${random}`;
};

const generatePaymentReference = () => {
  return `PSK-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
};

const makeStatusEvent = (status, label, description, timestamp = new Date()) => ({
  status,
  label,
  description,
  timestamp,
});

const addStatusEventIfMissing = (order, status, label, description, timestamp = new Date()) => {
  const exists = order.statusHistory.some((event) => event.status === status);
  if (!exists) {
    order.statusHistory.push(makeStatusEvent(status, label, description, timestamp));
  }
};

const serializeOrder = (order) => {
  const plain = order.toJSON ? order.toJSON() : order;

  return {
    ...plain,
    orderStatusLabel: toOrderStatusLabel(plain.orderStatus),
    paymentStatusLabel: toPaymentStatusLabel(plain.paymentStatus),
  };
};

const paystackRequest = async (path, { method = "GET", body = undefined } = {}) => {
  if (!env.paystackSecretKey) {
    throw new ApiError(500, "Paystack is not configured", "PAYSTACK_NOT_CONFIGURED");
  }

  const response = await fetch(`${env.paystackBaseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.paystackSecretKey}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.status) {
    throw new ApiError(
      502,
      payload?.message || "Payment provider request failed",
      "PAYMENT_PROVIDER_ERROR",
    );
  }

  return payload.data;
};

const buildOrderItems = async (items) => {
  const uniqueProductIds = [...new Set(items.map((item) => item.productId))];
  const objectIds = uniqueProductIds.filter((value) => isValidObjectId(value));

  if (objectIds.length !== uniqueProductIds.length) {
    throw new ApiError(400, "One or more products are invalid", "INVALID_PRODUCT");
  }

  const products = await ProductModel.find({
    _id: { $in: objectIds },
  }).lean();

  const productsById = new Map(products.map((product) => [product._id.toString(), product]));

  return items.map((item) => {
    const product = productsById.get(item.productId);

    if (!product) {
      throw new ApiError(400, "One or more selected products were not found", "INVALID_PRODUCT");
    }

    if (!product.inStock || product.inventoryCount < item.quantity) {
      throw new ApiError(
        400,
        `${product.name} does not have enough stock for quantity ${item.quantity}`,
        "INSUFFICIENT_STOCK",
      );
    }

    return {
      productId: product._id.toString(),
      productName: product.name,
      productSlug: product.slug,
      image: product.image,
      quantity: item.quantity,
      price: product.priceInNaira,
      total: product.priceInNaira * item.quantity,
    };
  });
};

const applyCoupon = async ({ couponCode, subtotal }) => {
  if (!couponCode) {
    return {
      coupon: null,
      discount: DEFAULT_DISCOUNT,
      couponCode: null,
    };
  }

  const code = couponCode.trim().toUpperCase();
  const coupon = await CouponModel.findOne({ code });

  if (!coupon || !coupon.active) {
    throw new ApiError(400, "Coupon code is invalid or inactive", "INVALID_COUPON");
  }

  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    throw new ApiError(400, "Coupon code has expired", "COUPON_EXPIRED");
  }

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw new ApiError(400, "Coupon usage limit has been reached", "COUPON_USAGE_LIMIT_REACHED");
  }

  if (subtotal < coupon.minOrderTotal) {
    throw new ApiError(
      400,
      `Coupon requires minimum order of ${coupon.minOrderTotal}`,
      "COUPON_MIN_ORDER_NOT_MET",
    );
  }

  const discount =
    coupon.type === "percent"
      ? Math.min(Math.round((subtotal * coupon.value) / 100), subtotal)
      : Math.min(coupon.value, subtotal);

  return {
    coupon,
    discount,
    couponCode: coupon.code,
  };
};

const updateCouponUsage = async (couponCode, delta) => {
  if (!couponCode) {
    return;
  }

  const coupon = await CouponModel.findOne({ code: couponCode });

  if (!coupon) {
    return;
  }

  coupon.usedCount = Math.max(0, coupon.usedCount + delta);
  await coupon.save();
};

const updateInventoryForOrderItems = async (items, mode) => {
  if (!items.length) {
    return;
  }

  const multiplier = mode === "decrement" ? -1 : 1;

  for (const item of items) {
    if (!isValidObjectId(item.productId)) {
      continue;
    }

    const product = await ProductModel.findById(item.productId);

    if (!product) {
      continue;
    }

    product.inventoryCount = Math.max(0, product.inventoryCount + multiplier * item.quantity);
    product.inStock = product.inventoryCount > 0;
    await product.save();
  }
};

const markOrderPaid = async (order, providerResponse) => {
  if (order.paymentStatus === "paid") {
    return order;
  }

  order.paymentStatus = "paid";
  order.paymentVerifiedAt = providerResponse?.paid_at ? new Date(providerResponse.paid_at) : new Date();
  order.paymentProviderResponse = providerResponse || null;

  if (order.orderStatus === "pending" || order.orderStatus === "cancelled") {
    order.orderStatus = "confirmed";
  }

  addStatusEventIfMissing(
    order,
    "confirmed",
    "Payment confirmed",
    "Your payment was confirmed. We are preparing your order.",
    order.paymentVerifiedAt,
  );

  await order.save();
  await updateInventoryForOrderItems(order.items, "decrement");
  await updateCouponUsage(order.couponCode, 1);

  return order;
};

const markOrderFailed = async (order, providerResponse) => {
  if (order.paymentStatus === "failed") {
    return order;
  }

  order.paymentStatus = "failed";
  order.paymentProviderResponse = providerResponse || null;

  if (!["delivered", "returned", "cancelled"].includes(order.orderStatus)) {
    order.orderStatus = "cancelled";
  }

  addStatusEventIfMissing(
    order,
    "cancelled",
    "Payment failed",
    "Payment did not complete successfully and this order was cancelled.",
  );

  await order.save();
  return order;
};

const markOrderRefunded = async (order, providerResponse) => {
  if (order.paymentStatus === "refunded" && order.orderStatus === "returned") {
    return order;
  }

  order.paymentStatus = "refunded";
  order.paymentProviderResponse = providerResponse || null;
  order.orderStatus = "returned";

  addStatusEventIfMissing(
    order,
    "returned",
    "Refund processed",
    "A refund was processed for this order and it has been marked as returned.",
  );

  await order.save();
  await updateInventoryForOrderItems(order.items, "increment");
  await updateCouponUsage(order.couponCode, -1);

  return order;
};

const initializeProviderPayment = async ({ user, order }) => {
  const amount = toKobo(order.total);

  const data = await paystackRequest("/transaction/initialize", {
    method: "POST",
    body: {
      email: user.email,
      amount,
      reference: order.paymentReference,
      callback_url: env.paystackCallbackUrl,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: user.id,
      },
    },
  });

  return {
    authorizationUrl: data.authorization_url,
    accessCode: data.access_code,
  };
};

export const initializeCheckoutForUser = async ({ user, payload }) => {
  const orderItems = await buildOrderItems(payload.items);
  const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
  const shippingFee = DEFAULT_SHIPPING_FEE;
  const couponResult = await applyCoupon({
    couponCode: payload.couponCode,
    subtotal,
  });
  const discount = couponResult.discount;
  const total = subtotal + shippingFee - discount;

  const order = await OrderModel.create({
    userId: user.id,
    orderNumber: generateOrderNumber(),
    items: orderItems,
    subtotal,
    shippingFee,
    discount,
    couponCode: couponResult.couponCode,
    total,
    currency: DEFAULT_CURRENCY,
    paymentStatus: "pending",
    paymentMethod: DEFAULT_PAYMENT_METHOD,
    paymentReference: generatePaymentReference(),
    orderStatus: "pending",
    trackingCode: `TRK-${Date.now().toString().slice(-8)}`,
    shippingAddress: payload.shippingAddress,
    billingAddress:
      payload.sameAsShipping || !payload.billingAddress
        ? payload.shippingAddress
        : payload.billingAddress,
    statusHistory: [
      makeStatusEvent(
        "pending",
        "Order placed",
        "Order has been created and is awaiting payment confirmation.",
      ),
    ],
    estimatedDeliveryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
  });

  try {
    const paymentSession = await initializeProviderPayment({ user, order });

    return {
      order: serializeOrder(order),
      ...paymentSession,
      reference: order.paymentReference,
    };
  } catch (error) {
    await OrderModel.findByIdAndDelete(order.id);
    throw error;
  }
};

export const verifyCheckoutForUser = async ({ userId, reference }) => {
  const order = await OrderModel.findOne({
    paymentReference: reference,
    userId,
  });

  if (!order) {
    throw new ApiError(404, "Order not found for this payment reference", "ORDER_NOT_FOUND");
  }

  const transaction = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);

  if (transaction.status === PAYSTACK_SUCCESS) {
    if (toKobo(order.total) !== transaction.amount) {
      throw new ApiError(
        400,
        "Paid amount does not match order total",
        "PAYMENT_AMOUNT_MISMATCH",
      );
    }

    const updated = await markOrderPaid(order, transaction);
    return {
      order: serializeOrder(updated),
      paymentState: "paid",
      providerStatus: transaction.status,
    };
  }

  if (PAYSTACK_FAILURE_STATES.has(transaction.status)) {
    const updated = await markOrderFailed(order, transaction);
    return {
      order: serializeOrder(updated),
      paymentState: "failed",
      providerStatus: transaction.status,
    };
  }

  return {
    order: serializeOrder(order),
    paymentState: "pending",
    providerStatus: transaction.status,
  };
};

export const handlePaystackWebhook = async ({ signature, rawBody, payload }) => {
  if (!env.paystackSecretKey) {
    throw new ApiError(500, "Paystack is not configured", "PAYSTACK_NOT_CONFIGURED");
  }

  const expectedSignature = crypto
    .createHmac("sha512", env.paystackSecretKey)
    .update(rawBody || Buffer.from(""))
    .digest("hex");

  if (!signature || signature !== expectedSignature) {
    throw new ApiError(401, "Invalid Paystack signature", "INVALID_WEBHOOK_SIGNATURE");
  }

  const event = payload?.event;
  const reference = payload?.data?.reference;

  if (!event || !reference) {
    return { received: true, ignored: true };
  }

  const order = await OrderModel.findOne({ paymentReference: reference });

  if (!order) {
    return { received: true, ignored: true };
  }

  if (event === "charge.success") {
    await markOrderPaid(order, payload.data);
    return { received: true, handled: "charge.success" };
  }

  if (event === "charge.failed") {
    await markOrderFailed(order, payload.data);
    return { received: true, handled: "charge.failed" };
  }

  if (event === "refund.processed") {
    await markOrderRefunded(order, payload.data);
    return { received: true, handled: "refund.processed" };
  }

  return { received: true, ignored: true };
};

const normalizeAddress = (address) => {
  if (!address) {
    return null;
  }

  return {
    recipientName: address.recipientName || "",
    line1: address.line1 || "",
    line2: address.line2 || "",
    city: address.city || "",
    state: address.state || "",
    postalCode: address.postalCode || "",
    country: address.country || "",
    phone: address.phone || "",
  };
};

export const getCheckoutDefaultsForUser = async (userId) => {
  const latestOrder = await OrderModel.findOne({ userId }).sort({ createdAt: -1 }).lean();

  if (!latestOrder) {
    return {
      shippingAddress: null,
      billingAddress: null,
      sameAsShipping: true,
      source: "none",
    };
  }

  const shippingAddress = normalizeAddress(latestOrder.shippingAddress);
  const billingAddress = normalizeAddress(latestOrder.billingAddress);
  const sameAsShipping =
    JSON.stringify(shippingAddress || {}) === JSON.stringify(billingAddress || {});

  return {
    shippingAddress,
    billingAddress,
    sameAsShipping,
    source: "last_order",
    orderId: latestOrder._id.toString(),
    updatedAt: latestOrder.updatedAt,
  };
};
