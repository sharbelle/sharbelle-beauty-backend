import { Router } from "express";
import {
  createAdminProduct,
  deleteAdminProduct,
  getAdminProduct,
  getAdminProducts,
  updateAdminProduct,
} from "../controllers/products.controller.js";
import {
  createAdminCoupon,
  deleteAdminCoupon,
  getAdminCoupons,
  updateAdminCoupon,
} from "../controllers/coupons.controller.js";
import {
  getAdminOrders,
  updateAdminOrderPaymentStatus,
  updateAdminOrderStatus,
} from "../controllers/admin-orders.controller.js";
import {
  createAdminCategory,
  createAdminTag,
  getAdminCategories,
  getAdminTags,
} from "../controllers/catalog.controller.js";
import { completeUpload, getUploadSignature } from "../controllers/upload.controller.js";
import {
  getAdminStoreSettings,
  updateAdminStoreSettings,
} from "../controllers/store-settings.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import allowRoles from "../middlewares/role.middleware.js";
import { validateBody, validateParams, validateQuery } from "../middlewares/validate.middleware.js";
import {
  adminProductListQuerySchema,
  createProductInputSchema,
  productIdParamSchema,
  updateProductInputSchema,
} from "../models/product.model.js";
import {
  couponIdParamSchema,
  couponListQuerySchema,
  createCouponInputSchema,
  updateCouponInputSchema,
} from "../models/coupon.model.js";
import {
  adminOrderListQuerySchema,
  adminOrderIdParamSchema,
  updateOrderStatusInputSchema,
  updatePaymentStatusInputSchema,
} from "../models/admin.model.js";
import { createCategoryInputSchema } from "../models/category.model.js";
import { createTagInputSchema } from "../models/tag.model.js";
import { completeUploadInputSchema, uploadSignatureInputSchema } from "../models/upload.model.js";
import { updateStoreSettingsInputSchema } from "../models/store-settings.model.js";

const router = Router();

router.use(authMiddleware, allowRoles("admin"));

router.get("/products", validateQuery(adminProductListQuerySchema), getAdminProducts);
router.get("/products/:productId", validateParams(productIdParamSchema), getAdminProduct);
router.post("/products", validateBody(createProductInputSchema), createAdminProduct);
router.patch(
  "/products/:productId",
  validateParams(productIdParamSchema),
  validateBody(updateProductInputSchema),
  updateAdminProduct,
);
router.delete("/products/:productId", validateParams(productIdParamSchema), deleteAdminProduct);
router.get("/categories", getAdminCategories);
router.post("/categories", validateBody(createCategoryInputSchema), createAdminCategory);
router.get("/tags", getAdminTags);
router.post("/tags", validateBody(createTagInputSchema), createAdminTag);

router.get("/coupons", validateQuery(couponListQuerySchema), getAdminCoupons);
router.post("/coupons", validateBody(createCouponInputSchema), createAdminCoupon);
router.patch(
  "/coupons/:couponId",
  validateParams(couponIdParamSchema),
  validateBody(updateCouponInputSchema),
  updateAdminCoupon,
);
router.delete("/coupons/:couponId", validateParams(couponIdParamSchema), deleteAdminCoupon);

router.get("/orders", validateQuery(adminOrderListQuerySchema), getAdminOrders);
router.patch(
  "/orders/:orderId/status",
  validateParams(adminOrderIdParamSchema),
  validateBody(updateOrderStatusInputSchema),
  updateAdminOrderStatus,
);
router.patch(
  "/orders/:orderId/payment",
  validateParams(adminOrderIdParamSchema),
  validateBody(updatePaymentStatusInputSchema),
  updateAdminOrderPaymentStatus,
);

router.post("/uploads/signature", validateBody(uploadSignatureInputSchema), getUploadSignature);
router.post("/uploads/complete", validateBody(completeUploadInputSchema), completeUpload);

router.get("/settings", getAdminStoreSettings);
router.patch("/settings", validateBody(updateStoreSettingsInputSchema), updateAdminStoreSettings);

export default router;
