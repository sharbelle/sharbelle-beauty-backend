import { Router } from "express";
import { getOrderById, getOrders, trackOrder } from "../controllers/orders.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { validateParams, validateQuery } from "../middlewares/validate.middleware.js";
import { orderIdParamSchema, orderListQuerySchema } from "../models/order.model.js";

const router = Router();

router.use(authMiddleware);
router.get("/", validateQuery(orderListQuerySchema), getOrders);
router.get("/:orderId", validateParams(orderIdParamSchema), getOrderById);
router.get("/:orderId/track", validateParams(orderIdParamSchema), trackOrder);

export default router;
