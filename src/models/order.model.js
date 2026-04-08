import mongoose from "mongoose";
import { z } from "zod";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "../config/constants.js";
import {
  dateFilterQuerySchema,
  paginationQuerySchema,
  querySearchSchema,
} from "./query.model.js";

export const orderStatusSchema = z.enum(ORDER_STATUSES);
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);

export const orderItemValidationSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  productSlug: z.string().min(1),
  image: z.string().url(),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
  total: z.number().nonnegative(),
});

export const trackingEventValidationSchema = z.object({
  status: orderStatusSchema,
  label: z.string().min(1),
  description: z.string().min(1),
  timestamp: z.string().datetime(),
});

export const addressValidationSchema = z.object({
  recipientName: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1),
  phone: z.string().min(7),
});

export const orderValidationSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  orderNumber: z.string().min(1).optional(),
  items: z.array(orderItemValidationSchema).min(1),
  subtotal: z.number().nonnegative(),
  shippingFee: z.number().nonnegative(),
  discount: z.number().nonnegative(),
  couponCode: z.string().min(1).optional(),
  total: z.number().nonnegative(),
  currency: z.string().min(3),
  paymentStatus: paymentStatusSchema,
  paymentMethod: z.string().min(1).optional(),
  paymentReference: z.string().min(1).optional(),
  paymentVerifiedAt: z.string().datetime().optional(),
  orderStatus: orderStatusSchema,
  trackingCode: z.string().min(1),
  shippingAddress: addressValidationSchema,
  billingAddress: addressValidationSchema,
  statusHistory: z.array(trackingEventValidationSchema).min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  estimatedDeliveryDate: z.string().datetime(),
});

export const orderIdParamSchema = z.object({
  orderId: z.string().min(1),
});

export const orderListQuerySchema = z.object({
  search: querySearchSchema,
  orderStatus: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  datePreset: dateFilterQuerySchema.shape.datePreset,
  dateFrom: dateFilterQuerySchema.shape.dateFrom,
  dateTo: dateFilterQuerySchema.shape.dateTo,
  page: paginationQuerySchema.shape.page,
  limit: paginationQuerySchema.shape.limit,
});

const addressSchema = new mongoose.Schema(
  {
    recipientName: {
      type: String,
      required: true,
      trim: true,
    },
    line1: {
      type: String,
      required: true,
      trim: true,
    },
    line2: {
      type: String,
      default: "",
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    postalCode: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
);

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      trim: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    productSlug: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const trackingEventSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: ORDER_STATUSES,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      default: [],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingFee: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
      index: true,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      default: "NGN",
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: PAYMENT_STATUSES,
      default: "pending",
    },
    paymentMethod: {
      type: String,
      required: true,
      default: "paystack",
      trim: true,
    },
    paymentReference: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    paymentVerifiedAt: {
      type: Date,
      default: null,
    },
    paymentProviderResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    orderStatus: {
      type: String,
      required: true,
      enum: ORDER_STATUSES,
      default: "pending",
    },
    trackingCode: {
      type: String,
      required: true,
      trim: true,
    },
    shippingAddress: {
      type: addressSchema,
      required: true,
    },
    billingAddress: {
      type: addressSchema,
      required: true,
    },
    statusHistory: {
      type: [trackingEventSchema],
      required: true,
      default: [],
    },
    estimatedDeliveryDate: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.userId = ret.userId?.toString ? ret.userId.toString() : ret.userId;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export const OrderModel = mongoose.models.Order || mongoose.model("Order", orderSchema);
