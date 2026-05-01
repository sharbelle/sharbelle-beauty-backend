import crypto from "crypto";
import { isValidObjectId } from "mongoose";
import ApiError from "../helpers/ApiError.js";
import env from "../config/env.js";
import {
  DEFAULT_CURRENCY,
  DEFAULT_DISCOUNT,
  DEFAULT_PAYMENT_METHOD,
} from "../config/constants.js";
import {
  getDeliveryPricingConfig,
  resolveDeliveryFeeByLga,
} from "../config/delivery-zones.js";
import { CouponModel } from "../models/coupon.model.js";
import { OrderModel } from "../models/order.model.js";
import { ProductModel } from "../models/product.model.js";
import {
  notifyOrderCreated,
  notifyOrderStatusUpdatedByAdmin,
} from "./order-notification.service.js";
import { toOrderStatusLabel, toPaymentStatusLabel } from "../utils/formatters.js";

const FLUTTERWAVE_SUCCESS = "successful";
const FLUTTERWAVE_FAILURE_STATES = new Set(["failed", "cancelled", "abandoned"]);

const logFlutterwaveDebug = (message, details = {}) => {
  if (!env.flutterwaveDebug) {
    return;
  }

  console.info(`[flutterwave-debug] ${message}`, details);
};

const maskSensitiveValue = (value) => {
  if (!value) {
    return "missing";
  }

  const stringValue = String(value);

  if (stringValue.length <= 8) {
    return `*** (len=${stringValue.length})`;
  }

  return `${stringValue.slice(0, 6)}...${stringValue.slice(-4)} (len=${stringValue.length})`;
};

const maskEmail = (email) => {
  if (!email || !String(email).includes("@")) {
    return "missing";
  }

  const [localPart, domain] = String(email).split("@");

  if (!localPart) {
    return `***@${domain}`;
  }

  const visibleLocal = localPart.length <= 2 ? `${localPart[0] || ""}*` : `${localPart.slice(0, 2)}***`;
  return `${visibleLocal}@${domain}`;
};

const summarizeFlutterwaveBody = (body) => {
  if (!body || typeof body !== "object") {
    return null;
  }

  return {
    keys: Object.keys(body),
    tx_ref: body.tx_ref || null,
    reference: body.reference || null,
    amount: body.amount ?? null,
    currency: body.currency || null,
    redirect_url: body.redirect_url || body.callback_url || null,
    customer: body.customer
      ? {
          email: maskEmail(body.customer.email),
          hasPhone: Boolean(body.customer.phonenumber),
          hasName: Boolean(body.customer.name),
        }
      : null,
    metaKeys: body.meta && typeof body.meta === "object" ? Object.keys(body.meta) : [],
  };
};

const truncateForLog = (value, max = 600) => {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

const generateOrderNumber = () => {
  const stamp = Date.now().toString().slice(-8);
  const random = Math.floor(100 + Math.random() * 900);
  return `SHR-${stamp}${random}`;
};

const generatePaymentReference = () => {
  return `FLW-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
};

const makeStatusEvent = (status, label, description, timestamp = new Date()) => ({
  status,
  label,
  description,
  timestamp,
});

const addStatusEventIfMissing = (order, status, label, description, timestamp = new Date()) => {
  const existingEvent = order.statusHistory.find((event) => event.status === status);

  if (existingEvent) {
    return existingEvent;
  }

  const event = makeStatusEvent(status, label, description, timestamp);
  order.statusHistory.push(event);
  return event;
};

const serializeOrder = (order) => {
  const plain = order.toJSON ? order.toJSON() : order;

  return {
    ...plain,
    orderStatusLabel: toOrderStatusLabel(plain.orderStatus),
    paymentStatusLabel: toPaymentStatusLabel(plain.paymentStatus),
  };
};

const toQueryString = (params) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
};

const resolveFlutterwaveSecretKey = () => {
  const rawValue = env.flutterwaveSecretKey || "";
  const trimmed = rawValue.trim().replace(/^["']|["']$/g, "");
  const withoutBearer = trimmed.replace(/^Bearer\s+/i, "");

  if (!withoutBearer) {
    throw new ApiError(
      500,
      "Flutterwave is not configured. Set FLUTTERWAVE_SECRET_KEY.",
      "FLUTTERWAVE_NOT_CONFIGURED",
    );
  }

  // Flutterwave API keys normally start with FLWSECK.
  if (!/^FLWSECK/i.test(withoutBearer)) {
    throw new ApiError(
      500,
      "Invalid FLUTTERWAVE_SECRET_KEY format. Use your Flutterwave Secret Key (starts with FLWSECK), not client secret or encryption key.",
      "FLUTTERWAVE_INVALID_SECRET_KEY_FORMAT",
    );
  }

  return withoutBearer;
};

const flutterwaveRequest = async (path, { method = "GET", body = undefined, query = undefined } = {}) => {
  const authToken = resolveFlutterwaveSecretKey();
  const queryString = query ? toQueryString(query) : "";
  const requestUrl = `${env.flutterwaveBaseUrl}${path}${queryString}`;

  logFlutterwaveDebug("outbound-request", {
    method,
    url: requestUrl,
    authToken: maskSensitiveValue(authToken),
    query: query || null,
    bodySummary: summarizeFlutterwaveBody(body),
  });

  const response = await fetch(requestUrl, {
    method,
    headers: {
      Authorization: `Bearer ${authToken}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const rawPayload = await response.text();
  const payload = (() => {
    if (!rawPayload) {
      return null;
    }

    try {
      return JSON.parse(rawPayload);
    } catch {
      return null;
    }
  })();
  const isSuccessfulPayload = payload?.status === "success";

  logFlutterwaveDebug("outbound-response", {
    method,
    url: requestUrl,
    httpStatus: response.status,
    ok: response.ok,
    providerStatus: payload?.status || null,
    providerMessage: payload?.message || null,
    bodySnippet: truncateForLog(payload || rawPayload || ""),
  });

  if (!response.ok || !isSuccessfulPayload) {
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
  order.paymentVerifiedAt = providerResponse?.created_at ? new Date(providerResponse.created_at) : new Date();
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
  // Send order-received notifications only after payment is actually confirmed.
  await notifyOrderCreated({ order });

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

  const statusEvent = addStatusEventIfMissing(
    order,
    "cancelled",
    "Payment failed",
    "Payment did not complete successfully and this order was cancelled.",
  );

  await order.save();
  await notifyOrderStatusUpdatedByAdmin({ order, statusEvent });
  return order;
};

const markOrderRefunded = async (order, providerResponse) => {
  if (order.paymentStatus === "refunded" && order.orderStatus === "returned") {
    return order;
  }

  order.paymentStatus = "refunded";
  order.paymentProviderResponse = providerResponse || null;
  order.orderStatus = "returned";

  const statusEvent = addStatusEventIfMissing(
    order,
    "returned",
    "Refund processed",
    "A refund was processed for this order and it has been marked as returned.",
  );

  await order.save();
  await updateInventoryForOrderItems(order.items, "increment");
  await updateCouponUsage(order.couponCode, -1);
  await notifyOrderStatusUpdatedByAdmin({ order, statusEvent });

  return order;
};

const initializeProviderPayment = async ({ user, order }) => {
  const data = await flutterwaveRequest("/payments", {
    method: "POST",
    body: {
      tx_ref: order.paymentReference,
      amount: order.total,
      currency: order.currency,
      redirect_url: env.flutterwaveRedirectUrl,
      customer: {
        email: user.email,
        name: user.fullName || user.email || "Sharbelle Customer",
        phonenumber: order.shippingAddress?.phone || undefined,
      },
      customizations: {
        title: "Sharbelle Beauty Checkout",
        description: `Payment for order ${order.orderNumber}`,
      },
      meta: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: user.id,
      },
    },
  });

  if (!data?.link) {
    throw new ApiError(502, "Could not create Flutterwave payment session", "PAYMENT_PROVIDER_ERROR");
  }

  return {
    checkoutUrl: data.link,
  };
};

const verifyFlutterwaveTransactionById = async (transactionId) => {
  if (!transactionId) {
    throw new ApiError(400, "Missing transaction id for verification", "INVALID_PROVIDER_RESPONSE");
  }

  return flutterwaveRequest(`/transactions/${encodeURIComponent(String(transactionId))}/verify`);
};

const verifyFlutterwaveTransactionByReference = async (txRef) => {
  if (!txRef) {
    throw new ApiError(400, "Missing transaction reference for verification", "INVALID_PROVIDER_RESPONSE");
  }

  return flutterwaveRequest("/transactions/verify_by_reference", {
    query: {
      tx_ref: txRef,
    },
  });
};

const assertSuccessfulTransactionMatchesOrder = (order, transaction) => {
  const txRef = transaction?.tx_ref || transaction?.txRef;
  const currency = transaction?.currency;
  const amount = Number(transaction?.amount || 0);
  const expectedAmount = Number(order.total || 0);

  if (txRef !== order.paymentReference) {
    throw new ApiError(400, "Transaction reference does not match this order", "PAYMENT_REFERENCE_MISMATCH");
  }

  if (currency !== order.currency) {
    throw new ApiError(400, "Transaction currency does not match order currency", "PAYMENT_CURRENCY_MISMATCH");
  }

  if (Number.isNaN(amount) || amount < expectedAmount) {
    throw new ApiError(400, "Paid amount does not match order total", "PAYMENT_AMOUNT_MISMATCH");
  }
};

const toPaymentState = (providerStatus) => {
  if (providerStatus === FLUTTERWAVE_SUCCESS) {
    return "paid";
  }

  if (FLUTTERWAVE_FAILURE_STATES.has(providerStatus)) {
    return "failed";
  }

  return "pending";
};

const isValidWebhookSignature = ({ signature, rawBody, payload }) => {
  if (!env.flutterwaveSecretHash) {
    return false;
  }

  if (!signature) {
    return false;
  }

  const normalizedSignature = String(signature).trim();
  const signatureValue = normalizedSignature.startsWith("sha256=")
    ? normalizedSignature.slice("sha256=".length)
    : normalizedSignature;

  if (signatureValue === env.flutterwaveSecretHash) {
    return true;
  }

  const bodyBuffer = rawBody || Buffer.from(JSON.stringify(payload || {}));
  const digest = crypto
    .createHmac("sha256", env.flutterwaveSecretHash)
    .update(bodyBuffer)
    .digest("hex");

  if (digest.length !== signatureValue.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signatureValue));
};

export const initializeCheckoutForUser = async ({ user, payload }) => {
  const orderItems = await buildOrderItems(payload.items);
  const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
  const shippingFee = resolveDeliveryFeeByLga(payload.shippingAddress.areaLga);
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
      checkoutUrl: paymentSession.checkoutUrl,
      txRef: order.paymentReference,
    };
  } catch (error) {
    await OrderModel.findByIdAndDelete(order.id);
    throw error;
  }
};

export const verifyCheckoutForUser = async ({ userId, txRef }) => {
  const order = await OrderModel.findOne({
    paymentReference: txRef,
    userId,
  });

  if (!order) {
    throw new ApiError(404, "Order not found for this payment reference", "ORDER_NOT_FOUND");
  }

  const transaction = await verifyFlutterwaveTransactionByReference(txRef);
  const providerStatus = transaction?.status || "unknown";

  if (providerStatus === FLUTTERWAVE_SUCCESS) {
    assertSuccessfulTransactionMatchesOrder(order, transaction);
    const updated = await markOrderPaid(order, transaction);

    return {
      order: serializeOrder(updated),
      paymentState: "paid",
      providerStatus,
    };
  }

  if (FLUTTERWAVE_FAILURE_STATES.has(providerStatus)) {
    const updated = await markOrderFailed(order, transaction);

    return {
      order: serializeOrder(updated),
      paymentState: "failed",
      providerStatus,
    };
  }

  return {
    order: serializeOrder(order),
    paymentState: "pending",
    providerStatus,
  };
};

export const handleFlutterwaveWebhook = async ({ signature, rawBody, payload }) => {
  resolveFlutterwaveSecretKey();

  if (!isValidWebhookSignature({ signature, rawBody, payload })) {
    throw new ApiError(401, "Invalid Flutterwave signature", "INVALID_WEBHOOK_SIGNATURE");
  }

  const eventName = payload?.event || payload?.event?.type || payload?.type || "";
  const transactionId = payload?.data?.id || payload?.id;
  const txRef = payload?.data?.tx_ref || payload?.tx_ref;

  if (!transactionId && !txRef) {
    return { received: true, ignored: true, reason: "missing-transaction-identifiers" };
  }

  const transaction = transactionId
    ? await verifyFlutterwaveTransactionById(transactionId)
    : await verifyFlutterwaveTransactionByReference(txRef);

  const resolvedTxRef = transaction?.tx_ref || txRef;

  if (!resolvedTxRef) {
    return { received: true, ignored: true, reason: "missing-reference-after-verification" };
  }

  const order = await OrderModel.findOne({ paymentReference: resolvedTxRef });

  if (!order) {
    return { received: true, ignored: true, reason: "order-not-found" };
  }

  const providerStatus = transaction?.status || "unknown";
  const paymentState = toPaymentState(providerStatus);

  if (eventName === "refund.processed") {
    await markOrderRefunded(order, transaction);
    return { received: true, handled: "refund.processed", paymentState: "refunded" };
  }

  if (paymentState === "paid") {
    assertSuccessfulTransactionMatchesOrder(order, transaction);
    await markOrderPaid(order, transaction);
    return { received: true, handled: eventName || "payment.updated", paymentState: "paid" };
  }

  if (paymentState === "failed") {
    await markOrderFailed(order, transaction);
    return { received: true, handled: eventName || "payment.updated", paymentState: "failed" };
  }

  return { received: true, ignored: true, paymentState: "pending", providerStatus };
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
    areaLga: address.areaLga || "",
    closestLandmark: address.closestLandmark || "",
    postalCode: address.postalCode || "",
    country: address.country || "",
    phone: address.phone || "",
  };
};

export const getCheckoutDefaultsForUser = async (userId) => {
  const latestOrder = await OrderModel.findOne({ userId }).sort({ createdAt: -1 }).lean();
  const deliveryPricing = getDeliveryPricingConfig();

  if (!latestOrder) {
    return {
      shippingAddress: null,
      billingAddress: null,
      sameAsShipping: true,
      source: "none",
      deliveryPricing,
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
    deliveryPricing,
    orderId: latestOrder._id.toString(),
    updatedAt: latestOrder.updatedAt,
  };
};
