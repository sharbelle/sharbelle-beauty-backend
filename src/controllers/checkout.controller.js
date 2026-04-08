import asyncHandler from "../helpers/asyncHandler.js";
import sendResponse from "../helpers/sendResponse.js";
import {
  getCheckoutDefaultsForUser,
  handlePaystackWebhook,
  initializeCheckoutForUser,
  verifyCheckoutForUser,
} from "../services/checkout.service.js";

export const initializeCheckout = asyncHandler(async (req, res) => {
  const session = await initializeCheckoutForUser({
    user: req.user,
    payload: req.body,
  });

  return sendResponse(res, {
    statusCode: 201,
    message: "Checkout initialized",
    data: session,
  });
});

export const verifyCheckout = asyncHandler(async (req, res) => {
  const verification = await verifyCheckoutForUser({
    userId: req.user.id,
    reference: req.params.reference,
  });

  return sendResponse(res, {
    message: "Checkout verified",
    data: verification,
  });
});

export const checkoutDefaults = asyncHandler(async (req, res) => {
  const defaults = await getCheckoutDefaultsForUser(req.user.id);

  return sendResponse(res, {
    message: "Checkout defaults fetched",
    data: defaults,
  });
});

export const webhook = asyncHandler(async (req, res) => {
  const result = await handlePaystackWebhook({
    signature: req.get("x-paystack-signature"),
    rawBody: req.rawBody,
    payload: req.body,
  });

  return sendResponse(res, {
    message: "Webhook processed",
    data: result,
  });
});
