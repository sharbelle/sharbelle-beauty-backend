import { Router } from "express";
import {
  addWishlistItem,
  getMyWishlist,
  getSharedWishlist,
  removeWishlistItem,
  updateWishlistSharing,
} from "../controllers/wishlist.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { validateBody, validateParams, validateQuery } from "../middlewares/validate.middleware.js";
import {
  addWishlistItemInputSchema,
  updateWishlistSharingInputSchema,
  wishlistListQuerySchema,
  wishlistItemParamSchema,
  wishlistShareParamSchema,
} from "../models/wishlist.model.js";

const router = Router();

router.get(
  "/share/:shareToken",
  validateParams(wishlistShareParamSchema),
  validateQuery(wishlistListQuerySchema),
  getSharedWishlist,
);

router.use(authMiddleware);
router.get("/me", validateQuery(wishlistListQuerySchema), getMyWishlist);
router.post("/items", validateBody(addWishlistItemInputSchema), addWishlistItem);
router.delete(
  "/items/:productId",
  validateParams(wishlistItemParamSchema),
  removeWishlistItem,
);
router.patch("/sharing", validateBody(updateWishlistSharingInputSchema), updateWishlistSharing);

export default router;
