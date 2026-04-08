import { Router } from "express";
import {
  checkoutDefaults,
  initializeCheckout,
  verifyCheckout,
  webhook,
} from "../controllers/checkout.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { validateBody, validateParams } from "../middlewares/validate.middleware.js";
import {
  initializeCheckoutInputSchema,
  verifyCheckoutParamSchema,
} from "../models/checkout.model.js";

const router = Router();

router.post("/webhook", webhook);
router.get("/defaults", authMiddleware, checkoutDefaults);
router.post("/initialize", authMiddleware, validateBody(initializeCheckoutInputSchema), initializeCheckout);
router.get("/verify/:reference", authMiddleware, validateParams(verifyCheckoutParamSchema), verifyCheckout);

export default router;
