import { z } from "zod";
import { addressValidationSchema } from "./order.model.js";

export const checkoutItemInputSchema = z.object({
  productId: z.string().trim().min(1, "Product ID is required"),
  quantity: z.number().int().positive("Quantity must be at least 1"),
});

export const initializeCheckoutInputSchema = z.object({
  items: z.array(checkoutItemInputSchema).min(1, "At least one item is required"),
  couponCode: z.string().trim().min(3).max(30).optional(),
  shippingAddress: addressValidationSchema,
  billingAddress: addressValidationSchema.optional(),
  sameAsShipping: z.boolean().optional(),
});

export const verifyCheckoutParamSchema = z.object({
  reference: z.string().trim().min(6, "Valid payment reference is required"),
});
