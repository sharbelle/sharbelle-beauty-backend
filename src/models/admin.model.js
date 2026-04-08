import { z } from "zod";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "../config/constants.js";
import {
  dateFilterQuerySchema,
  paginationQuerySchema,
  querySearchSchema,
} from "./query.model.js";

export const adminOrderIdParamSchema = z.object({
  orderId: z.string().trim().min(1, "Order ID is required"),
});

export const updateOrderStatusInputSchema = z.object({
  orderStatus: z.enum(ORDER_STATUSES),
  label: z.string().trim().min(2).optional(),
  description: z.string().trim().min(5).optional(),
});

export const updatePaymentStatusInputSchema = z.object({
  paymentStatus: z.enum(PAYMENT_STATUSES),
  note: z.string().trim().min(5).optional(),
});

export const adminOrderListQuerySchema = z.object({
  search: querySearchSchema,
  orderStatus: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  datePreset: dateFilterQuerySchema.shape.datePreset,
  dateFrom: dateFilterQuerySchema.shape.dateFrom,
  dateTo: dateFilterQuerySchema.shape.dateTo,
  page: paginationQuerySchema.shape.page,
  limit: paginationQuerySchema.shape.limit,
});
