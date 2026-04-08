import { Router } from "express";
import adminRoutes from "./admin.routes.js";
import authRoutes from "./auth.routes.js";
import checkoutRoutes from "./checkout.routes.js";
import ordersRoutes from "./orders.routes.js";
import productsRoutes from "./products.routes.js";
import settingsRoutes from "./settings.routes.js";
import wishlistRoutes from "./wishlist.routes.js";

const router = Router();

router.use("/products", productsRoutes);
router.use("/settings", settingsRoutes);
router.use("/auth", authRoutes);
router.use("/checkout", checkoutRoutes);
router.use("/orders", ordersRoutes);
router.use("/wishlist", wishlistRoutes);
router.use("/admin", adminRoutes);

export default router;
